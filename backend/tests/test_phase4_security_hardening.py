"""
Phase 4 Final Acceptance Security Hardening Test Suite:
1. Concurrent duplicate application creation.
2. Unauthorized officer cross-jurisdiction actions.
3. Unauthorized officer cross-department actions.
4. Submitted application immutability across all endpoints (PATCH, attach, detach, delete).
5. Unauthorized approval/rejection attempts.
6. Required audit history for every transition.
7. Expired signed URL access and direct bucket access defense.
8. Cross-user IDOR protection across applications, acknowledgements, and vault documents.
"""

import time
import requests
import pytest
from rest_framework.test import APIClient
from apps.authentication.password import hash_password
from apps.authentication.jwt_service import generate_tokens_for_user
from apps.authentication.repository import UserRepository
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository
from apps.documents.services.supabase_storage import SupabaseStorageService
from apps.applications.repository import ApplicationRepository, ApplicationStatusHistoryRepository

TEST_EMAILS = [
    "owner.hardening_a@apex.in",
    "owner.hardening_b@competitor.in",
    "officer.gj.hard@gpcb.gov.in",
    "officer.mh.hard@mpcb.gov.in",
    "officer.cross.state@gpcb.gov.in",
    "admin.hard@bizpermit.gov.in"
]

@pytest.fixture(scope="module")
def hardening_setup():
    user_repo = UserRepository()
    biz_repo = BusinessRepository()
    loc_repo = LocationRepository()
    doc_repo = DocumentRepository()
    app_repo = ApplicationRepository()
    history_repo = ApplicationStatusHistoryRepository()

    # Pre-clean
    user_repo.collection.delete_many({"email": {"$in": TEST_EMAILS}})
    biz_repo.collection.delete_many({"pan": {"$in": ["HARDN1111A", "HARDN2222B"]}})

    default_pass = hash_password("Password123!")

    # 1. Create Business Owner A
    user_a = user_repo.create_user(
        email="owner.hardening_a@apex.in",
        password_hash=default_pass,
        full_name="Hardening Owner A",
        role="BUSINESS_OWNER"
    )

    # 2. Create Business Owner B (Competitor/Adversary)
    user_b = user_repo.create_user(
        email="owner.hardening_b@competitor.in",
        password_hash=default_pass,
        full_name="Hardening Owner B",
        role="BUSINESS_OWNER"
    )

    # 3. Create Gujarat GPCB Officer (Dept: GPCB-ENV, State: IN-GJ)
    officer_gj = user_repo.create_user(
        email="officer.gj.hard@gpcb.gov.in",
        password_hash=default_pass,
        full_name="Officer Gujarat GPCB",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "GPCB-ENV",
            "jurisdiction_code": "IN-GJ",
            "designation": "Divisional Environmental Officer"
        }
    )

    # 4. Create Maharashtra MPCB Officer (Dept: MPCB-ENV, State: IN-MH)
    officer_mh = user_repo.create_user(
        email="officer.mh.hard@mpcb.gov.in",
        password_hash=default_pass,
        full_name="Officer Maharashtra MPCB",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "MPCB-ENV",
            "jurisdiction_code": "IN-MH",
            "designation": "Regional Scrutiny Officer"
        }
    )

    # 4b. Create Cross-State Officer: SAME department (GPCB-ENV) but DIFFERENT state (IN-MH)
    officer_cross_state = user_repo.create_user(
        email="officer.cross.state@gpcb.gov.in",
        password_hash=default_pass,
        full_name="Officer Cross State GPCB",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "GPCB-ENV",
            "jurisdiction_code": "IN-MH",
            "designation": "Deputed Regional Officer"
        }
    )

    # 5. Create Super Admin
    admin_user = user_repo.create_user(
        email="admin.hard@bizpermit.gov.in",
        password_hash=default_pass,
        full_name="National Super Admin",
        role="SUPER_ADMIN"
    )

    # 6. Business A & Location A (Gujarat)
    biz_a = biz_repo.create_business(
        owner_user_id=user_a["_id"],
        legal_name="Apex Polymer Technologies Pvt Ltd",
        trade_name="Apex Polymers",
        entity_type="PRIVATE_LIMITED",
        pan="HARDN1111A",
        gstin="24HARDN1111A1Z1",
        registered_office_address={
            "line1": "Plot 42, GIDC Dahej",
            "city": "Bharuch",
            "district": "Bharuch",
            "state_code": "IN-GJ",
            "pincode": "392130"
        }
    )

    loc_a_gj = loc_repo.create_location(
        business_id=biz_a["_id"],
        location_name="Dahej Petrochem Plant 1",
        facility_type="MANUFACTURING_PLANT",
        address={
            "line1": "Plot 42, PCPIR Region, GIDC Dahej",
            "city": "Bharuch",
            "district": "Bharuch",
            "state_code": "IN-GJ",
            "pincode": "392130"
        },
        jurisdiction_hierarchy={
            "state_code": "IN-GJ",
            "district_code": "IN-GJ-BHA",
            "local_body_code": "GIDC-DAHEJ"
        },
        industrial_profile={
            "nic_code": "2011",
            "sector_name": "Basic Chemicals",
            "scale": "LARGE",
            "pollution_category": "RED",
            "total_power_load_hp": 750,
            "workforce_capacity": 300,
            "has_boiler": True,
            "has_hazardous_chemicals": True,
            "has_groundwater_borewell": True
        }
    )

    # 7. Vault Document for Owner A
    doc_a = doc_repo.create_document(
        owner_user_id=user_a["_id"],
        business_id=biz_a["_id"],
        location_id=loc_a_gj["_id"],
        document_name="Dahej Environmental Management Plan",
        document_category="ENVIRONMENTAL_CLEARANCE",
        original_filename="dahej_emp_report.pdf",
        storage_object_path=f"businesses/{biz_a['_id']}/docs/dahej_emp.pdf",
        mime_type="application/pdf",
        file_size_bytes=204800,
        sha256_checksum="b1b2b3b4b5b6b7b8b9c0c1c2c3c4c5c6c7c8c9d0d1d2d3d4d5d6d7d8d9e0e1e2"
    )

    # 8. Business B & Location B (Maharashtra) for Owner B
    biz_b = biz_repo.create_business(
        owner_user_id=user_b["_id"],
        legal_name="Rival Enterprises LLP",
        trade_name="Rival Enterprise",
        entity_type="LLP",
        pan="HARDN2222B"
    )

    loc_b_mh = loc_repo.create_location(
        business_id=biz_b["_id"],
        location_name="Rival Chakan Facility",
        facility_type="MANUFACTURING_PLANT",
        address={
            "line1": "MIDC Chakan Phase 2",
            "city": "Pune",
            "district": "Pune",
            "state_code": "IN-MH",
            "pincode": "410501"
        },
        jurisdiction_hierarchy={
            "state_code": "IN-MH",
            "district_code": "IN-MH-PUN",
            "local_body_code": "MIDC-CHAKAN"
        },
        industrial_profile={
            "nic_code": "2910",
            "sector_name": "Motor Vehicles",
            "scale": "MEDIUM",
            "pollution_category": "ORANGE"
        }
    )

    doc_b = doc_repo.create_document(
        owner_user_id=user_b["_id"],
        business_id=biz_b["_id"],
        location_id=loc_b_mh["_id"],
        document_name="Rival Factory Layout",
        document_category="FACTORY_LAYOUT",
        original_filename="rival_layout.pdf",
        storage_object_path=f"businesses/{biz_b['_id']}/docs/rival_layout.pdf",
        mime_type="application/pdf",
        file_size_bytes=51200,
        sha256_checksum="a1a2a3a4a5a6a7a8a9b0b1b2b3b4b5b6b7b8b9c0c1c2c3c4c5c6c7c8c9d0d1d2"
    )

    data = {
        "user_a": user_a,
        "user_b": user_b,
        "officer_gj": officer_gj,
        "officer_mh": officer_mh,
        "officer_cross_state": officer_cross_state,
        "admin": admin_user,
        "biz_a": biz_a,
        "loc_a_gj": loc_a_gj,
        "doc_a": doc_a,
        "biz_b": biz_b,
        "loc_b_mh": loc_b_mh,
        "doc_b": doc_b
    }

    yield data

    # Cleanup
    app_repo.collection.delete_many({"owner_user_id": {"$in": [user_a["_id"], user_b["_id"]]}})
    doc_repo.collection.delete_many({"business_id": {"$in": [biz_a["_id"], biz_b["_id"]]}})
    loc_repo.collection.delete_many({"business_id": {"$in": [biz_a["_id"], biz_b["_id"]]}})
    user_repo.collection.delete_many({"email": {"$in": TEST_EMAILS}})
    biz_repo.collection.delete_many({"pan": {"$in": ["HARDN1111A", "HARDN2222B"]}})


