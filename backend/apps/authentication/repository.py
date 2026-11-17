"""
User, revocation and password-reset MongoDB repositories.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
from bson import ObjectId
from apps.common.base_repository import BaseRepository

class UserRepository(BaseRepository):
    collection_name = "users"

    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        if not email:
            return None
        return self.collection.find_one({"email": email.strip().lower()})

    def find_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        if not phone:
            return None
        return self.collection.find_one({"phone_number": phone.strip()})

    def create_user(
        self,
        email: str,
        password_hash: str,
        full_name: str,
        phone_number: Optional[str] = None,
        role: str = "BUSINESS_OWNER",
        officer_profile: Optional[Dict[str, Any]] = None,
        session=None
    ) -> Dict[str, Any]:
        doc = {
            "email": email.strip().lower(),
            "password_hash": password_hash,
            "full_name": full_name.strip(),
            "role": role,
            "officer_profile": officer_profile or {
                "department_code": None,
                "jurisdiction_code": None,
                "designation": None,
                "badge_number": None
            },
            "is_email_verified": True,  # Prototype default
            "is_phone_verified": True,
            "is_active": True,
            "last_login_at": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        if phone_number and phone_number.strip():
            doc["phone_number"] = phone_number.strip()
        return self.create(doc, session=session)

    def update_last_login(self, user_id: Union[str, ObjectId], session=None) -> None:
        oid = self.to_object_id(user_id)
        if oid:
            self.collection.update_one(
                {"_id": oid},
                {"$set": {"last_login_at": datetime.now(timezone.utc)}},
                session=session
            )

    def update_password(self, user_id: Union[str, ObjectId], password_hash: str, session=None) -> bool:
        oid = self.to_object_id(user_id)
        if not oid:
            return False
        result = self.collection.update_one(
            {"_id": oid},
            {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc)}},
            session=session,
        )
        return result.modified_count > 0


class RevokedTokenRepository(BaseRepository):
    collection_name = "revoked_tokens"

    def is_revoked(self, jti: str) -> bool:
        if not jti:
            return True
        return self.collection.find_one({"jti": jti}) is not None

    def revoke_token(self, jti: str, expires_at: datetime, user_id: Optional[Union[str, ObjectId]] = None, session=None) -> Dict[str, Any]:
        doc = {
            "jti": jti,
            "user_id": str(user_id) if user_id else None,
            "revoked_at": datetime.now(timezone.utc),
            "expires_at": expires_at
        }
        return self.create(doc, session=session)


class PasswordResetTokenRepository(BaseRepository):
    collection_name = "password_reset_tokens"

    def _normalize_email(self, email: str) -> str:
        return (email or '').strip().lower()

    def create_reset_token(self, user_id: Union[str, ObjectId], email: str, expires_in_minutes: int = 60) -> Dict[str, Any]:
        email_norm = self._normalize_email(email)
        user_oid = self.to_object_id(user_id)
        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        doc = {
            "token": token,
            "user_id": str(user_oid or user_id),
            "email": email_norm,
            "created_at": now,
            "expires_at": now + timedelta(minutes=expires_in_minutes),
            "used_at": None,
            "is_used": False,
        }
        self.collection.delete_many({"email": email_norm, "is_used": False})
        return self.create(doc)

    def find_valid_token(self, token: str) -> Optional[Dict[str, Any]]:
        if not token:
            return None
        now = datetime.now(timezone.utc)
        return self.collection.find_one({
            "token": token,
            "is_used": False,
            "expires_at": {"$gt": now},
        })

    def consume_token(self, token: str, session=None) -> Optional[Dict[str, Any]]:
        reset_doc = self.find_valid_token(token)
        if not reset_doc:
            return None
        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": reset_doc['_id']},
            {"$set": {"is_used": True, "used_at": now, "updated_at": now}},
            session=session,
        )
        return self.find_by_id(reset_doc['_id'])
