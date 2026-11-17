"""
URL routing for Administration and Platform Governance.
"""

from django.urls import path
from apps.administration.views import (
    PlatformOverviewView,
    AdminUserListView,
    AdminUserDetailView,
    AdminUserStatusView,
    AdminOfficerListCreateView,
    AdminOfficerDetailView,
    AdminJurisdictionListCreateView,
    AdminJurisdictionDetailView,
    AdminApplicationMonitoringView,
    AdminAuditLogListView,
    AdminPlatformEventListView,
    OfficerDashboardMetricsView
)

urlpatterns = [
    # 1. Platform Overview
    path('platform-overview', PlatformOverviewView.as_view(), name='admin_platform_overview'),

    # 2. User Management
    path('users', AdminUserListView.as_view(), name='admin_user_list'),
    path('users/<str:pk>', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('users/<str:pk>/status', AdminUserStatusView.as_view(), name='admin_user_status'),

    # 3. Department Officer Management (Exclusive to Super Admin)
    path('officers', AdminOfficerListCreateView.as_view(), name='admin_officer_list_create'),
    path('officers/<str:pk>', AdminOfficerDetailView.as_view(), name='admin_officer_detail'),

    # 4. Jurisdiction Governance
    path('jurisdictions', AdminJurisdictionListCreateView.as_view(), name='admin_jurisdiction_list_create'),
    path('jurisdictions/<str:code>', AdminJurisdictionDetailView.as_view(), name='admin_jurisdiction_detail'),

    # 5. Application Monitoring
    path('applications', AdminApplicationMonitoringView.as_view(), name='admin_application_monitoring'),

    # 6. Audit Logs & Platform Events
    path('audit-logs', AdminAuditLogListView.as_view(), name='admin_audit_logs'),
    path('platform-events', AdminPlatformEventListView.as_view(), name='admin_platform_events'),

    # 7. Officer Scoped Analytics
    path('officer/metrics', OfficerDashboardMetricsView.as_view(), name='officer_dashboard_metrics'),
]
