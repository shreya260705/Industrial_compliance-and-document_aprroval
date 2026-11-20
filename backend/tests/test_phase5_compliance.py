"""
Comprehensive Phase 5 Test Suite:
Compliance Obligations, Calendar & Renewal Automation Engine.
Validates:
1. Obligation generation from facility profile & verified catalogue templates.
2. NEEDS_CONFIRMATION handling and date confirmation.
3. Facility ownership & cross-user IDOR protection.
4. Dynamic status & due-date calculation (UPCOMING, DUE_SOON, DUE_TODAY, OVERDUE).
5. Safe leap-year & month-end recurrence calculations.
6. Completion evidence attachment from vault & recurring cycle advancement.
7. Cross-tenant vault document attachment defense.
8. Officer internal review with departmental & jurisdictional scoping.
9. Deduplicated reminders & in-app notification engine integration.
10. Calendar feed, metrics, and renewals pipeline endpoints.
11. Super Admin nationwide oversight and RBAC barriers.
"""

from datetime import datetime, timezone, timedelta
import pytest
from rest_framework.test import APIClient
from apps.authentication.password import hash_password
from apps.authentication.jwt_service import generate_tokens_for_user
from apps.authentication.repository import UserRepository
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository
from apps.compliance.repository import (
    ComplianceObligationRepository,
    ComplianceCycleRepository,
    ComplianceCompletionRepository,
    ComplianceReminderLogRepository,
    ComplianceTemplateRepository
)
from apps.compliance.services.compliance_engine import ComplianceEngineService
from apps.compliance.services.reminder_service import ComplianceReminderService
from apps.notifications.repository import NotificationRepository

TEST_EMAILS = [
    "owner.phase5a@apexenterprises.in",
    "owner.phase5b@rivalindustries.in",
    "officer.gj.p5@gpcb.gov.in",
    "officer.mh.p5@mpcb.gov.in",
    "admin.phase5@bizpermit.gov.in"
]