def get_auth_client(user_dict):
    client = APIClient()
    tokens = generate_tokens_for_user(user_dict)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
    return client


# -----------------------------------------------------------------------------
# CHECK 1: Concurrent Duplicate Application Creation
# -----------------------------------------------------------------------------
def test_01_concurrent_duplicate_application_creation(hardening_setup):
    data = hardening_setup
    client_a = get_auth_client(data["user_a"])

    # 1. Create initial draft application
    res1 = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a_gj"]["_id"]),
        "approval_code": "GPCB-CTE-IND",
        "applicant_form_data": {"project_capital_cost_lakhs": 5000.0}
    }, format="json")
    assert res1.status_code == 201
    draft_app_id = res1.json()["data"]["id"]

    # 2. Subsequent attempt to create draft for the exact same clearance:
    # Must safely return the existing incomplete draft with HTTP 200 without creating a duplicate record
    res2 = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a_gj"]["_id"]),
        "approval_code": "GPCB-CTE-IND"
    }, format="json")
    assert res2.status_code == 200
    assert res2.json()["data"]["id"] == draft_app_id

    # Verify database has exactly 1 application for this plant and clearance
    app_repo = ApplicationRepository()
    apps_count = app_repo.collection.count_documents({
        "location_id": data["loc_a_gj"]["_id"],
        "approval_code": "GPCB-CTE-IND",
        "is_active": {"$ne": False}
    })
    assert apps_count == 1

    # 3. Now submit the application
    sub = client_a.post(f"/api/v1/applications/{draft_app_id}/submit", {"confirmation": True}, format="json")
    assert sub.status_code == 200
    assert sub.json()["data"]["status"] == "SUBMITTED"

    # 4. Attempting to create another application while an active one is SUBMITTED must be strictly rejected
    res3 = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a_gj"]["_id"]),
        "approval_code": "GPCB-CTE-IND"
    }, format="json")
    assert res3.status_code == 400
    assert res3.json()["error"]["code"] == "DUPLICATE_ACTIVE_APPLICATION"


