"""
DRF Custom Authentication Class for MongoDB-Backed JWT.
Maps validated JWT claims to a clean MongoUserPrincipal.
"""

from typing import Optional, Tuple
from rest_framework.authentication import BaseAuthentication
from rest_framework.request import Request
from apps.common.exceptions import AuthenticationFailedException
from apps.authentication.jwt_service import decode_token
from apps.authentication.repository import UserRepository

user_repo = UserRepository()

class MongoUserPrincipal:
    """
    Lightweight User Principal conforming to Django request.user interface.
    """
    def __init__(self, user_doc: dict):
        self.raw_doc = user_doc
        self.id = str(user_doc.get('_id') or user_doc.get('id'))
        self.pk = self.id
        self.email = user_doc.get('email', '')
        self.full_name = user_doc.get('full_name', '')
        self.phone_number = user_doc.get('phone_number')
        self.role = user_doc.get('role', 'BUSINESS_OWNER')
        self.officer_profile = user_doc.get('officer_profile', {})
        self.is_active = user_doc.get('is_active', True)
        self.is_authenticated = True
        self.is_anonymous = False

    @property
    def is_staff(self) -> bool:
        return self.role == 'SUPER_ADMIN'

    @property
    def is_superuser(self) -> bool:
        return self.role == 'SUPER_ADMIN'

    @property
    def is_business_owner(self) -> bool:
        return self.role == 'BUSINESS_OWNER'

    @property
    def is_department_officer(self) -> bool:
        return self.role == 'DEPARTMENT_OFFICER'

    def __str__(self):
        return f"{self.email} ({self.role})"


class MongoJWTAuthentication(BaseAuthentication):
    """
    Validates Bearer JWT tokens on incoming DRF requests.
    """
    def authenticate(self, request: Request) -> Optional[Tuple[MongoUserPrincipal, str]]:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            raise AuthenticationFailedException("Authorization header must be formatted as 'Bearer <token>'.")

        token_str = parts[1]
        payload = decode_token(token_str, verify_type="access")

        user_id = payload.get('sub')
        user_doc = user_repo.find_by_id(user_id)
        if not user_doc:
            raise AuthenticationFailedException("User referenced by token does not exist.")

        if not user_doc.get('is_active', True):
            raise AuthenticationFailedException("User account is inactive or disabled.")

        if user_doc.get('role') == 'DEPARTMENT_OFFICER' and (not user_doc.get('is_verified', True) or not user_doc.get('is_email_verified', True)):
            raise AuthenticationFailedException("Officer account is pending verification.")

        principal = MongoUserPrincipal(user_doc)
        return (principal, token_str)

    def authenticate_header(self, request: Request) -> str:
        return 'Bearer realm="api"'
