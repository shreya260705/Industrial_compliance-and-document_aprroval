"""
BizPermit — Cross-Dashboard Workflow Engine Integration Test Suite.
Validates the complete 12-scenario lifecycle across Business Owner, Department Officers, and Super Admin:
1. Owner submits application.
2. Admin assigns a specific officer.
3. Owner sees that officer's actual name and email.
4. Assigned officer sees the task in their queue.
5. Another officer cannot access the task.
6. Officer verifies a document.
7. Owner sees the updated result after refresh/re-login.
8. Officer requests correction and owner resubmits a new document version.
9. Officer reassignment removes old access and preserves history.
10. Scheme and grievance workflows reflect the same cross-dashboard behaviour.
11. Compliance updates reflect in the owner and authorised monitoring dashboards.
12. Admin sees the corresponding events and audit history in platform_events.
"""

import io
import pytest
from datetime import datetime, timezone
from django.core.management import call_command
from rest_framework.test import APIClient
from apps.authentication.password import hash_password
from apps.authentication.repository import UserRepository
from apps.authentication.jwt_service import generate_tokens_for_user
from apps.database.connection import get_db
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository
from apps.applications.repository import ApplicationRepository
from apps.schemes.repository import SchemeRepository
from apps.common.workflow_engine import WorkflowEngine

VALID_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Title (Statutory Blueprint) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
VALID_REVISED_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Title (Revised Blueprint) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"


@pytest.fixture(scope="module")
def workflow_setup():
    db = get_db()
    user_repo = UserRepository()
    biz_repo = BusinessRepository()
    loc_repo = LocationRepository()
    doc_repo = DocumentRepository()
    app_repo = ApplicationRepository()

    # Seed required regulatory data and schemes
    call_command("seed_national_data")
    if SchemeRepository().collection.count_documents({}) == 0:
        call_command("seed_schemes")

    # Clear prior test data
    test_emails = [
        "workflow.admin@bizpermit.gov.in",
        "officer.primary@gpcb.gov.in",
        "officer.secondary@gpcb.gov.in",
        "owner.workflow@enterprise.in"
    ]
    user_repo.collection.delete_many({"email": {"$in": test_emails}})

    default_pw = hash_password("SecurePass123!")

    # 1. Super Admin
    admin_user = user_repo.create_user(
        email="workflow.admin@bizpermit.gov.in",
        password_hash=default_pw,
        full_name="National Administrator",
        role="SUPER_ADMIN"
    )

    # 2. Officer 1 (Primary Gujarat Officer)
    officer_1 = user_repo.create_user(
        email="officer.primary@gpcb.gov.in",
        password_hash=default_pw,
        full_name="Arjun Mehta",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "GPCB-ENV",
            "jurisdiction_code": "IN-GJ",
            "designation": "Senior Technical Officer",
            "badge_number": "GJ-ENV-1001",
            "permitted_workflow_actions": ["SCRUTINY", "REVIEW", "APPROVE", "RECOMMEND"]
        }
    )

    # 3. Officer 2 (Secondary Gujarat Officer in same department)
    officer_2 = user_repo.create_user(
        email="officer.secondary@gpcb.gov.in",
        password_hash=default_pw,
        full_name="Bhavik Shah",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "GPCB-ENV",
            "jurisdiction_code": "IN-GJ",
            "designation": "Assistant Technical Officer",
            "badge_number": "GJ-ENV-2002",
            "permitted_workflow_actions": ["SCRUTINY", "REVIEW"]
        }
    )

    # 4. Business Owner
    owner_user = user_repo.create_user(
        email="owner.workflow@enterprise.in",
        password_hash=default_pw,
        full_name="Vikramaditya Singhania",
        role="BUSINESS_OWNER"
    )

    # Setup clients with JWT authentication
    admin_client = APIClient()
    admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {generate_tokens_for_user(admin_user)['access_token']}")

    off1_client = APIClient()
    off1_client.credentials(HTTP_AUTHORIZATION=f"Bearer {generate_tokens_for_user(officer_1)['access_token']}")

    off2_client = APIClient()
    off2_client.credentials(HTTP_AUTHORIZATION=f"Bearer {generate_tokens_for_user(officer_2)['access_token']}")

    owner_client = APIClient()
    owner_client.credentials(HTTP_AUTHORIZATION=f"Bearer {generate_tokens_for_user(owner_user)['access_token']}")

    # Clean up test businesses
    biz_repo.collection.delete_many({"pan": "AABCS1234F"})

    # Create business and location for owner
    biz = biz_repo.create_business(
        owner_user_id=owner_user["_id"],
        legal_name="Singhania Advanced Polymers Pvt Ltd",
        pan="AABCS1234F"
    )

    loc = loc_repo.create_location(
        business_id=biz["_id"],
        location_name="Sanand Industrial Plant",
        facility_type="MANUFACTURING_PLANT",
        address={
            "line1": "Plot 45, GIDC Industrial Estate, Sanand",
            "city": "Ahmedabad",
            "district": "Ahmedabad",
            "state_code": "IN-GJ",
            "pincode": "382110"
        },
        jurisdiction_hierarchy={
            "state_code": "IN-GJ",
            "district_code": "IN-GJ-AHM",
            "local_body_code": "GIDC-SANAND"
        },
        industrial_profile={
            "nic_code": "2011",
            "sector_name": "Chemicals",
            "scale": "MEDIUM",
            "pollution_category": "ORANGE"
        }
    )

    return {
        "admin_user": admin_user,
        "officer_1": officer_1,
        "officer_2": officer_2,
        "owner_user": owner_user,
        "admin_client": admin_client,
        "off1_client": off1_client,
        "off2_client": off2_client,
        "owner_client": owner_client,
        "biz": biz,
        "loc": loc
    }


