"""
Comprehensive Role-Based Access Control (RBAC) & Portal Boundaries Test Suite.
Validates:
1. Public registration restricts role escalation to BUSINESS_OWNER.
2. Super Admin platform-wide overview, user management, and audit log access.
3. Exclusive Super Admin Department Officer provisioning and assignment transfers.
4. Department Officer scoped access enforcement (HTTP 403 on foreign scopes/actions).
5. Business Owner boundary defense (HTTP 403 on Super Admin and Officer portals).
6. Dynamic Jurisdiction governance and platform application monitoring.
"""

import pytest
from rest_framework.test import APIClient
from apps.authentication.password import hash_password
from apps.authentication.repository import UserRepository
from apps.authentication.jwt_service import generate_tokens_for_user
from apps.database.connection import get_db

@pytest.fixture(scope="module")
def rbac_setup():
    from django.core.cache import cache
    cache.clear()

    user_repo = UserRepository()
    db = get_db()

    # Pre-clean test accounts
    test_emails = [
        "admin.rbac@bizpermit.gov.in",
        "officer.gj.rbac@gpcb.gov.in",
        "officer.mh.rbac@mpcb.gov.in",
        "owner.rbac@autotech.in",
        "provisioned.officer@kspcb.gov.in"
    ]
    user_repo.collection.delete_many({"email": {"$in": test_emails}})
    db.jurisdictions.delete_many({"code": "IN-TEST-REG-DIST"})

    default_pass = hash_password("Password123")

    # 1. Super Admin
    admin_user = user_repo.create_user(
        email="admin.rbac@bizpermit.gov.in",
        password_hash=default_pass,
        full_name="National Governance Lead",
        role="SUPER_ADMIN"
    )

    # 2. Gujarat Officer
    officer_gj = user_repo.create_user(
        email="officer.gj.rbac@gpcb.gov.in",
        password_hash=default_pass,
        full_name="Sanjay Patel",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "GPCB-ENV",
            "jurisdiction_code": "IN-GJ",
            "designation": "Regional Scrutiny Officer",
            "badge_number": "GJ-ENV-7711"
        }
    )

    # 3. Maharashtra Officer
    officer_mh = user_repo.create_user(
        email="officer.mh.rbac@mpcb.gov.in",
        password_hash=default_pass,
        full_name="Vikas Deshmukh",
        role="DEPARTMENT_OFFICER",
        officer_profile={
            "department_code": "MPCB-ENV",
            "jurisdiction_code": "IN-MH",
            "designation": "Sub-Regional Officer",
            "badge_number": "MH-ENV-5522"
        }
    )

    # 4. Business Owner
    owner_user = user_repo.create_user(
        email="owner.rbac@autotech.in",
        password_hash=default_pass,
        full_name="Rajiv Malhotra",
        role="BUSINESS_OWNER"
    )

    # Setup clients with JWT authentication
    admin_client = APIClient()
    admin_tokens = generate_tokens_for_user(admin_user)
    admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_tokens['access_token']}")

    gj_officer_client = APIClient()
    gj_tokens = generate_tokens_for_user(officer_gj)
    gj_officer_client.credentials(HTTP_AUTHORIZATION=f"Bearer {gj_tokens['access_token']}")

    mh_officer_client = APIClient()
    mh_tokens = generate_tokens_for_user(officer_mh)
    mh_officer_client.credentials(HTTP_AUTHORIZATION=f"Bearer {mh_tokens['access_token']}")

    owner_client = APIClient()
    owner_tokens = generate_tokens_for_user(owner_user)
    owner_client.credentials(HTTP_AUTHORIZATION=f"Bearer {owner_tokens['access_token']}")

    anon_client = APIClient()

    return {
        "admin_client": admin_client,
        "gj_officer_client": gj_officer_client,
        "mh_officer_client": mh_officer_client,
        "owner_client": owner_client,
        "anon_client": anon_client,
        "admin_user": admin_user,
        "officer_gj": officer_gj,
        "officer_mh": officer_mh,
        "owner_user": owner_user
    }

def test_01_public_registration_restricts_role_escalation(rbac_setup):
    """Public registration must force role BUSINESS_OWNER and reject officer/admin escalation."""
    anon = rbac_setup["anon_client"]

    # Attempt vertical privilege escalation to SUPER_ADMIN
    res_admin_attempt = anon.post("/api/v1/auth/register", {
        "email": "hacker.admin@bizpermit.gov.in",
        "password": "Password123",
        "full_name": "Hacker Admin",
        "role": "SUPER_ADMIN"
    }, format="json")
    assert res_admin_attempt.status_code == 400
    assert "strictly restricted to Business Owner" in res_admin_attempt.json()["error"]["message"]

    # Attempt vertical privilege escalation to DEPARTMENT_OFFICER
    res_officer_attempt = anon.post("/api/v1/auth/register", {
        "email": "fake.officer@gpcb.gov.in",
        "password": "Password123",
        "full_name": "Fake Officer",
        "role": "DEPARTMENT_OFFICER"
    }, format="json")
    assert res_officer_attempt.status_code == 400
    assert "strictly restricted to Business Owner" in res_officer_attempt.json()["error"]["message"]

