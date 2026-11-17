"""
Authentication Views for BizPermit.
"""

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from apps.common.responses import api_success_response, api_error_response
from apps.common.base_repository import BaseRepository
from apps.common.audit import log_audit_event
from apps.authentication.serializers import (
    RegisterSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    TokenRefreshSerializer,
    UserProfileSerializer,
)
from apps.authentication.jwt_service import (
    generate_tokens_for_user,
    rotate_refresh_token,
    revoke_token,
)

class AuthBurstRateThrottle(AnonRateThrottle):
    rate = '60/minute'

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthBurstRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_doc = serializer.save()

        # Log audit event
        log_audit_event(
            actor_user_id=user_doc['_id'],
            actor_role="BUSINESS_OWNER",
            action="USER_REGISTERED",
            target_collection="users",
            target_id=user_doc['_id'],
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        tokens = generate_tokens_for_user(user_doc)
        serialized_user = BaseRepository.serialize_doc(user_doc)
        serialized_user.pop('password_hash', None)

        return api_success_response(
            data={
                "user": serialized_user,
                "tokens": tokens
            },
            message="Account successfully registered.",
            status_code=201,
            request=request
        )

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthBurstRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_doc = serializer.validated_data['user']
        tokens = serializer.validated_data['tokens']

        log_audit_event(
            actor_user_id=user_doc['_id'],
            actor_role=user_doc.get('role', 'BUSINESS_OWNER'),
            action="USER_LOGIN_SUCCESS",
            target_collection="users",
            target_id=user_doc['_id'],
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        serialized_user = BaseRepository.serialize_doc(user_doc)
        serialized_user.pop('password_hash', None)

        return api_success_response(
            data={
                "user": serialized_user,
                "tokens": tokens
            },
            message="Authentication successful.",
            request=request
        )

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthBurstRateThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        log_audit_event(
            actor_user_id=None,
            actor_role='PUBLIC',
            action='PASSWORD_RESET_REQUESTED',
            target_collection='users',
            target_id=None,
            delta={"email": serializer.validated_data['email'], "reset_sent": result.get('reset_sent', False)},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
        )

        return api_success_response(
            data={"reset_sent": result.get('reset_sent', False), "email": serializer.validated_data['email']},
            message="If an account exists for this email, password reset instructions have been sent.",
            request=request,
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthBurstRateThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        log_audit_event(
            actor_user_id=result['user_id'],
            actor_role='USER',
            action='PASSWORD_RESET_COMPLETED',
            target_collection='users',
            target_id=result['user_id'],
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
        )

        return api_success_response(
            data={"reset_complete": True},
            message="Password reset successfully. Please sign in with your new password.",
            request=request,
        )


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token_str = serializer.validated_data['refresh_token']
        new_tokens = rotate_refresh_token(refresh_token_str)

        return api_success_response(
            data=new_tokens,
            message="Token refreshed successfully.",
            request=request
        )

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Revoke access token
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            access_token = auth_header.split(' ')[1]
            revoke_token(access_token)

        # Optionally revoke refresh token if provided
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            revoke_token(refresh_token)

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="USER_LOGOUT",
            target_collection="users",
            target_id=request.user.id,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data={"logged_out": True},
            message="Successfully logged out and token invalidated.",
            request=request
        )

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_doc = request.user.raw_doc
        serialized_user = BaseRepository.serialize_doc(user_doc)
        serialized_user.pop('password_hash', None)

        return api_success_response(
            data=serialized_user,
            request=request
        )