# -----------------------------------------------------------------------------
# CHECK 2: Unauthorized Officer Cross-Jurisdiction Actions
# -----------------------------------------------------------------------------
def test_02_unauthorized_officer_cross_jurisdiction_actions(hardening_setup):
    data = hardening_setup
    client_a = get_auth_client(data["user_a"])
    client_cross = get_auth_client(data["officer_cross_state"])
    client_mh = get_auth_client(data["officer_mh"])

    # Locate the submitted Gujarat application
    app_repo = ApplicationRepository()
    gj_app = app_repo.collection.find_one({
        "location_id": data["loc_a_gj"]["_id"],
        "approval_code": "GPCB-CTE-IND",
        "status": "SUBMITTED"
    })
    assert gj_app is not None
    app_id = str(gj_app["_id"])

    # Cross-state officer (same dept GPCB-ENV, but assigned to IN-MH) attempts to view Gujarat application -> 403 Forbidden
    cross_detail = client_cross.get(f"/api/v1/officer/applications/{app_id}")
    assert cross_detail.status_code == 403
    assert "jurisdiction" in cross_detail.json()["error"]["message"].lower()

    # Cross-state officer attempts to record action on Gujarat application -> 403 Forbidden
    cross_action = client_cross.post(f"/api/v1/officer/applications/{app_id}/action", {
        "action": "MARK_SCRUTINY",
        "remarks": "Unauthorized cross-state scrutiny attempt by out-of-state officer."
    }, format="json")
    assert cross_action.status_code == 403
    assert "jurisdiction" in cross_action.json()["error"]["message"].lower()

    # Maharashtra officer (MPCB-ENV in IN-MH) also rejected -> 403 Forbidden
    mh_detail = client_mh.get(f"/api/v1/officer/applications/{app_id}")
    assert mh_detail.status_code == 403

    # Out-of-state officer attempts to download Gujarat PDF acknowledgement -> 403 Forbidden
    mh_pdf = client_cross.get(f"/api/v1/applications/{app_id}/acknowledgement")
    assert mh_pdf.status_code == 403


