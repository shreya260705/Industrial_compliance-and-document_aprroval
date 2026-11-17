"""
Phase 2 Test Suite: National Jurisdiction, Department Directory & Approval Catalogue Engine.
Validates:
1. National Geographical Data (All 28 States + 8 UTs = 36 jurisdictions).
2. Sub-state Hierarchy & Lineage traversal.
3. Department Directory discovery and multi-parameter filtering.
4. Department RBAC governance (Super Admin write-access only).
5. Statutory Approval Catalogue multi-criteria filtering and details.
6. Approval Catalogue RBAC governance.
7. Deterministic KYA Rule-Based Applicability Engine evaluations across profiles.
8. Pagination and robust error handling.
"""

import pytest
from rest_framework.test import APIClient
from apps.authentication.password import hash_password
from apps.authentication.repository import UserRepository
from apps.authentication.jwt_service import generate_tokens_for_user

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def admin_client():
    client = APIClient()
    user_repo = UserRepository()
    admin = user_repo.find_by_email("superadmin.test@bizpermit.gov.in")
    if not admin:
        admin = user_repo.create_user(
            email="superadmin.test@bizpermit.gov.in",
            password_hash=hash_password("SuperAdminSecret123!"),
            full_name="National Super Admin",
            role="SUPER_ADMIN"
        )
    tokens = generate_tokens_for_user(admin)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
    return client

@pytest.fixture
def business_client():
    client = APIClient()
    user_repo = UserRepository()
    user = user_repo.find_by_email("businessowner.test@horizonauto.in")
    if not user:
        user = user_repo.create_user(
            email="businessowner.test@horizonauto.in",
            password_hash=hash_password("OwnerSecret123!"),
            full_name="Rajesh Patel",
            role="BUSINESS_OWNER"
        )
    tokens = generate_tokens_for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
    return client

@pytest.fixture
def officer_client():
    client = APIClient()
    user_repo = UserRepository()
    officer = user_repo.find_by_email("officer.test@gpcb.gov.in")
    if not officer:
        officer = user_repo.create_user(
            email="officer.test@gpcb.gov.in",
            password_hash=hash_password("OfficerSecret123!"),
            full_name="Officer Sanjay Mehta",
            role="DEPARTMENT_OFFICER",
            officer_profile={
                "department_code": "GPCB-ENV",
                "jurisdiction_code": "IN-GJ",
                "designation": "Regional Officer",
                "badge_number": "GPCB-9901"
            }
        )
    tokens = generate_tokens_for_user(officer)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
    return client

# -------------------------------------------------------------------------
# Test 1: Complete 28 States and 8 Union Territories
# -------------------------------------------------------------------------
def test_01_all_36_states_and_uts_exist(client):
    res = client.get("/api/v1/jurisdictions/states")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]

    # Must contain exactly 28 states + 8 UTs = 36 entities
    assert len(data) == 36, f"Expected 36 states and UTs, got {len(data)}"
    
    # Verify standard ISO-3166-2:IN prefixes and tiers
    states = [item for item in data if item["tier"] == "STATE"]
    uts = [item for item in data if item["tier"] == "UT"]
    assert len(states) == 28, f"Expected 28 states, got {len(states)}"
    assert len(uts) == 8, f"Expected 8 union territories, got {len(uts)}"

    # Check key sample states and UTs are properly populated
    codes = {item["code"] for item in data}
    expected_sample_codes = {"IN-GJ", "IN-MH", "IN-KA", "IN-TN", "IN-UP", "IN-DL", "IN-JK", "IN-CH"}
    assert expected_sample_codes.issubset(codes)

    # Check metadata integrity
    gj = next(item for item in data if item["code"] == "IN-GJ")
    assert gj["name"] == "Gujarat"
    assert gj["capital"] == "Gandhinagar"
    assert gj["zone"] == "WEST"

