"""
Comprehensive Phase 6 Module 1 Test Suite:
Government Schemes & Incentives Engine.

Validates:
1. CGTMSE classification (CREDIT_GUARANTEE) and verified tiered coverage.
2. CGTMSE applicable facility ceiling (₹500L standard vs ₹200L retail) and special categories.
3. PLI Auto closed intake versus active beneficiary claims.
4. PM-KUSUM extension versus fresh State DISCOM tender requirement.
5. PMKSY expired EOI blocks new applications.
6. Maharashtra PSI legacy transition uncertainty and manual review.
7. Missing evidence is NEVER evaluated as satisfied.
8. Recommendation history remains append-only.
9. Re-evaluation preserves old records.
10. Rule updates invalidate latest evaluations without rewriting history.
11. Profile changes invalidate relevant evaluations.
12. Cross-tenant location and application IDOR defenses.
13. Application creation blocked for closed or unconfirmed intake.
14. External attestation validation and immutability.
15. Future submission dates rejected.
16. Existing vault document ownership enforced (cross-tenant vault defense).
17. Prototype disclaimers included in relevant outputs.
"""

from datetime import datetime, timezone, timedelta, date
import pytest
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
from apps.schemes.services.eligibility_engine import EligibilityEngine

TEST_EMAILS = [
    "owner.phase6a@apexindustries.in",
    "owner.phase6b@zenithagro.in",
    "rival.phase6@rivalcorp.in",
    "admin.phase6@bizpermit.gov.in"
]


@pytest.fixture(scope="module")
def schemes_setup():
    user_repo = UserRepository()
    biz_repo = BusinessRepository()
    loc_repo = LocationRepository()
    doc_repo = DocumentRepository()
    scheme_repo = SchemeRepository()
    rec_repo = SchemeRecommendationRepository()
    app_repo = SchemeApplicationRepository()

    # Pre-clean test records
    user_repo.collection.delete_many({"email": {"$in": TEST_EMAILS}})
    biz_repo.collection.delete_many({"pan": {"$in": ["SCHEM1111A", "SCHEM2222B", "SCHEM3333C"]}})
    
    # Ensure master schemes are seeded
    from django.core.management import call_command
    call_command("seed_schemes")

    default_pass = hash_password("Password123!")

    # 1. User A: Industrial Manufacturer (Gujarat)
    user_a = user_repo.create_user(
        email="owner.phase6a@apexindustries.in",
        password_hash=default_pass,
        full_name="Vikramaditya Shah",
        role="BUSINESS_OWNER"
    )

    # 2. User B: Agro & Renewable Producer (Gujarat / Maharashtra)
    user_b = user_repo.create_user(
        email="owner.phase6b@zenithagro.in",
        password_hash=default_pass,
        full_name="Pooja Kulkarni",
        role="BUSINESS_OWNER"
    )

    # 3. User C: Rival Enterprise (for IDOR attack tests)
    user_c = user_repo.create_user(
        email="rival.phase6@rivalcorp.in",
        password_hash=default_pass,
        full_name="Dinesh Singhania",
        role="BUSINESS_OWNER"
    )

    # 4. Super Admin
    admin_user = user_repo.create_user(
        email="admin.phase6@bizpermit.gov.in",
        password_hash=default_pass,
        full_name="Governance Director",
        role="SUPER_ADMIN"
    )

    # Business A (Manufacturing MSME)
    biz_a = biz_repo.create_business(
        owner_user_id=user_a["_id"],
        legal_name="Apex Precision Engineering Pvt Ltd",
        trade_name="Apex Engineering",
        entity_type="PRIVATE_LIMITED",
        pan="SCHEM1111A",
        industry_sector="MANUFACTURING",
        udyam_registration_number="UDYAM-GJ-01-0012345"
    )

    # Location A1 (Dholera, Gujarat - Valid MSME)
    loc_a1 = loc_repo.create_location(
        business_id=biz_a["_id"],
        location_name="Dholera High-Tech Fabrication Unit",
        facility_type="MANUFACTURING_PLANT",
        operational_status="OPERATIONAL",
        address={
            "line1": "Plot 45, Dholera SIR",
            "city": "Dholera",
            "district_code": "IN-GJ-AHM",
            "state_code": "IN-GJ",
            "pincode": "382455",
            "taluka": "Dholera"
        },
        jurisdiction_hierarchy={
            "state_code": "IN-GJ",
            "district_code": "IN-GJ-AHM",
            "taluka_code": "Dholera"
        },
        industrial_profile={
            "pollution_category": "ORANGE",
            "capital_investment_inr": 45000000,   # 4.5 Cr
            "plant_machinery_inr": 35000000,      # 3.5 Cr (Small Enterprise)
            "annual_turnover_inr": 120000000,     # 12 Cr
            "employment_count": 45,
            "commencement_date": "2024-01-15",    # Within 2022 policy window
            "sector": "MANUFACTURING",
            "has_gpcb_cte": True
        }
    )

    # Business B (Agro & Food Processing)
    biz_b = biz_repo.create_business(
        owner_user_id=user_b["_id"],
        legal_name="Zenith Agro Foods LLP",
        trade_name="Zenith Foods",
        entity_type="LLP",
        pan="SCHEM2222B",
        industry_sector="FOOD_PROCESSING"
    )

    # Location B1 (Maharashtra Pune Food Processing Facility)
    loc_b1 = loc_repo.create_location(
        business_id=biz_b["_id"],
        location_name="Pune Organic Processing Hub",
        facility_type="MANUFACTURING_PLANT",
        operational_status="OPERATIONAL",
        address={
            "line1": "Baramati MIDC Phase II",
            "city": "Baramati",
            "district_code": "IN-MH-PUN",
            "state_code": "IN-MH",
            "pincode": "413133",
            "taluka": "Baramati"
        },
        jurisdiction_hierarchy={
            "state_code": "IN-MH",
            "district_code": "IN-MH-PUN"
        },
        industrial_profile={
            "pollution_category": "GREEN",
            "capital_investment_inr": 20000000,
            "plant_machinery_inr": 15000000,
            "annual_turnover_inr": 40000000,
            "employment_count": 25,
            "commencement_date": "2024-06-01",
            "sector": "FOOD_PROCESSING",
            "has_pre_2024_effective_steps": False  # Uncertain transition!
        }
    )

    # Business C (Rival Enterprise for IDOR)
    biz_c = biz_repo.create_business(
        owner_user_id=user_c["_id"],
        legal_name="Rival Industrial Corp",
        entity_type="PRIVATE_LIMITED",
        pan="SCHEM3333C",
        industry_sector="CHEMICALS"
    )
    loc_c1 = loc_repo.create_location(
        business_id=biz_c["_id"],
        location_name="Rival Dahej Unit",
        facility_type="CHEMICAL_PLANT",
        operational_status="PROPOSED",
        address={"state_code": "IN-GJ", "city": "Dahej"},
        jurisdiction_hierarchy={"state_code": "IN-GJ"},
        industrial_profile={"pollution_category": "RED"}
    )

    # Vault documents for User A
    doc_a = doc_repo.create_document(
        owner_user_id=user_a["_id"],
        business_id=biz_a["_id"],
        document_name="GPCB CTE Consent 2024",
        document_category="ENVIRONMENTAL_DOCUMENT",
        original_filename="GPCB_CTE_Consent_2024.pdf",
        storage_object_path="vault/schem1111a/gpcb_cte.pdf",
        mime_type="application/pdf",
        file_size_bytes=204850,
        sha256_checksum="a" * 64,
        location_id=loc_a1["_id"]
    )

    # Vault document for User C (Rival)
    doc_c = doc_repo.create_document(
        owner_user_id=user_c["_id"],
        business_id=biz_c["_id"],
        document_name="Confidential Patent Doc",
        document_category="OTHER",
        original_filename="Confidential_Patent_Doc.pdf",
        storage_object_path="vault/schem3333c/patent.pdf",
        mime_type="application/pdf",
        file_size_bytes=1048576,
        sha256_checksum="c" * 64
    )

    # Token helpers
    token_a = generate_tokens_for_user(user_a)["access_token"]
    token_b = generate_tokens_for_user(user_b)["access_token"]
    token_c = generate_tokens_for_user(user_c)["access_token"]
    token_admin = generate_tokens_for_user(admin_user)["access_token"]

    client_a = APIClient()
    client_a.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

    client_b = APIClient()
    client_b.credentials(HTTP_AUTHORIZATION=f"Bearer {token_b}")

    client_c = APIClient()
    client_c.credentials(HTTP_AUTHORIZATION=f"Bearer {token_c}")

    client_admin = APIClient()
    client_admin.credentials(HTTP_AUTHORIZATION=f"Bearer {token_admin}")

    yield {
        "user_a": user_a,
        "user_b": user_b,
        "user_c": user_c,
        "admin_user": admin_user,
        "client_a": client_a,
        "client_b": client_b,
        "client_c": client_c,
        "client_admin": client_admin,
        "biz_a": biz_a,
        "loc_a1": loc_a1,
        "biz_b": biz_b,
        "loc_b1": loc_b1,
        "biz_c": biz_c,
        "loc_c1": loc_c1,
        "doc_a": doc_a,
        "doc_c": doc_c,
        "rec_repo": rec_repo,
        "app_repo": app_repo,
        "scheme_repo": scheme_repo
    }

    # Teardown
    user_repo.collection.delete_many({"email": {"$in": TEST_EMAILS}})
    biz_repo.collection.delete_many({"pan": {"$in": ["SCHEM1111A", "SCHEM2222B", "SCHEM3333C"]}})
    rec_repo.collection.delete_many({"user_id": {"$in": [user_a["_id"], user_b["_id"], user_c["_id"], admin_user["_id"]]}})
    rec_repo.pointers_collection.delete_many({"user_id": {"$in": [user_a["_id"], user_b["_id"], user_c["_id"], admin_user["_id"]]}})
    app_repo.collection.delete_many({"user_id": {"$in": [user_a["_id"], user_b["_id"], user_c["_id"], admin_user["_id"]]}})
    scheme_repo.collection.delete_many({"scheme_code": {"$regex": "^TEST-"}})
    scheme_repo.get_collection("scheme_admin_audit_logs").delete_many({"actor_id": admin_user["_id"]})