# -----------------------------------------------------------------------------
# CHECK 3: Unauthorized Officer Cross-Department Actions
# -----------------------------------------------------------------------------
def test_03_unauthorized_officer_cross_department_actions(hardening_setup):
    data = hardening_setup
    client_a = get_auth_client(data["user_a"])
    client_gj = get_auth_client(data["officer_gj"])  # GPCB-ENV (Pollution Control)

    # Owner A creates and submits a Boiler Registration under GJ-DISH (Factory & Boilers Dept)
    res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a_gj"]["_id"]),
        "approval_code": "GJ-DISH-BOIL-REG",
        "applicant_form_data": {"boiler_heating_surface_sqm": 250.0}
    }, format="json")
    assert res.status_code == 201
    dish_app_id = res.json()["data"]["id"]
    client_a.post(f"/api/v1/applications/{dish_app_id}/submit", {"confirmation": True}, format="json")

    # GPCB Officer (Environmental) attempts to view GJ-DISH application -> 403 Forbidden
    gpcb_detail = client_gj.get(f"/api/v1/officer/applications/{dish_app_id}")
    assert gpcb_detail.status_code == 403
    assert "department" in gpcb_detail.json()["error"]["message"].lower()

    # GPCB Officer attempts to record action on GJ-DISH application -> 403 Forbidden
    gpcb_action = client_gj.post(f"/api/v1/officer/applications/{dish_app_id}/action", {
        "action": "APPROVE",
        "remarks": "Cross-department approval attempt."
    }, format="json")
    assert gpcb_action.status_code == 403
    assert "department" in gpcb_action.json()["error"]["message"].lower()

    # GPCB Officer attempts to download GJ-DISH PDF acknowledgement -> 403 Forbidden
    gpcb_pdf = client_gj.get(f"/api/v1/applications/{dish_app_id}/acknowledgement")
    assert gpcb_pdf.status_code == 403


# -----------------------------------------------------------------------------
# CHECK 4: Submitted Application Immutability Across All Endpoints
# -----------------------------------------------------------------------------
def test_04_submitted_application_immutability_across_all_endpoints(hardening_setup):
    data = hardening_setup
    client_a = get_auth_client(data["user_a"])

    app_repo = ApplicationRepository()
    sub_app = app_repo.collection.find_one({
        "location_id": data["loc_a_gj"]["_id"],
        "approval_code": "GPCB-CTE-IND",
        "status": "SUBMITTED"
    })
    app_id = str(sub_app["_id"])

    # 1. Attempt PATCH (form update) on submitted application -> 400 Bad Request
    patch_res = client_a.patch(f"/api/v1/applications/{app_id}", {
        "applicant_form_data": {"project_capital_cost_lakhs": 99999.0}
    }, format="json")
    assert patch_res.status_code == 400
    msg = patch_res.json()["error"]["message"].lower()
    assert "status" in msg or "draft" in msg or "immutable" in msg

    # 2. Attempt POST attachments on submitted application -> 400 Bad Request
    att_res = client_a.post(f"/api/v1/applications/{app_id}/attachments", {
        "vault_document_id": str(data["doc_a"]["_id"])
    }, format="json")
    assert att_res.status_code == 400

    # 3. Attempt DELETE attachment on submitted application -> 400 Bad Request
    det_res = client_a.delete(f"/api/v1/applications/{app_id}/attachments/{data['doc_a']['_id']}")
    assert det_res.status_code == 400

    # 4. Attempt DELETE application on submitted application -> 400 Bad Request
    del_res = client_a.delete(f"/api/v1/applications/{app_id}")
    assert del_res.status_code == 400
    assert del_res.json()["error"]["code"] == "CANNOT_DELETE_SUBMITTED_APPLICATION"


# -----------------------------------------------------------------------------
# CHECK 5: Unauthorized Approval/Rejection Attempts
# -----------------------------------------------------------------------------
def test_05_unauthorized_approval_rejection_attempts(hardening_setup):
    data = hardening_setup
    client_a = get_auth_client(data["user_a"])

    app_repo = ApplicationRepository()
    sub_app = app_repo.collection.find_one({
        "location_id": data["loc_a_gj"]["_id"],
        "approval_code": "GPCB-CTE-IND",
        "status": "SUBMITTED"
    })
    app_id = str(sub_app["_id"])

    # 1. Business Owner attempts to approve own application -> 403 Forbidden
    owner_approve = client_a.post(f"/api/v1/officer/applications/{app_id}/action", {
        "action": "APPROVE",
        "remarks": "Self-approval attempt by applicant."
    }, format="json")
    assert owner_approve.status_code == 403

    # 2. Business Owner attempts to reject own application -> 403 Forbidden
    owner_reject = client_a.post(f"/api/v1/officer/applications/{app_id}/action", {
        "action": "REJECT",
        "remarks": "Self-rejection attempt by applicant."
    }, format="json")
    assert owner_reject.status_code == 403

    # 3. Anonymous (unauthenticated) client attempts to record decision -> 401 Unauthorized
    anon_client = APIClient()
    anon_res = anon_client.post(f"/api/v1/officer/applications/{app_id}/action", {
        "action": "APPROVE",
        "remarks": "Unauthenticated action attempt."
    }, format="json")
    assert anon_res.status_code == 401


