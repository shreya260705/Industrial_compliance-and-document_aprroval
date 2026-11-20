"""
Phase 4 End-to-End Test Suite:
Application Preparation, Filing Lifecycle, Document Attachments, PDF Acknowledgements,
Officer Scrutiny Desk, Clarification Loops, and In-App Notifications.
"""

import pytest
from rest_framework.test import APIClient
from apps.authentication.password import hash_password
from apps.authentication.jwt_service import generate_tokens_for_user
from apps.authentication.repository import UserRepository
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository
from apps.applications.repository import ApplicationRepository

@pytest.fixture(scope="module")
def test_setup():
    user_repo = UserRepository()
    biz_repo = BusinessRepository()
    loc_repo = LocationRepository()
    doc_repo = DocumentRepository()
    app_repo = ApplicationRepository()

    TEST_EMAILS = [
        "owner.phase4a@testenterprise.in",
        "owner.phase4b@competitor.in",
        "officer.gj.p4@gpcb.gov.in",
        "officer.mh.p4@mpcb.gov.in",
        "officer.gj.dish.p4@gujarat.gov.in",
        "officer.mh.dish.p4@maharashtra.gov.in",
        "admin.phase4@bizpermit.gov.in"
    ]
    # Ensure master regulatory data exists
    from django.core.management import call_command
    from apps.approvals.repository import ApprovalCatalogueRepository
    if ApprovalCatalogueRepository().collection.count_documents({}) == 0:
        call_command('seed_national_data')

    # Pre-cleanup in case of previous run
    user_repo.collection.delete_many({"email": {"$in": TEST_EMAILS}})
    biz_repo.collection.delete_many({"pan": {"$in": ["ABCDE1111A", "BCDEF2222B"]}})

    default_pass = hash_password("Password123")

    # Create Owner A
    user_a = user_repo.create_user(
        email="owner.phase4a@testenterprise.in",
        password_hash=default_pass,
        full_name="Ananya Sharma",
        role="BUSINESS_OWNER"
    )

    # Create Owner B (for IDOR attack tests)
    user_b = user_repo.create_user(
        email="owner.phase4b@competitor.in",
        password_hash=default_pass,
        full_name="Bhavin Patel",
        role="BUSINESS_OWNER"
    )

    # Create Gujarat Officer
    officer_gj = user_repo.create_user(
        email="officer.gj.p4@gpcb.gov.in",
        password_hash=default_pass,
        full_name="Kiritbhai Solanki",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "GPCB-ENV",
            "jurisdiction_code": "IN-GJ",
            "designation": "Divisional Environmental Engineer"
        }
    )

    # Create Maharashtra Officer
    officer_mh = user_repo.create_user(
        email="officer.mh.p4@mpcb.gov.in",
        password_hash=default_pass,
        full_name="Pramod Jadhav",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "MPCB-ENV",
            "jurisdiction_code": "IN-MH",
            "designation": "Regional Scrutiny Officer"
        }
    )

    officer_gj_dish = user_repo.create_user(
        email="officer.gj.dish.p4@gujarat.gov.in",
        password_hash=default_pass,
        full_name="Gujarat Factory Safety Officer",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "GJ-DISH",
            "jurisdiction_code": "IN-GJ",
            "designation": "Factory & Boilers Scrutiny Officer"
        }
    )

    officer_mh_dish = user_repo.create_user(
        email="officer.mh.dish.p4@maharashtra.gov.in",
        password_hash=default_pass,
        full_name="Maharashtra Factory Safety Officer",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "GJ-DISH",
            "jurisdiction_code": "IN-MH",
            "designation": "Factory & Boilers Scrutiny Officer"
        }
    )

    # Create Super Admin
    admin_user = user_repo.create_user(
        email="admin.phase4@bizpermit.gov.in",
        password_hash=default_pass,
        full_name="Central Admin Lead",
        role="SUPER_ADMIN"
    )

    # Setup Business & Location for Owner A in Gujarat
    biz_a = biz_repo.create_business(
        owner_user_id=user_a["_id"],
        legal_name="Apex Speciality Synthetics Pvt Ltd",
        trade_name="Apex Synthetics",
        entity_type="PRIVATE_LIMITED",
        pan="ABCDE1111A",
        gstin="24ABCDE1111A1Z1",
        registered_office_address={
            "line1": "Plot 100, GIDC Sanand",
            "city": "Ahmedabad",
            "district": "Ahmedabad",
            "state_code": "IN-GJ",
            "pincode": "382170"
        }
    )

    loc_a = loc_repo.create_location(
        business_id=biz_a["_id"],
        location_name="Sanand Chemical Unit 1",
        facility_type="MANUFACTURING_PLANT",
        address={
            "line1": "Plot 100, Phase 2, GIDC Sanand",
            "city": "Ahmedabad",
            "district": "Ahmedabad",
            "state_code": "IN-GJ",
            "pincode": "382170"
        },
        jurisdiction_hierarchy={
            "state_code": "IN-GJ",
            "district_code": "IN-GJ-AHM",
            "local_body_code": "GIDC-SANAND"
        },
        industrial_profile={
            "nic_code": "2011",
            "sector_name": "Chemicals & Petrochemicals",
            "scale": "MEDIUM",
            "pollution_category": "RED",
            "total_power_load_hp": 300,
            "workforce_capacity": 150,
            "has_boiler": True,
            "has_hazardous_chemicals": True,
            "has_groundwater_borewell": True
        }
    )

    # Create Vault Document for Owner A
    doc_a = doc_repo.create_document(
        owner_user_id=user_a["_id"],
        business_id=biz_a["_id"],
        location_id=loc_a["_id"],
        document_name="Sanand Site Layout Blueprint",
        document_category="SITE_PLAN_LAYOUT",
        original_filename="sanand_site_layout.pdf",
        storage_object_path=f"businesses/{biz_a['_id']}/docs/test_site_plan.pdf",
        mime_type="application/pdf",
        file_size_bytes=102400,
        sha256_checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )

    # Setup Business for Owner B
    biz_b = biz_repo.create_business(
        owner_user_id=user_b["_id"],
        legal_name="Bhavin Trading LLP",
        trade_name="Bhavin Trading",
        entity_type="LLP",
        pan="BCDEF2222B"
    )

    data = {
        "user_a": user_a,
        "user_b": user_b,
        "officer_gj": officer_gj,
        "officer_mh": officer_mh,
        "officer_gj_dish": officer_gj_dish,
        "officer_mh_dish": officer_mh_dish,
        "admin": admin_user,
        "biz_a": biz_a,
        "loc_a": loc_a,
        "doc_a": doc_a,
        "biz_b": biz_b
    }

    yield data

    # Cleanup at end of module
    app_repo.collection.delete_many({"owner_user_id": {"$in": [user_a["_id"], user_b["_id"]]}})
    doc_repo.collection.delete_many({"business_id": {"$in": [biz_a["_id"], biz_b["_id"]]}})
    loc_repo.collection.delete_many({"business_id": {"$in": [biz_a["_id"], biz_b["_id"]]}})
    user_repo.collection.delete_many({"email": {"$in": TEST_EMAILS}})
    biz_repo.collection.delete_many({"pan": {"$in": ["ABCDE1111A", "BCDEF2222B"]}})