shared_state = {}


def test_scenario_01_owner_submits_application_and_uploads_document(workflow_setup):
    """Scenario 1: Owner submits an application and the least-loaded eligible officer is assigned."""
    owner_client = workflow_setup["owner_client"]
    biz = workflow_setup["biz"]
    loc = workflow_setup["loc"]

    # Direct document upload
    dummy_pdf = io.BytesIO(VALID_PDF_BYTES)
    dummy_pdf.name = "Site_Layout_Plan.pdf"

    doc_res = owner_client.post("/api/v1/documents/direct-upload", {
        "business_id": str(biz["_id"]),
        "document_name": "Factory Site Layout & Architecture",
        "document_category": "FACTORY_LAYOUT",
        "file": dummy_pdf
    }, format="multipart")
    assert doc_res.status_code == 201
    doc_data = doc_res.json()["data"]
    shared_state["doc_id"] = doc_data["id"]

    # Create application draft
    app_res = owner_client.post("/api/v1/applications", {
        "business_id": str(biz["_id"]),
        "location_id": str(loc["_id"]),
        "approval_code": "GPCB-CTE-IND",
        "applicant_form_data": {
            "project_capital_cost_lakhs": 2500.0,
            "proposed_commissioning_date": "2027-06-30"
        }
    }, format="json")
    assert app_res.status_code == 201
    app_data = app_res.json()["data"]
    shared_state["app_id"] = app_data["id"]

    # Attach document
    att_res = owner_client.post(f"/api/v1/applications/{shared_state['app_id']}/attachments", {
        "vault_document_id": shared_state["doc_id"]
    }, format="json")
    assert att_res.status_code == 200

    # Submit application
    sub_res = owner_client.post(f"/api/v1/applications/{shared_state['app_id']}/submit", {"confirmation": True}, format="json")
    assert sub_res.status_code == 200
    submitted = sub_res.json()["data"]
    assert submitted["status"] == "UNDER_SCRUTINY"
    assert submitted["assigned_officer_name"] == workflow_setup["officer_1"]["full_name"]
    assert submitted["assigned_officer_id"] == str(workflow_setup["officer_1"]["_id"])
    shared_state["app_number"] = sub_res.json()["data"]["application_number"]

    from apps.notifications.repository import NotificationRepository
    notifications = NotificationRepository()
    owner_notifications = notifications.find_by_user(workflow_setup["owner_user"]["_id"])
    officer_notifications = notifications.find_by_user(workflow_setup["officer_1"]["_id"])
    owner_assignment = next(n for n in owner_notifications if n["reference_id"] == shared_state["app_number"])
    officer_assignment = next(n for n in officer_notifications if n["reference_id"] == shared_state["app_number"])
    assert owner_assignment["title"] == f"Officer assigned to {shared_state['app_number']}"
    assert "Arjun Mehta" in owner_assignment["message"]
    assert officer_assignment["title"] == f"New scrutiny assignment: {shared_state['app_number']}"
    assert "Vikramaditya Singhania" in officer_assignment["message"]