# =============================================================================
# 1. CGTMSE Classification & Tiered Coverage (CGS-I Updated 01/04/2025)
# =============================================================================
def test_01_cgtmse_classification_and_verified_tiered_coverage(schemes_setup):
    scheme = schemes_setup["scheme_repo"].find_by_code("IN-CEN-CGTMSE")
    assert scheme is not None
    assert scheme["financial_instrument_type"] == "CREDIT_GUARANTEE"

    eval_result = EligibilityEngine.evaluate(
        schemes_setup["loc_a1"],
        schemes_setup["biz_a"],
        scheme
    )
    assert eval_result["overall_eligibility"] == "ELIGIBLE"
    summary = eval_result["financial_summary"]
    assert summary["instrument_type"] == "CREDIT_GUARANTEE"
    assert summary["applicable_coverage_percentage"] == 75.0  # Standard Small Enterprise > 50L
    assert summary["lender_category_schedule"]["SCHEDULED_COMMERCIAL_BANKS_AND_SELECT_FI"] == 1000
    assert summary["lender_category_schedule"]["SFB_RRB_SFI_COOPERATIVE"] == 200
    assert summary["lender_category_schedule"]["MFI"] == 50


# =============================================================================
# 2. CGTMSE Facility Ceilings by Lender Category & Priority Slabs
# =============================================================================
def test_02_cgtmse_facility_ceiling_and_special_categories(schemes_setup):
    scheme = schemes_setup["scheme_repo"].find_by_code("IN-CEN-CGTMSE")

    # A. Micro + Women Owned Enterprise (<= 50L) -> 90% coverage per April 1, 2025 Schedule
    micro_loc = dict(schemes_setup["loc_a1"])
    micro_loc["industrial_profile"] = dict(micro_loc["industrial_profile"])
    micro_loc["industrial_profile"]["plant_machinery_inr"] = 400000  # 4 Lakh
    micro_loc["industrial_profile"]["requested_credit_facility_inr"] = 3500000  # 35 Lakh (<= 50L)
    
    micro_biz = dict(schemes_setup["biz_a"])
    micro_biz["is_women_owned"] = True

    eval_result = EligibilityEngine.evaluate(micro_loc, micro_biz, scheme)
    summary = eval_result["financial_summary"]
    assert summary["applicable_coverage_percentage"] == 90.0
    assert summary["guarantee_amount_inr"] == 3500000 * 0.90
    assert "Women" in summary["coverage_rule_explanation"]

    # B. Micro Enterprise <= 5L (General Category) -> 85% coverage
    micro_5l_loc = dict(micro_loc)
    micro_5l_loc["industrial_profile"] = dict(micro_loc["industrial_profile"])
    micro_5l_loc["industrial_profile"]["requested_credit_facility_inr"] = 450000  # 4.5 Lakh
    eval_5l = EligibilityEngine.evaluate(micro_5l_loc, schemes_setup["biz_a"], scheme)
    assert eval_5l["financial_summary"]["applicable_coverage_percentage"] == 85.0
    assert eval_5l["financial_summary"]["guarantee_amount_inr"] == 450000 * 0.85

    # C. Micro Enterprise > 5L (General Category, e.g. 20 Lakh) -> 75% coverage
    micro_20l_loc = dict(micro_loc)
    micro_20l_loc["industrial_profile"] = dict(micro_loc["industrial_profile"])
    micro_20l_loc["industrial_profile"]["requested_credit_facility_inr"] = 2000000  # 20 Lakh
    eval_20l = EligibilityEngine.evaluate(micro_20l_loc, schemes_setup["biz_a"], scheme)
    assert eval_20l["financial_summary"]["applicable_coverage_percentage"] == 75.0
    assert eval_20l["financial_summary"]["guarantee_amount_inr"] == 2000000 * 0.75

    # D. Special Priority: SC/ST / PwD / ZED / Aspirational / Transgender -> 85% coverage across all slabs
    sc_biz = dict(schemes_setup["biz_a"])
    sc_biz["is_sc_st_owned"] = True
    eval_sc = EligibilityEngine.evaluate(micro_20l_loc, sc_biz, scheme)
    assert eval_sc["financial_summary"]["applicable_coverage_percentage"] == 85.0

    # E. Agniveer Promoted Unit -> 90% coverage across all slabs
    agniveer_biz = dict(schemes_setup["biz_a"])
    agniveer_biz["is_agniveer_owned"] = True
    eval_agniveer = EligibilityEngine.evaluate(micro_20l_loc, agniveer_biz, scheme)
    assert eval_agniveer["financial_summary"]["applicable_coverage_percentage"] == 90.0

    # F. Regional: MSE in NER / J&K / Ladakh -> 80% up to 50L, 75% > 50L
    ner_loc = dict(micro_loc)
    ner_loc["address"] = dict(ner_loc["address"])
    ner_loc["address"]["state_code"] = "IN-AS"
    ner_loc["jurisdiction_hierarchy"] = {"state_code": "IN-AS"}
    ner_loc["industrial_profile"] = dict(micro_loc["industrial_profile"])
    ner_loc["industrial_profile"]["requested_credit_facility_inr"] = 3000000  # 30 Lakh
    eval_ner_30l = EligibilityEngine.evaluate(ner_loc, schemes_setup["biz_a"], scheme)
    assert eval_ner_30l["financial_summary"]["applicable_coverage_percentage"] == 80.0

    ner_loc["industrial_profile"]["requested_credit_facility_inr"] = 7000000  # 70 Lakh (> 50L)
    eval_ner_70l = EligibilityEngine.evaluate(ner_loc, schemes_setup["biz_a"], scheme)
    assert eval_ner_70l["financial_summary"]["applicable_coverage_percentage"] == 75.0
    assert eval_ner_70l["financial_summary"]["requires_internal_investment_grade_rating"] is True

    # G. Credit Deficient District (ICDD) -> +5 percentage points bonus
    icdd_biz = dict(schemes_setup["biz_a"])
    icdd_biz["is_credit_deficient_district"] = True
    eval_icdd = EligibilityEngine.evaluate(micro_20l_loc, icdd_biz, scheme)
    assert eval_icdd["financial_summary"]["applicable_coverage_percentage"] == 80.0  # 75% + 5%
    assert eval_icdd["financial_summary"]["is_credit_deficient_district"] is True

    # H. Lender Category Ceilings:
    # 1. Commercial Banks: ₹10 Crore (1000 Lakh) irrespective of trading activity
    trading_biz = dict(schemes_setup["biz_a"])
    trading_biz["lender_category"] = "SCHEDULED_COMMERCIAL_BANKS_AND_SELECT_FI"
    trading_loc = dict(micro_loc)
    trading_loc["industrial_profile"] = dict(micro_loc["industrial_profile"])
    trading_loc["industrial_profile"]["sector"] = "TRADING"
    eval_trading = EligibilityEngine.evaluate(trading_loc, trading_biz, scheme)
    assert eval_trading["financial_summary"]["max_facility_ceiling_lakh"] == 1000

    # 2. SFB / RRB: ₹200 Lakh (2 Crore)
    sfb_biz = dict(schemes_setup["biz_a"])
    sfb_biz["lender_category"] = "SFB_RRB_SFI_COOPERATIVE"
    eval_sfb = EligibilityEngine.evaluate(micro_loc, sfb_biz, scheme)
    assert eval_sfb["financial_summary"]["max_facility_ceiling_lakh"] == 200

    # 3. MFI: ₹50 Lakh
    mfi_biz = dict(schemes_setup["biz_a"])
    mfi_biz["lender_category"] = "MFI"
    eval_mfi = EligibilityEngine.evaluate(micro_loc, mfi_biz, scheme)
    assert eval_mfi["financial_summary"]["max_facility_ceiling_lakh"] == 50