def get_auth_client(user_or_email, password="Password123"):
    client = APIClient()
    if isinstance(user_or_email, dict):
        user = user_or_email
    else:
        user = UserRepository().find_by_email(user_or_email)
    tokens = generate_tokens_for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
    return client


def test_01_draft_creation_and_form_prefill(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])

    res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "GPCB-CTE-IND",
        "applicant_form_data": {
            "project_capital_cost_lakhs": 2500.0,
            "proposed_commissioning_date": "2027-06-30"
        }
    }, format="json")

    assert res.status_code == 201
    body = res.json()["data"]
    assert body["status"] == "DRAFT"
    assert "BP-" in body["application_number"]
    assert "GPCB" in body["application_number"]
    assert body["approval_code"] == "GPCB-CTE-IND"
    assert body["state_code"] == "IN-GJ"
    assert body["applicant_form_data"]["enterprise_legal_name"] == "Apex Speciality Synthetics Pvt Ltd"
    assert body["applicant_form_data"]["project_capital_cost_lakhs"] == 2500.0


def test_02_draft_update_and_duplicate_prevention(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])

    # Create draft for CTO
    create_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "GPCB-CTO-IND"
    }, format="json")
    assert create_res.status_code == 201
    app_id = create_res.json()["data"]["id"]

    # Update draft form data
    patch_res = client_a.patch(f"/api/v1/applications/{app_id}", {
        "applicant_form_data": {
            "project_capital_cost_lakhs": 3200.0,
            "effluent_treatment_details": "Zero Liquid Discharge (ZLD) Multi-Stage RO"
        }
    }, format="json")
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["applicant_form_data"]["project_capital_cost_lakhs"] == 3200.0
    assert patch_res.json()["data"]["applicant_form_data"]["effluent_treatment_details"] == "Zero Liquid Discharge (ZLD) Multi-Stage RO"

    # Attempt to create duplicate active draft - returns existing draft gracefully
    dup_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "GPCB-CTO-IND"
    }, format="json")
    assert dup_res.status_code == 200
    assert dup_res.json()["data"]["id"] == app_id