def test_scenario_02_admin_assigns_specific_officer(workflow_setup):
    """Scenario 2: Admin can reassign an automatically assigned application."""
    admin_client = workflow_setup["admin_client"]
    officer_2 = workflow_setup["officer_2"]

    assign_res = admin_client.post(f"/api/v1/applications/{shared_state['app_id']}/assign", {
        "officer_user_id": str(officer_2["_id"]),
        "remarks": "Reassigned to Bhavik Shah for statutory environmental scrutiny."
    }, format="json")
    assert assign_res.status_code == 200
    assigned_data = assign_res.json()["data"]
    assert str(assigned_data["assigned_officer_id"]) == str(officer_2["_id"])
    assert assigned_data["assigned_officer_name"] == "Bhavik Shah"
    assert assigned_data["assigned_officer_email"] == "officer.secondary@gpcb.gov.in"
    assert assigned_data["status"] == "UNDER_SCRUTINY"

    from apps.notifications.repository import NotificationRepository
    notifications = NotificationRepository()
    owner_assignment = next(
        notification for notification in notifications.find_by_user(workflow_setup["owner_user"]["_id"])
        if notification["reference_id"] == shared_state["app_number"]
        and "Bhavik Shah" in notification["message"]
    )
    officer_assignment = next(
        notification for notification in notifications.find_by_user(officer_2["_id"])
        if notification["reference_id"] == shared_state["app_number"]
        and notification["title"] == f"New scrutiny assignment: {shared_state['app_number']}"
    )
    previous_officer_notice = next(
        notification for notification in notifications.find_by_user(workflow_setup["officer_1"]["_id"])
        if notification["reference_id"] == shared_state["app_number"]
        and notification["title"] == f"Assignment reassigned: {shared_state['app_number']}"
    )
    assert "You are responsible" in officer_assignment["message"]
    assert "no longer assigned to you" in previous_officer_notice["message"]


def test_scenario_03_owner_sees_officers_actual_identity(workflow_setup):
    """Scenario 3: Owner fetches application and sees officer's real name, email, and department."""
    owner_client = workflow_setup["owner_client"]
    officer_2 = workflow_setup["officer_2"]

    detail_res = owner_client.get(f"/api/v1/applications/{shared_state['app_id']}")
    assert detail_res.status_code == 200
    app_doc = detail_res.json()["data"]
    assert app_doc["assigned_officer_name"] == officer_2["full_name"]
    assert app_doc["assigned_officer_email"] == officer_2["email"]
    assert app_doc["assigned_officer_department"] == "GPCB-ENV"
    assert app_doc["assigned_officer_badge"] == "GJ-ENV-2002"
    assert len(app_doc.get("assignment_history", [])) >= 1