@pytest.fixture(scope="module")
def compliance_setup():
    user_repo = UserRepository()
    biz_repo = BusinessRepository()
    loc_repo = LocationRepository()
    doc_repo = DocumentRepository()
    ob_repo = ComplianceObligationRepository()
    cycle_repo = ComplianceCycleRepository()
    comp_repo = ComplianceCompletionRepository()
    rem_repo = ComplianceReminderLogRepository()
    tpl_repo = ComplianceTemplateRepository()

    # Pre-clean
    user_repo.collection.delete_many({"email": {"$in": TEST_EMAILS}})
    biz_repo.collection.delete_many({"pan": {"$in": ["CMPLN1111A", "CMPLN2222B"]}})

    # Ensure templates are seeded
    from django.core.management import call_command
    if tpl_repo.collection.count_documents({}) == 0:
        call_command("seed_compliance_templates")

    default_pass = hash_password("Password123!")

    # 1. Create Business Owner A
    user_a = user_repo.create_user(
        email="owner.phase5a@apexenterprises.in",
        password_hash=default_pass,
        full_name="Aarav Mehta",
        role="BUSINESS_OWNER"
    )

    # 2. Create Business Owner B (Competitor)
    user_b = user_repo.create_user(
        email="owner.phase5b@rivalindustries.in",
        password_hash=default_pass,
        full_name="Rohan Varma",
        role="BUSINESS_OWNER"
    )

    # 3. Create Gujarat GPCB Officer
    officer_gj = user_repo.create_user(
        email="officer.gj.p5@gpcb.gov.in",
        password_hash=default_pass,
        full_name="Hasmukh Patel",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "GPCB-ENV",
            "jurisdiction_code": "IN-GJ",
            "designation": "Regional Environmental Officer"
        }
    )

    # 4. Create Maharashtra MPCB Officer
    officer_mh = user_repo.create_user(
        email="officer.mh.p5@mpcb.gov.in",
        password_hash=default_pass,
        full_name="Sachin Deshmukh",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "MPCB-ENV",
            "jurisdiction_code": "IN-MH",
            "designation": "Divisional Scrutiny Officer"
        }
    )

    # 5. Create Super Admin
    admin_user = user_repo.create_user(
        email="admin.phase5@bizpermit.gov.in",
        password_hash=default_pass,
        full_name="National Governance Lead",
        role="SUPER_ADMIN"
    )

    # 6. Business A & Location A (Gujarat Dahej Chemical Plant)
    biz_a = biz_repo.create_business(
        owner_user_id=user_a["_id"],
        legal_name="Apex Speciality Synthetics Pvt Ltd",
        trade_name="Apex Speciality",
        entity_type="PRIVATE_LIMITED",
        pan="CMPLN1111A",
        gstin="24CMPLN1111A1Z1"
    )

    loc_a_gj = loc_repo.create_location(
        business_id=biz_a["_id"],
        location_name="Dahej Synthetic Complex",
        facility_type="MANUFACTURING_PLANT",
        address={
            "line1": "Plot 50, GIDC Dahej",
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
            "total_power_load_hp": 800,
            "workforce_capacity": 150,
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
        document_name="Form V Environment Statement Audit Report 2026",
        document_category="ENVIRONMENTAL_CLEARANCE",
        original_filename="form_v_audit_2026.pdf",
        storage_object_path=f"businesses/{biz_a['_id']}/docs/form_v_audit.pdf",
        mime_type="application/pdf",
        file_size_bytes=153600,
        sha256_checksum="c1c2c3c4c5c6c7c8c9d0d1d2d3d4d5d6d7d8d9e0e1e2e3e4e5e6e7e8e9f0f1f2"
    )

    # 8. Business B & Location B for Owner B
    biz_b = biz_repo.create_business(
        owner_user_id=user_b["_id"],
        legal_name="Rival Synthetics LLP",
        trade_name="Rival Synthetics",
        entity_type="LLP",
        pan="CMPLN2222B"
    )

    loc_b_mh = loc_repo.create_location(
        business_id=biz_b["_id"],
        location_name="Rival Chakan Facility",
        facility_type="MANUFACTURING_PLANT",
        address={
            "line1": "MIDC Chakan",
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
            "sector_name": "Automotive",
            "scale": "MEDIUM",
            "pollution_category": "ORANGE"
        }
    )

    doc_b = doc_repo.create_document(
        owner_user_id=user_b["_id"],
        business_id=biz_b["_id"],
        location_id=loc_b_mh["_id"],
        document_name="Rival Emission Test Report",
        document_category="ENVIRONMENTAL_CLEARANCE",
        original_filename="rival_emission.pdf",
        storage_object_path=f"businesses/{biz_b['_id']}/docs/rival_emission.pdf",
        mime_type="application/pdf",
        file_size_bytes=81920,
        sha256_checksum="d1d2d3d4d5d6d7d8d9e0e1e2e3e4e5e6e7e8e9f0f1f2f3f4f5f6f7f8f9a0a1a2"
    )

    data = {
        "user_a": user_a,
        "user_b": user_b,
        "officer_gj": officer_gj,
        "officer_mh": officer_mh,
        "admin": admin_user,
        "biz_a": biz_a,
        "loc_a_gj": loc_a_gj,
        "doc_a": doc_a,
        "biz_b": biz_b,
        "loc_b_mh": loc_b_mh,
        "doc_b": doc_b
    }

    yield data

    # Teardown
    ob_repo.collection.delete_many({"owner_user_id": {"$in": [user_a["_id"], user_b["_id"]]}})
    cycle_repo.collection.delete_many({})
    comp_repo.collection.delete_many({})
    rem_repo.collection.delete_many({"recipient_user_id": {"$in": [user_a["_id"], user_b["_id"]]}})
    doc_repo.collection.delete_many({"business_id": {"$in": [biz_a["_id"], biz_b["_id"]]}})
    loc_repo.collection.delete_many({"business_id": {"$in": [biz_a["_id"], biz_b["_id"]]}})
    user_repo.collection.delete_many({"email": {"$in": TEST_EMAILS}})
    biz_repo.collection.delete_many({"pan": {"$in": ["CMPLN1111A", "CMPLN2222B"]}})


def get_auth_client(user_dict):
    client = APIClient()
    tokens = generate_tokens_for_user(user_dict)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
    return client


# -----------------------------------------------------------------------------
# TEST 1: Obligation Generation from Facility Profile & Verified Templates
# -----------------------------------------------------------------------------
def test_01_obligation_generation_from_facility_profile(compliance_setup):
    data = compliance_setup
    client_a = get_auth_client(data["user_a"])
    loc_id = str(data["loc_a_gj"]["_id"])

    # 1. Trigger obligation generation for Dahej Chemical Plant
    res = client_a.post(f"/api/v1/compliance/locations/{loc_id}/generate")
    assert res.status_code == 201
    body = res.json()["data"]
    assert len(body) >= 6

    # Verify templates represented
    template_codes = [item["template_code"] for item in body]
    assert "ENV-FORM-V" in template_codes
    assert "ENV-HALF-YEARLY" in template_codes
    assert "BOIL-ANNUAL-INSP" in template_codes
    assert "FAC-ANNUAL-RETURN" in template_codes
    assert "HAZ-CHEM-RETURN" in template_codes
    assert "CGWA-ANNUAL-RETURN" in template_codes
    assert "CTO-RENEWAL-TRACKER" in template_codes

    # Verify human-readable obligation reference format
    for item in body:
        assert item["obligation_number"].startswith("OB-")
        assert item["owner_user_id"] == str(data["user_a"]["_id"])
        assert item["location_id"] == loc_id

    # 2. Idempotency test: subsequent call must not create duplicates
    repeat_res = client_a.post(f"/api/v1/compliance/locations/{loc_id}/generate")
    assert repeat_res.status_code == 200
    repeat_body = repeat_res.json()["data"]
    assert len(repeat_body) == 0  # 0 new duplicates generated

    ob_repo = ComplianceObligationRepository()
    count = ob_repo.collection.count_documents({"location_id": data["loc_a_gj"]["_id"], "is_active": True})
    assert count == len(body)


# -----------------------------------------------------------------------------
# TEST 2: NEEDS_CONFIRMATION Handling and Date Confirmation
# -----------------------------------------------------------------------------
def test_02_needs_confirmation_handling_and_date_confirmation(compliance_setup):
    data = compliance_setup
    client_a = get_auth_client(data["user_a"])

    ob_repo = ComplianceObligationRepository()
    cto_ob = ob_repo.collection.find_one({
        "location_id": data["loc_a_gj"]["_id"],
        "template_code": "CTO-RENEWAL-TRACKER"
    })
    assert cto_ob is not None
    assert cto_ob["status"] == "NEEDS_CONFIRMATION"
    assert cto_ob["source_verification_status"] == "NEEDS_CONFIRMATION"

    ob_id = str(cto_ob["_id"])

    # User confirms an operational expiry date 180 days in the future
    confirmed_date = datetime.now(timezone.utc) + timedelta(days=180)
    conf_res = client_a.post(f"/api/v1/compliance/obligations/{ob_id}/confirm-date", {
        "confirmed_due_date": confirmed_date.isoformat(),
        "notes": "Confirmed 5-year CTO renewal schedule based on GPCB consent order dated 2022."
    }, format="json")

    assert conf_res.status_code == 200
    updated = conf_res.json()["data"]
    assert updated["status"] in ("UPCOMING", "DUE_SOON")
    assert updated["source_verification_status"] == "INDICATIVE_INTERNAL"


# -----------------------------------------------------------------------------
# TEST 3: Facility Ownership & Cross-User IDOR Protection
# -----------------------------------------------------------------------------
def test_03_facility_ownership_and_cross_user_idor_protection(compliance_setup):
    data = compliance_setup
    client_a = get_auth_client(data["user_a"])
    client_b = get_auth_client(data["user_b"])

    ob_repo = ComplianceObligationRepository()
    ob_a = ob_repo.collection.find_one({"location_id": data["loc_a_gj"]["_id"]})
    ob_a_id = str(ob_a["_id"])

    # 1. User B attempts to generate obligations for User A's plant -> 400
    gen_attack = client_b.post(f"/api/v1/compliance/locations/{data['loc_a_gj']['_id']}/generate")
    assert gen_attack.status_code in (400, 403)

    # 2. User B attempts to read User A's obligation -> 404 Not Found
    get_res = client_b.get(f"/api/v1/compliance/obligations/{ob_a_id}")
    assert get_res.status_code == 404

    # 3. User B attempts to update User A's obligation -> 404
    patch_res = client_b.patch(f"/api/v1/compliance/obligations/{ob_a_id}", {"title": "Compromised Title"}, format="json")
    assert patch_res.status_code == 404

    # 4. User B attempts to complete User A's obligation -> 400/404
    comp_res = client_b.post(f"/api/v1/compliance/obligations/{ob_a_id}/complete", {
        "completion_remarks": "Unauthorized completion"
    }, format="json")
    assert comp_res.status_code in (400, 404)

    # 5. User B attempts to delete User A's obligation -> 404
    del_res = client_b.delete(f"/api/v1/compliance/obligations/{ob_a_id}")
    assert del_res.status_code == 404


# -----------------------------------------------------------------------------
# TEST 4: Dynamic Status and Due-Date Calculation
# -----------------------------------------------------------------------------
def test_04_dynamic_status_and_due_date_calculation():
    now = datetime.now(timezone.utc)

    # 1. More than 7 days ahead -> UPCOMING
    d_upcoming = now + timedelta(days=25)
    st1 = ComplianceEngineService.calculate_status(d_upcoming, "UPCOMING")
    assert st1 == "UPCOMING"

    # 2. Within 7 days -> DUE_SOON
    d_due_soon = now + timedelta(days=5)
    st2 = ComplianceEngineService.calculate_status(d_due_soon, "UPCOMING")
    assert st2 == "DUE_SOON"

    # 3. Today (within 0.5 days) -> DUE_TODAY
    d_today = now + timedelta(hours=6)
    st3 = ComplianceEngineService.calculate_status(d_today, "UPCOMING")
    assert st3 == "DUE_TODAY"

    # 4. Past due -> OVERDUE
    d_overdue = now - timedelta(days=3)
    st4 = ComplianceEngineService.calculate_status(d_overdue, "UPCOMING")
    assert st4 == "OVERDUE"

    # 5. Completed flag overrides
    st5 = ComplianceEngineService.calculate_status(d_overdue, "OVERDUE", has_completed=True)
    assert st5 == "COMPLETED"


# -----------------------------------------------------------------------------
# TEST 5: Safe Leap-Year & Month-End Recurrence
# -----------------------------------------------------------------------------
def test_05_safe_leap_year_and_month_end_recurrence():
    # 1. Month-end clamping: Jan 31 + 1 month in non-leap year (2025) -> Feb 28
    d_jan31 = datetime(2025, 1, 31, 12, 0, tzinfo=timezone.utc)
    d_feb = ComplianceEngineService.add_months(d_jan31, 1)
    assert d_feb.year == 2025
    assert d_feb.month == 2
    assert d_feb.day == 28

    # 2. Month-end clamping in leap year (2024): Jan 31 + 1 month -> Feb 29
    d_jan31_leap = datetime(2024, 1, 31, 12, 0, tzinfo=timezone.utc)
    d_feb_leap = ComplianceEngineService.add_months(d_jan31_leap, 1)
    assert d_feb_leap.year == 2024
    assert d_feb_leap.month == 2
    assert d_feb_leap.day == 29

    # 3. Leap day rollover: Feb 29, 2024 + 12 months (1 year) -> Feb 28, 2025
    d_feb29 = datetime(2024, 2, 29, 12, 0, tzinfo=timezone.utc)
    d_next_year = ComplianceEngineService.compute_next_cycle_date(d_feb29, "ANNUAL")
    assert d_next_year.year == 2025
    assert d_next_year.month == 2
    assert d_next_year.day == 28

    # 4. Quarterly calculation: March 31 + 3 months -> June 30
    d_mar31 = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
    d_jun = ComplianceEngineService.compute_next_cycle_date(d_mar31, "QUARTERLY")
    assert d_jun.month == 6
    assert d_jun.day == 30

    # 5. One-time obligation has no next cycle
    assert ComplianceEngineService.compute_next_cycle_date(d_mar31, "ONE_TIME") is None


# -----------------------------------------------------------------------------
# TEST 6: Completion with Vault Evidence & Recurring Cycle Advancement
# -----------------------------------------------------------------------------
def test_06_completion_with_vault_evidence_and_cycle_advancement(compliance_setup):
    data = compliance_setup
    client_a = get_auth_client(data["user_a"])

    ob_repo = ComplianceObligationRepository()
    form_v_ob = ob_repo.collection.find_one({
        "location_id": data["loc_a_gj"]["_id"],
        "template_code": "ENV-FORM-V"
    })
    assert form_v_ob is not None
    ob_id = str(form_v_ob["_id"])
    orig_due = form_v_ob["due_date"]
    orig_cycle = form_v_ob.get("current_cycle_number", 1)

    # Submit completion evidence referencing existing Vault document
    complete_res = client_a.post(f"/api/v1/compliance/obligations/{ob_id}/complete", {
        "completion_remarks": "Form V audit report prepared by accredited environmental auditor and submitted.",
        "vault_document_ids": [str(data["doc_a"]["_id"])],
        "needs_officer_review": True
    }, format="json")

    assert complete_res.status_code == 200
    updated = complete_res.json()["data"]

    # 1. Next cycle #2 instantiated automatically for recurring annual obligation
    assert updated["current_cycle_number"] == orig_cycle + 1
    assert updated["status"] in ("UPCOMING", "DUE_SOON", "OVERDUE")
    assert updated["last_completed_at"] is not None

    # 2. Cycle #1 completion evidence is 100% preserved
    comp_repo = ComplianceCompletionRepository()
    records = comp_repo.find_by_obligation(ob_id)
    assert len(records) == 1
    rec = records[0]
    assert rec["cycle_number"] == 1
    assert rec["needs_officer_review"] is True
    assert rec["review_status"] == "PENDING_REVIEW"
    assert len(rec["attached_documents"]) == 1
    assert rec["attached_documents"][0]["sha256_checksum"] == data["doc_a"]["sha256_checksum"]

    # 3. Compliance cycle records reflect cycle 1 COMPLETED and cycle 2 UPCOMING
    cycle_repo = ComplianceCycleRepository()
    cycles = cycle_repo.find_by_obligation(ob_id)
    assert len(cycles) == 2
    c1 = next(c for c in cycles if c["cycle_number"] == 1)
    c2 = next(c for c in cycles if c["cycle_number"] == 2)
    assert c1["status"] == "COMPLETED"
    assert c2["status"] in ("UPCOMING", "DUE_SOON", "OVERDUE")


# -----------------------------------------------------------------------------
# TEST 7: Cross-Tenant Vault Document Defense
# -----------------------------------------------------------------------------
def test_07_cross_tenant_vault_document_defense(compliance_setup):
    data = compliance_setup
    client_a = get_auth_client(data["user_a"])

    ob_repo = ComplianceObligationRepository()
    boiler_ob = ob_repo.collection.find_one({
        "location_id": data["loc_a_gj"]["_id"],
        "template_code": "BOIL-ANNUAL-INSP"
    })
    ob_id = str(boiler_ob["_id"])

    # Same-business evidence for a different facility is also out of scope.
    other_loc = LocationRepository().create_location(
        business_id=data["biz_a"]["_id"],
        location_name="Second Gujarat Compliance Facility",
        facility_type="MANUFACTURING_PLANT",
        address={"line1": "Plot 80, GIDC Ankleshwar", "city": "Ankleshwar", "district": "Bharuch", "state_code": "IN-GJ", "pincode": "393002"},
        jurisdiction_hierarchy={"state_code": "IN-GJ", "district_code": "IN-GJ-BHA", "local_body_code": "GIDC-ANKLESHWAR"},
        industrial_profile={"nic_code": "2011", "sector_name": "Chemicals", "scale": "MEDIUM", "pollution_category": "RED"}
    )
    other_loc_doc = DocumentRepository().create_document(
        owner_user_id=data["user_a"]["_id"],
        business_id=data["biz_a"]["_id"],
        location_id=other_loc["_id"],
        document_name="Other facility evidence",
        document_category="ENVIRONMENTAL_CLEARANCE",
        original_filename="other_facility_evidence.pdf",
        storage_object_path=f"businesses/{data['biz_a']['_id']}/docs/other_facility_evidence.pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
        sha256_checksum="b" * 64
    )
    location_attack = client_a.post(f"/api/v1/compliance/obligations/{ob_id}/complete", {
        "completion_remarks": "Evidence from another location",
        "vault_document_ids": [str(other_loc_doc["_id"])]
    }, format="json")
    assert location_attack.status_code == 400
    assert "location" in location_attack.json()["error"]["message"].lower()

    # User A attempts to attach User B's vault document -> Rejected 400
    attack_res = client_a.post(f"/api/v1/compliance/obligations/{ob_id}/complete", {
        "completion_remarks": "Attaching competitor document",
        "vault_document_ids": [str(data["doc_b"]["_id"])]
    }, format="json")

    assert attack_res.status_code == 400
    assert "not found" in attack_res.json()["error"]["message"].lower() or "belong" in attack_res.json()["error"]["message"].lower()


# -----------------------------------------------------------------------------
# TEST 8: Officer Internal Review with Departmental & Jurisdictional Scoping
# -----------------------------------------------------------------------------
def test_08_officer_internal_review_with_departmental_scoping(compliance_setup):
    data = compliance_setup
    client_a = get_auth_client(data["user_a"])
    client_gj = get_auth_client(data["officer_gj"])
    client_mh = get_auth_client(data["officer_mh"])

    ob_repo = ComplianceObligationRepository()
    comp_repo = ComplianceCompletionRepository()

    form_v_ob = ob_repo.collection.find_one({
        "location_id": data["loc_a_gj"]["_id"],
        "template_code": "ENV-FORM-V"
    })
    ob_id = str(form_v_ob["_id"])

    # Get the pending completion record
    records = comp_repo.find_by_obligation(ob_id)
    assert len(records) > 0
    rec_id = str(records[0]["_id"])

    # 1. Maharashtra Officer attempts to review Gujarat obligation -> 403 Forbidden
    mh_res = client_mh.post(f"/api/v1/compliance/obligations/{ob_id}/records/{rec_id}/review", {
        "decision": "VERIFIED_COMPLETE",
        "remarks": "Cross-state review attempt"
    }, format="json")
    assert mh_res.status_code == 403
    assert "jurisdiction" in mh_res.json()["error"]["message"].lower() or "department" in mh_res.json()["error"]["message"].lower()

    # 2. Business Owner attempts to self-review -> 403 Forbidden
    owner_res = client_a.post(f"/api/v1/compliance/obligations/{ob_id}/records/{rec_id}/review", {
        "decision": "VERIFIED_COMPLETE",
        "remarks": "Self-review attempt"
    }, format="json")
    assert owner_res.status_code == 403

    # 3. Authorized Gujarat Environmental Officer reviews and verifies -> 200 OK
    gj_res = client_gj.post(f"/api/v1/compliance/obligations/{ob_id}/records/{rec_id}/review", {
        "decision": "VERIFIED_COMPLETE",
        "remarks": "Form V consumption metrics verified against GPCB Consent to Operate parameters."
    }, format="json")
    assert gj_res.status_code == 200
    assert gj_res.json()["data"]["review_status"] == "VERIFIED_COMPLETE"


# -----------------------------------------------------------------------------
# TEST 9: Deduplicated Reminders & In-App Notification Integration
# -----------------------------------------------------------------------------
def test_09_deduplicated_reminders_and_notification_integration(compliance_setup):
    data = compliance_setup
    client_a = get_auth_client(data["user_a"])
    ob_repo = ComplianceObligationRepository()

    # Set an obligation due date to 5 days from now to hit the 7-day reminder threshold
    target_ob = ob_repo.collection.find_one({
        "owner_user_id": data["user_a"]["_id"],
        "status": {"$ne": "COMPLETED"}
    })
    assert target_ob is not None

    due_soon_date = datetime.now(timezone.utc) + timedelta(days=6)
    ob_repo.collection.update_one(
        {"_id": target_ob["_id"]},
        {"$set": {"due_date": due_soon_date, "status": "UPCOMING"}}
    )

    # 1. Execute Compliance Reminder Service
    stats1 = ComplianceReminderService.process_all_active_obligations()
    assert stats1["processed"] > 0
    assert stats1["reminders_dispatched"] >= 1

    # Verify notification received by User A
    notif_res = client_a.get("/api/v1/notifications")
    assert notif_res.status_code == 200
    notifs = notif_res.json()["data"]
    comp_notifs = [n for n in notifs if "COMPLIANCE" in n.get("notification_type", "")]
    assert len(comp_notifs) >= 1

    # 2. Immediate repeat execution must NOT dispatch duplicate notifications (Idempotency)
    stats2 = ComplianceReminderService.process_all_active_obligations()
    assert stats2["reminders_dispatched"] == 0  # Deduplicated!


# -----------------------------------------------------------------------------
# TEST 10: Calendar Events, Metrics & Renewals Endpoints
# -----------------------------------------------------------------------------
def test_10_calendar_events_and_metrics_endpoints(compliance_setup):
    data = compliance_setup
    client_a = get_auth_client(data["user_a"])

    # 1. Calendar feed
    cal_res = client_a.get("/api/v1/compliance/calendar")
    assert cal_res.status_code == 200
    events = cal_res.json()["data"]
    assert len(events) > 0
    first_ev = events[0]
    assert "id" in first_ev
    assert "title" in first_ev
    assert "due_date" in first_ev
    assert "status" in first_ev
    assert "facility_name" in first_ev

    # 2. Metrics dashboard
    metrics_res = client_a.get("/api/v1/compliance/metrics")
    assert metrics_res.status_code == 200
    m = metrics_res.json()["data"]
    assert m["total_obligations"] > 0
    assert "completion_percentage" in m
    assert "facilities" in m
    assert len(m["facilities"]) > 0
    location_id = str(data["loc_a_gj"]["_id"])
    filtered_metrics = client_a.get(
        f"/api/v1/compliance/metrics?business_id={data['biz_a']['_id']}&location_id={location_id}"
    )
    assert filtered_metrics.status_code == 200
    assert filtered_metrics.json()["data"]["total_obligations"] == m["total_obligations"]
    assert all(facility["facility_id"] == location_id for facility in filtered_metrics.json()["data"]["facilities"])

    # Obligation registry pagination metadata must report the real filtered count.
    list_res = client_a.get(
        f"/api/v1/compliance/obligations?business_id={data['biz_a']['_id']}&location_id={location_id}&page=1&page_size=1"
    )
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) == 1
    assert list_res.json()["meta"]["pagination"]["total_records"] == m["total_obligations"]

    # 3. Renewals pipeline
    renew_res = client_a.get("/api/v1/compliance/renewals")
    assert renew_res.status_code == 200
    renewals = renew_res.json()["data"]
    for r in renewals:
        assert r["renewal_applicability"] is True
    filtered_renewals = client_a.get(
        f"/api/v1/compliance/renewals?business_id={data['biz_a']['_id']}&location_id={location_id}"
    )
    assert filtered_renewals.status_code == 200
    assert all(item["location_id"] == location_id for item in filtered_renewals.json()["data"])

    # Custom obligation creation supplies the required API contract fields.
    custom_res = client_a.post("/api/v1/compliance/obligations", {
        "business_id": str(data["biz_a"]["_id"]),
        "location_id": location_id,
        "title": "Quarterly internal safety review",
        "description": "Review machine guarding and emergency procedures.",
        "authority_name": "Internal Enterprise Policy",
        "department_code": "INTERNAL",
        "jurisdiction_code": "IN-GJ",
        "compliance_category": "LABOUR_SAFETY",
        "frequency": "QUARTERLY",
        "due_date": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
        "renewal_applicability": True,
    }, format="json")
    assert custom_res.status_code == 201
    assert custom_res.json()["data"]["location_id"] == location_id
    assert custom_res.json()["data"]["renewal_applicability"] is True


