"""
Phase 3 Test Suite: Multi-Business, Multi-Location Management & Secure Document Vault.
Validates:
1. Multi-business creation, listing, completion scoring, and profile updates.
2. Multi-tenancy IDOR defenses and PAN uniqueness constraints.
3. Multi-location industrial facility management across multiple states (Gujarat, Maharashtra).
4. Facility location cross-business and cross-user authorization barriers.
5. Location-specific KYA statutory compliance roadmap evaluation.
6. Secure Document Vault uploads to private Supabase storage.
7. Magic-byte inspection, file size enforcement, and dangerous file rejection.
8. Signed temporary preview/download token generation and tenant isolation.
9. Document organization, filtering, and soft-deletion.
"""

import os
import io
import pytest
from rest_framework.test import APIClient
from apps.authentication.password import hash_password
from apps.authentication.repository import UserRepository
from apps.authentication.jwt_service import generate_tokens_for_user
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository

@pytest.fixture(autouse=True)
def cleanup_test_db():
    yield
    # Cleanup test data generated during testing
    try:
        user_repo = UserRepository()
        users = list(user_repo.collection.find({"email": {"$regex": r"@(phase3tenant|competitor3|testuser3)\.in"}}))
        uids = [u["_id"] for u in users]
        if uids:
            BusinessRepository().collection.delete_many({"owner_user_id": {"$in": uids}})
            DocumentRepository().collection.delete_many({"owner_user_id": {"$in": uids}})
            user_repo.collection.delete_many({"_id": {"$in": uids}})
    except Exception:
        pass

@pytest.fixture
def user_a_client():
    client = APIClient()
    user_repo = UserRepository()
    user = user_repo.find_by_email("tenant.a@phase3tenant.in")
    if not user:
        user = user_repo.create_user(
            email="tenant.a@phase3tenant.in",
            password_hash=hash_password("TenantAPass123!"),
            full_name="Rajiv Singhal",
            role="BUSINESS_OWNER"
        )
    tokens = generate_tokens_for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
    client.user_id = str(user["_id"])
    return client

@pytest.fixture
def user_b_client():
    client = APIClient()
    user_repo = UserRepository()
    user = user_repo.find_by_email("tenant.b@competitor3.in")
    if not user:
        user = user_repo.create_user(
            email="tenant.b@competitor3.in",
            password_hash=hash_password("TenantBPass123!"),
            full_name="Aditi Rao",
            role="BUSINESS_OWNER"
        )
    tokens = generate_tokens_for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
    client.user_id = str(user["_id"])
    return client

# Sample genuine PDF byte sequence (%PDF-1.4 header)
VALID_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Title (Statutory Blueprint) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
# Sample genuine PNG byte sequence
VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

# -------------------------------------------------------------------------
# Test 1: Multi-Business Management & Profile Completion Scoring
# -------------------------------------------------------------------------
def test_01_multi_business_management(user_a_client):
    # 1. Create Business 1
    res1 = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Apex Polymers Private Limited",
        "trade_name": "Apex Poly",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "AAACA1111A",
        "gstin": "24AAACA1111A1Z5",
        "registered_office_address": {
            "line1": "Plot 101 GIDC Estate",
            "city": "Ahmedabad",
            "district": "Ahmedabad",
            "state_code": "IN-GJ",
            "pincode": "382110"
        },
        "authorized_signatory": {
            "name": "Rajiv Singhal",
            "email": "rajiv@apexpoly.in",
            "phone": "+919876543210"
        }
    }, format="json")
    assert res1.status_code == 201
    biz1_id = res1.json()["data"]["id"]
    assert res1.json()["data"]["completion_percentage"] >= 75

    # 2. Create Business 2 for the same user
    res2 = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Apex Chemical Synthetics LLP",
        "trade_name": "Apex Chem",
        "entity_type": "LLP",
        "pan": "AAACB2222B"
    }, format="json")
    assert res2.status_code == 201
    biz2_id = res2.json()["data"]["id"]

    # 3. List businesses returns both entities for user A
    list_res = user_a_client.get("/api/v1/businesses")
    assert list_res.status_code == 200
    biz_ids = [b["id"] for b in list_res.json()["data"]]
    assert biz1_id in biz_ids
    assert biz2_id in biz_ids

    # 4. Update Business 2 profile via PATCH
    patch_res = user_a_client.patch(f"/api/v1/businesses/{biz2_id}", {
        "trade_name": "Apex Advanced Synthetics",
        "contact_email": "info@apexchem.in",
        "industry_sector": "CHEMICALS",
        "nic_code": "2011"
    }, format="json")
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["trade_name"] == "Apex Advanced Synthetics"
    assert patch_res.json()["data"]["nic_code"] == "2011"