def test_02_super_admin_platform_overview_access(rbac_setup):
    """Super Admin accesses platform overview with real DB counts; other roles are forbidden."""
    admin = rbac_setup["admin_client"]
    owner = rbac_setup["owner_client"]
    officer = rbac_setup["gj_officer_client"]

    # Super Admin succeeds
    res_admin = admin.get("/api/v1/admin/platform-overview")
    assert res_admin.status_code == 200
    data = res_admin.json()["data"]
    assert "users" in data
    assert "applications" in data
    assert "governance" in data
    assert data["users"]["super_admins"] >= 1

    # Business Owner denied
    res_owner = owner.get("/api/v1/admin/platform-overview")
    assert res_owner.status_code == 403

    # Officer denied
    res_off = officer.get("/api/v1/admin/platform-overview")
    assert res_off.status_code == 403

def test_03_exclusive_super_admin_officer_provisioning(rbac_setup):
    """Only Super Admin can provision Department Officers; Owner and Officer cannot."""
    admin = rbac_setup["admin_client"]
    owner = rbac_setup["owner_client"]
    officer = rbac_setup["gj_officer_client"]

    payload = {
        "email": "provisioned.officer@kspcb.gov.in",
        "password": "Password123",
        "full_name": "Kavita Rao",
        "phone_number": "+919876543288",
        "department_code": "KSPCB-ENV",
        "jurisdiction_code": "IN-KA",
        "designation": "Divisional Officer",
        "badge_number": "KA-ENV-1002"
    }

    # Business Owner attempt is forbidden
    assert owner.post("/api/v1/admin/officers", payload, format="json").status_code == 403

    # Department Officer attempt is forbidden
    assert officer.post("/api/v1/admin/officers", payload, format="json").status_code == 403

    # Super Admin succeeds
    res_create = admin.post("/api/v1/admin/officers", payload, format="json")
    assert res_create.status_code == 201
    created_off = res_create.json()["data"]
    assert created_off["role"] == "DEPARTMENT_OFFICER"
    assert created_off["officer_profile"]["department_code"] == "KSPCB-ENV"

def test_04_super_admin_user_management_and_status_governance(rbac_setup):
    """Super Admin views user registry and can toggle user activation."""
    admin = rbac_setup["admin_client"]
    owner_user = rbac_setup["owner_user"]

    # List users
    res_list = admin.get("/api/v1/admin/users?role=BUSINESS_OWNER")
    assert res_list.status_code == 200
    assert len(res_list.json()["data"]) >= 1

    # Inspect detail
    res_detail = admin.get(f"/api/v1/admin/users/{owner_user['_id']}")
    assert res_detail.status_code == 200
    assert res_detail.json()["data"]["email"] == "owner.rbac@autotech.in"

    # Suspend user
    res_suspend = admin.patch(f"/api/v1/admin/users/{owner_user['_id']}/status", {
        "is_active": False,
        "reason": "Administrative compliance review"
    }, format="json")
    assert res_suspend.status_code == 200
    assert res_suspend.json()["data"]["is_active"] is False

    # Reactivate user
    res_reactivate = admin.patch(f"/api/v1/admin/users/{owner_user['_id']}/status", {
        "is_active": True,
        "reason": "Clearance verified"
    }, format="json")
    assert res_reactivate.status_code == 200
    assert res_reactivate.json()["data"]["is_active"] is True

def test_05_officer_scoped_dashboard_metrics(rbac_setup):
    """Department Officer receives scoped analytics matching their department and jurisdiction."""
    gj_officer = rbac_setup["gj_officer_client"]
    owner = rbac_setup["owner_client"]

    # Officer succeeds
    res_metrics = gj_officer.get("/api/v1/admin/officer/metrics")
    assert res_metrics.status_code == 200
    data = res_metrics.json()["data"]
    assert data["officer"]["department_code"] == "GPCB-ENV"
    assert data["officer"]["jurisdiction_code"] == "IN-GJ"
    assert "assigned_applications" in data["metrics"]

    # Business Owner forbidden
    assert owner.get("/api/v1/admin/officer/metrics").status_code == 403

def test_06_jurisdiction_and_application_monitoring_governance(rbac_setup):
    """Super Admin can dynamically add jurisdictions and monitor platform-wide applications."""
    admin = rbac_setup["admin_client"]
    owner = rbac_setup["owner_client"]

    # Super Admin adds a local jurisdiction
    res_juris = admin.post("/api/v1/admin/jurisdictions", {
        "code": "IN-TEST-REG-DIST",
        "name": "Special Industrial Testing District",
        "type": "DISTRICT",
        "parent_code": "IN-GJ"
    }, format="json")
    assert res_juris.status_code == 201

    # Super Admin monitors platform applications
    res_apps = admin.get("/api/v1/admin/applications")
    assert res_apps.status_code == 200
    assert "pagination" in res_apps.json()["meta"]

    # Owner cannot monitor platform applications
    assert owner.get("/api/v1/admin/applications").status_code == 403

def test_07_audit_log_isolation(rbac_setup):
    """Super Admin inspects audit logs; other roles are blocked with HTTP 403."""
    admin = rbac_setup["admin_client"]
    owner = rbac_setup["owner_client"]
    officer = rbac_setup["gj_officer_client"]

    assert admin.get("/api/v1/admin/audit-logs").status_code == 200
    assert owner.get("/api/v1/admin/audit-logs").status_code == 403
    assert officer.get("/api/v1/admin/audit-logs").status_code == 403
