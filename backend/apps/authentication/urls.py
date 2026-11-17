from django.urls import path
from apps.authentication.views import (
    RegisterView,
    LoginView,
    ForgotPasswordView,
    ResetPasswordView,
    TokenRefreshView,
    LogoutView,
    UserProfileView,
)

urlpatterns = [
    path('register', RegisterView.as_view(), name='auth_register'),
    path('login', LoginView.as_view(), name='auth_login'),
    path('forgot-password', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('reset-password', ResetPasswordView.as_view(), name='auth_reset_password'),
    path('refresh', TokenRefreshView.as_view(), name='auth_refresh'),
    path('logout', LogoutView.as_view(), name='auth_logout'),
    path('me', UserProfileView.as_view(), name='auth_me'),
]