# =============================================================================
# 3. PLI Auto Closed Intake vs Beneficiary Claims
# =============================================================================
def test_03_pli_auto_closed_intake_versus_active_claims(schemes_setup):
    scheme = schemes_setup["scheme_repo"].find_by_code("IN-CEN-PLI-AUTO")
    assert scheme["fresh_intake_status"] == "PERMANENTLY_CLOSED"
    assert scheme["beneficiary_claim_period"]["is_active"] is True
    assert "FY 2027-28" in scheme["implementation_period"]["notes"]

    eval_result = EligibilityEngine.evaluate(
        schemes_setup["loc_a1"],
        schemes_setup["biz_a"],
        scheme
    )
    assert eval_result["overall_eligibility"] == "INELIGIBLE"
    criterion = eval_result["criteria_results"][0]
    assert criterion["status"] == "UNMET"
    assert "PERMANENTLY_CLOSED" in criterion["actual_value"]


# =============================================================================
# 4. PM-KUSUM Extension vs Fresh Tender
# =============================================================================
def test_04_pm_kusum_extension_versus_fresh_tender(schemes_setup):
    scheme = schemes_setup["scheme_repo"].find_by_code("IN-CEN-PM-KUSUM-A")
    assert scheme["fresh_intake_status"] == "CLOSED_AWAITING_STATE_TENDER"
    assert scheme["operating_or_ppa_period"]["duration_years"] == 25

    # Manufacturing location evaluated against solar scheme -> Ineligible
    eval_ind = EligibilityEngine.evaluate(
        schemes_setup["loc_a1"],
        schemes_setup["biz_a"],
        scheme
    )
    assert eval_ind["overall_eligibility"] == "INELIGIBLE"

    # Solar location evaluated -> Needs manual confirmation for state tender
    solar_loc = dict(schemes_setup["loc_a1"])
    solar_loc["facility_type"] = "SOLAR_POWER_PLANT"
    solar_loc["industrial_profile"] = dict(solar_loc["industrial_profile"])
    solar_loc["industrial_profile"]["sector"] = "RENEWABLE_ENERGY"
    eval_solar = EligibilityEngine.evaluate(solar_loc, schemes_setup["biz_a"], scheme)
    assert eval_solar["overall_eligibility"] == "NEEDS_MANUAL_REVIEW"


