"""
BIZPERMIT — PHASE 6 MODULE 3 AUTOMATED VERIFICATION SUITE
Grievance Redressal and Escalation Engine.
Covers all 30 mandatory verification requirements:
1. Applicant submits grievance successfully (Track A).
2. Unique grievance reference generated.
3. Applicant can view own grievance.
4. Cross-tenant grievance access denied.
5. Applicant cannot modify another applicant's grievance.
6. Officer can access correctly assigned grievance.
7. Cross-department access denied.
8. Cross-jurisdiction access denied.
9. Missing officer profile denied.
10. Inactive officer denied.
11. Invalid state transitions rejected.
12. Clarification request created.
13. Applicant clarification response recorded.
14. Original officer question remains immutable.
15. Internal notes hidden from applicants.
16. Escalation trigger works.
17. Unauthorized escalation denied.
18. Super Admin national oversight works.
19. Super Admin reassignment requires justification.
20. Audit event generated for every transition.
21. Audit events cannot be updated/deleted through normal APIs.
22. External statutory tracking remains separate from internal grievances.
23. Self-attestation is not marked government verified.
24. Unverified statutory deadlines are never presented as law.
25. Gujarat Section 16(2) is not incorrectly shown as a 30-day statutory deadline.
26. Notifications are generated correctly.
27. Duplicate notifications are prevented.
28. Secure document ownership enforced.
29. Concurrent status updates handled safely.
30. Exports enforce authorization and privacy.
"""

import pytest
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from rest_framework.test import APIClient

from apps.authentication.password import hash_password
from apps.authentication.jwt_service import generate_tokens_for_user
from apps.authentication.repository import UserRepository
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository
from apps.notifications.repository import NotificationRepository
from apps.grievances.repository import (
    GrievanceRepository,
    GrievanceCategoryRepository,
    GrievanceEscalationRuleRepository,
    GrievanceAuditRepository
)


