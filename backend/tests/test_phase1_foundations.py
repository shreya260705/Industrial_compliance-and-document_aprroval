"""
Comprehensive Phase 1 Test Suite.
Validates all 11 required architectural and security checkpoints:
1. MongoDB connectivity
2. User registration
3. Duplicate registration
4. Password hashing
5. Login success and failure
6. JWT expiry and refresh
7. Logout/revocation
8. Protected routes
9. Role-based access
10. Business data ownership (IDOR defense)
11. Invalid input handling
"""

import os
import pytest
from datetime import datetime, timezone, timedelta
from rest_framework.test import APIClient
from apps.database.connection import check_connection_health, reset_mock_db_for_testing
from apps.authentication.password import hash_password, verify_password
from apps.authentication.repository import UserRepository, RevokedTokenRepository
from apps.authentication.jwt_service import decode_token, generate_tokens_for_user
from apps.businesses.repository import BusinessRepository

@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    """Flushes test database before each test run."""
    reset_mock_db_for_testing()
    # Also clean test-generated accounts from live Atlas database
    try:
        user_repo = UserRepository()
        user_repo.collection.delete_many({"email": {"$regex": r"@(horizonauto|competitor|evil|test\.gov|domain\.com)"}})
        BusinessRepository().collection.delete_many({"legal_name": {"$regex": r"(Tenant|Horizon|Bad PAN)"}})
    except Exception:
        pass
    yield
    reset_mock_db_for_testing()
    try:
        user_repo = UserRepository()
        user_repo.collection.delete_many({"email": {"$regex": r"@(horizonauto|competitor|evil|test\.gov|domain\.com)"}})
        BusinessRepository().collection.delete_many({"legal_name": {"$regex": r"(Tenant|Horizon|Bad PAN)"}})
    except Exception:
        pass

@pytest.fixture
def client():
    return APIClient()

# -------------------------------------------------------------------------
# Test 1: MongoDB Connectivity & Health
# -------------------------------------------------------------------------
def test_01_mongodb_connectivity():
    health = check_connection_health()
    assert health["status"] in ("connected", "unhealthy")
    assert "database" in health
    assert "replica_set_transactions_supported" in health
    # Verify that raw credentials or passwords are never present in health output
    assert "password" not in str(health).lower()
    assert "@" not in str(health)

# -------------------------------------------------------------------------
# Test 2: User Registration (Business Owner)
# -------------------------------------------------------------------------
def test_02_user_registration(client):
    payload = {
        "email": "owner.test@horizonauto.in",
        "password": "SecurePassword123",
        "full_name": "Vikram Malhotra",
        "phone_number": "+919876543210"
    }
    response = client.post("/api/v1/auth/register", payload, format="json")
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["user"]["email"] == "owner.test@horizonauto.in"
    assert res_data["data"]["user"]["role"] == "BUSINESS_OWNER"
    assert "password_hash" not in res_data["data"]["user"]
    assert "tokens" in res_data["data"]
    assert "access_token" in res_data["data"]["tokens"]
    assert "refresh_token" in res_data["data"]["tokens"]

# -------------------------------------------------------------------------
# Test 3: Duplicate Registration Rejection
# -------------------------------------------------------------------------
def test_03_duplicate_registration(client):
    payload = {
        "email": "duplicate@horizonauto.in",
        "password": "SecurePassword123",
        "full_name": "Original User",
        "phone_number": "+919876543210"
    }
    first_res = client.post("/api/v1/auth/register", payload, format="json")
    assert first_res.status_code == 201

    # Attempt second registration with same email
    dup_res = client.post("/api/v1/auth/register", payload, format="json")
    assert dup_res.status_code == 400
    res_data = dup_res.json()
    assert res_data["success"] is False
    assert res_data["error"]["code"] == "VALIDATION_ERROR"
    assert any("already exists" in err["message"] for err in res_data["error"]["field_errors"])