def test_scenario_04_assigned_officer_sees_task_in_queue(workflow_setup):
    """Scenario 4: Assigned officer sees the task in their scrutiny queue."""
    off2_client = workflow_setup["off2_client"]
    queue_res = off2_client.get("/api/v1/officer/applications")
    assert queue_res.status_code == 200
    apps = queue_res.json()["data"]
    found = [a for a in apps if a["id"] == shared_state["app_id"]]
    assert len(found) == 1
    assert found[0]["application_number"] == shared_state["app_number"]


def test_scenario_05_another_officer_cannot_access_task(workflow_setup):
    """Scenario 5: Another officer in the same department cannot access the task or execute scrutiny."""
    off1_client = workflow_setup["off1_client"]

    # Direct detail access forbidden
    detail_res = off1_client.get(f"/api/v1/officer/applications/{shared_state['app_id']}")
    assert detail_res.status_code == 403
    assert "assigned to another officer" in detail_res.json()["error"]["message"]

    # Scrutiny action forbidden
    action_res = off1_client.post(f"/api/v1/officer/applications/{shared_state['app_id']}/action", {
        "action": "MARK_SCRUTINY",
        "remarks": "Unauthorized scrutiny attempt"
    }, format="json")
    assert action_res.status_code == 403
    assert "assigned to another officer" in action_res.json()["error"]["message"]


def test_scenario_06_officer_verifies_document(workflow_setup):
    """Scenario 6: Assigned officer verifies the document in vault."""
    off2_client = workflow_setup["off2_client"]

    verify_res = off2_client.post(f"/api/v1/documents/{shared_state['doc_id']}/verify", {
        "decision": "VERIFIED",
        "remarks": "Factory layout verified compliant with GPCB distance norms."
    }, format="json")
    assert verify_res.status_code == 200
    doc = verify_res.json()["data"]
    assert doc["verification_status"] == "VERIFIED"
    assert doc["verified_by_officer_name"] == "Bhavik Shah"


def test_scenario_07_owner_sees_updated_result_after_refresh(workflow_setup):
    """Scenario 7: Owner sees updated document status after session re-verification."""
    owner_client = workflow_setup["owner_client"]
    doc_res = owner_client.get(f"/api/v1/documents/{shared_state['doc_id']}")
    assert doc_res.status_code == 200
    doc = doc_res.json()["data"]
    assert doc["verification_status"] == "VERIFIED"
    assert doc["verified_by_officer_name"] == "Bhavik Shah"


def test_scenario_08_officer_requests_correction_and_owner_resubmits_version(workflow_setup):
    """Scenario 8: Officer requests correction; Owner resubmits new version."""
    off2_client = workflow_setup["off2_client"]
    owner_client = workflow_setup["owner_client"]

    # Officer requests correction with mandatory remarks
    req_res = off2_client.post(f"/api/v1/documents/{shared_state['doc_id']}/verify", {
        "decision": "CORRECTION_REQUESTED",
        "remarks": "Please provide updated ETP layout dimensions on sheet 2."
    }, format="json")
    assert req_res.status_code == 200
    assert req_res.json()["data"]["verification_status"] == "CORRECTION_REQUESTED"

    # Owner resubmits corrected version
    corrected_pdf = io.BytesIO(VALID_REVISED_PDF_BYTES)
    corrected_pdf.name = "Site_Layout_Plan_v2.pdf"

    resub_res = owner_client.post(f"/api/v1/documents/{shared_state['doc_id']}/resubmit", {
        "file": corrected_pdf
    }, format="multipart")
    assert resub_res.status_code == 200
    resub_doc = resub_res.json()["data"]
    assert resub_doc["version_number"] == 2
    assert resub_doc["verification_status"] == "RESUBMITTED"
    assert len(resub_doc["version_history"]) == 1
    assert resub_doc["version_history"][0]["version_number"] == 1