# =============================================================================
# 5. PMKSY Expired EOI Blocks New Applications
# =============================================================================
def test_05_pmksy_expired_eoi_blocks_new_applications(schemes_setup):
    scheme = schemes_setup["scheme_repo"].find_by_code("IN-CEN-PMKSY-CEFPPC")
    assert scheme["fresh_intake_status"] == "CLOSED_AWAITING_NEXT_EOI"

    # API blocks application creation
    resp = schemes_setup["client_b"].post("/api/v1/scheme-applications/", {
        "location_id": str(schemes_setup["loc_b1"]["_id"]),
        "scheme_code": "IN-CEN-PMKSY-CEFPPC"
    })
    assert resp.status_code == 400
    assert "closed" in resp.data["error"]["message"].lower()


# =============================================================================
# 6. Maharashtra PSI Transition Uncertainty
# =============================================================================
def test_06_maharashtra_psi_transition_uncertainty(schemes_setup):
    scheme = schemes_setup["scheme_repo"].find_by_code("IN-MH-PSI-2019")
    
    # Location B1 has has_pre_2024_effective_steps: False
    eval_result = EligibilityEngine.evaluate(
        schemes_setup["loc_b1"],
        schemes_setup["biz_b"],
        scheme
    )
    assert eval_result["overall_eligibility"] == "NEEDS_MANUAL_REVIEW"
    crit = [c for c in eval_result["criteria_results"] if c["criterion_key"] == "transition_effective_steps"][0]
    assert crit["status"] == "MANUAL_CONFIRMATION_REQUIRED"

    # If effective steps documented -> Satisfied
    loc_with_steps = dict(schemes_setup["loc_b1"])
    loc_with_steps["industrial_profile"] = dict(loc_with_steps["industrial_profile"])
    loc_with_steps["industrial_profile"]["has_pre_2024_effective_steps"] = True
    eval_confirmed = EligibilityEngine.evaluate(loc_with_steps, schemes_setup["biz_b"], scheme)
    crit_confirmed = [c for c in eval_confirmed["criteria_results"] if c["criterion_key"] == "transition_effective_steps"][0]
    assert crit_confirmed["status"] == "SATISFIED"


# =============================================================================
# 7. Missing Evidence Is Never Satisfied
# =============================================================================
def test_07_missing_evidence_never_satisfied(schemes_setup):
    scheme = schemes_setup["scheme_repo"].find_by_code("IN-GJ-AATMA-2022")
    
    # Location missing Plant & Machinery investment
    incomplete_loc = dict(schemes_setup["loc_a1"])
    incomplete_loc["industrial_profile"] = dict(incomplete_loc["industrial_profile"])
    incomplete_loc["industrial_profile"]["plant_machinery_inr"] = None
    incomplete_loc["industrial_profile"]["capital_investment_inr"] = None

    eval_result = EligibilityEngine.evaluate(incomplete_loc, schemes_setup["biz_a"], scheme)
    assert eval_result["overall_eligibility"] == "MISSING_EVIDENCE"
    scale_crit = [c for c in eval_result["criteria_results"] if c["criterion_key"] == "enterprise_scale"][0]
    assert scale_crit["status"] == "MISSING_EVIDENCE"
    assert scale_crit["status"] != "SATISFIED"


# =============================================================================
# 8. Recommendation History Remains Append-Only
# =============================================================================
def test_08_recommendation_history_remains_append_only(schemes_setup):
    client = schemes_setup["client_a"]
    loc_id = str(schemes_setup["loc_a1"]["_id"])

    # First evaluation
    resp1 = client.post("/api/v1/schemes/evaluate/", {
        "location_id": loc_id,
        "scheme_code": "IN-GJ-AATMA-2022"
    })
    assert resp1.status_code == 200

    rec_repo = schemes_setup["rec_repo"]
    history1 = rec_repo.find_history_by_location(schemes_setup["loc_a1"]["_id"], "IN-GJ-AATMA-2022")
    count1 = len(history1)
    assert count1 >= 1

    # Second evaluation
    resp2 = client.post("/api/v1/schemes/evaluate/", {
        "location_id": loc_id,
        "scheme_code": "IN-GJ-AATMA-2022"
    })
    assert resp2.status_code == 200

    history2 = rec_repo.find_history_by_location(schemes_setup["loc_a1"]["_id"], "IN-GJ-AATMA-2022")
    assert len(history2) == count1 + 1

    # Verify latest pointer points to the most recent evaluation snapshot
    latest_rec = rec_repo.find_latest_by_location_and_scheme(schemes_setup["loc_a1"]["_id"], "IN-GJ-AATMA-2022")
    assert latest_rec is not None
    assert str(latest_rec["_id"]) == str(history2[0]["_id"])