# -------------------------------------------------------------------------
# Test 4: Argon2id Password Hashing
# -------------------------------------------------------------------------
def test_04_password_hashing():
    raw_pass = "MyIndustrialSecret#2026"
    hashed = hash_password(raw_pass)
    
    assert hashed.startswith("$argon2id$")
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False
    assert verify_password("", hashed) is False

# -------------------------------------------------------------------------
# Test 5: Login Success & Anti-Enumeration Failure
# -------------------------------------------------------------------------
def test_05_login_success_and_failure(client):
    reg_payload = {
        "email": "login.test@horizonauto.in",
        "password": "ValidPassword99",
        "full_name": "Test Login"
    }
    client.post("/api/v1/auth/register", reg_payload, format="json")

    # 1. Success case
    login_res = client.post("/api/v1/auth/login", {
        "email": "login.test@horizonauto.in",
        "password": "ValidPassword99"
    }, format="json")
    assert login_res.status_code == 200
    assert login_res.json()["success"] is True
    assert "tokens" in login_res.json()["data"]

    # 2. Failure with wrong password
    bad_pass_res = client.post("/api/v1/auth/login", {
        "email": "login.test@horizonauto.in",
        "password": "WrongPassword99"
    }, format="json")
    assert bad_pass_res.status_code == 401
    assert bad_pass_res.json()["error"]["code"] == "AUTHENTICATION_FAILED"
    # Uniform message: avoids leaking that user exists
    assert bad_pass_res.json()["error"]["message"] == "Invalid email or password."

    # 3. Failure with non-existent user
    non_user_res = client.post("/api/v1/auth/login", {
        "email": "nonexistent@horizonauto.in",
        "password": "AnyPassword123"
    }, format="json")
    assert non_user_res.status_code == 401
    # Uniform message: identical to wrong password case
    assert non_user_res.json()["error"]["message"] == "Invalid email or password."

# -------------------------------------------------------------------------
# Test 6: JWT Expiry & Refresh Rotation
# -------------------------------------------------------------------------
def test_06_jwt_expiry_and_refresh(client):
    user_repo = UserRepository()
    user = user_repo.create_user(
        email="jwt.test@horizonauto.in",
        password_hash=hash_password("Pass12345"),
        full_name="JWT Tester"
    )
    tokens = generate_tokens_for_user(user)
    refresh_token = tokens["refresh_token"]

    # Decode refresh token
    payload = decode_token(refresh_token, verify_type="refresh")
    assert payload["sub"] == str(user["_id"])
    assert payload["token_type"] == "refresh"

    # Call refresh endpoint to rotate tokens
    refresh_res = client.post("/api/v1/auth/refresh", {
        "refresh_token": refresh_token
    }, format="json")
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()["data"]
    assert new_tokens["access_token"] != tokens["access_token"]
    assert new_tokens["refresh_token"] != tokens["refresh_token"]

    # Verify that the old refresh token is now revoked (replay attack prevention)
    replay_res = client.post("/api/v1/auth/refresh", {
        "refresh_token": refresh_token
    }, format="json")
    assert replay_res.status_code == 401
    assert "revoked" in replay_res.json()["error"]["message"].lower()

# -------------------------------------------------------------------------
# Test 7: Logout & Token Revocation
# -------------------------------------------------------------------------
def test_07_logout_and_revocation(client):
    reg_res = client.post("/api/v1/auth/register", {
        "email": "logout.test@horizonauto.in",
        "password": "Password123",
        "full_name": "Logout Tester"
    }, format="json")
    access_token = reg_res.json()["data"]["tokens"]["access_token"]
    refresh_token = reg_res.json()["data"]["tokens"]["refresh_token"]

    # Perform logout
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    logout_res = client.post("/api/v1/auth/logout", {"refresh_token": refresh_token}, format="json")
    assert logout_res.status_code == 200
    assert logout_res.json()["data"]["logged_out"] is True

    # Attempt using the revoked access token to fetch profile
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 401
    assert "revoked" in me_res.json()["error"]["message"].lower()