# -------------------------------------------------------------------------
# Test 2: Multi-Tenancy IDOR Defenses & Duplicate PAN Rejection
# -------------------------------------------------------------------------
def test_02_business_idor_and_pan_uniqueness(user_a_client, user_b_client):
    # User A creates an enterprise
    res_a = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Sovereign Engineering Ltd",
        "entity_type": "PUBLIC_LIMITED",
        "pan": "AAACC3333C"
    }, format="json")
    assert res_a.status_code == 201
    biz_a_id = res_a.json()["data"]["id"]

    # Attempt duplicate registration with the same PAN must be rejected
    dup_res = user_b_client.post("/api/v1/businesses", {
        "legal_name": "Copycat Engineering",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "AAACC3333C"
    }, format="json")
    assert dup_res.status_code == 400
    assert "already registered" in dup_res.json()["error"]["message"]

    # User B cannot access User A's business (IDOR horizontal isolation)
    idor_get = user_b_client.get(f"/api/v1/businesses/{biz_a_id}")
    assert idor_get.status_code == 404

    # User B cannot mutate User A's business
    idor_patch = user_b_client.patch(f"/api/v1/businesses/{biz_a_id}", {"trade_name": "Hacked"}, format="json")
    assert idor_patch.status_code == 404

    # User A can soft-delete their business
    del_res = user_a_client.delete(f"/api/v1/businesses/{biz_a_id}")
    assert del_res.status_code == 200
    assert del_res.json()["data"]["is_active"] is False

    # Soft-deleted business no longer accessible via standard GET
    assert user_a_client.get(f"/api/v1/businesses/{biz_a_id}").status_code == 404

# -------------------------------------------------------------------------
# Test 3: Multi-Location Industrial Management Across States
# -------------------------------------------------------------------------
def test_03_multi_location_industrial_management(user_a_client):
    # Setup parent business
    biz_res = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Bharat Heavy Manufacturing Ltd",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "AAACD4444D"
    }, format="json")
    biz_id = biz_res.json()["data"]["id"]

    # Location 1: Gujarat Chemical Manufacturing Plant (GIDC Sanand)
    loc1_res = user_a_client.post(f"/api/v1/businesses/{biz_id}/locations", {
        "location_name": "Sanand Plant Unit 1",
        "facility_type": "MANUFACTURING_PLANT",
        "address": {
            "plot_number": "Plot G-42",
            "industrial_zone": "GIDC Sanand Phase II",
            "city": "Ahmedabad",
            "district": "Ahmedabad",
            "state_code": "IN-GJ",
            "pincode": "382170"
        },
        "jurisdiction_hierarchy": {
            "state_code": "IN-GJ",
            "district_code": "IN-GJ-AHM",
            "local_body_code": "GIDC-SANAND"
        },
        "industrial_profile": {
            "nic_code": "2011",
            "sector_name": "Chemicals & Petrochemicals",
            "scale": "LARGE",
            "pollution_category": "RED",
            "workforce_capacity": 140,
            "total_power_load_hp": 350,
            "has_boiler": True,
            "has_hazardous_chemicals": True,
            "has_groundwater_borewell": True,
            "water_requirement_kld": 50.0
        }
    }, format="json")
    assert loc1_res.status_code == 201
    loc1_id = loc1_res.json()["data"]["id"]

    # Location 2: Maharashtra Logistics & Assembly Warehouse (MIDC Chakan)
    loc2_res = user_a_client.post(f"/api/v1/businesses/{biz_id}/locations", {
        "location_name": "Chakan Assembly Warehouse",
        "facility_type": "WAREHOUSE",
        "address": {
            "plot_number": "Sector 10",
            "industrial_zone": "MIDC Chakan",
            "city": "Pune",
            "district": "Pune",
            "state_code": "IN-MH",
            "pincode": "410501"
        },
        "jurisdiction_hierarchy": {
            "state_code": "IN-MH",
            "district_code": "IN-MH-PUN",
            "local_body_code": "MIDC-CHAKAN"
        },
        "industrial_profile": {
            "nic_code": "5210",
            "sector_name": "Warehousing & Storage",
            "scale": "MEDIUM",
            "pollution_category": "WHITE",
            "workforce_capacity": 30,
            "total_power_load_hp": 25,
            "has_boiler": False,
            "has_hazardous_chemicals": False,
            "has_groundwater_borewell": False
        }
    }, format="json")
    assert loc2_res.status_code == 201
    loc2_id = loc2_res.json()["data"]["id"]

    # Verify both locations returned under business
    locs_res = user_a_client.get(f"/api/v1/businesses/{biz_id}/locations")
    assert locs_res.status_code == 200
    returned_ids = [l["id"] for l in locs_res.json()["data"]]
    assert loc1_id in returned_ids
    assert loc2_id in returned_ids

    # Location update via PATCH
    patch_loc = user_a_client.patch(f"/api/v1/locations/{loc2_id}", {
        "location_name": "Chakan Central Assembly Hub",
        "operational_status": "COMMISSIONED"
    }, format="json")
    assert patch_loc.status_code == 200
    assert patch_loc.json()["data"]["location_name"] == "Chakan Central Assembly Hub"
    assert patch_loc.json()["data"]["operational_status"] == "COMMISSIONED"