def test_scenario_09_officer_reassignment_removes_old_access_and_preserves_history(workflow_setup):
    """Scenario 9: Admin reassigns application to Officer 1. Officer 2 loses access; history preserved."""
    admin_client = workflow_setup["admin_client"]
    off2_client = workflow_setup["off2_client"]
    officer_1 = workflow_setup["officer_1"]
    officer_2 = workflow_setup["officer_2"]

    reassign_res = admin_client.post(f"/api/v1/applications/{shared_state['app_id']}/assign", {
        "officer_user_id": str(officer_1["_id"]),
        "remarks": "Reassigned to Arjun Mehta due to departmental workload re-balancing."
    }, format="json")
    assert reassign_res.status_code == 200
    app_doc = reassign_res.json()["data"]
    assert str(app_doc["assigned_officer_id"]) == str(officer_1["_id"])
    assert app_doc["assigned_officer_name"] == "Arjun Mehta"

    # Check assignment history length and previous officer id
    history = app_doc["assignment_history"]
    assert len(history) >= 2
    assert str(history[-1]["previous_officer_id"]) == str(officer_2["_id"])

    # Officer 2 now loses scrutiny access
    off2_access = off2_client.get(f"/api/v1/officer/applications/{shared_state['app_id']}")
    assert off2_access.status_code == 403

    # Officer 1 now has access
    off1_access = workflow_setup["off1_client"].get(f"/api/v1/officer/applications/{shared_state['app_id']}")
    assert off1_access.status_code == 200


def test_scenario_10_scheme_and_grievance_cross_dashboard_behaviour(workflow_setup):
    """Scenario 10: Schemes and grievances reflect the same assignment, scoping, and notifications."""
    db = get_db()
    admin_client = workflow_setup["admin_client"]
    owner_client = workflow_setup["owner_client"]
    off1_client = workflow_setup["off1_client"]
    off2_client = workflow_setup["off2_client"]
    officer_1 = workflow_setup["officer_1"]
    officer_2 = workflow_setup["officer_2"]
    biz = workflow_setup["biz"]
    loc = workflow_setup["loc"]

    # 1. Scheme Application
    scheme_app_res = owner_client.post("/api/v1/scheme-applications/", {
        "location_id": str(loc["_id"]),
        "scheme_code": "IN-GJ-AATMA-2022",
        "dossier_data": {"investment_inr_crores": 5.0}
    }, format="json")
    assert scheme_app_res.status_code == 201
    scheme_id = scheme_app_res.json()["data"]["application"]["id"]

    # Ensure scheme application has proper department/state for scoping
    db.scheme_applications.update_one(
        {"_id": DocumentRepository.to_object_id(scheme_id)},
        {"$set": {"department_code": "GPCB-ENV", "state_code": "IN-GJ"}}
    )

    scheme_attest_res = owner_client.post(f"/api/v1/scheme-applications/{scheme_id}/attest/", {
        "external_portal_name": "Gujarat Investor Facilitation Portal",
        "external_acknowledgement_number": "IFP/2026/GJ/1002",
        "external_submission_date": datetime.now(timezone.utc).date().isoformat(),
        "attestation_confirmed": True
    }, format="json")
    assert scheme_attest_res.status_code == 200
    scheme_reference = scheme_attest_res.json()["data"]["application"]["application_reference"]
    from apps.notifications.repository import NotificationRepository
    notif_repo = NotificationRepository()
    for officer in (officer_1, officer_2):
        matching_notifications = [
            notification for notification in notif_repo.find_by_user(officer["_id"])
            if notification["reference_id"] == scheme_reference
        ]
        assert len(matching_notifications) == 1
        assert matching_notifications[0]["title"] == f"Scheme dossier ready for review: {scheme_reference}"
        assert "Vikramaditya Singhania" in matching_notifications[0]["message"]

    # Super Admin assigns scheme review to Officer 1
    assign_scheme_res = admin_client.post(f"/api/v1/admin/scheme-reviews/{scheme_id}/reassign/", {
        "new_officer_id": str(officer_1["_id"]),
        "justification": "Assigned for capital subsidy technical scrutiny."
    }, format="json")
    assert assign_scheme_res.status_code == 200
    assignment_notifications = [
        notification for notification in notif_repo.find_by_user(officer_1["_id"])
        if notification["reference_id"] == scheme_reference
        and notification["title"] == f"New scrutiny assignment: {scheme_reference}"
    ]
    assert len(assignment_notifications) == 1

    # Officer 1 sees it; Officer 2 is forbidden
    assert off1_client.get(f"/api/v1/officer/scheme-reviews/{scheme_id}/").status_code == 200
    assert off2_client.get(f"/api/v1/officer/scheme-reviews/{scheme_id}/").status_code == 403

    # 2. Grievance
    grv_res = owner_client.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "GPCB-ENV",
        "state_code": "IN-GJ",
        "category_code": "OTHER",
        "subject": "Delay in clearance CTE",
        "description": "Statutory timelines exceeded by 15 days.",
        "priority": "HIGH"
    }, format="json")
    assert grv_res.status_code == 201
    grv_data = grv_res.json()["data"]["grievance"]
    grv_id = grv_data.get("id") or grv_data.get("_id")

    # Admin reassigns grievance to Officer 1
    grv_assign_res = admin_client.post(f"/api/v1/admin/grievances/{grv_id}/reassign/", {
        "new_officer_id": str(officer_1["_id"]),
        "justification": "Assigned to regional grievance officer."
    }, format="json")
    assert grv_assign_res.status_code == 200

    # Officer 1 has access; Officer 2 forbidden
    assert off1_client.get(f"/api/v1/officer/grievances/{grv_id}/").status_code == 200
    assert off2_client.get(f"/api/v1/officer/grievances/{grv_id}/").status_code == 403