def test_03_vault_document_attachment_and_ownership_defense(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])
    client_b = get_auth_client(data["user_b"]["email"])

    # Create draft for PESO
    create_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "PESO-LIC-CHEM"
    }, format="json")
    assert create_res.status_code == 201
    app_id = create_res.json()["data"]["id"]

    # Attach vault document
    att_res = client_a.post(f"/api/v1/applications/{app_id}/attachments", {
        "vault_document_id": str(data["doc_a"]["_id"])
    }, format="json")
    assert att_res.status_code == 200
    attachments = att_res.json()["data"]["attached_documents"]
    assert len(attachments) == 1
    assert attachments[0]["document_category"] == "SITE_PLAN_LAYOUT"

    # A document for another location in the same business cannot be attached.
    other_loc = LocationRepository().create_location(
        business_id=data["biz_a"]["_id"],
        location_name="Second Gujarat Unit",
        facility_type="MANUFACTURING_PLANT",
        address={"line1": "Plot 20, GIDC Ankleshwar", "city": "Ankleshwar", "district": "Bharuch", "state_code": "IN-GJ", "pincode": "393002"},
        jurisdiction_hierarchy={"state_code": "IN-GJ", "district_code": "IN-GJ-BHA", "local_body_code": "GIDC-ANKLESHWAR"},
        industrial_profile={"nic_code": "2011", "sector_name": "Chemicals", "scale": "MEDIUM", "pollution_category": "RED"}
    )
    other_loc_doc = DocumentRepository().create_document(
        owner_user_id=data["user_a"]["_id"],
        business_id=data["biz_a"]["_id"],
        location_id=other_loc["_id"],
        document_name="Second unit site plan",
        document_category="SITE_PLAN",
        original_filename="second_unit_site_plan.pdf",
        storage_object_path=f"businesses/{data['biz_a']['_id']}/docs/second_unit_site_plan.pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
        sha256_checksum="a" * 64
    )
    wrong_location_att = client_a.post(f"/api/v1/applications/{app_id}/attachments", {
        "vault_document_id": str(other_loc_doc["_id"])
    }, format="json")
    assert wrong_location_att.status_code == 400

    # User B attempts to attach User A's document to an application -> blocked
    loc_b = LocationRepository().create_location(
        business_id=data["biz_b"]["_id"],
        location_name="Unit B Pune",
        facility_type="WAREHOUSE",
        address={"line1": "MIDC Bhosari", "city": "Pune", "district": "Pune", "state_code": "IN-MH", "pincode": "411026"},
        jurisdiction_hierarchy={"state_code": "IN-MH", "district_code": "IN-MH-PUN", "local_body_code": "MIDC-BHOSARI"},
        industrial_profile={"nic_code": "5210", "sector_name": "Warehousing", "scale": "MICRO", "pollution_category": "WHITE"}
    )
    b_draft = client_b.post("/api/v1/applications", {
        "business_id": str(data["biz_b"]["_id"]),
        "location_id": str(loc_b["_id"]),
        "approval_code": "MPCB-CTE-IND"
    }, format="json")
    assert b_draft.status_code == 201
    b_app_id = b_draft.json()["data"]["id"]

    # User B tries to attach User A's vault document
    unauthorized_att = client_b.post(f"/api/v1/applications/{b_app_id}/attachments", {
        "vault_document_id": str(data["doc_a"]["_id"])
    }, format="json")
    assert unauthorized_att.status_code in (400, 403, 404)