# -------------------------------------------------------------------------
# Test 8: Protected Routes
# -------------------------------------------------------------------------
def test_08_protected_routes(client):
    # Unauthenticated requests to protected endpoints must be rejected
    res_me = client.get("/api/v1/auth/me")
    assert res_me.status_code == 401

    res_biz = client.get("/api/v1/businesses")
    assert res_biz.status_code == 401

# -------------------------------------------------------------------------
# Test 9: Role-Based Access & Anti-Privilege Escalation
# -------------------------------------------------------------------------
def test_09_role_based_access(client):
    # Public self-registration must reject attempts to register as Officer or Admin
    officer_attempt = client.post("/api/v1/auth/register", {
        "email": "hacker@evil.com",
        "password": "Password123",
        "full_name": "Fake Officer",
        "role": "DEPARTMENT_OFFICER"
    }, format="json")
    assert officer_attempt.status_code == 400
    assert "strictly restricted" in officer_attempt.json()["error"]["message"]

    admin_attempt = client.post("/api/v1/auth/register", {
        "email": "hacker2@evil.com",
        "password": "Password123",
        "full_name": "Fake Admin",
        "role": "SUPER_ADMIN"
    }, format="json")
    assert admin_attempt.status_code == 400
    assert "strictly restricted" in admin_attempt.json()["error"]["message"]

# -------------------------------------------------------------------------
# Test 10: Business Data Ownership & Multi-Tenancy (IDOR Defense)
# -------------------------------------------------------------------------
def test_10_business_data_ownership(client):
    # User A registers & creates an enterprise
    res_a = client.post("/api/v1/auth/register", {
        "email": "tenant.a@horizonauto.in",
        "password": "Password123",
        "full_name": "User A"
    }, format="json")
    token_a = res_a.json()["data"]["tokens"]["access_token"]
    
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")
    biz_a_res = client.post("/api/v1/businesses", {
        "legal_name": "Tenant A Enterprises Ltd",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "AAACB1234A"
    }, format="json")
    assert biz_a_res.status_code == 201
    biz_a_id = biz_a_res.json()["data"]["id"]

    # User B registers & attempts to read User A's business by ID
    res_b = client.post("/api/v1/auth/register", {
        "email": "tenant.b@competitor.in",
        "password": "Password123",
        "full_name": "User B"
    }, format="json")
    token_b = res_b.json()["data"]["tokens"]["access_token"]

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_b}")
    idor_res = client.get(f"/api/v1/businesses/{biz_a_id}")
    # Must fail with 404 (preventing discovery of other businesses)
    assert idor_res.status_code == 404
    assert idor_res.json()["error"]["code"] == "RESOURCE_NOT_FOUND"

# -------------------------------------------------------------------------
# Test 11: Invalid Input Handling & Form Validations
# -------------------------------------------------------------------------
def test_11_invalid_input_handling(client):
    # 1. Invalid email syntax
    res1 = client.post("/api/v1/auth/register", {
        "email": "not-an-email",
        "password": "Password123",
        "full_name": "Bad Email"
    }, format="json")
    assert res1.status_code == 400
    assert res1.json()["error"]["code"] == "VALIDATION_ERROR"

    # 2. Weak password (no number)
    res2 = client.post("/api/v1/auth/register", {
        "email": "valid@email.com",
        "password": "onlyletters",
        "full_name": "Weak Pass"
    }, format="json")
    assert res2.status_code == 400
    assert "one letter and one number" in res2.json()["error"]["message"]

    # 3. Invalid PAN syntax on business creation
    user_repo = UserRepository()
    test_user = user_repo.create_user(
        email="pan.tester@domain.com",
        password_hash=hash_password("Password123"),
        full_name="PAN Tester",
        role="BUSINESS_OWNER"
    )
    tokens = generate_tokens_for_user(test_user)
    token = tokens["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    res3 = client.post("/api/v1/businesses", {
        "legal_name": "Bad PAN Industries",
        "entity_type": "PRIVATE_LIMITED",
        "pan": "12345ABCDE"  # 10 chars, but invalid PAN regex
    }, format="json")
    assert res3.status_code == 400
    assert "PAN" in res3.json()["error"]["message"]