# -------------------------------------------------------------------------
# Test 2: Sub-State Hierarchy & Lineage Traversal
# -------------------------------------------------------------------------
def test_02_jurisdiction_hierarchy_and_children(client):
    # Retrieve children of Gujarat (IN-GJ)
    res_children = client.get("/api/v1/jurisdictions/IN-GJ/children")
    assert res_children.status_code == 200
    children = res_children.json()["data"]
    child_codes = {c["code"] for c in children}
    assert "IN-GJ-AHM" in child_codes

    # Lineage lookup for GIDC Sanand Industrial Estate
    res_hierarchy = client.get("/api/v1/jurisdictions/GIDC-SANAND/hierarchy")
    assert res_hierarchy.status_code == 200
    hierarchy = res_hierarchy.json()["data"]
    assert hierarchy["target"]["code"] == "GIDC-SANAND"
    assert hierarchy["target"]["tier"] == "INDUSTRIAL_ZONE"

    # Lineage must traverse downwards: National -> Gujarat -> Ahmedabad District -> GIDC
    lineage_codes = [ancestor["code"] for ancestor in hierarchy["lineage"]]
    assert lineage_codes == ["IN", "IN-GJ", "IN-GJ-AHM", "GIDC-SANAND"]

# -------------------------------------------------------------------------
# Test 3: Statutory Department Directory & Multi-Parameter Filtering
# -------------------------------------------------------------------------
def test_03_department_directory_list_and_filters(client):
    # 1. Total list
    res_all = client.get("/api/v1/departments")
    assert res_all.status_code == 200
    all_depts = res_all.json()["data"]
    assert len(all_depts) >= 15

    # 2. Filter by tier=CENTRAL
    res_central = client.get("/api/v1/departments?tier=CENTRAL")
    assert res_central.status_code == 200
    central_depts = res_central.json()["data"]
    for dept in central_depts:
        assert dept["tier"] == "CENTRAL"
    central_codes = {d["department_code"] for d in central_depts}
    assert "CPCB-ENV" in central_codes
    assert "PESO-EXP" in central_codes

    # 3. Filter by state_code=IN-GJ & tier=STATE
    res_gj = client.get("/api/v1/departments?tier=STATE&state_code=IN-GJ")
    assert res_gj.status_code == 200
    gj_depts = res_gj.json()["data"]
    for dept in gj_depts:
        assert dept["state_code"] == "IN-GJ"
    gj_codes = {d["department_code"] for d in gj_depts}
    assert "GPCB-ENV" in gj_codes
    assert "GJ-FIRE" in gj_codes

    # 4. Search query
    res_search = client.get("/api/v1/departments?search=Pollution")
    assert res_search.status_code == 200
    search_depts = res_search.json()["data"]
    assert len(search_depts) >= 2
    for d in search_depts:
        assert "pollution" in d["name"].lower() or "cpcb" in d["department_code"].lower() or "gpcb" in d["department_code"].lower()

# -------------------------------------------------------------------------
# Test 4: Department RBAC Governance
# -------------------------------------------------------------------------
def test_04_department_rbac_governance(client, business_client, officer_client, admin_client):
    new_dept_payload = {
        "department_code": "TEST-DEPT-01",
        "name": "Test Regional Development Authority",
        "tier": "LOCAL",
        "state_code": "IN-MH",
        "jurisdiction_code": "IN-MH-PUN",
        "regulatory_areas": ["BUILDING", "PLANNING"],
        "official_website": "https://puda.test.gov.in",
        "verification_status": "DEMO"
    }

    # 1. Anonymous creation must be blocked
    res_anon = client.post("/api/v1/departments", new_dept_payload, format="json")
    assert res_anon.status_code in (401, 403)

    # 2. Business Owner creation must be blocked
    res_owner = business_client.post("/api/v1/departments", new_dept_payload, format="json")
    assert res_owner.status_code == 403

    # 3. Department Officer creation must be blocked (Officers cannot add departments)
    res_officer = officer_client.post("/api/v1/departments", new_dept_payload, format="json")
    assert res_officer.status_code == 403

    # 4. Super Admin creation must succeed
    res_admin = admin_client.post("/api/v1/departments", new_dept_payload, format="json")
    assert res_admin.status_code == 201
    assert res_admin.json()["data"]["department_code"] == "TEST-DEPT-01"