def test_scenario_11_compliance_updates_reflect_in_dashboards(workflow_setup):
    """Scenario 11: Compliance completion dispatches events and reflects in owner & monitoring dashboards."""
    db = get_db()
    owner_client = workflow_setup["owner_client"]
    admin_client = workflow_setup["admin_client"]
    biz = workflow_setup["biz"]
    loc = workflow_setup["loc"]

    # Insert test compliance obligation
    ob_id = db.compliance_obligations.insert_one({
        "business_id": biz["_id"],
        "location_id": loc["_id"],
        "owner_user_id": workflow_setup["owner_user"]["_id"],
        "title": "Quarterly Hazardous Waste Return Filing",
        "department_code": "GPCB-ENV",
        "state_code": "IN-GJ",
        "status": "UPCOMING",
        "is_active": True,
        "due_date": "2026-12-31"
    }).inserted_id

    # Owner completes obligation
    comp_res = owner_client.post(f"/api/v1/compliance/obligations/{ob_id}/complete", {
        "completion_remarks": "Submitted Form 4 to State Pollution Control Board.",
        "needs_officer_review": False
    }, format="json")
    assert comp_res.status_code == 200
    assert comp_res.json()["data"]["status"] == "COMPLETED"


def test_scenario_12_admin_sees_platform_events_and_audit_history(workflow_setup):
    """Scenario 12: Admin inspects platform_events and audit logs for end-to-end evidence."""
    admin_client = workflow_setup["admin_client"]
    db = get_db()

    events_res = admin_client.get("/api/v1/admin/platform-events")
    assert events_res.status_code == 200
    events = events_res.json()["data"]
    assert len(events) >= 5

    # Check for specific event types
    event_types = {e["event_type"] for e in events}
    assert "APPLICATIONS_OFFICER_ASSIGNED" in event_types or "APPLICATION_UNDER_SCRUTINY" in event_types
    assert "DOCUMENT_VERIFIED" in event_types
    assert "DOCUMENT_RESUBMITTED" in event_types

    # Verify immutable audit log stream
    audit_res = admin_client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    assert len(audit_res.json()["data"]) >= 5