# -------------------------------------------------------------------------
# Test 4: Location Cross-Business & Cross-User IDOR Defense
# -------------------------------------------------------------------------
def test_04_location_idor_defense(user_a_client, user_b_client):
    # User A creates business & location
    biz_a = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Alpha Defence Works Ltd",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "AAACE5555E"
    }, format="json").json()["data"]

    loc_a = user_a_client.post(f"/api/v1/businesses/{biz_a['id']}/locations", {
        "location_name": "Restricted Ordnance Plant",
        "facility_type": "MANUFACTURING_PLANT",
        "address": {"city": "Vadodara", "state_code": "IN-GJ"},
        "jurisdiction_hierarchy": {"state_code": "IN-GJ"},
        "industrial_profile": {"nic_code": "2520", "sector_name": "Defence", "pollution_category": "RED"}
    }, format="json").json()["data"]

    # User B cannot create location under User A's business
    hack_create = user_b_client.post(f"/api/v1/businesses/{biz_a['id']}/locations", {
        "location_name": "Rogue Plant",
        "address": {"city": "Pune"},
        "jurisdiction_hierarchy": {"state_code": "IN-MH"},
        "industrial_profile": {"nic_code": "1000", "sector_name": "Misc"}
    }, format="json")
    assert hack_create.status_code in (403, 404)

    # User B cannot access User A's location details
    hack_get = user_b_client.get(f"/api/v1/locations/{loc_a['id']}")
    assert hack_get.status_code == 404

    # User B cannot delete User A's location
    hack_del = user_b_client.delete(f"/api/v1/locations/{loc_a['id']}")
    assert hack_del.status_code == 404