# =============================================================================
# 9. Re-evaluation Preserves Old Records
# =============================================================================
def test_09_reevaluation_preserves_old_records(schemes_setup):
    loc_oid = schemes_setup["loc_a1"]["_id"]
    rec_repo = schemes_setup["rec_repo"]
    all_records = list(rec_repo.collection.find({"location_id": loc_oid, "scheme_code": "IN-GJ-AATMA-2022"}))
    assert len(all_records) >= 2
    # Verify exact snapshot hashes were retained
    for r in all_records:
        assert len(r.get("profile_snapshot_hash", "")) == 64


# =============================================================================
# 10. Rule Updates Invalidate Latest Evaluations
# =============================================================================
def test_10_rule_updates_invalidate_latest_evaluations(schemes_setup):
    rec_repo = schemes_setup["rec_repo"]
    modified = rec_repo.invalidate_by_scheme_rule_version("IN-GJ-AATMA-2022", "NEW_GAZETTE_AMENDMENT_2026")
    assert modified >= 1

    latest = rec_repo.find_latest_by_location_and_scheme(schemes_setup["loc_a1"]["_id"], "IN-GJ-AATMA-2022")
    assert latest["is_stale"] is True
    assert latest["invalidation_reason"] == "NEW_GAZETTE_AMENDMENT_2026"
    assert latest["invalidation_timestamp"] is not None


# =============================================================================
# 11. Profile Changes Invalidate Relevant Evaluations
# =============================================================================
def test_11_profile_changes_invalidate_relevant_evaluations(schemes_setup):
    # Re-evaluate to make it fresh
    schemes_setup["client_a"].post("/api/v1/schemes/evaluate/", {
        "location_id": str(schemes_setup["loc_a1"]["_id"]),
        "scheme_code": "IN-GJ-AATMA-2022"
    })
    rec_repo = schemes_setup["rec_repo"]
    latest_before = rec_repo.find_latest_by_location_and_scheme(schemes_setup["loc_a1"]["_id"], "IN-GJ-AATMA-2022")
    assert latest_before["is_stale"] is False

    # Simulate location profile change
    rec_repo.invalidate_latest_by_location(schemes_setup["loc_a1"]["_id"], "LOCATION_PROFILE_UPDATED")
    latest_after = rec_repo.find_latest_by_location_and_scheme(schemes_setup["loc_a1"]["_id"], "IN-GJ-AATMA-2022")
    assert latest_after["is_stale"] is True
    assert latest_after["invalidation_reason"] == "LOCATION_PROFILE_UPDATED"


# =============================================================================
# 12. Cross-Tenant Location and Application IDOR Defenses
# =============================================================================
def test_12_cross_tenant_location_and_application_idor(schemes_setup):
    # Rival Client C attempts to evaluate User A's location A1
    resp_eval = schemes_setup["client_c"].post("/api/v1/schemes/evaluate/", {
        "location_id": str(schemes_setup["loc_a1"]["_id"])
    })
    assert resp_eval.status_code in [403, 404]

    # User A creates a legitimate application
    resp_create = schemes_setup["client_a"].post("/api/v1/scheme-applications/", {
        "location_id": str(schemes_setup["loc_a1"]["_id"]),
        "scheme_code": "IN-GJ-AATMA-2022"
    })
    assert resp_create.status_code == 201
    app_id = resp_create.data["data"]["application"]["id"]

    # Rival Client C attempts to read User A's application
    resp_read = schemes_setup["client_c"].get(f"/api/v1/scheme-applications/{app_id}/")
    assert resp_read.status_code in [403, 404]

    # Rival Client C attempts to mutate User A's application
    resp_patch = schemes_setup["client_c"].patch(f"/api/v1/scheme-applications/{app_id}/", {
        "status": "READY_FOR_FILING"
    })
    assert resp_patch.status_code in [403, 404]


# =============================================================================
# 13. Application Creation Blocked for Closed or Unconfirmed Intake
# =============================================================================
def test_13_application_creation_blocked_for_closed_or_unconfirmed_intake(schemes_setup):
    client = schemes_setup["client_a"]
    loc_id = str(schemes_setup["loc_a1"]["_id"])

    # 1. PERMANENTLY_CLOSED: PLI Auto
    resp_pli = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-CEN-PLI-AUTO"
    })
    assert resp_pli.status_code == 400
    assert "closed" in resp_pli.data["error"]["message"].lower()

    # 2. CLOSED_AWAITING_NEXT_EOI: PMKSY-CEFPPC
    resp_pmksy = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-CEN-PMKSY-CEFPPC"
    })
    assert resp_pmksy.status_code == 400
    assert "closed" in resp_pmksy.data["error"]["message"].lower()

    # 3. CLOSED_AWAITING_STATE_TENDER: PM-KUSUM Component A
    resp_kusum = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-CEN-PM-KUSUM-A"
    })
    assert resp_kusum.status_code == 400
    assert "closed" in resp_kusum.data["error"]["message"].lower()

    # 4. TRANSITIONAL_LEGACY_ONLY: Maharashtra PSI 2019
    resp_psi = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-MH-PSI-2019"
    })
    assert resp_psi.status_code == 400
    assert "closed" in resp_psi.data["error"]["message"].lower()

    # 5. NEEDS_CONFIRMATION: Maharashtra MIISP 2025 & CLCSS
    resp_miisp = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-MH-MIISP-2025"
    })
    assert resp_miisp.status_code == 400
    assert "closed" in resp_miisp.data["error"]["message"].lower()

    resp_clcss = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-CEN-CLCSS"
    })
    assert resp_clcss.status_code == 400

    # 6. Legacy claim missing reference or sanction date must be rejected
    resp_bad_legacy1 = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-MH-PSI-2019",
        "is_legacy_claim": True,
        "legacy_approval_reference": ""  # empty reference
    })
    assert resp_bad_legacy1.status_code == 400

    resp_bad_legacy2 = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-MH-PSI-2019",
        "is_legacy_claim": True,
        "legacy_approval_reference": "DIC/PSI/2023/123",
        "legacy_sanction_date": ""  # empty sanction date
    })
    assert resp_bad_legacy2.status_code == 400

    # 7. Legacy claim attempted by rival on unowned location must be blocked with 404/403
    resp_bad_idor = schemes_setup["client_c"].post("/api/v1/scheme-applications/", {
        "location_id": loc_id,  # User A's location
        "scheme_code": "IN-MH-PSI-2019",
        "is_legacy_claim": True,
        "legacy_approval_reference": "DIC/PSI/2023/123",
        "legacy_sanction_date": "2023-10-15"
    })
    assert resp_bad_idor.status_code in [403, 404]