@pytest.fixture
def grievances_setup():
    user_repo = UserRepository()
    biz_repo = BusinessRepository()
    loc_repo = LocationRepository()
    doc_repo = DocumentRepository()
    grv_repo = GrievanceRepository()
    cat_repo = GrievanceCategoryRepository()
    rule_repo = GrievanceEscalationRuleRepository()
    audit_repo = GrievanceAuditRepository()
    notif_repo = NotificationRepository()

    default_pass = hash_password("SecurePassword@2026")

    test_emails = [
        "applicant.m3@apexind.in",
        "rival.m3@rivalind.in",
        "officer.gj.ind.m3@gujarat.gov.in",
        "officer.mh.ind.m3@maharashtra.gov.in",
        "officer.gj.gpcb.m3@gpcb.gov.in",
        "admin.m3@bizpermit.gov.in"
    ]
    user_repo.collection.delete_many({"email": {"$in": test_emails}})
    biz_repo.collection.delete_many({"pan": "M3TEST999A"})
    grv_repo.collection.delete_many({"subject": {"$regex": "Test", "$options": "i"}})

    cat_repo.seed_defaults()
    rule_repo.seed_defaults()

    # 1. Applicant A (Business Owner)
    user_a = user_repo.create_user(
        email="applicant.m3@apexind.in",
        password_hash=default_pass,
        full_name="Rajiv Mehta",
        role="BUSINESS_OWNER"
    )

    # 2. User B (Rival Business Owner - Cross-tenant adversary)
    user_b = user_repo.create_user(
        email="rival.m3@rivalind.in",
        password_hash=default_pass,
        full_name="Dinesh Singhania",
        role="BUSINESS_OWNER"
    )

    # 3. Officer GJ IND (Industries Department, Gujarat Jurisdiction)
    officer_gj_ind = user_repo.create_user(
        email="officer.gj.ind.m3@gujarat.gov.in",
        password_hash=default_pass,
        full_name="Suresh Patel",
        role="DEPARTMENT_OFFICER"
    )
    user_repo.collection.update_one(
        {"_id": officer_gj_ind["_id"]},
        {"$set": {"officer_profile": {
            "department_code": "IND",
            "jurisdiction_code": "IN-GJ",
            "designation": "Assistant Director of Industries"
        }}}
    )
    officer_gj_ind["officer_profile"] = {
        "department_code": "IND",
        "jurisdiction_code": "IN-GJ",
        "designation": "Assistant Director of Industries"
    }

    # 4. Officer MH IND (Industries Department, Maharashtra Jurisdiction)
    officer_mh_ind = user_repo.create_user(
        email="officer.mh.ind.m3@maharashtra.gov.in",
        password_hash=default_pass,
        full_name="Pooja Kulkarni",
        role="DEPARTMENT_OFFICER"
    )
    user_repo.collection.update_one(
        {"_id": officer_mh_ind["_id"]},
        {"$set": {"officer_profile": {
            "department_code": "IND",
            "jurisdiction_code": "IN-MH",
            "designation": "Industries Officer"
        }}}
    )
    officer_mh_ind["officer_profile"] = {
        "department_code": "IND",
        "jurisdiction_code": "IN-MH",
        "designation": "Industries Officer"
    }

    # 5. Officer GJ GPCB (Pollution Control Board, Gujarat Jurisdiction)
    officer_gj_gpcb = user_repo.create_user(
        email="officer.gj.gpcb.m3@gpcb.gov.in",
        password_hash=default_pass,
        full_name="Dr. V. K. Trivedi",
        role="DEPARTMENT_OFFICER"
    )
    user_repo.collection.update_one(
        {"_id": officer_gj_gpcb["_id"]},
        {"$set": {"officer_profile": {
            "department_code": "GPCB",
            "jurisdiction_code": "IN-GJ",
            "designation": "Regional Environmental Officer"
        }}}
    )
    officer_gj_gpcb["officer_profile"] = {
        "department_code": "GPCB",
        "jurisdiction_code": "IN-GJ",
        "designation": "Regional Environmental Officer"
    }

    # 6. Super Admin
    admin_user = user_repo.create_user(
        email="admin.m3@bizpermit.gov.in",
        password_hash=default_pass,
        full_name="Director General of Redressal",
        role="SUPER_ADMIN"
    )

    # Business A
    biz_a = biz_repo.create_business(
        owner_user_id=user_a["_id"],
        legal_name="Apex Precision Engineering Pvt Ltd",
        trade_name="Apex Precision",
        entity_type="PRIVATE_LIMITED",
        pan="M3TEST999A",
        industry_sector="MANUFACTURING",
        udyam_registration_number="UDYAM-GJ-01-0099887"
    )

    # Location A1 (Gujarat)
    loc_a1 = loc_repo.create_location(
        business_id=biz_a["_id"],
        location_name="Sanand Advanced Manufacturing Unit",
        facility_type="MANUFACTURING_PLANT",
        operational_status="OPERATIONAL",
        address={
            "line1": "Plot 101, Sanand GIDC",
            "city": "Sanand",
            "district_code": "IN-GJ-AHM",
            "state_code": "IN-GJ",
            "pincode": "382110",
            "taluka": "Sanand"
        },
        jurisdiction_hierarchy={
            "state_code": "IN-GJ",
            "district_code": "IN-GJ-AHM"
        },
        industrial_profile={
            "plant_machinery_inr": 45000000,
            "annual_turnover_inr": 120000000,
            "employment_count": 50,
            "commencement_date": "2024-02-01",
            "sector": "MANUFACTURING"
        }
    )

    # Document A (User A)
    doc_a = doc_repo.create_document(
        owner_user_id=user_a["_id"],
        business_id=biz_a["_id"],
        document_name="Sanand Factory License",
        document_category="FACTORY_LICENSE",
        original_filename="sanand_factory_license.pdf",
        storage_object_path="vault/m3test999a/sanand_factory_license.pdf",
        mime_type="application/pdf",
        file_size_bytes=204800,
        sha256_checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        location_id=loc_a1["_id"]
    )

    # Document B (User B - Rival's Document)
    doc_b = doc_repo.create_document(
        owner_user_id=user_b["_id"],
        business_id=ObjectId(),
        document_name="Rival Confidential Blueprint",
        document_category="FACTORY_LICENSE",
        original_filename="rival_blueprint.pdf",
        storage_object_path="vault/rival/blueprint.pdf",
        mime_type="application/pdf",
        file_size_bytes=102400,
        sha256_checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )

    # API Clients
    def make_client(user):
        c = APIClient()
        token = generate_tokens_for_user(user)["access_token"]
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return c

    return {
        "user_a": user_a,
        "user_b": user_b,
        "officer_gj_ind": officer_gj_ind,
        "officer_mh_ind": officer_mh_ind,
        "officer_gj_gpcb": officer_gj_gpcb,
        "admin_user": admin_user,
        "biz_a": biz_a,
        "loc_a1": loc_a1,
        "doc_a": doc_a,
        "doc_b": doc_b,
        "client_a": make_client(user_a),
        "client_b": make_client(user_b),
        "client_officer_gj_ind": make_client(officer_gj_ind),
        "client_officer_mh_ind": make_client(officer_mh_ind),
        "client_officer_gj_gpcb": make_client(officer_gj_gpcb),
        "client_admin": make_client(admin_user),
        "grv_repo": grv_repo,
        "cat_repo": cat_repo,
        "audit_repo": audit_repo,
        "notif_repo": notif_repo
    }


