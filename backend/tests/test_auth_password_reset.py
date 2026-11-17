import pytest
from rest_framework.test import APIClient
from apps.authentication.repository import UserRepository, PasswordResetTokenRepository
from apps.database.connection import reset_mock_db_for_testing


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    reset_mock_db_for_testing()
    yield
    reset_mock_db_for_testing()


@pytest.fixture
def client():
    return APIClient()


def test_password_reset_flow(client):
    email = "reset.user@horizonauto.in"
    password = "SecurePassword123"

    reg_res = client.post(
        "/api/v1/auth/register",
        {
            "email": email,
            "password": password,
            "full_name": "Reset Test User",
            "phone_number": "+919876543299",
        },
        format="json",
    )
    assert reg_res.status_code == 201

    forgot_res = client.post(
        "/api/v1/auth/forgot-password",
        {"email": email},
        format="json",
    )
    assert forgot_res.status_code == 200
    assert forgot_res.json()["success"] is True

    reset_doc = PasswordResetTokenRepository().collection.find_one({"email": email})
    assert reset_doc is not None
    assert reset_doc["is_used"] is False

    new_password = "NewPassword456"
    reset_res = client.post(
        "/api/v1/auth/reset-password",
        {
            "token": reset_doc["token"],
            "password": new_password,
            "confirm_password": new_password,
        },
        format="json",
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True

    old_login_res = client.post(
        "/api/v1/auth/login",
        {"email": email, "password": password},
        format="json",
    )
    assert old_login_res.status_code == 401

    new_login_res = client.post(
        "/api/v1/auth/login",
        {"email": email, "password": new_password},
        format="json",
    )
    assert new_login_res.status_code == 200
    assert new_login_res.json()["data"]["user"]["email"] == email


def test_reset_password_invalid_token_is_rejected(client):
    response = client.post(
        "/api/v1/auth/reset-password",
        {
            "token": "invalid-token",
            "password": "NewPassword456",
            "confirm_password": "NewPassword456",
        },
        format="json",
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
