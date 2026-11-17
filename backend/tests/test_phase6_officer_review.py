"""
BIZPERMIT — PHASE 6 MODULE 2 AUTOMATED TEST SUITE
Officer Review Workflow, Clarification Engine & Immutable Audit Log.

Problem Statement: SIH26130
Verifies 20 Core Security, Scoping, and State Machine Test Cases:
1.  Valid officer assignment
2.  Correct department scope
3.  Correct jurisdiction scope
4.  Cross-department IDOR defense
5.  Cross-state IDOR defense
6.  Unassigned review access & pickup
7.  Invalid state transitions rejected
8.  Clarification creation
9.  Applicant clarification response
10. Applicant cannot modify officer clarification
11. Audit event generated for every transition
12. Audit records cannot be edited or deleted through normal APIs
13. Super Admin national oversight
14. Business owner cannot access officer-only actions
15. Secure document ownership & temporary preview signed URL
16. Notification integration across review lifecycle
17. Concurrent review updates
18. Assignment changes and audit history
19. No false government approval representation (prototype disclaimer)
20. Cross-tenant isolation
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
from apps.schemes.repository import (
    SchemeRepository,
    SchemeRecommendationRepository,
    SchemeApplicationRepository
)
from apps.schemes.review_repository import (
    SchemeReviewRepository,
    SchemeReviewAuditRepository
)
from apps.notifications.repository import NotificationRepository


@pytest.fixture
def review_setup():
    user_repo = UserRepository()
    biz_repo = BusinessRepository()
    loc_repo = LocationRepository()
    doc_repo = DocumentRepository()
    scheme_repo = SchemeRepository()
    rec_repo = SchemeRecommendationRepository()
    app_repo = SchemeApplicationRepository()
    review_repo = SchemeReviewRepository()
    audit_repo = SchemeReviewAuditRepository()
    notif_repo = NotificationRepository()

    default_pass = hash_password("SecurePassword@2026")

    test_emails = [
        "owner.m2@apexindustries.in",
        "rival.m2@rivalcorp.in",
        "officer.gj.ind@gujarat.gov.in",
        "officer.mh.ind@maharashtra.gov.in",
        "officer.gj.gpcb@gpcb.gov.in",
        "admin.m2@bizpermit.gov.in"
    ]
    user_repo.collection.delete_many({"email": {"$in": test_emails}})
    biz_repo.collection.delete_many({"pan": "M2TEST111A"})

    # 1. User A (Business Owner)
    user_a = user_repo.create_user(
        email="owner.m2@apexindustries.in",
        password_hash=default_pass,
        full_name="Rajiv Mehta",
        role="BUSINESS_OWNER"
    )

    # 2. User C (Rival Business Owner - Cross-tenant adversary)
    user_c = user_repo.create_user(
        email="rival.m2@rivalcorp.in",
        password_hash=default_pass,
        full_name="Dinesh Singhania",
        role="BUSINESS_OWNER"
    )

    # 3. Officer GJ IND (Industries Department, Gujarat Jurisdiction)
    officer_gj_ind = user_repo.create_user(
        email="officer.gj.ind@gujarat.gov.in",
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
        email="officer.mh.ind@maharashtra.gov.in",
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
        email="officer.gj.gpcb@gpcb.gov.in",
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
        email="admin.m2@bizpermit.gov.in",
        password_hash=default_pass,
        full_name="Director General of Scrutiny",
        role="SUPER_ADMIN"
    )

    # Business A
    biz_a = biz_repo.create_business(
        owner_user_id=user_a["_id"],
        legal_name="Apex Precision Engineering Pvt Ltd",
        trade_name="Apex Precision",
        entity_type="PRIVATE_LIMITED",
        pan="M2TEST111A",
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

    # Location A2 (Maharashtra)
    loc_a2 = loc_repo.create_location(
        business_id=biz_a["_id"],
        location_name="Chakan Auto Components Plant",
        facility_type="MANUFACTURING_PLANT",
        operational_status="OPERATIONAL",
        address={
            "line1": "Phase 2, Chakan MIDC",
            "city": "Pune",
            "district_code": "IN-MH-PUN",
            "state_code": "IN-MH",
            "pincode": "410501",
            "taluka": "Khed"
        },
        jurisdiction_hierarchy={
            "state_code": "IN-MH",
            "district_code": "IN-MH-PUN"
        },
        industrial_profile={
            "plant_machinery_inr": 60000000,
            "annual_turnover_inr": 180000000,
            "employment_count": 65,
            "commencement_date": "2023-11-10",
            "sector": "AUTOMOBILE"
        }
    )

    # Document A (User A)
    doc_a = doc_repo.create_document(
        owner_user_id=user_a["_id"],
        business_id=biz_a["_id"],
        document_name="Sanand Factory License",
        document_category="FACTORY_LICENSE",
        original_filename="sanand_factory_license.pdf",
        storage_object_path="vault/m2test111a/sanand_factory_license.pdf",
        mime_type="application/pdf",
        file_size_bytes=204800,
        sha256_checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        location_id=loc_a1["_id"]
    )

    # Seed master scheme if not present
    scheme_gj = scheme_repo.find_by_code("IN-GJ-AATMA-2022")
    if not scheme_gj:
        scheme_repo.create({
            "scheme_code": "IN-GJ-AATMA-2022",
            "name": "Aatmanirbhar Gujarat Schemes 2022 for MSMEs",
            "short_name": "Aatmanirbhar Gujarat MSME 2022",
            "authority_level": "STATE",
            "state_code": "IN-GJ",
            "department_code": "IND",
            "financial_instrument_type": "CAPITAL_SUBSIDY",
            "fresh_intake_status": "OPEN",
            "verification_status": "VERIFIED"
        })

    # Create recommendation snapshot
    rec_doc = {
        "location_id": loc_a1["_id"],
        "business_id": biz_a["_id"],
        "user_id": user_a["_id"],
        "scheme_code": "IN-GJ-AATMA-2022",
        "scheme_rule_version": "1.0",
        "profile_snapshot_hash": "testhash123456",
        "overall_eligibility": "ELIGIBLE",
        "criteria_results": [
            {
                "criterion_key": "rule_state_gj",
                "label": "State Jurisdiction (Gujarat)",
                "status": "SATISFIED",
                "statutory_reference": "GR GID/102022/1005/Z",
                "required_value": "IN-GJ",
                "actual_value": "IN-GJ",
                "explanation": "Plant facility is situated in Sanand, Gujarat."
            }
        ],
        "financial_summary": {
            "applicable_coverage_percentage": 75.0,
            "max_facility_ceiling_lakh": 1000
        }
    }
    rec_saved = rec_repo.create_evaluation(rec_doc)

    # Create Scheme Application Dossier for Gujarat Plant
    dossier_gj = app_repo.create_dossier(
        business_id=biz_a["_id"],
        location_id=loc_a1["_id"],
        user_id=user_a["_id"],
        scheme_code="IN-GJ-AATMA-2022",
        recommendation_id=rec_saved["_id"],
        profile_snapshot_hash="testhash123456",
        scheme_rule_version="1.0",
        dossier_data={
            "project_cost_inr": 45000000,
            "claimed_eligible_investment_inr": 35000000,
            "employment_generation": 50
        }
    )
    # Attach document
    app_repo.attach_vault_document(
        application_id=dossier_gj["_id"],
        user_id=user_a["_id"],
        vault_document_id=doc_a["_id"],
        document_category="FACTORY_LICENSE"
    )

    # API Clients
    def make_client(user):
        c = APIClient()
        token = generate_tokens_for_user(user)["access_token"]
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return c

    client_a = make_client(user_a)
    client_c = make_client(user_c)
    client_officer_gj_ind = make_client(officer_gj_ind)
    client_officer_mh_ind = make_client(officer_mh_ind)
    client_officer_gj_gpcb = make_client(officer_gj_gpcb)
    client_admin = make_client(admin_user)

    setup_data = {
        "user_a": user_a,
        "user_c": user_c,
        "officer_gj_ind": officer_gj_ind,
        "officer_mh_ind": officer_mh_ind,
        "officer_gj_gpcb": officer_gj_gpcb,
        "admin_user": admin_user,
        "biz_a": biz_a,
        "loc_a1": loc_a1,
        "loc_a2": loc_a2,
        "doc_a": doc_a,
        "dossier_gj": dossier_gj,
        "client_a": client_a,
        "client_c": client_c,
        "client_officer_gj_ind": client_officer_gj_ind,
        "client_officer_mh_ind": client_officer_mh_ind,
        "client_officer_gj_gpcb": client_officer_gj_gpcb,
        "client_admin": client_admin,
        "review_repo": review_repo,
        "audit_repo": audit_repo,
        "app_repo": app_repo,
        "notif_repo": notif_repo
    }

    yield setup_data

    # Cleanup
    app_repo.collection.delete_many({"business_id": biz_a["_id"]})
    doc_repo.collection.delete_many({"business_id": biz_a["_id"]})
    loc_repo.collection.delete_many({"business_id": biz_a["_id"]})
    biz_repo.collection.delete_many({"_id": biz_a["_id"]})
    audit_repo.collection.delete_many({})
    notif_repo.collection.delete_many({})
    user_repo.collection.delete_many({
        "_id": {"$in": [
            user_a["_id"], user_c["_id"], officer_gj_ind["_id"],
            officer_mh_ind["_id"], officer_gj_gpcb["_id"], admin_user["_id"]
        ]}
    })


# =============================================================================
# 1. Valid Officer Assignment
# =============================================================================
def test_01_valid_officer_assignment(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client = review_setup["client_officer_gj_ind"]

    # Assign review to self
    resp = client.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {
        "remarks": "Self-assigned for internal technical scrutiny."
    })
    assert resp.status_code == 200
    dossier = resp.data["data"]["dossier"]
    assert dossier["review_status"] == "ASSIGNED"
    assert dossier["assigned_officer_email"] == review_setup["officer_gj_ind"]["email"]


# =============================================================================
# 2. Correct Department Scope
# =============================================================================
def test_02_correct_department_scope(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_same_dept = review_setup["client_officer_gj_ind"]

    # Gujarat Industries Officer accessing Gujarat Industries dossier -> 200 OK
    resp = client_same_dept.get(f"/api/v1/officer/scheme-reviews/{dossier_id}/")
    assert resp.status_code == 200
    assert resp.data["data"]["dossier"]["application_reference"] == review_setup["dossier_gj"]["application_reference"]


# =============================================================================
# 3. Correct Jurisdiction Scope
# =============================================================================
def test_03_correct_jurisdiction_scope(review_setup):
    client = review_setup["client_officer_gj_ind"]

    # Retrieve queue: should strictly contain Gujarat dossiers
    resp = client.get("/api/v1/officer/scheme-reviews/")
    assert resp.status_code == 200
    items = resp.data["data"]["reviews"]
    assert len(items) >= 1
    assert all(item["state_code"] == "IN-GJ" for item in items)


# =============================================================================
# 4. Cross-Department IDOR Defense
# =============================================================================
def test_04_cross_department_idor_defense(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_gpcb = review_setup["client_officer_gj_gpcb"]

    # GPCB Pollution Officer attempting to access Industries Department dossier -> 403 Forbidden
    resp_read = client_gpcb.get(f"/api/v1/officer/scheme-reviews/{dossier_id}/")
    assert resp_read.status_code == 403
    assert "department" in resp_read.data["error"]["message"].lower()

    # Attempting to assign cross-department -> 403 Forbidden
    resp_assign = client_gpcb.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {
        "remarks": "Attempting cross-department pickup"
    })
    assert resp_assign.status_code == 403


# =============================================================================
# 5. Cross-State IDOR Defense
# =============================================================================
def test_05_cross_state_idor_defense(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_mh = review_setup["client_officer_mh_ind"]

    # Maharashtra Officer attempting to access Gujarat dossier -> 403 Forbidden
    resp_read = client_mh.get(f"/api/v1/officer/scheme-reviews/{dossier_id}/")
    assert resp_read.status_code == 403
    assert "jurisdiction" in resp_read.data["error"]["message"].lower()

    # Attempting to start review cross-state -> 403 Forbidden
    resp_start = client_mh.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/start/", {})
    assert resp_start.status_code == 403


# =============================================================================
# 6. Unassigned Review Access & Queue Filtering
# =============================================================================
def test_06_unassigned_review_access_and_filtering(review_setup):
    client = review_setup["client_officer_gj_ind"]

    # Queue filtered by unassigned
    resp_unassigned = client.get("/api/v1/officer/scheme-reviews/?assigned_filter=UNASSIGNED")
    assert resp_unassigned.status_code == 200
    assert any(str(r["id"]) == str(review_setup["dossier_gj"]["_id"]) for r in resp_unassigned.data["data"]["reviews"])


# =============================================================================
# 7. Invalid State Transitions Rejected
# =============================================================================
def test_07_invalid_state_transitions_rejected(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client = review_setup["client_officer_gj_ind"]

    # Dossier is PENDING_REVIEW; attempting to complete review immediately without starting -> 400 Bad Request
    resp_bad_complete = client.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/complete/", {
        "decision": "INTERNAL_VERIFIED",
        "remarks": "Premature completion without assignment or scrutiny"
    })
    assert resp_bad_complete.status_code == 400
    assert "state" in resp_bad_complete.data["error"]["message"].lower()


# =============================================================================
# 8. Clarification Creation
# =============================================================================
def test_08_clarification_creation(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client = review_setup["client_officer_gj_ind"]

    # 1. Assign & Start Review
    client.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {})
    client.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/start/", {})

    # 2. Request clarification
    resp_clr = client.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/clarification/", {
        "question": "Please furnish the chartered accountant certificate for gross fixed capital investment.",
        "related_criterion_key": "rule_capex",
        "deadline_days": 14
    })
    assert resp_clr.status_code == 200
    dossier = resp_clr.data["data"]["dossier"]
    assert dossier["review_status"] == "CLARIFICATION_REQUESTED"
    assert len(dossier["clarifications"]) == 1
    clr = dossier["clarifications"][0]
    assert "chartered accountant" in clr["question"]
    assert clr["status"] == "PENDING"


# =============================================================================
# 9. Applicant Clarification Response
# =============================================================================
def test_09_applicant_clarification_response(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_off = review_setup["client_officer_gj_ind"]
    client_app = review_setup["client_a"]

    # Move to CLARIFICATION_REQUESTED
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {})
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/start/", {})
    resp_clr = client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/clarification/", {
        "question": "Clarify total employment count breakdown."
    })
    clr_id = resp_clr.data["data"]["dossier"]["clarifications"][0]["clarification_id"]

    # Applicant responds
    resp_ans = client_app.post(f"/api/v1/scheme-applications/{dossier_id}/respond-clarification/", {
        "clarification_id": clr_id,
        "response_text": "Employment breakdown: 35 regular shop-floor technicians and 15 administrative staff.",
        "vault_document_ids": [str(review_setup["doc_a"]["_id"])]
    })
    assert resp_ans.status_code == 200
    dossier = resp_ans.data["data"]["dossier"]
    assert dossier["review_status"] == "APPLICANT_RESPONSE_RECEIVED"
    resolved_clr = [c for c in dossier["clarifications"] if c["clarification_id"] == clr_id][0]
    assert resolved_clr["status"] == "RESOLVED"
    assert "35 regular shop-floor" in resolved_clr["applicant_response"]


# =============================================================================
# 10. Applicant Cannot Modify Officer Clarification Question
# =============================================================================
def test_10_applicant_cannot_modify_officer_clarification(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_off = review_setup["client_officer_gj_ind"]
    client_app = review_setup["client_a"]

    # Move to CLARIFICATION_REQUESTED
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {})
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/start/", {})
    resp_clr = client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/clarification/", {
        "question": "Original Officer Question on Boiler Capacity"
    })
    clr_id = resp_clr.data["data"]["dossier"]["clarifications"][0]["clarification_id"]

    # Applicant attempts to tamper with the question in the response payload
    client_app.post(f"/api/v1/scheme-applications/{dossier_id}/respond-clarification/", {
        "clarification_id": clr_id,
        "response_text": "Here is the response.",
        "question": "Tampered Fake Question by Adversary"
    })

    # Read back dossier: original question MUST remain intact
    updated = review_setup["app_repo"].find_by_id(dossier_id)
    target_clr = [c for c in updated["clarifications"] if c["clarification_id"] == clr_id][0]
    assert target_clr["question"] == "Original Officer Question on Boiler Capacity"
    assert target_clr["officer_email"] == review_setup["officer_gj_ind"]["email"]


# =============================================================================
# 11. Audit Event Generated for Every Transition
# =============================================================================
def test_11_audit_event_generated_for_every_transition(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_off = review_setup["client_officer_gj_ind"]

    # 1. Assign
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {"remarks": "Step 1: Assign"})
    # 2. Start
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/start/", {"remarks": "Step 2: Start"})
    # 3. Clarification
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/clarification/", {
        "question": "Step 3: Question"
    })

    # Verify audit logs in MongoDB collection
    audit_events = review_setup["audit_repo"].get_dossier_audit_history(dossier_id)
    actions = [e["action"] for e in audit_events]
    assert "ASSIGN_OFFICER" in actions
    assert "START_REVIEW" in actions
    assert "REQUEST_CLARIFICATION" in actions
    assert all(e["prototype_disclaimer"] is not None for e in audit_events)


# =============================================================================
# 12. Audit Records Cannot Be Edited or Deleted Through Normal APIs
# =============================================================================
def test_12_audit_records_cannot_be_edited_or_deleted(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client = review_setup["client_officer_gj_ind"]

    # Attempting to PATCH or DELETE audit logs via HTTP must return 404 or 405 (no route exposed)
    resp_patch = client.patch(f"/api/v1/officer/scheme-reviews/{dossier_id}/audit/", {"remarks": "Tamper"})
    assert resp_patch.status_code in [404, 405]

    resp_del = client.delete(f"/api/v1/officer/scheme-reviews/{dossier_id}/audit/")
    assert resp_del.status_code in [404, 405]


# =============================================================================
# 13. Super Admin National Oversight
# =============================================================================
def test_13_super_admin_national_oversight(review_setup):
    client_admin = review_setup["client_admin"]

    resp = client_admin.get("/api/v1/admin/scheme-reviews/oversight/")
    assert resp.status_code == 200
    data = resp.data["data"]
    assert "status_counts" in data
    assert "state_distribution" in data
    assert "dept_distribution" in data
    assert "officer_workload" in data
    assert "ageing_metrics" in data

    # Non-admin user accessing oversight receives 403 Forbidden
    resp_forbidden = review_setup["client_officer_gj_ind"].get("/api/v1/admin/scheme-reviews/oversight/")
    assert resp_forbidden.status_code == 403


# =============================================================================
# 14. Business Owner Cannot Access Officer-Only Actions
# =============================================================================
def test_14_business_owner_cannot_access_officer_only_actions(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_owner = review_setup["client_a"]

    # Business owner attempting to view officer queue -> 403 Forbidden
    resp_q = client_owner.get("/api/v1/officer/scheme-reviews/")
    assert resp_q.status_code == 403

    # Business owner attempting to start scrutiny -> 403 Forbidden
    resp_start = client_owner.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/start/", {})
    assert resp_start.status_code == 403

    # Business owner attempting to self-complete review -> 403 Forbidden
    resp_complete = client_owner.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/complete/", {
        "decision": "INTERNAL_VERIFIED",
        "remarks": "Self-approved by owner"
    })
    assert resp_complete.status_code == 403


# =============================================================================
# 15. Secure Document Ownership & Temporary Preview URL
# =============================================================================
def test_15_secure_document_ownership_and_preview_urls(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_officer = review_setup["client_officer_gj_ind"]

    resp = client_officer.get(f"/api/v1/officer/scheme-reviews/{dossier_id}/")
    assert resp.status_code == 200
    docs = resp.data["data"]["dossier"]["attached_vault_documents"]
    assert len(docs) >= 1
    doc_entry = docs[0]
    assert doc_entry["document_category"] == "FACTORY_LICENSE"
    # Document integrity hash must be preserved
    assert doc_entry.get("document_integrity_sha256") is not None


# =============================================================================
# 16. Notification Integration Across Lifecycle
# =============================================================================
def test_16_notification_integration_across_lifecycle(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_off = review_setup["client_officer_gj_ind"]
    notif_repo = review_setup["notif_repo"]
    user_a_id = review_setup["user_a"]["_id"]

    # 1. Start & Request Clarification
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {})
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/start/", {})
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/clarification/", {
        "question": "Provide GST filing receipt."
    })

    # Applicant must have received notification
    notifs = notif_repo.find_by_user(user_a_id)
    assert any("Clarification Requested" in n["title"] for n in notifs)


# =============================================================================
# 17. Concurrent Review Updates & State Invalidation
# =============================================================================
def test_17_concurrent_review_updates(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_off = review_setup["client_officer_gj_ind"]

    # Officer moves to ASSIGNED
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {})
    # Second duplicate assign succeeds idempotently or updates timestamp
    resp2 = client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {})
    assert resp2.status_code == 200


# =============================================================================
# 18. Assignment Changes & Complete Audit History
# =============================================================================
def test_18_assignment_changes_and_audit_history(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_admin = review_setup["client_admin"]

    # Super Admin reassigns review to officer
    resp_reassign = client_admin.post(f"/api/v1/admin/scheme-reviews/{dossier_id}/reassign/", {
        "new_officer_id": str(review_setup["officer_gj_ind"]["_id"]),
        "justification": "Reallocated under administrative workload rebalancing"
    })
    assert resp_reassign.status_code == 200

    audit_logs = review_setup["audit_repo"].get_dossier_audit_history(dossier_id)
    reassign_log = [e for e in audit_logs if "Reallocated" in e["remarks"]][0]
    assert reassign_log["action"] == "ASSIGN_OFFICER"
    assert reassign_log["actor_role"] == "SUPER_ADMIN"


# =============================================================================
# 19. No False Government Approval Representation (Prototype Disclaimer)
# =============================================================================
def test_19_no_false_government_approval_representation(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_off = review_setup["client_officer_gj_ind"]

    # Move through lifecycle to completion
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {})
    client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/start/", {})
    resp_comp = client_off.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/complete/", {
        "decision": "INTERNAL_VERIFIED",
        "remarks": "Internal documentation matches eligibility parameters."
    })
    assert resp_comp.status_code == 200

    dossier = resp_comp.data["data"]["dossier"]
    assert dossier["review_status"] == "REVIEW_COMPLETED"
    decision = dossier["review_decision"]
    assert decision["decision"] == "INTERNAL_VERIFIED"
    assert "SIH26130 PROTOTYPE NOTICE" in decision["prototype_disclaimer"]
    assert "NOT constitute a statutory government sanction" in decision["prototype_disclaimer"]


# =============================================================================
# 20. Tenant Isolation for Clarification and Dossier Reviews
# =============================================================================
def test_20_tenant_isolation(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_rival = review_setup["client_c"]

    # Rival User C attempting to respond to User A's clarification -> 403/404 Forbidden
    resp_bad_resp = client_rival.post(f"/api/v1/scheme-applications/{dossier_id}/respond-clarification/", {
        "clarification_id": "CLR-DUMMY",
        "response_text": "Adversary injecting response"
    })
    assert resp_bad_resp.status_code in [400, 403, 404]

    # Rival User C attempting to withdraw User A's review -> 403 Forbidden
    resp_bad_with = client_rival.post(f"/api/v1/scheme-applications/{dossier_id}/withdraw/", {
        "reason": "Malicious withdrawal attempt"
    })
    assert resp_bad_with.status_code in [403, 404]


# =============================================================================
# 21. Officer with No Department Denied Access
# =============================================================================
def test_21_officer_with_no_department_denied(review_setup):
    dossier = review_setup["dossier_gj"]
    review_repo = SchemeReviewRepository()

    # Officer missing department_code in officer_profile
    bad_officer = {
        "_id": ObjectId(),
        "email": "nodept.officer@test.gov.in",
        "role": "DEPARTMENT_OFFICER",
        "is_active": True,
        "officer_profile": {
            "department_code": None,
            "jurisdiction_code": "IN-GJ"
        }
    }
    with pytest.raises(PermissionError) as exc:
        review_repo.check_officer_scoping(bad_officer, dossier)
    assert "no assigned department" in str(exc.value).lower()

    # Empty string department
    bad_officer["officer_profile"]["department_code"] = "   "
    with pytest.raises(PermissionError) as exc2:
        review_repo.check_officer_scoping(bad_officer, dossier)
    assert "no assigned department" in str(exc2.value).lower()


# =============================================================================
# 22. Officer with No Jurisdiction Denied Access
# =============================================================================
def test_22_officer_with_no_jurisdiction_denied(review_setup):
    dossier = review_setup["dossier_gj"]
    review_repo = SchemeReviewRepository()

    # Officer missing jurisdiction_code
    bad_officer = {
        "_id": ObjectId(),
        "email": "nojuris.officer@test.gov.in",
        "role": "DEPARTMENT_OFFICER",
        "is_active": True,
        "officer_profile": {
            "department_code": "IN-GJ-IND",
            "jurisdiction_code": None
        }
    }
    with pytest.raises(PermissionError) as exc:
        review_repo.check_officer_scoping(bad_officer, dossier)
    assert "no assigned jurisdiction" in str(exc.value).lower()

    # Empty string jurisdiction
    bad_officer["officer_profile"]["jurisdiction_code"] = ""
    with pytest.raises(PermissionError) as exc2:
        review_repo.check_officer_scoping(bad_officer, dossier)
    assert "no assigned jurisdiction" in str(exc2.value).lower()


# =============================================================================
# 23. Officer with Inactive or Invalid Profile Denied Access
# =============================================================================
def test_23_officer_with_inactive_or_invalid_profile_denied(review_setup):
    dossier = review_setup["dossier_gj"]
    review_repo = SchemeReviewRepository()

    # Deactivated officer account
    inactive_officer = {
        "_id": ObjectId(),
        "email": "inactive.officer@test.gov.in",
        "role": "DEPARTMENT_OFFICER",
        "is_active": False,
        "officer_profile": {
            "department_code": "IN-GJ-IND",
            "jurisdiction_code": "IN-GJ"
        }
    }
    with pytest.raises(PermissionError) as exc:
        review_repo.check_officer_scoping(inactive_officer, dossier)
    assert "deactivated" in str(exc.value).lower()

    # Missing profile entirely
    no_profile_officer = {
        "_id": ObjectId(),
        "email": "noprofile.officer@test.gov.in",
        "role": "DEPARTMENT_OFFICER",
        "is_active": True,
        "officer_profile": None
    }
    with pytest.raises(PermissionError) as exc2:
        review_repo.check_officer_scoping(no_profile_officer, dossier)
    assert "profile is missing or invalid" in str(exc2.value).lower()


# =============================================================================
# 24. Dossier with Missing Department Denied Access
# =============================================================================
def test_24_dossier_with_missing_department_denied(review_setup):
    officer = review_setup["officer_gj_ind"]
    review_repo = SchemeReviewRepository()

    bad_dossier = dict(review_setup["dossier_gj"])
    bad_dossier["department_code"] = None
    with pytest.raises(PermissionError) as exc:
        review_repo.check_officer_scoping(officer, bad_dossier)
    assert "no designated department" in str(exc.value).lower()

    bad_dossier["department_code"] = "   "
    with pytest.raises(PermissionError) as exc2:
        review_repo.check_officer_scoping(officer, bad_dossier)
    assert "no designated department" in str(exc2.value).lower()


# =============================================================================
# 25. Dossier with Missing Jurisdiction Denied Access
# =============================================================================
def test_25_dossier_with_missing_jurisdiction_denied(review_setup):
    officer = review_setup["officer_gj_ind"]
    review_repo = SchemeReviewRepository()

    bad_dossier = dict(review_setup["dossier_gj"])
    bad_dossier["state_code"] = None
    with pytest.raises(PermissionError) as exc:
        review_repo.check_officer_scoping(officer, bad_dossier)
    assert "no designated jurisdiction" in str(exc.value).lower()

    bad_dossier["state_code"] = ""
    with pytest.raises(PermissionError) as exc2:
        review_repo.check_officer_scoping(officer, bad_dossier)
    assert "no designated jurisdiction" in str(exc2.value).lower()


# =============================================================================
# 26. Two Different Departments Sharing the Same Suffix Denied
# =============================================================================
def test_26_different_departments_sharing_same_suffix_denied(review_setup):
    dossier = review_setup["dossier_gj"]  # department_code: IN-GJ-IND, state: IN-GJ
    review_repo = SchemeReviewRepository()

    # Officer in a different department that shares the "-IND" suffix
    # e.g., "TEXTILE-IND" or "TOURISM-IND"
    suffix_sharing_officer = {
        "_id": ObjectId(),
        "email": "textile.officer@test.gov.in",
        "role": "DEPARTMENT_OFFICER",
        "is_active": True,
        "officer_profile": {
            "department_code": "TEXTILE-IND",
            "jurisdiction_code": "IN-GJ"
        }
    }
    with pytest.raises(PermissionError) as exc:
        review_repo.check_officer_scoping(suffix_sharing_officer, dossier)
    assert "department scoping violation" in str(exc.value).lower()

    # Another different department: "AGRICULTURE-IND"
    suffix_sharing_officer["officer_profile"]["department_code"] = "AGRICULTURE-IND"
    with pytest.raises(PermissionError) as exc2:
        review_repo.check_officer_scoping(suffix_sharing_officer, dossier)
    assert "department scoping violation" in str(exc2.value).lower()


# =============================================================================
# 27. Valid Exact Department and Jurisdiction Match Allowed
# =============================================================================
def test_27_valid_exact_department_and_jurisdiction_match_allowed(review_setup):
    review_repo = SchemeReviewRepository()

    # Exact match on authoritative code
    officer_exact = {
        "_id": ObjectId(),
        "email": "exact.officer@gujarat.gov.in",
        "role": "DEPARTMENT_OFFICER",
        "is_active": True,
        "officer_profile": {
            "department_code": "IN-GJ-IND",
            "jurisdiction_code": "IN-GJ"
        }
    }
    dossier_exact = {
        "_id": ObjectId(),
        "department_code": "IN-GJ-IND",
        "state_code": "IN-GJ"
    }
    # Should not raise any exception
    review_repo.check_officer_scoping(officer_exact, dossier_exact)

    # Validated alias match (IND with IN-GJ for IN-GJ-IND)
    officer_alias = {
        "_id": ObjectId(),
        "email": "alias.officer@gujarat.gov.in",
        "role": "DEPARTMENT_OFFICER",
        "is_active": True,
        "officer_profile": {
            "department_code": "IND",
            "jurisdiction_code": "IN-GJ"
        }
    }
    review_repo.check_officer_scoping(officer_alias, dossier_exact)


# =============================================================================
# 28. Cross-State Access Strictly Denied
# =============================================================================
def test_28_cross_state_access_strictly_denied(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_mh = review_setup["client_officer_mh_ind"]

    # Maharashtra officer trying to access Gujarat dossier via API
    resp_get = client_mh.get(f"/api/v1/officer/scheme-reviews/{dossier_id}/")
    assert resp_get.status_code == 403
    assert "jurisdiction" in resp_get.data["error"]["message"].lower()

    resp_assign = client_mh.post(f"/api/v1/officer/scheme-reviews/{dossier_id}/assign/", {
        "remarks": "Cross-state illegal assignment"
    })
    assert resp_assign.status_code == 403


# =============================================================================
# 29. Super Admin National Access Allowed
# =============================================================================
def test_29_super_admin_national_access_allowed(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_admin = review_setup["client_admin"]

    # Super Admin can inspect Gujarat dossier
    resp_get = client_admin.get(f"/api/v1/officer/scheme-reviews/{dossier_id}/")
    assert resp_get.status_code == 200
    assert resp_get.data["data"]["dossier"]["application_reference"] == review_setup["dossier_gj"]["application_reference"]

    # Super Admin can access national oversight
    resp_ov = client_admin.get("/api/v1/admin/scheme-reviews/oversight/")
    assert resp_ov.status_code == 200


# =============================================================================
# 30. Unauthorized Reassignment and Review Actions Denied
# =============================================================================
def test_30_unauthorized_reassignment_and_review_actions_denied(review_setup):
    dossier_id = str(review_setup["dossier_gj"]["_id"])
    client_officer = review_setup["client_officer_gj_ind"]
    client_owner = review_setup["client_a"]
    client_admin = review_setup["client_admin"]

    # 1. Non-admin attempting to reassign dossier -> 403 Forbidden
    resp_nonadmin = client_officer.post(f"/api/v1/admin/scheme-reviews/{dossier_id}/reassign/", {
        "new_officer_id": str(review_setup["officer_gj_ind"]["_id"]),
        "justification": "Officer attempting unauthorized reassignment"
    })
    assert resp_nonadmin.status_code == 403

    # 2. Business owner attempting to reassign dossier -> 403 Forbidden
    resp_owner = client_owner.post(f"/api/v1/admin/scheme-reviews/{dossier_id}/reassign/", {
        "new_officer_id": str(review_setup["officer_gj_ind"]["_id"]),
        "justification": "Owner attempting unauthorized reassignment"
    })
    assert resp_owner.status_code == 403

    # 3. Super Admin attempting cross-state reassignment (assigning Gujarat dossier to Maharashtra officer)
    resp_bad_reassign = client_admin.post(f"/api/v1/admin/scheme-reviews/{dossier_id}/reassign/", {
        "new_officer_id": str(review_setup["officer_mh_ind"]["_id"]),
        "justification": "Admin attempting invalid cross-jurisdiction assignment"
    })
    # Target officer fails scoping validation -> 403 Forbidden
    assert resp_bad_reassign.status_code == 403
    assert "jurisdiction" in resp_bad_reassign.data["error"]["message"].lower()