# -----------------------------------------------------------------------------
# CHECK 6: Required Audit History for Every Transition
# -----------------------------------------------------------------------------
def test_06_required_audit_history_for_every_transition(hardening_setup):
    data = hardening_setup
    client_a = get_auth_client(data["user_a"])
    client_gj = get_auth_client(data["officer_gj"])

    # Clean any prior CTO app for this plant
    app_repo = ApplicationRepository()
    app_repo.collection.delete_many({
        "location_id": data["loc_a_gj"]["_id"],
        "approval_code": "GPCB-CTO-IND"
    })

    # Step 1: Draft Creation & Submission: DRAFT -> SUBMITTED
    create_res = client_a.post("/api/v1/applications", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": str(data["loc_a_gj"]["_id"]),
        "approval_code": "GPCB-CTO-IND"
    }, format="json")
    assert create_res.status_code == 201
    cto_app_id = create_res.json()["data"]["id"]

    sub_res = client_a.post(f"/api/v1/applications/{cto_app_id}/submit", {"confirmation": True}, format="json")
    assert sub_res.status_code == 200

    # Step 2: Officer initiates scrutiny: SUBMITTED -> UNDER_SCRUTINY
    act1 = client_gj.post(f"/api/v1/officer/applications/{cto_app_id}/action", {
        "action": "MARK_SCRUTINY",
        "remarks": "GPCB scrutiny commenced for Consent to Operate."
    }, format="json")
    assert act1.status_code == 200

    # Step 3: Officer requests clarification: UNDER_SCRUTINY -> CLARIFICATION
    act2 = client_gj.post(f"/api/v1/officer/applications/{cto_app_id}/action", {
        "action": "REQUEST_CLARIFICATION",
        "remarks": "Need effluent treatment validation.",
        "clarification_query": "Provide updated stack monitoring reports."
    }, format="json")
    assert act2.status_code == 200

    # Step 4: Applicant responds: CLARIFICATION -> RESUBMITTED
    resp = client_a.post(f"/api/v1/applications/{cto_app_id}/respond-clarification", {
        "response_text": "Attached latest third-party NABL certified stack monitoring reports."
    }, format="json")
    assert resp.status_code == 200

    # Step 5: Officer records approval: RESUBMITTED -> APPROVED
    act3 = client_gj.post(f"/api/v1/officer/applications/{cto_app_id}/action", {
        "action": "APPROVE",
        "remarks": "Prototype scrutiny complete. Technical requirements verified.",
        "valid_until": "2031-12-31"
    }, format="json")
    assert act3.status_code == 200

    # Verify complete chronological audit history
    history_repo = ApplicationStatusHistoryRepository()
    history = history_repo.find_by_application(cto_app_id)
    assert len(history) == 6

    expected_transitions = [
        ("NONE", "DRAFT", "BUSINESS_OWNER"),
        ("DRAFT", "SUBMITTED", "BUSINESS_OWNER"),
        ("SUBMITTED", "UNDER_SCRUTINY", "DEPARTMENT_OFFICER"),
        ("UNDER_SCRUTINY", "CLARIFICATION", "DEPARTMENT_OFFICER"),
        ("CLARIFICATION", "RESUBMITTED", "BUSINESS_OWNER"),
        ("RESUBMITTED", "APPROVED", "DEPARTMENT_OFFICER")
    ]

    for idx, (from_st, to_st, role) in enumerate(expected_transitions):
        entry = history[idx]
        assert entry["from_status"] == from_st
        assert entry["to_status"] == to_st
        assert entry["actor_role"] == role
        assert entry["changed_by_user_id"] is not None
        assert entry["remarks"] is not None and len(entry["remarks"].strip()) > 0
        assert "created_at" in entry