# -------------------------------------------------------------------------
# Test 5: Approval Catalogue Multi-Filter & Search
# -------------------------------------------------------------------------
def test_05_approval_catalogue_filtering_and_search(client):
    # 1. Total approvals
    res_all = client.get("/api/v1/approvals")
    assert res_all.status_code == 200
    approvals = res_all.json()["data"]
    assert len(approvals) >= 14

    # 2. Filter by authority_level=CENTRAL
    res_central = client.get("/api/v1/approvals?authority_level=CENTRAL")
    assert res_central.status_code == 200
    central_items = res_central.json()["data"]
    for item in central_items:
        assert item["tier"] == "CENTRAL"

    # 3. Filter by stage=PRE_ESTABLISHMENT
    res_pre_est = client.get("/api/v1/approvals?stage=PRE_ESTABLISHMENT")
    assert res_pre_est.status_code == 200
    for item in res_pre_est.json()["data"]:
        assert item["stage"] == "PRE_ESTABLISHMENT"

    # 4. Detailed approval verification
    res_detail = client.get("/api/v1/approvals/GPCB-CTE-IND")
    assert res_detail.status_code == 200
    detail = res_detail.json()["data"]
    assert detail["approval_code"] == "GPCB-CTE-IND"
    assert detail["standard_sla_days"] == 45
    assert len(detail["document_checklist"]) >= 3
    assert detail["official_portal_url"] == "https://gpcb.gujarat.gov.in"
    assert detail["verification_status"] in ("VERIFIED", "NEEDS_REVIEW", "DEMO")

# -------------------------------------------------------------------------
# Test 6: Approval RBAC Governance
# -------------------------------------------------------------------------
def test_06_approval_rbac_governance(business_client, officer_client, admin_client):
    new_approval_payload = {
        "approval_code": "TEST-APP-NOC",
        "title": "Special Industrial Environmental Permit",
        "description": "Prototype approval for industrial testing",
        "tier": "STATE",
        "department_code": "GPCB-ENV",
        "state_code": "IN-GJ",
        "stage": "PRE_ESTABLISHMENT",
        "standard_sla_days": 30,
        "verification_status": "DEMO"
    }

    # 1. Business Owner must be rejected
    res_owner = business_client.post("/api/v1/approvals", new_approval_payload, format="json")
    assert res_owner.status_code == 403

    # 2. Officer must be rejected
    res_officer = officer_client.post("/api/v1/approvals", new_approval_payload, format="json")
    assert res_officer.status_code == 403

    # 3. Super Admin must succeed
    res_admin = admin_client.post("/api/v1/approvals", new_approval_payload, format="json")
    assert res_admin.status_code == 201
    assert res_admin.json()["data"]["approval_code"] == "TEST-APP-NOC"