# =============================================================================
# 14. External Attestation Validation & Immutability
# =============================================================================
def test_14_external_attestation_validation_and_immutability(schemes_setup):
    client = schemes_setup["client_a"]
    loc_id = str(schemes_setup["loc_a1"]["_id"])

    # Create fresh application
    resp_create = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-GJ-AATMA-2022"
    })
    app_id = resp_create.data["data"]["application"]["id"]

    # Incomplete attestation (missing confirmation)
    resp_bad = client.post(f"/api/v1/scheme-applications/{app_id}/attest/", {
        "external_portal_name": "Gujarat Investor Facilitation Portal",
        "external_acknowledgement_number": "IFP/2026/GJ/1001",
        "external_submission_date": "2026-11-14",
        "attestation_confirmed": False
    })
    assert resp_bad.status_code == 400

    # Valid attestation
    resp_attest = client.post(f"/api/v1/scheme-applications/{app_id}/attest/", {
        "external_portal_name": "Gujarat Investor Facilitation Portal (IFP)",
        "external_acknowledgement_number": "IFP/2026/GJ/1001",
        "external_submission_date": "2026-11-14",
        "attestation_confirmed": True
    })
    assert resp_attest.status_code == 200
    app_data = resp_attest.data["data"]["application"]
    assert app_data["status"] == "USER_REPORTED_EXTERNAL_SUBMISSION"
    sub_record = app_data["external_submission"]
    assert sub_record["declaration_version"] == "v1.4-USER-SELF-ATTESTATION"
    assert "USER_REPORTED_EXTERNAL_SUBMISSION" in sub_record["disclaimer"]
    assert sub_record["explicit_user_confirmation"] is True
    assert sub_record["actor_email"] == schemes_setup["user_a"]["email"]

    # Immutability Defense: Attempting further update must fail
    resp_locked = client.patch(f"/api/v1/scheme-applications/{app_id}/", {
        "status": "DRAFT"
    })
    assert resp_locked.status_code == 400
    assert "locked" in resp_locked.data["error"]["message"].lower()


# =============================================================================
# 15. Future Submission Dates Rejected
# =============================================================================
def test_15_future_submission_dates_rejected(schemes_setup):
    client = schemes_setup["client_a"]
    loc_id = str(schemes_setup["loc_a1"]["_id"])

    resp_create = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-GJ-AATMA-2022"
    })
    app_id = resp_create.data["data"]["application"]["id"]

    future_date = (datetime.now(timezone.utc) + timedelta(days=10)).strftime("%Y-%m-%d")
    resp_future = client.post(f"/api/v1/scheme-applications/{app_id}/attest/", {
        "external_portal_name": "Gujarat IFP",
        "external_acknowledgement_number": "IFP/9999",
        "external_submission_date": future_date,
        "attestation_confirmed": True
    })
    assert resp_future.status_code == 400
    assert "future" in resp_future.data["error"]["message"].lower()


# =============================================================================
# 16. Existing Vault Document Ownership Enforced
# =============================================================================
def test_16_existing_vault_document_ownership_enforced(schemes_setup):
    client = schemes_setup["client_a"]
    loc_id = str(schemes_setup["loc_a1"]["_id"])

    resp_create = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-GJ-AATMA-2022"
    })
    app_id = resp_create.data["data"]["application"]["id"]

    # 1. Attach own document doc_a -> Success
    resp_attach_own = client.post(f"/api/v1/scheme-applications/{app_id}/documents/", {
        "vault_document_id": str(schemes_setup["doc_a"]["_id"]),
        "document_category": "ENVIRONMENTAL_CLEARANCE"
    })
    assert resp_attach_own.status_code == 200

    # 2. Attach Rival User C's document doc_c -> Forbidden
    resp_attach_rival = client.post(f"/api/v1/scheme-applications/{app_id}/documents/", {
        "vault_document_id": str(schemes_setup["doc_c"]["_id"]),
        "document_category": "PATENT"
    })
    assert resp_attach_rival.status_code in [403, 404]


# =============================================================================
# 17. Prototype Disclaimers Included in Outputs
# =============================================================================
def test_17_prototype_disclaimers_included_in_relevant_outputs(schemes_setup):
    client = schemes_setup["client_a"]
    loc_id = str(schemes_setup["loc_a1"]["_id"])

    resp_eval = client.post("/api/v1/schemes/evaluate/", {
        "location_id": loc_id,
        "scheme_code": "IN-GJ-AATMA-2022"
    })
    assert resp_eval.status_code == 200
    eval_item = resp_eval.data["data"]["evaluations"][0]
    assert len(eval_item.get("disclaimers", [])) > 0
    assert any("SIH26130" in d for d in eval_item["disclaimers"])


# =============================================================================
# 18. Maharashtra MIISP-2025: Publication vs Operational Intake Distinction
# =============================================================================
def test_18_maharashtra_miisp_2025_publication_vs_operational_intake(schemes_setup):
    scheme = schemes_setup["scheme_repo"].find_by_code("IN-MH-MIISP-2025")
    assert scheme is not None
    assert scheme["fresh_intake_status"] == "NEEDS_CONFIRMATION"

    # Evaluate for Maharashtra plant
    eval_result = EligibilityEngine.evaluate(
        schemes_setup["loc_b1"],
        schemes_setup["biz_b"],
        scheme
    )
    criteria_map = {c["criterion_key"]: c for c in eval_result["criteria_results"]}
    
    # Policy was published on 31/12/2025 -> SATISFIED
    assert criteria_map["policy_publication_status"]["status"] == "SATISFIED"
    assert "31/12/2025" in criteria_map["policy_publication_status"]["explanation"]
    
    # Operational guidelines & portal intake are pending -> MANUAL_CONFIRMATION_REQUIRED
    assert criteria_map["policy_operational_status"]["status"] == "MANUAL_CONFIRMATION_REQUIRED"
    assert eval_result["overall_eligibility"] == "NEEDS_MANUAL_REVIEW"