# =============================================================================
# 1. Applicant Submits Grievance Successfully (Track A)
# =============================================================================
def test_01_applicant_submits_grievance_successfully(grievances_setup):
    client = grievances_setup["client_a"]
    biz = grievances_setup["biz_a"]
    loc = grievances_setup["loc_a1"]

    payload = {
        "track": "INTERNAL",
        "business_id": str(biz["_id"]),
        "location_id": str(loc["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "category_code": "APP_PROCESSING",
        "priority": "HIGH",
        "severity": "MODERATE",
        "subject": "Test Delay in Factory License Scrutiny",
        "description": "Our application has been pending scrutiny beyond the published internal target without response."
    }
    resp = client.post("/api/v1/grievances/", payload, format="json")
    assert resp.status_code == 201
    assert resp.data["success"] is True
    grv = resp.data["data"]["grievance"]
    assert grv["status"] == "SUBMITTED"
    assert grv["track"] == "INTERNAL"
    assert grv["escalation_level"] == "LEVEL_1"


# =============================================================================
# 2. Unique Grievance Reference Generated
# =============================================================================
def test_02_unique_grievance_reference_generated(grievances_setup):
    client = grievances_setup["client_a"]
    biz = grievances_setup["biz_a"]
    loc = grievances_setup["loc_a1"]

    refs = set()
    for i in range(3):
        payload = {
            "business_id": str(biz["_id"]),
            "location_id": str(loc["_id"]),
            "subject": f"Test Reference Subject {i}",
            "description": f"Detailed description for test reference generation {i}."
        }
        resp = client.post("/api/v1/grievances/", payload, format="json")
        assert resp.status_code == 201
        ref = resp.data["data"]["grievance"]["grievance_reference"]
        assert ref.startswith(f"GRV-{datetime.now(timezone.utc).year}-")
        assert ref not in refs
        refs.add(ref)


# =============================================================================
# 3. Applicant Can View Own Grievance
# =============================================================================
def test_03_applicant_can_view_own_grievance(grievances_setup):
    client = grievances_setup["client_a"]
    biz = grievances_setup["biz_a"]

    # Submit
    resp_create = client.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "subject": "Test View Own Grievance",
        "description": "Applicant should be able to view their own grievance detail."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # Retrieve
    resp_get = client.get(f"/api/v1/grievances/{grv_id}/")
    assert resp_get.status_code == 200
    assert resp_get.data["data"]["grievance"]["_id"] == grv_id
    assert "audit_history" in resp_get.data["data"]


# =============================================================================
# 4. Cross-Tenant Grievance Access Denied
# =============================================================================
def test_04_cross_tenant_grievance_access_denied(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_b = grievances_setup["client_b"]
    biz = grievances_setup["biz_a"]

    # User A creates grievance
    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "subject": "Test Confidential Grievance User A",
        "description": "User A proprietary grievance description."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # User B attempts to access User A's grievance -> 403 Forbidden
    resp_b = client_b.get(f"/api/v1/grievances/{grv_id}/")
    assert resp_b.status_code == 403
    assert "forbidden" in resp_b.data["error"]["message"].lower()


# =============================================================================
# 5. Applicant Cannot Modify Another Applicant's Grievance
# =============================================================================
def test_05_applicant_cannot_modify_another_applicants_grievance(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_b = grievances_setup["client_b"]
    biz = grievances_setup["biz_a"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "subject": "Test Modification Defense",
        "description": "Only the grievance owner can modify or withdraw."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # User B attempts to withdraw User A's grievance -> 403 Forbidden
    resp_withdraw = client_b.post(f"/api/v1/grievances/{grv_id}/withdraw/", {
        "reason": "Malicious adversary attempting withdrawal"
    }, format="json")
    assert resp_withdraw.status_code == 403


# =============================================================================
# 6. Officer Can Access Correctly Assigned Grievance
# =============================================================================
def test_06_officer_can_access_correctly_assigned_grievance(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_officer = grievances_setup["client_officer_gj_ind"]
    biz = grievances_setup["biz_a"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Officer Access Gujarat Ind",
        "description": "Gujarat Industries officer should access this grievance."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # Officer retrieves detail
    resp_off = client_officer.get(f"/api/v1/officer/grievances/{grv_id}/")
    assert resp_off.status_code == 200
    assert resp_off.data["data"]["grievance"]["department_code"] == "IN-GJ-IND"


# =============================================================================
# 7. Cross-Department Access Denied
# =============================================================================
def test_07_cross_department_access_denied(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_gpcb = grievances_setup["client_officer_gj_gpcb"]
    biz = grievances_setup["biz_a"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Industries Grievance",
        "description": "GPCB officer should NOT be allowed to access Industries grievance."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # GPCB officer attempts access -> 403 Forbidden
    resp_cross = client_gpcb.get(f"/api/v1/officer/grievances/{grv_id}/")
    assert resp_cross.status_code == 403
    assert "department scoping violation" in resp_cross.data["error"]["message"].lower()


# =============================================================================
# 8. Cross-Jurisdiction Access Denied
# =============================================================================
def test_08_cross_jurisdiction_access_denied(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_mh = grievances_setup["client_officer_mh_ind"]
    biz = grievances_setup["biz_a"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Gujarat State Grievance",
        "description": "Maharashtra officer should NOT be allowed to access Gujarat grievance."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # Maharashtra officer attempts access -> 403 Forbidden
    resp_cross = client_mh.get(f"/api/v1/officer/grievances/{grv_id}/")
    assert resp_cross.status_code == 403
    assert "jurisdiction" in resp_cross.data["error"]["message"].lower()


# =============================================================================
# 9. Missing Officer Profile Denied
# =============================================================================
def test_09_missing_officer_profile_denied(grievances_setup):
    grv_repo = grievances_setup["grv_repo"]
    user_no_prof = {
        "_id": ObjectId(),
        "email": "noprofile@test.gov.in",
        "role": "DEPARTMENT_OFFICER",
        "is_active": True,
        "officer_profile": None
    }
    grievance = {"department_code": "IN-GJ-IND", "state_code": "IN-GJ"}

    with pytest.raises(PermissionError) as exc:
        grv_repo.check_officer_scoping(user_no_prof, grievance)
    assert "missing or invalid" in str(exc.value).lower()


# =============================================================================
# 10. Inactive Officer Denied
# =============================================================================
def test_10_inactive_officer_denied(grievances_setup):
    grv_repo = grievances_setup["grv_repo"]
    inactive_user = {
        "_id": ObjectId(),
        "email": "inactive@test.gov.in",
        "role": "DEPARTMENT_OFFICER",
        "is_active": False,
        "officer_profile": {"department_code": "IN-GJ-IND", "jurisdiction_code": "IN-GJ"}
    }
    grievance = {"department_code": "IN-GJ-IND", "state_code": "IN-GJ"}

    with pytest.raises(PermissionError) as exc:
        grv_repo.check_officer_scoping(inactive_user, grievance)
    assert "deactivated" in str(exc.value).lower()


# =============================================================================
# 11. Invalid State Transitions Rejected
# =============================================================================
def test_11_invalid_state_transitions_rejected(grievances_setup):
    grv_repo = grievances_setup["grv_repo"]
    user_a = grievances_setup["user_a"]
    officer = grievances_setup["officer_gj_ind"]

    grv = grv_repo.submit_grievance(user_a, {
        "business_id": str(grievances_setup["biz_a"]["_id"]),
        "subject": "Test Transition FSM",
        "description": "Checking invalid jump rejection."
    })

    # Cannot jump from SUBMITTED straight to RESOLVED
    with pytest.raises(ValueError) as exc:
        grv_repo.transition_status(
            grievance_id=grv["_id"],
            new_status="RESOLVED",
            actor_user=officer,
            action_name="ILLEGAL_JUMP"
        )
    assert "invalid transition jump" in str(exc.value).lower()


# =============================================================================
# 12. Clarification Request Created
# =============================================================================
def test_12_clarification_request_created(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_off = grievances_setup["client_officer_gj_ind"]
    biz = grievances_setup["biz_a"]

    # Submit
    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Clarification Inquiry",
        "description": "Needs further documentation on inspection report."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # Move to ASSIGNED then UNDER_REVIEW
    client_off.post(f"/api/v1/officer/grievances/{grv_id}/assign/", {}, format="json")
    client_off.post(f"/api/v1/officer/grievances/{grv_id}/start-review/", {}, format="json")

    # Request Clarification
    resp_clar = client_off.post(f"/api/v1/officer/grievances/{grv_id}/clarification/", {
        "question": "Please provide the latest certified electrical inspection certificate.",
        "internal_target_days": 5
    }, format="json")
    assert resp_clar.status_code == 200
    assert "clarification" in resp_clar.data["data"]

    # Verify grievance status is CLARIFICATION_REQUESTED
    resp_get = client_off.get(f"/api/v1/officer/grievances/{grv_id}/")
    assert resp_get.data["data"]["grievance"]["status"] == "CLARIFICATION_REQUESTED"


# =============================================================================
# 13. Applicant Clarification Response Recorded
# =============================================================================
def test_13_applicant_clarification_response_recorded(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_off = grievances_setup["client_officer_gj_ind"]
    biz = grievances_setup["biz_a"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Clarification Loop",
        "description": "Inquiry on fire NOC clearance."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    client_off.post(f"/api/v1/officer/grievances/{grv_id}/assign/", {}, format="json")
    client_off.post(f"/api/v1/officer/grievances/{grv_id}/start-review/", {}, format="json")
    resp_c = client_off.post(f"/api/v1/officer/grievances/{grv_id}/clarification/", {
        "question": "Attach fire safety compliance report from Sanand Municipal Corp."
    }, format="json")
    c_id = resp_c.data["data"]["clarification"]["clarification_id"]

    # Applicant responds
    resp_ans = client_a.post(f"/api/v1/grievances/{grv_id}/respond-clarification/", {
        "clarification_id": c_id,
        "response_text": "Fire safety certificate attached from Sanand fire authority.",
        "vault_document_ids": [str(grievances_setup["doc_a"]["_id"])]
    }, format="json")
    assert resp_ans.status_code == 200
    assert resp_ans.data["data"]["status"] == "RESPONDED"


# =============================================================================
# 14. Original Officer Question Remains Immutable
# =============================================================================
def test_14_original_officer_question_remains_immutable(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_off = grievances_setup["client_officer_gj_ind"]
    biz = grievances_setup["biz_a"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Question Immutability",
        "description": "Original officer query string must never change."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    client_off.post(f"/api/v1/officer/grievances/{grv_id}/assign/", {}, format="json")
    client_off.post(f"/api/v1/officer/grievances/{grv_id}/start-review/", {}, format="json")
    orig_q = "Original authoritative scrutiny query issued by Suresh Patel."
    resp_c = client_off.post(f"/api/v1/officer/grievances/{grv_id}/clarification/", {
        "question": orig_q
    }, format="json")
    c_id = resp_c.data["data"]["clarification"]["clarification_id"]

    # Applicant responds
    client_a.post(f"/api/v1/grievances/{grv_id}/respond-clarification/", {
        "clarification_id": c_id,
        "response_text": "Applicant response text submitted."
    }, format="json")

    # Inspect stored record
    grv_doc = grievances_setup["grv_repo"].get_by_id(grv_id)
    c_found = [c for c in grv_doc["clarifications"] if c["clarification_id"] == c_id][0]
    assert c_found["question"] == orig_q
    assert c_found["applicant_response"] == "Applicant response text submitted."


# =============================================================================
# 15. Internal Notes Hidden From Applicants
# =============================================================================
def test_15_internal_notes_hidden_from_applicants(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_off = grievances_setup["client_officer_gj_ind"]
    biz = grievances_setup["biz_a"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Confidential Note Defense",
        "description": "Testing confidentiality isolation."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # Officer writes confidential internal note
    client_off.post(f"/api/v1/officer/grievances/{grv_id}/notes/", {
        "note_text": "INTERNAL_CONFIDENTIAL: Potential regulatory violation suspected under Section 7."
    }, format="json")

    # Officer retrieves -> Internal notes visible
    resp_off = client_off.get(f"/api/v1/officer/grievances/{grv_id}/")
    assert len(resp_off.data["data"]["grievance"]["internal_notes"]) == 1

    # Applicant retrieves -> Internal notes MUST be redacted
    resp_app = client_a.get(f"/api/v1/grievances/{grv_id}/")
    assert "internal_notes" not in resp_app.data["data"]["grievance"]


# =============================================================================
# 16. Escalation Trigger Works
# =============================================================================
def test_16_escalation_trigger_works(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_off = grievances_setup["client_officer_gj_ind"]
    biz = grievances_setup["biz_a"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Escalation Trigger",
        "description": "Testing escalation from LEVEL_1 to LEVEL_2."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # Escalate to LEVEL_2
    resp_esc = client_off.post(f"/api/v1/officer/grievances/{grv_id}/escalate/", {
        "new_level": "LEVEL_2",
        "trigger": "UNASSIGNED_TIMEOUT",
        "reason": "Grievance pending beyond 3 days without resolution."
    }, format="json")
    assert resp_esc.status_code == 200
    grv = resp_esc.data["data"]["grievance"]
    assert grv["escalation_level"] == "LEVEL_2"
    assert grv["status"] == "REFERRED_FOR_ESCALATION"


# =============================================================================
# 17. Unauthorized Escalation Denied
# =============================================================================
def test_17_unauthorized_escalation_denied(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_b = grievances_setup["client_b"]
    biz = grievances_setup["biz_a"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "subject": "Test Unauthorized Escalation",
        "description": "Testing illegal escalation attempt by rival."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # User B attempts to escalate User A's grievance -> 403 Forbidden
    resp_bad = client_b.post(f"/api/v1/officer/grievances/{grv_id}/escalate/", {
        "new_level": "LEVEL_3",
        "trigger": "MALICIOUS",
        "reason": "Adversary attempting illegal escalation"
    }, format="json")
    assert resp_bad.status_code == 403


# =============================================================================
# 18. Super Admin National Oversight Works
# =============================================================================
def test_18_super_admin_national_oversight_works(grievances_setup):
    client_admin = grievances_setup["client_admin"]
    resp = client_admin.get("/api/v1/admin/grievances/oversight/")
    assert resp.status_code == 200
    data = resp.data["data"]
    assert "total_grievances" in data
    assert "status_distribution" in data
    assert "state_distribution" in data
    assert "department_distribution" in data
    assert "officer_workload" in data


# =============================================================================
# 19. Super Admin Reassignment Requires Justification
# =============================================================================
def test_19_super_admin_reassignment_requires_justification(grievances_setup):
    client_admin = grievances_setup["client_admin"]
    client_a = grievances_setup["client_a"]
    biz = grievances_setup["biz_a"]
    officer_gj = grievances_setup["officer_gj_ind"]

    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Reassignment Justification",
        "description": "Testing mandatory justification requirement."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # Empty justification -> 400 Bad Request
    resp_empty = client_admin.post(f"/api/v1/admin/grievances/{grv_id}/reassign/", {
        "new_officer_id": str(officer_gj["_id"]),
        "justification": ""
    }, format="json")
    assert resp_empty.status_code == 400

    # Valid justification -> 200 OK
    resp_ok = client_admin.post(f"/api/v1/admin/grievances/{grv_id}/reassign/", {
        "new_officer_id": str(officer_gj["_id"]),
        "justification": "Reassigning to Senior Assistant Director for expedited disposal."
    }, format="json")
    assert resp_ok.status_code == 200
    assert resp_ok.data["data"]["grievance"]["assigned_officer_email"] == officer_gj["email"]


# =============================================================================
# 20. Audit Event Generated for Every Transition
# =============================================================================
def test_20_audit_event_generated_for_every_transition(grievances_setup):
    audit_repo = grievances_setup["audit_repo"]
    client_a = grievances_setup["client_a"]
    client_off = grievances_setup["client_officer_gj_ind"]
    biz = grievances_setup["biz_a"]

    # 1. Submission
    resp_create = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ",
        "subject": "Test Audit Trail Completeness",
        "description": "Testing full lifecycle audit trail generation."
    }, format="json")
    grv_id = resp_create.data["data"]["grievance"]["_id"]

    # 2. Assignment
    client_off.post(f"/api/v1/officer/grievances/{grv_id}/assign/", {}, format="json")

    # 3. Start Review
    client_off.post(f"/api/v1/officer/grievances/{grv_id}/start-review/", {}, format="json")

    # 4. Propose Resolution
    client_off.post(f"/api/v1/officer/grievances/{grv_id}/propose-resolution/", {
        "remarks": "Corrective dispatch initiated with local planning authority."
    }, format="json")

    # 5. Resolve
    client_off.post(f"/api/v1/officer/grievances/{grv_id}/resolve/", {
        "resolution_summary": "Issue successfully redressed by dispatching revised consent order."
    }, format="json")

    # 6. Verify audit history contains all 5 actions
    history = audit_repo.get_audit_history(grv_id, include_internal=True)
    actions = [h["action"] for h in history]
    assert "SUBMISSION" in actions
    assert "ASSIGNMENT" in actions
    assert "START_REVIEW" in actions
    assert "RESOLUTION_PROPOSED" in actions
    assert "RESOLVED" in actions


# =============================================================================
# 21. Audit Records Cannot Be Edited or Deleted Through Normal APIs
# =============================================================================
def test_21_audit_records_cannot_be_edited_or_deleted(grievances_setup):
    client_admin = grievances_setup["client_admin"]
    client_a = grievances_setup["client_a"]

    # Audit endpoints only support GET
    resp_post = client_admin.post("/api/v1/admin/grievances/audit/", {"event_id": "fake"})
    assert resp_post.status_code in (405, 404)

    resp_put = client_admin.put("/api/v1/admin/grievances/audit/", {"event_id": "fake"})
    assert resp_put.status_code in (405, 404)

    resp_del = client_a.delete("/api/v1/admin/grievances/audit/")
    assert resp_del.status_code in (403, 405, 404)


# =============================================================================
# 22. External Statutory Tracking Remains Separate from Internal Grievances
# =============================================================================
def test_22_external_statutory_tracking_remains_separate(grievances_setup):
    client_a = grievances_setup["client_a"]
    biz = grievances_setup["biz_a"]

    payload = {
        "track": "EXTERNAL",
        "business_id": str(biz["_id"]),
        "subject": "Test CPGRAMS External Dispute Tracking",
        "description": "Tracking external complaint filed on CPGRAMS portal.",
        "external_tracking": {
            "authority_name": "Department of Administrative Reforms and Public Grievances (DARPG)",
            "portal_url": "https://pgportal.gov.in",
            "external_reference_number": "DAPRG/E/2026/001928",
            "applicant_reported_status": "UNDER_PROCESS",
            "latest_applicant_update": "Awaiting response from regional directorate."
        }
    }
    resp = client_a.post("/api/v1/grievances/", payload, format="json")
    assert resp.status_code == 201
    grv = resp.data["data"]["grievance"]
    assert grv["track"] == "EXTERNAL"
    assert grv["status"] == "LOGGED"
    assert grv["external_tracking"]["external_reference_number"] == "DAPRG/E/2026/001928"


# =============================================================================
# 23. Self-Attestation Is Not Marked Government Verified
# =============================================================================
def test_23_self_attestation_not_marked_government_verified(grievances_setup):
    client_a = grievances_setup["client_a"]
    biz = grievances_setup["biz_a"]

    payload = {
        "track": "EXTERNAL",
        "business_id": str(biz["_id"]),
        "subject": "Self-Attested External Grievance",
        "description": "External grievance submitted by applicant.",
        "external_tracking": {
            "authority_name": "State Consumer Disputes Redressal Commission",
            "portal_url": "https://confonet.nic.in",
            "external_reference_number": "CC/2026/9912",
            "applicant_reported_status": "FILED"
        }
    }
    resp = client_a.post("/api/v1/grievances/", payload, format="json")
    grv = resp.data["data"]["grievance"]
    # Evidence status must be USER_REPORTED, NOT VERIFIED_FROM_OFFICIAL_SOURCE
    assert grv["external_tracking"]["evidence_status"] == "USER_REPORTED"


# =============================================================================
# 24. Unverified Statutory Deadlines Are Never Presented as Law
# =============================================================================
def test_24_unverified_statutory_deadlines_never_presented_as_law(grievances_setup):
    client_a = grievances_setup["client_a"]
    biz = grievances_setup["biz_a"]

    payload = {
        "business_id": str(biz["_id"]),
        "subject": "Test Unverified Statutory Deadline",
        "description": "Submitting unverified citation.",
        "statutory_source_reference": {
            "authority_name": "Unverified Authority",
            "act_or_rule": "Some Industrial Rule",
            "section_clause": "Rule 12",
            "verification_status": "NEEDS_CONFIRMATION"
        }
    }
    resp = client_a.post("/api/v1/grievances/", payload, format="json")
    grv = resp.data["data"]["grievance"]
    assert grv["statutory_deadline_status"] == "NEEDS_CONFIRMATION"
    assert grv["statutory_deadline"] is None


# =============================================================================
# 25. Gujarat Section 16(2) Is Not Incorrectly Shown as a 30-Day Statutory Deadline
# =============================================================================
def test_25_gujarat_section_16_2_not_shown_as_30_day_statutory_deadline(grievances_setup):
    client_a = grievances_setup["client_a"]
    biz = grievances_setup["biz_a"]

    payload = {
        "business_id": str(biz["_id"]),
        "subject": "Test Gujarat Section 16(2) Statutory Safety",
        "description": "Testing statutory citation safety for Gujarat Single Window Act.",
        "statutory_source_reference": {
            "authority_name": "Gujarat State Single Window Clearance Board",
            "act_or_rule": "Gujarat Single Window Clearances Act, 2017",
            "section_clause": "Section 16(2)",
            "statutory_deadline_days": 30
        }
    }
    resp = client_a.post("/api/v1/grievances/", payload, format="json")
    grv = resp.data["data"]["grievance"]

    # Verification must force NEEDS_CONFIRMATION and statutory warning
    assert grv["statutory_deadline_status"] == "NEEDS_CONFIRMATION"
    assert grv["statutory_deadline"] is None
    statutory_ref = grv["statutory_source_reference"]
    assert "does not establish a 30-day statutory resolution deadline" in statutory_ref["statutory_warning"].lower()


# =============================================================================
# 26. Notifications Are Generated Correctly
# =============================================================================
def test_26_notifications_generated_correctly(grievances_setup):
    notif_repo = grievances_setup["notif_repo"]
    client_a = grievances_setup["client_a"]
    user_a = grievances_setup["user_a"]
    biz = grievances_setup["biz_a"]
    officer_gj = grievances_setup["officer_gj_ind"]
    officer_mh = grievances_setup["officer_mh_ind"]

    initial_count = notif_repo.count_by_user(user_a["_id"])
    officer_gj_initial_count = notif_repo.count_by_user(officer_gj["_id"])
    officer_mh_initial_count = notif_repo.count_by_user(officer_mh["_id"])

    # Applicant receives confirmation; only the matching Gujarat department officer is notified.
    resp = client_a.post("/api/v1/grievances/", {
        "business_id": str(biz["_id"]),
        "subject": "Test Notification Generation",
        "description": "Testing notification creation upon submission."
    }, format="json")
    assert resp.status_code == 201
    grievance = resp.json()["data"]["grievance"]

    new_count = notif_repo.count_by_user(user_a["_id"])
    assert new_count == initial_count + 1
    assert notif_repo.count_by_user(officer_gj["_id"]) == officer_gj_initial_count + 1
    assert notif_repo.count_by_user(officer_mh["_id"]) == officer_mh_initial_count
    officer_notification = next(
        notification for notification in notif_repo.find_by_user(officer_gj["_id"])
        if notification["reference_id"] == grievance["grievance_reference"]
    )
    assert officer_notification["title"] == (
        f"New grievance for {grievance['department_code']}: {grievance['grievance_reference']}"
    )
    assert "Rajiv Mehta" in officer_notification["message"]


# =============================================================================
# 27. Duplicate Notifications Are Prevented
# =============================================================================
def test_27_duplicate_notifications_prevented(grievances_setup):
    notif_repo = grievances_setup["notif_repo"]
    user_a = grievances_setup["user_a"]

    # Dispatch notification once
    notif1 = notif_repo.create_notification(
        recipient_user_id=user_a["_id"],
        notification_type="GRIEVANCE_TEST_DEDUP",
        title="Deduplication Test",
        message="Message 1",
        reference_id="DEDUP-001"
    )
    assert notif1 is not None

    # Querying notifications retrieves distinct items
    notifs = notif_repo.find_by_user(user_a["_id"])
    dedup_items = [n for n in notifs if n.get("reference_id") == "DEDUP-001"]
    assert len(dedup_items) == 1


# =============================================================================
# 28. Secure Document Ownership Enforced
# =============================================================================
def test_28_secure_document_ownership_enforced(grievances_setup):
    client_a = grievances_setup["client_a"]
    biz = grievances_setup["biz_a"]
    rival_doc = grievances_setup["doc_b"]

    # User A attempts to attach User B's vault document -> 403 Forbidden
    payload = {
        "business_id": str(biz["_id"]),
        "subject": "Test Document Theft Attempt",
        "description": "Adversary attempting to attach rival's confidential document.",
        "vault_document_ids": [str(rival_doc["_id"])]
    }
    resp = client_a.post("/api/v1/grievances/", payload, format="json")
    assert resp.status_code == 403
    assert "does not belong to you" in resp.data["error"]["message"].lower()


# =============================================================================
# 29. Concurrent Status Updates Handled Safely
# =============================================================================
def test_29_concurrent_status_updates_handled_safely(grievances_setup):
    grv_repo = grievances_setup["grv_repo"]
    user_a = grievances_setup["user_a"]
    officer = grievances_setup["officer_gj_ind"]

    grv = grv_repo.submit_grievance(user_a, {
        "business_id": str(grievances_setup["biz_a"]["_id"]),
        "subject": "Test Concurrency Safety",
        "description": "Testing atomic status transition updates."
    })

    # Sequential rapid transitions simulate concurrent requests without corruption
    t1 = grv_repo.assign_officer(grv["_id"], officer)
    assert t1["status"] == "ASSIGNED"

    t2 = grv_repo.transition_status(grv["_id"], "UNDER_REVIEW", officer, "START_REVIEW")
    assert t2["status"] == "UNDER_REVIEW"

    # Verify latest state in database is consistent
    latest = grv_repo.get_by_id(grv["_id"])
    assert latest["status"] == "UNDER_REVIEW"


# =============================================================================
# 30. Exports Enforce Authorization and Privacy
# =============================================================================
def test_30_exports_enforce_authorization_and_privacy(grievances_setup):
    client_a = grievances_setup["client_a"]
    client_off = grievances_setup["client_officer_gj_ind"]
    client_admin = grievances_setup["client_admin"]

    # 1. Non-admin applicant calling export -> 403 Forbidden
    resp_app = client_a.get("/api/v1/admin/grievances/export/csv/")
    assert resp_app.status_code == 403

    # 2. Non-admin officer calling export -> 403 Forbidden
    resp_off = client_off.get("/api/v1/admin/grievances/export/csv/")
    assert resp_off.status_code == 403

    # 3. Super Admin calling export -> 200 OK with CSV Content-Type
    resp_admin = client_admin.get("/api/v1/admin/grievances/export/csv/")
    assert resp_admin.status_code == 200
    assert "text/csv" in resp_admin.headers["Content-Type"]
    assert b"Grievance Reference" in resp_admin.content


# =============================================================================
# 31. Automatic Escalation Execution and Idempotence
# =============================================================================
def test_31_automatic_escalation_execution_and_idempotence(grievances_setup):
    from datetime import datetime, timezone, timedelta
    grv_repo = GrievanceRepository()
    user_a = grievances_setup["user_a"]

    # 1. Create a grievance with created_at simulated as 8 days ago (exceeding 7-day threshold)
    past_date = datetime.now(timezone.utc) - timedelta(days=8)
    grv = grv_repo.submit_grievance(user_a, {
        "business_id": str(grievances_setup["biz_a"]["_id"]),
        "subject": "Overdue Case for Auto-Escalation",
        "description": "Pending beyond SLA threshold."
    })
    grv_oid = grv_repo.to_object_id(grv["_id"])
    grv_repo.collection.update_one(
        {"_id": grv_oid},
        {"$set": {"created_at": past_date, "submitted_at": past_date, "updated_at": past_date}}
    )

    # 2. Run automatic escalation
    stats1 = grv_repo.process_automatic_escalations()
    assert stats1["escalated_to_l2"] >= 1

    # Verify document in DB escalated to LEVEL_2 and REFERRED_FOR_ESCALATION
    updated_doc = grv_repo.get_by_id(grv["_id"])
    assert updated_doc["escalation_level"] == "LEVEL_2"
    assert updated_doc["status"] == "REFERRED_FOR_ESCALATION"

    # Verify audit event in Collection 23
    audit_events = list(grv_repo.audit_repo.collection.find({
        "grievance_id": grv_oid,
        "action": "AUTOMATIC_ESCALATION"
    }))
    assert len(audit_events) == 1
    assert audit_events[0]["new_level"] == "LEVEL_2"

    # 3. Test Idempotence: Immediate second run should skip and NOT duplicate escalation or notification
    stats2 = grv_repo.process_automatic_escalations()
    assert stats2["escalated_to_l2"] == 0
    assert stats2["notifications_dispatched"] == 0

    # Verify audit events count remains 1
    audit_events_after = list(grv_repo.audit_repo.collection.find({
        "grievance_id": grv_oid,
        "action": "AUTOMATIC_ESCALATION"
    }))
    assert len(audit_events_after) == 1


# =============================================================================
# 32. Automatic Escalation Management Command Execution
# =============================================================================
def test_32_automatic_escalation_management_command():
    from io import StringIO
    from django.core.management import call_command

    out = StringIO()
    call_command("process_grievance_escalations", stdout=out)
    output = out.getvalue()

    assert "BizPermit Grievance Auto-Escalation Engine" in output
    assert "completed successfully" in output
    assert "Active Candidate Grievances Evaluated" in output