# -------------------------------------------------------------------------
# Test 7: Rule-Based Applicability Engine (KYA Evaluation)
# -------------------------------------------------------------------------
def test_07_kya_applicability_evaluation_engine(client):
    # Scenario A: Red Category Chemical Plant in Gujarat with Boiler and Hazardous Chemicals
    heavy_industry_payload = {
        "state_code": "IN-GJ",
        "district_code": "IN-GJ-AHM",
        "scale": "LARGE",
        "pollution_category": "RED",
        "workforce_capacity": 150,
        "total_power_load_hp": 300,
        "has_boiler": True,
        "has_hazardous_chemicals": True
    }

    res_heavy = client.post("/api/v1/kya/evaluate", heavy_industry_payload, format="json")
    assert res_heavy.status_code == 200
    heavy_data = res_heavy.json()["data"]

    # Verify breakdown structure
    assert "total_approvals_required" in heavy_data
    assert "estimated_cumulative_sla_days" in heavy_data
    assert "stages" in heavy_data
    assert "evaluated_parameters" in heavy_data

    stages = heavy_data["stages"]
    all_codes = {
        app["approval_code"]
        for stage_list in stages.values()
        for app in stage_list
    }

    # Heavy chemical plant MUST trigger:
    # 1. State Consent to Establish (CTE)
    assert "GPCB-CTE-IND" in all_codes
    # 2. Factory License
    assert "GJ-DISH-FAC-LIC" in all_codes
    # 3. PESO Petroleum / Chemical license
    assert "PESO-LIC-CHEM" in all_codes
    # 4. State Boiler Registration
    assert "GJ-DISH-BOIL-REG" in all_codes
    # 5. Fire Safety NOC
    assert "GJ-FIRE-NOC-IND" in all_codes

    # Grouped stages verification
    assert len(stages["PRE_ESTABLISHMENT"]) >= 2
    assert len(stages["PRE_OPERATION"]) >= 2

    # Scenario B: IT / Software Services in Karnataka (White Category, No Boiler, No hazardous chemicals)
    it_service_payload = {
        "state_code": "IN-KA",
        "district_code": "IN-KA-BLR",
        "scale": "SMALL",
        "pollution_category": "WHITE",
        "workforce_capacity": 25,
        "total_power_load_hp": 15,
        "has_boiler": False,
        "has_hazardous_chemicals": False
    }

    res_it = client.post("/api/v1/kya/evaluate", it_service_payload, format="json")
    assert res_it.status_code == 200
    it_data = res_it.json()["data"]
    it_codes = {
        app["approval_code"]
        for stage_list in it_data["stages"].values()
        for app in stage_list
    }

    # IT / White category MUST NOT trigger pollution CTE or Boilers or PESO hazardous approvals!
    assert "GPCB-CTE-IND" not in it_codes
    assert "PESO-LIC-CHEM" not in it_codes
    assert "GJ-DISH-BOIL-REG" not in it_codes

# -------------------------------------------------------------------------
# Test 8: Pagination, Edge Cases & Error Handling
# -------------------------------------------------------------------------
def test_08_pagination_and_error_handling(client):
    # 1. Pagination verification
    res_page = client.get("/api/v1/approvals?page=1&page_size=2")
    assert res_page.status_code == 200
    page_data = res_page.json()
    assert len(page_data["data"]) == 2
    assert page_data["meta"]["pagination"]["page"] == 1
    assert page_data["meta"]["pagination"]["page_size"] == 2
    assert page_data["meta"]["pagination"]["total_records"] >= 14

    # 2. Non-existent jurisdiction detail -> 404
    res_not_found_j = client.get("/api/v1/jurisdictions/IN-UNKNOWN-XX")
    assert res_not_found_j.status_code == 404

    # 3. Non-existent approval detail -> 404
    res_not_found_a = client.get("/api/v1/approvals/NON-EXISTENT-APPROVAL-99")
    assert res_not_found_a.status_code == 404

    # 4. Non-existent department detail -> 404
    res_not_found_d = client.get("/api/v1/departments/NON-EXISTENT-DEPT-99")
    assert res_not_found_d.status_code == 404

    # 5. Invalid evaluation request (invalid choice for pollution_category) -> 400
    res_invalid_kya = client.post("/api/v1/kya/evaluate", {"state_code": "IN-GJ", "pollution_category": "ULTRA_VIOLET"}, format="json")
    assert res_invalid_kya.status_code == 400

    # 6. Invalid evaluation request (unknown state code) -> 400
    res_bad_state = client.post("/api/v1/kya/evaluate", {"state_code": "INVALID-UNKNOWN-STATE"}, format="json")
    assert res_bad_state.status_code == 400