def test_04_application_submission_and_immutability(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])

    create_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "GJ-DISH-BOIL-REG"
    }, format="json")
    assert create_res.status_code == 201
    app_id = create_res.json()["data"]["id"]

    # Attach document
    client_a.post(f"/api/v1/applications/{app_id}/attachments", {
        "vault_document_id": str(data["doc_a"]["_id"])
    }, format="json")

    # Submit without confirmation -> blocked
    bad_sub = client_a.post(f"/api/v1/applications/{app_id}/submit", {"confirmation": False}, format="json")
    assert bad_sub.status_code == 400

    # Submit with confirmation
    sub_res = client_a.post(f"/api/v1/applications/{app_id}/submit", {"confirmation": True}, format="json")
    assert sub_res.status_code == 200
    assert sub_res.json()["data"]["status"] == "SUBMITTED"
    assert sub_res.json()["data"]["submitted_at"] is not None
    from apps.notifications.repository import NotificationRepository
    notifications = NotificationRepository()
    assert notifications.count_by_user(data["officer_gj_dish"]["_id"]) > 0
    assert notifications.count_by_user(data["officer_mh_dish"]["_id"]) == 0

    # Post-submission edit must be blocked
    patch_after_sub = client_a.patch(f"/api/v1/applications/{app_id}", {
        "applicant_form_data": {"project_capital_cost_lakhs": 9999.0}
    }, format="json")
    assert patch_after_sub.status_code == 400


def test_05_pdf_acknowledgement_generation(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])

    create_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "GJ-DISH-FAC-LIC"
    }, format="json")
    assert create_res.status_code == 201
    app_id = create_res.json()["data"]["id"]

    # Submit
    client_a.post(f"/api/v1/applications/{app_id}/submit", {"confirmation": True}, format="json")

    # Request PDF acknowledgement
    pdf_res = client_a.get(f"/api/v1/applications/{app_id}/acknowledgement")
    assert pdf_res.status_code == 200
    assert pdf_res["Content-Type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")
    assert len(pdf_res.content) > 1000


def test_06_application_cross_user_idor_protection(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])
    client_b = get_auth_client(data["user_b"]["email"])

    create_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "CGWA-NOC-BORE"
    }, format="json")
    assert create_res.status_code == 201
    app_a_id = create_res.json()["data"]["id"]

    # User B attempts to read User A's application -> 404
    get_res = client_b.get(f"/api/v1/applications/{app_a_id}")
    assert get_res.status_code == 404

    # User B attempts to submit User A's application -> 404
    sub_res = client_b.post(f"/api/v1/applications/{app_a_id}/submit", {"confirmation": True}, format="json")
    assert sub_res.status_code in (403, 404)

    # User B attempts to delete User A's application -> 404
    del_res = client_b.delete(f"/api/v1/applications/{app_a_id}")
    assert del_res.status_code == 404


def test_07_officer_jurisdiction_scoping(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])
    client_gj = get_auth_client(data["officer_gj"]["email"])
    client_mh = get_auth_client(data["officer_mh"]["email"])

    # Create & submit Gujarat application for CTE Red
    app_repo = ApplicationRepository()
    # Ensure no active application for CTE Red before creating
    app_repo.collection.delete_many({
        "location_id": data["loc_a"]["_id"],
        "approval_code": "GPCB-CTE-IND"
    })

    create_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "GPCB-CTE-IND"
    }, format="json")
    assert create_res.status_code in (200, 201)
    app_id = create_res.json()["data"]["id"]
    client_a.post(f"/api/v1/applications/{app_id}/submit", {"confirmation": True}, format="json")

    # Gujarat Officer can see application in queue
    gj_queue = client_gj.get("/api/v1/officer/applications")
    assert gj_queue.status_code == 200
    app_ids = [a["id"] for a in gj_queue.json()["data"]]
    assert app_id in app_ids

    # Gujarat Officer can read application details
    gj_detail = client_gj.get(f"/api/v1/officer/applications/{app_id}")
    assert gj_detail.status_code == 200
    assert gj_detail.json()["data"]["approval_code"] == "GPCB-CTE-IND"

    # Maharashtra Officer attempts to read Gujarat application -> 403 Forbidden
    mh_detail = client_mh.get(f"/api/v1/officer/applications/{app_id}")
    assert mh_detail.status_code == 403


