"""
Cryptographic JWT Token Generation, Rotation, and Revocation Service.
"""

from datetime import datetime, timedelta, timezone
import uuid
from typing import Any, Dict, Tuple
from django.conf import settings
import jwt
from apps.common.exceptions import AuthenticationFailedException
from apps.authentication.repository import RevokedTokenRepository, UserRepository

revoked_repo = RevokedTokenRepository()
user_repo = UserRepository()

ALGORITHM = "HS256"

def get_secret_key() -> str:
    return getattr(settings, 'JWT_SECRET_KEY', 'bizpermit-default-jwt-secret-phase1-2026')

def generate_tokens_for_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates short-lived access token (15 mins) and long-lived refresh token (7 days).
    """
    now = datetime.now(timezone.utc)
    access_expiry_mins = getattr(settings, 'JWT_ACCESS_EXPIRY_MINUTES', 15)
    refresh_expiry_days = getattr(settings, 'JWT_REFRESH_EXPIRY_DAYS', 7)

    access_exp = now + timedelta(minutes=access_expiry_mins)
    refresh_exp = now + timedelta(days=refresh_expiry_days)

    user_id = str(user.get('_id') or user.get('id'))
    officer_profile = user.get('officer_profile') or {}

    access_jti = str(uuid.uuid4())
    refresh_jti = str(uuid.uuid4())

    access_payload = {
        "iss": "bizpermit-api",
        "sub": user_id,
        "email": user.get('email'),
        "full_name": user.get('full_name'),
        "role": user.get('role', 'BUSINESS_OWNER'),
        "department_code": officer_profile.get('department_code'),
        "jurisdiction_code": officer_profile.get('jurisdiction_code'),
        "token_type": "access",
        "jti": access_jti,
        "iat": int(now.timestamp()),
        "exp": int(access_exp.timestamp())
    }

    refresh_payload = {
        "iss": "bizpermit-api",
        "sub": user_id,
        "token_type": "refresh",
        "jti": refresh_jti,
        "iat": int(now.timestamp()),
        "exp": int(refresh_exp.timestamp())
    }

    access_token = jwt.encode(access_payload, get_secret_key(), algorithm=ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, get_secret_key(), algorithm=ALGORITHM)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": access_expiry_mins * 60,
        "access_expires_at": access_exp.isoformat(),
        "refresh_expires_at": refresh_exp.isoformat()
    }

def decode_token(token_str: str, verify_type: str = None) -> Dict[str, Any]:
    """
    Decodes and cryptographically verifies a JWT. Checks revoked tokens blacklist.
    """
    if not token_str:
        raise AuthenticationFailedException("Token string is required.")

    try:
        payload = jwt.decode(
            token_str,
            get_secret_key(),
            algorithms=[ALGORITHM],
            options={"require": ["exp", "iat", "sub", "jti"]}
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailedException("Token has expired.")
    except jwt.InvalidTokenError as exc:
        raise AuthenticationFailedException(f"Invalid token signature or format: {str(exc)}")

    # Verify token type if specified
    if verify_type and payload.get("token_type") != verify_type:
        raise AuthenticationFailedException(f"Expected {verify_type} token, but got {payload.get('token_type')}.")

    # Check blacklist for revoked token JTI
    jti = payload.get("jti")
    if revoked_repo.is_revoked(jti):
        raise AuthenticationFailedException("Token has been revoked / logged out.")

    return payload

def rotate_refresh_token(refresh_token_str: str) -> Dict[str, Any]:
    """
    Validates refresh token, invalidates it to prevent replay attacks,
    and returns a brand-new token pair.
    """
    payload = decode_token(refresh_token_str, verify_type="refresh")

    # Invalidate current refresh token
    jti = payload.get("jti")
    exp_ts = payload.get("exp")
    expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
    user_id = payload.get("sub")
    revoked_repo.revoke_token(jti, expires_at=expires_at, user_id=user_id)

    # Fetch user
    user = user_repo.find_by_id(user_id)
    if not user or not user.get("is_active"):
        raise AuthenticationFailedException("User account does not exist or has been disabled.")

    # Issue brand new pair
    return generate_tokens_for_user(user)

def revoke_token(token_str: str) -> bool:
    """
    Decodes token (even if already near expiry) and adds jti to revocation list.
    """
    try:
        payload = jwt.decode(
            token_str,
            get_secret_key(),
            algorithms=[ALGORITHM],
            options={"verify_exp": False}
        )
        jti = payload.get("jti")
        exp_ts = payload.get("exp", int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp()))
        expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
        user_id = payload.get("sub")
        revoked_repo.revoke_token(jti, expires_at=expires_at, user_id=user_id)
        return True
    except Exception:
        return False