# =============================================================================
# 19. Super Admin Scheme Management Auth & Lifecycle
# =============================================================================
def test_19_super_admin_scheme_management_auth_and_crud(schemes_setup):
    # 1. Non-super admin receives 403 Forbidden
    resp_forbidden = schemes_setup["client_a"].post("/api/v1/admin/schemes/", {
        "scheme_code": "TEST-SCHEME-403",
        "name": "Unauthorized Scheme",
        "short_name": "Unauth",
        "description": "Attempted by business owner",
        "authority_level": "STATE",
        "state_code": "IN-GJ",
        "financial_instrument_type": "CAPITAL_SUBSIDY"
    })
    assert resp_forbidden.status_code == 403

    # 2. Super Admin successfully creates scheme in DRAFT / UNVERIFIED state
    test_code = "TEST-SCHEME-01"
    schemes_setup["scheme_repo"].collection.delete_many({"scheme_code": test_code})
    
    resp_create = schemes_setup["client_admin"].post("/api/v1/admin/schemes/", {
        "scheme_code": test_code,
        "name": "Test Industrial Technology Subsidy 2026",
        "short_name": "Test Tech Subsidy",
        "description": "Comprehensive grant assistance for industrial units adopting clean technology.",
        "authority_level": "STATE",
        "state_code": "IN-GJ",
        "department_code": "IND",
        "financial_instrument_type": "CAPITAL_SUBSIDY",
        "scheme_rule_version": "1.0",
        "statutory_reference": {
            "notification_number": "TEST/GR/2026/01",
            "guidelines_title": "Clean Tech Assistance Guidelines",
            "source_url": "https://test-department.gov.in/guidelines.pdf",
            "issuing_authority": "Department of Industries"
        },
        "declarative_rules": [
            {
                "criterion_id": "rule_state_gj",
                "criterion_type": "STATE_MATCH",
                "operator": "EQ",
                "value": "IN-GJ",
                "required_evidence": "LOCATION_PROFILE",
                "label": "Plant must be in Gujarat"
            }
        ]
    }, format="json")
    assert resp_create.status_code == 201
    scheme_data = resp_create.data["data"]["scheme"]
    assert scheme_data["scheme_code"] == test_code
    assert scheme_data["verification_status"] == "UNVERIFIED"
    assert scheme_data["is_active"] is False

    # 3. Super Admin updates metadata
    resp_update = schemes_setup["client_admin"].patch(f"/api/v1/admin/schemes/{test_code}/", {
        "short_name": "Clean Tech Subsidy 2026"
    })
    assert resp_update.status_code == 200
    assert resp_update.data["data"]["scheme"]["short_name"] == "Clean Tech Subsidy 2026"

    # 4. Super Admin adds new rule version
    resp_rules = schemes_setup["client_admin"].post(f"/api/v1/admin/schemes/{test_code}/rules/", {
        "version": "1.1",
        "rules": [
            {
                "criterion_id": "rule_state_gj",
                "criterion_type": "STATE_MATCH",
                "operator": "EQ",
                "value": "IN-GJ",
                "required_evidence": "LOCATION_PROFILE",
                "label": "Plant must be in Gujarat"
            },
            {
                "criterion_id": "rule_scale_micro_small",
                "criterion_type": "ENTERPRISE_SIZE",
                "operator": "IN",
                "value": ["MICRO", "SMALL"],
                "required_evidence": "UDYAM_CERTIFICATE",
                "label": "Enterprise size must be Micro or Small"
            }
        ]
    }, format="json")
    assert resp_rules.status_code == 201

    # 5. Check history endpoint captures administrative audit log
    resp_history = schemes_setup["client_admin"].get(f"/api/v1/admin/schemes/{test_code}/history/")
    assert resp_history.status_code == 200
    assert len(resp_history.data["data"]["audit_logs"]) >= 3


# =============================================================================
# 20. Super Admin: Unverified Scheme Cannot Be Activated
# =============================================================================
def test_20_super_admin_unverified_scheme_cannot_activate(schemes_setup):
    test_code = "TEST-SCHEME-01"

    # 1. Attempt to activate unverified scheme -> Must be rejected with 400
    resp_act_bad = schemes_setup["client_admin"].post(f"/api/v1/admin/schemes/{test_code}/activate/", {
        "version": "1.1",
        "fresh_intake_status": "OPEN"
    })
    assert resp_act_bad.status_code == 400
    assert "verified" in resp_act_bad.data["error"]["message"].lower()

    # 2. Submit for verification
    resp_sub = schemes_setup["client_admin"].post(f"/api/v1/admin/schemes/{test_code}/submit-verification/", {})
    assert resp_sub.status_code == 200
    assert resp_sub.data["data"]["scheme"]["verification_status"] == "UNDER_VERIFICATION"

    # 3. Formally verify statutory evidence
    resp_ver = schemes_setup["client_admin"].post(f"/api/v1/admin/schemes/{test_code}/verify/", {
        "decision": "VERIFIED",
        "notes": "Verified against official gazette publication and valid departmental portal.",
        "verified_source_url": "https://test-department.gov.in/guidelines.pdf"
    })
    assert resp_ver.status_code == 200
    assert resp_ver.data["data"]["scheme"]["verification_status"] == "VERIFIED"

    # 4. Now activation succeeds
    resp_act = schemes_setup["client_admin"].post(f"/api/v1/admin/schemes/{test_code}/activate/", {
        "version": "1.1",
        "fresh_intake_status": "OPEN"
    })
    assert resp_act.status_code == 200
    activated = resp_act.data["data"]["scheme"]
    assert activated["is_active"] is True
    assert activated["fresh_intake_status"] == "OPEN"
    assert activated["active_rule_version"] == "1.1"