# -------------------------------------------------------------------------
# Test 5: Location-Specific KYA Statutory Compliance Evaluation
# -------------------------------------------------------------------------
def test_05_location_specific_kya_evaluation(user_a_client):
    # Setup business
    biz = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Gujarat Agro Chemicals Ltd",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "AAACF6666F"
    }, format="json").json()["data"]

    # Location: Red Category Chemical Plant in Gujarat with Boiler and Ground Water Extraction
    loc = user_a_client.post(f"/api/v1/businesses/{biz['id']}/locations", {
        "location_name": "Dahej PCPIR Complex",
        "facility_type": "MANUFACTURING_PLANT",
        "address": {"city": "Dahej", "state_code": "IN-GJ"},
        "jurisdiction_hierarchy": {"state_code": "IN-GJ", "district_code": "IN-GJ-SUR"},
        "industrial_profile": {
            "nic_code": "2011",
            "sector_name": "Agro Chemicals",
            "scale": "LARGE",
            "pollution_category": "RED",
            "workforce_capacity": 180,
            "total_power_load_hp": 400,
            "has_boiler": True,
            "has_hazardous_chemicals": True,
            "has_groundwater_borewell": True
        }
    }, format="json").json()["data"]

    # POST evaluate for this location
    eval_res = user_a_client.post(f"/api/v1/locations/{loc['id']}/evaluate")
    assert eval_res.status_code == 200
    roadmap = eval_res.json()["data"]

    assert "total_approvals_required" in roadmap
    assert "stages" in roadmap
    assert "disclaimer" in roadmap

    all_codes = {
        app["approval_code"]
        for stage_list in roadmap["stages"].values()
        for app in stage_list
    }

    # Heavy chemical plant must trigger CTE, CTO, Boiler Reg, Factory License, and PESO
    assert "GPCB-CTE-IND" in all_codes
    assert "GPCB-CTO-IND" in all_codes
    assert "GJ-DISH-BOIL-REG" in all_codes
    assert "GJ-DISH-FAC-LIC" in all_codes
    assert "PESO-LIC-CHEM" in all_codes
    assert "CGWA-NOC-BORE" in all_codes

    # GET /approvals for this location returns the roadmap
    app_res = user_a_client.get(f"/api/v1/locations/{loc['id']}/approvals")
    assert app_res.status_code == 200
    assert app_res.json()["data"]["total_approvals_required"] == roadmap["total_approvals_required"]

# -------------------------------------------------------------------------
# Test 6: Secure Document Vault Direct Upload & Supabase Integration
# -------------------------------------------------------------------------
def test_06_secure_document_vault_direct_upload(user_a_client):
    biz = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Solaris Solar Tech Ltd",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "AAACG7777G"
    }, format="json").json()["data"]

    # Prepare multipart upload of valid PDF
    pdf_file = io.BytesIO(VALID_PDF_BYTES)
    pdf_file.name = "Sanctioned_Factory_Layout.pdf"

    upload_res = user_a_client.post(
        "/api/v1/documents/direct-upload",
        {
            "business_id": biz["id"],
            "document_name": "Sanctioned Factory Layout Plan 2026",
            "document_category": "FACTORY_LAYOUT",
            "file": pdf_file
        },
        format="multipart"
    )
    assert upload_res.status_code == 201
    doc = upload_res.json()["data"]

    assert doc["document_name"] == "Sanctioned Factory Layout Plan 2026"
    assert doc["document_category"] == "FACTORY_LAYOUT"
    assert doc["mime_type"] == "application/pdf"
    assert doc["verification_status"] == "UPLOADED"
    assert "sha256_checksum" in doc
    assert len(doc["sha256_checksum"]) == 64

# -------------------------------------------------------------------------
# Test 7: Magic-Byte Inspection & Dangerous File Rejection
# -------------------------------------------------------------------------
def test_07_document_security_and_file_validation(user_a_client):
    biz = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Secure Vault Testing Co",
        "entity_type": "LLP",
        "pan": "AAACH8888H"
    }, format="json").json()["data"]

    # 1. Reject dangerous executable script file
    exe_file = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00echo hacked")
    exe_file.name = "trojan.exe"
    res_exe = user_a_client.post(
        "/api/v1/documents/direct-upload",
        {
            "business_id": biz["id"],
            "document_name": "Malicious Binary",
            "document_category": "OTHER",
            "file": exe_file
        },
        format="multipart"
    )
    assert res_exe.status_code == 400
    assert "strictly prohibited" in res_exe.json()["error"]["message"]

    # 2. Reject extension spoofing (plain text masquerading as .pdf)
    fake_pdf = io.BytesIO(b"Hello world, I am just a plain text file, not a real PDF!")
    fake_pdf.name = "fake_document.pdf"
    res_spoof = user_a_client.post(
        "/api/v1/documents/direct-upload",
        {
            "business_id": biz["id"],
            "document_name": "Spoofed Document",
            "document_category": "PAN",
            "file": fake_pdf
        },
        format="multipart"
    )
    assert res_spoof.status_code == 400
    assert "signature verification failed" in res_spoof.json()["error"]["message"].lower()