def test_08_full_officer_scrutiny_and_clarification_loop(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])
    client_gj = get_auth_client(data["officer_gj"]["email"])

    # Clean up any existing CTO Red for loc_a
    ApplicationRepository().collection.delete_many({
        "location_id": data["loc_a"]["_id"],
        "approval_code": "GPCB-CTO-IND"
    })

    # 1. Create & Submit Application
    create_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "GPCB-CTO-IND"
    }, format="json")
    assert create_res.status_code == 201
    app_id = create_res.json()["data"]["id"]
    sub = client_a.post(f"/api/v1/applications/{app_id}/submit", {"confirmation": True}, format="json")
    assert sub.status_code == 200

    # 2. Officer takes up for scrutiny: SUBMITTED -> UNDER_SCRUTINY
    act1 = client_gj.post(f"/api/v1/officer/applications/{app_id}/action", {
        "action": "MARK_SCRUTINY",
        "remarks": "Application accepted for technical review by GPCB Regional Officer."
    }, format="json")
    assert act1.status_code == 200
    assert act1.json()["data"]["status"] == "UNDER_SCRUTINY"

    # 3. Officer raises clarification: UNDER_SCRUTINY -> CLARIFICATION
    act2 = client_gj.post(f"/api/v1/officer/applications/{app_id}/action", {
        "action": "REQUEST_CLARIFICATION",
        "remarks": "Additional environmental management plan required.",
        "clarification_query": "Please provide detailed ZLD flow diagram and hazardous waste storage layout."
    }, format="json")
    assert act2.status_code == 200
    assert act2.json()["data"]["status"] == "CLARIFICATION"

    # 4. Applicant responds: CLARIFICATION -> RESUBMITTED
    resp = client_a.post(f"/api/v1/applications/{app_id}/respond-clarification", {
        "response_text": "ZLD flow diagram and hazardous storage plan attached. ZLD capacity 50 KLD."
    }, format="json")
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "RESUBMITTED"

    # 5. Officer approves: RESUBMITTED -> APPROVED
    act3 = client_gj.post(f"/api/v1/officer/applications/{app_id}/action", {
        "action": "APPROVE",
        "remarks": "Statutory requirements fulfilled. Consent to Operate (CTO) granted for 5 years.",
        "valid_until": "2031-12-31"
    }, format="json")
    assert act3.status_code == 200
    assert act3.json()["data"]["status"] == "APPROVED"
    assert act3.json()["data"]["decision_details"]["decision"] == "APPROVED"


def test_09_notifications_lifecycle(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])

    # Query notifications
    res = client_a.get("/api/v1/notifications")
    assert res.status_code == 200
    notifs = res.json()["data"]
    assert len(notifs) > 0

    first_notif_id = notifs[0]["id"]
    # Mark as read
    read_res = client_a.patch(f"/api/v1/notifications/{first_notif_id}/read")
    assert read_res.status_code == 200
    assert read_res.json()["data"]["is_read"] is True


def test_10_application_metrics_can_be_scoped_to_business(test_setup):
    data = test_setup
    client_a = get_auth_client(data["user_a"]["email"])

    create_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a"]["_id"]),
        "approval_code": "GPCB-CTE-IND",
        "applicant_form_data": {}
    }, format="json")
    assert create_res.status_code in (200, 201)

    metrics_a = client_a.get(
        "/api/v1/applications/metrics",
        {"business_id": str(data["biz_a"]["_id"])}
    )
    metrics_b = client_a.get(
        "/api/v1/applications/metrics",
        {"business_id": str(data["biz_b"]["_id"])}
    )

    assert metrics_a.status_code == 200
    assert metrics_a.json()["data"]["total"] >= 1
    assert metrics_b.status_code == 200
    assert metrics_b.json()["data"]["total"] == 0