# =============================================================================
# 21. Data-Driven Declarative Rules Evaluation Engine
# =============================================================================
def test_21_data_driven_declarative_rules_evaluator(schemes_setup):
    scheme_doc = {
        "scheme_code": "TEST-DECLARATIVE-01",
        "scheme_rule_version": "1.0",
        "declarative_rules": [
            {
                "criterion_id": "rule_state",
                "criterion_type": "STATE_MATCH",
                "operator": "EQ",
                "value": "IN-GJ",
                "required_evidence": "LOCATION_PROFILE",
                "label": "State Match"
            },
            {
                "criterion_id": "rule_scale",
                "criterion_type": "ENTERPRISE_SIZE",
                "operator": "IN",
                "value": ["MICRO", "SMALL"],
                "required_evidence": "UDYAM_CERTIFICATE",
                "label": "Enterprise Size"
            },
            {
                "criterion_id": "rule_msme",
                "criterion_type": "MSME_REGISTRATION",
                "operator": "EXISTS",
                "value": True,
                "required_evidence": "UDYAM_REGISTRATION",
                "label": "MSME Registration"
            }
        ]
    }

    # 1. Matching location -> ELIGIBLE
    eval_ok = EligibilityEngine.evaluate(schemes_setup["loc_a1"], schemes_setup["biz_a"], scheme_doc)
    assert eval_ok["overall_eligibility"] == "ELIGIBLE"
    assert all(c["status"] == "SATISFIED" for c in eval_ok["criteria_results"])

    # 2. Location missing profile field -> MISSING_EVIDENCE
    incomplete_loc = dict(schemes_setup["loc_a1"])
    incomplete_loc["jurisdiction_hierarchy"] = {}
    incomplete_loc["address"] = {}
    eval_missing = EligibilityEngine.evaluate(incomplete_loc, schemes_setup["biz_a"], scheme_doc)
    assert eval_missing["overall_eligibility"] == "MISSING_EVIDENCE"
    state_crit = [c for c in eval_missing["criteria_results"] if c["criterion_key"] == "rule_state"][0]
    assert state_crit["status"] == "MISSING_EVIDENCE"

    # 3. Invalid operator safely rejected during validation
    with pytest.raises(ValueError) as exc:
        from apps.schemes.services.eligibility_engine import DeclarativeRuleValidator
        DeclarativeRuleValidator.validate_rule({
            "criterion_id": "bad_rule",
            "criterion_type": "STATE_MATCH",
            "operator": "INVALID_OP_INJECTION",
            "value": "IN-GJ"
        })
    assert "operator" in str(exc.value).lower()


# =============================================================================
# 22. Dossier Lifecycle & Legacy Claim Intake Guard
# =============================================================================
def test_22_dossier_lifecycle_and_legacy_claim_intake_guard(schemes_setup):
    client = schemes_setup["client_a"]
    loc_id = str(schemes_setup["loc_a1"]["_id"])

    # 1. Ordinary fresh application for closed scheme (PLI Auto) -> Blocked (400)
    resp_bad = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-CEN-PLI-AUTO"
    })
    assert resp_bad.status_code == 400
    assert "closed" in resp_bad.data["error"]["message"].lower()

    # 2. Legacy claim with required reference -> Allowed
    resp_legacy = client.post("/api/v1/scheme-applications/", {
        "location_id": loc_id,
        "scheme_code": "IN-CEN-PLI-AUTO",
        "is_legacy_claim": True,
        "legacy_approval_reference": "PLI/AUTO/2022/CHAMPION-042",
        "legacy_sanction_date": "2022-03-15"
    })
    assert resp_legacy.status_code == 201
    app_id = resp_legacy.data["data"]["application"]["id"]
    assert resp_legacy.data["data"]["application"]["status"] == "DRAFT"

    # 3. Attaching Document transitions status to DOCUMENT_ASSEMBLY
    resp_doc = client.post(f"/api/v1/scheme-applications/{app_id}/documents/", {
        "vault_document_id": str(schemes_setup["doc_a"]["_id"]),
        "document_category": "SANCTION_ORDER"
    })
    assert resp_doc.status_code == 200
    assert resp_doc.data["data"]["application"]["status"] == "DOCUMENT_ASSEMBLY"

    # 4. Updating status to READY_FOR_FILING succeeds
    resp_ready = client.patch(f"/api/v1/scheme-applications/{app_id}/", {
        "status": "READY_FOR_FILING"
    })
    assert resp_ready.status_code == 200
    assert resp_ready.data["data"]["application"]["status"] == "READY_FOR_FILING"


# =============================================================================
# 23. Concurrency-Safe Pointers & Immutability of Historical Snapshots
# =============================================================================
def test_23_concurrency_safe_pointer_updates(schemes_setup):
    loc_oid = schemes_setup["loc_a1"]["_id"]
    scheme_code = "IN-GJ-AATMA-2022"
    rec_repo = schemes_setup["rec_repo"]

    # 1. Trigger evaluation
    resp1 = schemes_setup["client_a"].post("/api/v1/schemes/evaluate/", {
        "location_id": str(loc_oid),
        "scheme_code": scheme_code
    })
    assert resp1.status_code == 200
    eval1_id = resp1.data["data"]["evaluations"][0]["id"]

    # Read original snapshot document from collection
    snap1 = rec_repo.collection.find_one({"_id": rec_repo.to_object_id(eval1_id)})
    assert snap1 is not None
    original_created_at = snap1["created_at"]
    original_criteria = list(snap1["criteria_results"])

    # 2. Trigger second evaluation
    resp2 = schemes_setup["client_a"].post("/api/v1/schemes/evaluate/", {
        "location_id": str(loc_oid),
        "scheme_code": scheme_code
    })
    assert resp2.status_code == 200
    eval2_id = resp2.data["data"]["evaluations"][0]["id"]
    assert eval2_id != eval1_id

    # 3. Verify snap1 document was NEVER mutated
    snap1_after = rec_repo.collection.find_one({"_id": rec_repo.to_object_id(eval1_id)})
    assert snap1_after["created_at"] == original_created_at
    assert snap1_after["criteria_results"] == original_criteria
    assert snap1_after["profile_snapshot_hash"] == snap1["profile_snapshot_hash"]

    # 4. Verify pointer points to latest evaluation
    pointer = rec_repo.pointers_collection.find_one({
        "location_id": loc_oid,
        "scheme_code": scheme_code
    })
    assert pointer is not None
    assert str(pointer["latest_recommendation_id"]) == str(eval2_id)
    assert pointer["is_valid"] is True
