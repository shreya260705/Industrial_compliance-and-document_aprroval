"""
BizPermit URL Configuration.
Exposes versioned endpoints prefixed with /api/v1/.
"""

from django.urls import path, include
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from apps.common.responses import api_success_response
from apps.database.connection import check_connection_health

class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        db_health = check_connection_health()
        return api_success_response(
            data={
                "service": "BizPermit API Engine",
                "version": "1.0.0",
                "environment": "phase1-development",
                "database_health": db_health
            },
            message="BizPermit API Gateway operational",
            request=request
        )

urlpatterns = [
    # API Health Gateway
    path('api/v1/health', HealthCheckView.as_view(), name='api_health'),

    # Domain Endpoints
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/', include('apps.businesses.urls')),
    path('api/v1/', include('apps.jurisdictions.urls')),
    path('api/v1/', include('apps.departments.urls')),
    path('api/v1/', include('apps.approvals.urls')),
    path('api/v1/', include('apps.documents.urls')),
    path('api/v1/applications', include('apps.applications.urls')),
    path('api/v1/notifications', include('apps.notifications.urls')),
    path('api/v1/officer/applications', include('apps.applications.urls_officer')),
    path('api/v1/compliance', include('apps.compliance.urls')),
    path('api/v1/compliance/', include('apps.compliance.urls')),
    path('api/v1/', include('apps.schemes.urls')),
    path('api/v1/', include('apps.grievances.urls')),
    path('api/v1/admin/', include('apps.administration.urls')),
    path('api/v1/admin', include('apps.administration.urls')),
]