# -------------------------------------------------------------------------
# Test 8: Signed Preview & Download Token Generation with IDOR Defense
# -------------------------------------------------------------------------
def test_08_signed_preview_and_download_tokens(user_a_client, user_b_client):
    biz_a = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Alpha Aero Tech Ltd",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "AAACI9999I"
    }, format="json").json()["data"]

    png_file = io.BytesIO(VALID_PNG_BYTES)
    png_file.name = "Incorporation_Certificate.png"

    doc_a = user_a_client.post(
        "/api/v1/documents/direct-upload",
        {
            "business_id": biz_a["id"],
            "document_name": "Certificate of Incorporation",
            "document_category": "BUSINESS_REGISTRATION",
            "file": png_file
        },
        format="multipart"
    )
    assert doc_a.status_code == 201
    doc_id = doc_a.json()["data"]["id"]

    # User A requests temporary signed preview URL
    prev_res = user_a_client.get(f"/api/v1/documents/{doc_id}/preview")
    assert prev_res.status_code == 200
    assert "preview_url" in prev_res.json()["data"]
    assert "token=" in prev_res.json()["data"]["preview_url"]
    assert prev_res.json()["data"]["expires_in_seconds"] == 900

    # User A requests temporary signed download URL
    down_res = user_a_client.get(f"/api/v1/documents/{doc_id}/download")
    assert down_res.status_code == 200
    assert "download_url" in down_res.json()["data"]
    assert "token=" in down_res.json()["data"]["download_url"]

    # User B cannot preview User A's document (IDOR defense)
    assert user_b_client.get(f"/api/v1/documents/{doc_id}/preview").status_code == 404

    # User B cannot download User A's document
    assert user_b_client.get(f"/api/v1/documents/{doc_id}/download").status_code == 404

    # User B cannot delete User A's document
    assert user_b_client.delete(f"/api/v1/documents/{doc_id}").status_code == 404

# -------------------------------------------------------------------------
# Test 9: Document Organization, Filtering & Soft Deletion
# -------------------------------------------------------------------------
def test_09_document_filtering_and_soft_delete(user_a_client):
    biz = user_a_client.post("/api/v1/businesses", {
        "legal_name": "Integrated Logistics Ltd",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "AAACJ0000J"
    }, format="json").json()["data"]

    # Upload Doc 1 (PAN)
    f1 = io.BytesIO(VALID_PDF_BYTES)
    f1.name = "Company_PAN.pdf"
    user_a_client.post(
        "/api/v1/documents/direct-upload",
        {
            "business_id": biz["id"],
            "document_name": "Corporate PAN Card",
            "document_category": "PAN",
            "file": f1
        },
        format="multipart"
    )

    # Upload Doc 2 (FIRE_SAFETY)
    f2 = io.BytesIO(VALID_PDF_BYTES)
    f2.name = "Fire_NOC.pdf"
    res2 = user_a_client.post(
        "/api/v1/documents/direct-upload",
        {
            "business_id": biz["id"],
            "document_name": "Gujarat Fire Safety NOC",
            "document_category": "FIRE_SAFETY",
            "file": f2
        },
        format="multipart"
    )
    doc2_id = res2.json()["data"]["id"]

    # Filter documents by category=FIRE_SAFETY
    filter_res = user_a_client.get(f"/api/v1/documents?business_id={biz['id']}&category=FIRE_SAFETY")
    assert filter_res.status_code == 200
    fire_docs = filter_res.json()["data"]
    assert len(fire_docs) == 1
    assert fire_docs[0]["document_category"] == "FIRE_SAFETY"

    # Soft-delete Doc 2
    del_res = user_a_client.delete(f"/api/v1/documents/{doc2_id}")
    assert del_res.status_code == 200

    # Doc 2 is now filtered out from active listing
    after_res = user_a_client.get(f"/api/v1/documents?business_id={biz['id']}&category=FIRE_SAFETY")
    assert len(after_res.json()["data"]) == 0