# -----------------------------------------------------------------------------
# TEST 11: Super Admin Nationwide Oversight & RBAC Barriers
# -----------------------------------------------------------------------------
def test_11_super_admin_compliance_oversight(compliance_setup):
    data = compliance_setup
    client_a = get_auth_client(data["user_a"])
    client_admin = get_auth_client(data["admin"])

    # 1. Regular user barred from admin endpoints -> 403 Forbidden
    unauth_overview = client_a.get("/api/v1/compliance/admin/overview")
    assert unauth_overview.status_code == 403

    unauth_tpls = client_a.get("/api/v1/compliance/admin/templates")
    assert unauth_tpls.status_code == 403

    # 2. Super Admin accesses nationwide overview -> 200 OK
    admin_overview = client_admin.get("/api/v1/compliance/admin/overview")
    assert admin_overview.status_code == 200
    data_overview = admin_overview.json()["data"]
    assert "total_obligations_nationwide" in data_overview
    assert "national_compliance_rate" in data_overview
    assert "states" in data_overview

    # 3. Super Admin accesses statutory templates -> 200 OK
    admin_tpls = client_admin.get("/api/v1/compliance/admin/templates")
    assert admin_tpls.status_code == 200
    tpls = admin_tpls.json()["data"]
    assert len(tpls) >= 8