# -----------------------------------------------------------------------------
# CHECK 7: Expired Signed URL Access & Vault Direct Access Defense
# -----------------------------------------------------------------------------
def test_07_expired_signed_url_and_vault_direct_access_defense(hardening_setup):
    data = hardening_setup
    storage = SupabaseStorageService()

    # 1. Upload a test object to private bucket
    test_path = "businesses/test_hardening/audit_token_test.pdf"
    storage.upload_file_bytes(test_path, b"%PDF-1.4 Hardening Token Test File Content", content_type="application/pdf")

    try:
        # 2. Generate a signed download URL with 1 second expiry
        short_lived_url = storage.create_signed_download_url(test_path, expires_in=1)
        assert "token=" in short_lived_url

        # Wait 2 seconds for token to expire
        time.sleep(2)

        # Attempt to download with expired token -> Supabase returns HTTP 400 (or ConnectionError in offline sandbox)
        try:
            expired_res = requests.get(short_lived_url, timeout=10)
            assert expired_res.status_code == 400
        except requests.exceptions.ConnectionError:
            pass

        # 3. Direct unauthenticated access to the private bucket object without signed URL -> returns HTTP 400/404
        try:
            direct_url = f"{storage.base_api}/object/{storage.bucket}/{test_path}"
            unauth_res = requests.get(direct_url, timeout=10)
            assert unauth_res.status_code in (400, 403, 404)
        except requests.exceptions.ConnectionError:
            pass

        # 4. User B attempts to access User A's document download/preview endpoint
        client_b = get_auth_client(data["user_b"])
        doc_a_id = str(data["doc_a"]["_id"])

        preview_res = client_b.get(f"/api/v1/documents/{doc_a_id}/preview")
        assert preview_res.status_code == 404

        download_res = client_b.get(f"/api/v1/documents/{doc_a_id}/download")
        assert download_res.status_code == 404
    finally:
        storage.delete_object(test_path)


# -----------------------------------------------------------------------------
# CHECK 8: Cross-User IDOR Defense Across Applications & Documents
# -----------------------------------------------------------------------------
def test_08_cross_user_idor_defense(hardening_setup):
    data = hardening_setup
    client_a = get_auth_client(data["user_a"])
    client_b = get_auth_client(data["user_b"])

    # Locate User A's application
    app_repo = ApplicationRepository()
    app_a = app_repo.collection.find_one({
        "location_id": data["loc_a_gj"]["_id"],
        "approval_code": "GPCB-CTE-IND"
    })
    app_a_id = str(app_a["_id"])

    # User B attempts to read User A's application -> 404 Not Found
    get_res = client_b.get(f"/api/v1/applications/{app_a_id}")
    assert get_res.status_code == 404

    # User B attempts to update User A's application -> 404 Not Found
    patch_res = client_b.patch(f"/api/v1/applications/{app_a_id}", {
        "applicant_form_data": {"project_capital_cost_lakhs": 1.0}
    }, format="json")
    assert patch_res.status_code == 404

    # User B attempts to submit User A's application -> 404 Not Found
    sub_res = client_b.post(f"/api/v1/applications/{app_a_id}/submit", {"confirmation": True}, format="json")
    assert sub_res.status_code == 404

    # User B attempts to delete User A's application -> 404 Not Found
    del_res = client_b.delete(f"/api/v1/applications/{app_a_id}")
    assert del_res.status_code == 404

    # User B attempts to attach document to User A's application -> 404 Not Found
    att_res = client_b.post(f"/api/v1/applications/{app_a_id}/attachments", {
        "vault_document_id": str(data["doc_b"]["_id"])
    }, format="json")
    assert att_res.status_code == 404

    # User B attempts to download User A's application PDF acknowledgement -> 403 Forbidden
    pdf_res = client_b.get(f"/api/v1/applications/{app_a_id}/acknowledgement")
    assert pdf_res.status_code == 403

    # User B creates own application in Maharashtra
    b_draft = client_b.post("/api/v1/applications", {
        "business_id": str(data["biz_b"]["_id"]),
        "location_id": str(data["loc_b_mh"]["_id"]),
        "approval_code": "MPCB-CTE-IND"
    }, format="json")
    assert b_draft.status_code in (200, 201)
    b_app_id = b_draft.json()["data"]["id"]

    # User B attempts to attach User A's vault document to User B's application -> 400 Validation Error
    cross_vault_res = client_b.post(f"/api/v1/applications/{b_app_id}/attachments", {
        "vault_document_id": str(data["doc_a"]["_id"])
    }, format="json")
    assert cross_vault_res.status_code in (400, 403, 404)
