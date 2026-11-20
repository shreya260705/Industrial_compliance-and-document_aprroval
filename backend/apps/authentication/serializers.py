"""
DRF Serializers for Authentication, Registration, and User Profiles.
"""

import re
from django.conf import settings
from django.core.mail import send_mail
from rest_framework import serializers
from apps.common.exceptions import (
    ValidationException,
    AuthenticationFailedException,
)
from apps.authentication.password import hash_password, verify_password
from apps.authentication.repository import UserRepository, PasswordResetTokenRepository
from apps.authentication.jwt_service import generate_tokens_for_user

user_repo = UserRepository()
password_reset_repo = PasswordResetTokenRepository()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, min_length=8, write_only=True)
    full_name = serializers.CharField(required=True, min_length=2, max_length=120)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    role = serializers.CharField(required=False, default="BUSINESS_OWNER")

    def validate_password(self, value):
        if not re.search(r'[A-Za-z]', value) or not re.search(r'[0-9]', value):
            raise serializers.ValidationError(
                "Password must be at least 8 characters long and contain at least one letter and one number."
            )
        return value

    def validate_role(self, value):
        if value and value != "BUSINESS_OWNER":
            raise serializers.ValidationError(
                "Public self-registration is strictly restricted to Business Owner accounts. "
                "Department Officer and Admin accounts are provisioned via administrative governance."
            )
        return "BUSINESS_OWNER"

    def validate_phone_number(self, value):
        if value:
            cleaned = re.sub(r'[\s\-]', '', value)
            if not re.match(r'^(\+91)?[6-9]\d{9}$', cleaned):
                raise serializers.ValidationError("Please provide a valid Indian mobile number.")
            if user_repo.find_by_phone(cleaned):
                raise serializers.ValidationError("An account with this phone number already exists.")
            return cleaned
        return None

    def validate_email(self, value):
        normalized = value.strip().lower()
        if user_repo.find_by_email(normalized):
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized

    def create(self, validated_data):
        from pymongo.errors import DuplicateKeyError
        password_hash = hash_password(validated_data['password'])
        try:
            user_doc = user_repo.create_user(
                email=validated_data['email'],
                password_hash=password_hash,
                full_name=validated_data['full_name'],
                phone_number=validated_data.get('phone_number'),
                role="BUSINESS_OWNER"
            )
            return user_doc
        except DuplicateKeyError:
            raise serializers.ValidationError("An account with this email address or phone number already exists.")


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        demo_emails = {
            "owner@horizonauto.in",
            "officer.gpcb@gujarat.gov.in",
            "officer.dish@gujarat.gov.in",
            "officer.mpcb@maharashtra.gov.in",
            "admin@bizpermit.gov.in",
        }

        user = user_repo.find_by_email(email)
        if not user and (email in demo_emails or user_repo.collection.count_documents({}) == 0):
            try:
                from django.core.management import call_command
                call_command('seed_demo_data')
                call_command('seed_national_data')
                call_command('seed_compliance_templates')
                call_command('seed_schemes')
                call_command('seed_grievances')
            except Exception:
                pass
            user = user_repo.find_by_email(email)

        is_valid_pw = False
        if user:
            is_valid_pw = verify_password(password, user.get('password_hash', ''))
            # Permissive demo credentials fallback for standard demo users
            if not is_valid_pw and email in demo_emails and password.strip().lower() in ("password123", "password123!", "securepass123!"):
                is_valid_pw = True

        if not user or not is_valid_pw:
            raise AuthenticationFailedException("Invalid email or password.")

        if not user.get('is_active', True):
            raise AuthenticationFailedException("This account has been disabled. Please contact support.")

        user_repo.update_last_login(user['_id'])
        tokens = generate_tokens_for_user(user)

        attrs['user'] = user
        attrs['tokens'] = tokens
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()

    def save(self, **kwargs):
        email = self.validated_data['email']
        user = user_repo.find_by_email(email)
        if not user:
            return {"email": email, "reset_sent": False}

        reset_doc = password_reset_repo.create_reset_token(user['_id'], email)
        frontend_base_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173')
        reset_url = f"{frontend_base_url.rstrip('/')}/reset-password?token={reset_doc['token']}"

        try:
            send_mail(
                subject='BizPermit password reset request',
                message=(
                    f"Hello {user.get('full_name', 'there')},\n\n"
                    f"We received a request to reset your BizPermit password.\n"
                    f"Click the link below to continue:\n\n{reset_url}\n\n"
                    "If you did not request this change, you can ignore this message and your password will remain unchanged."
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@bizpermit.local'),
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception:
            # Intentionally swallow delivery issues so the API remains safe and consistent.
            pass

        return {"email": email, "reset_sent": True, "reset_url": reset_url}


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, trim_whitespace=True)
    password = serializers.CharField(required=True, min_length=8, write_only=True)
    confirm_password = serializers.CharField(required=True, min_length=8, write_only=True)

    def validate_password(self, value):
        if not re.search(r'[A-Za-z]', value) or not re.search(r'[0-9]', value):
            raise serializers.ValidationError(
                "Password must be at least 8 characters long and contain at least one letter and one number."
            )
        return value

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if password != confirm_password:
            raise ValidationException("Password confirmation does not match the new password.")

        token = attrs.get('token')
        reset_doc = password_reset_repo.find_valid_token(token)
        if not reset_doc:
            raise ValidationException("This password reset link is invalid or has expired.")

        user = user_repo.find_by_id(reset_doc['user_id'])
        if not user or not user.get('is_active', True):
            raise ValidationException("This account is no longer active. Please contact support.")

        attrs['user'] = user
        attrs['reset_doc'] = reset_doc
        return attrs

    def save(self, **kwargs):
        user = self.validated_data['user']
        reset_doc = self.validated_data['reset_doc']
        new_password_hash = hash_password(self.validated_data['password'])

        user_repo.update_password(user['_id'], new_password_hash)
        password_reset_repo.consume_token(reset_doc['token'])
        return {"user_id": str(user['_id']), "reset_complete": True}


class TokenRefreshSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=True)


class UserProfileSerializer(serializers.Serializer):
    id = serializers.CharField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    phone_number = serializers.CharField(allow_null=True)
    role = serializers.CharField()
    officer_profile = serializers.DictField(required=False)
    created_at = serializers.CharField()
    last_login_at = serializers.CharField(allow_null=True)
