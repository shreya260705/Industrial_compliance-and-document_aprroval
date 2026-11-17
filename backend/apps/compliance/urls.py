"""
URL Routing for Compliance Obligations, Calendar & Renewal Engine.
"""

from django.urls import path
from apps.compliance.views import (
    ComplianceObligationListCreateView,
    ComplianceLocationGenerateView,
    ComplianceObligationDetailView,
    ComplianceDateConfirmView,
    ComplianceCompleteView,
    ComplianceOfficerReviewView,
    ComplianceCalendarEventsView,
    ComplianceMetricsView,
    ComplianceRenewalsListView,
    AdminComplianceOverviewView,
    AdminComplianceTemplatesView
)

urlpatterns = [
    # Metrics, Calendar & Renewals
    path('metrics', ComplianceMetricsView.as_view(), name='compliance_metrics'),
    path('metrics/', ComplianceMetricsView.as_view(), name='compliance_metrics_slash'),
    path('calendar', ComplianceCalendarEventsView.as_view(), name='compliance_calendar'),
    path('calendar/', ComplianceCalendarEventsView.as_view(), name='compliance_calendar_slash'),
    path('renewals', ComplianceRenewalsListView.as_view(), name='compliance_renewals'),
    path('renewals/', ComplianceRenewalsListView.as_view(), name='compliance_renewals_slash'),

    # Obligations CRUD
    path('obligations', ComplianceObligationListCreateView.as_view(), name='compliance_obligations_list_create'),
    path('obligations/', ComplianceObligationListCreateView.as_view(), name='compliance_obligations_list_create_slash'),
    path('obligations/<str:pk>', ComplianceObligationDetailView.as_view(), name='compliance_obligation_detail'),
    path('obligations/<str:pk>/', ComplianceObligationDetailView.as_view(), name='compliance_obligation_detail_slash'),
    path('obligations/<str:pk>/confirm-date', ComplianceDateConfirmView.as_view(), name='compliance_obligation_confirm_date'),
    path('obligations/<str:pk>/complete', ComplianceCompleteView.as_view(), name='compliance_obligation_complete'),
    path('obligations/<str:pk>/records/<str:record_id>/review', ComplianceOfficerReviewView.as_view(), name='compliance_officer_review'),

    # Location auto-generation trigger
    path('locations/<str:location_id>/generate', ComplianceLocationGenerateView.as_view(), name='compliance_location_generate'),

    # Super Admin Overview & Templates
    path('admin/overview', AdminComplianceOverviewView.as_view(), name='admin_compliance_overview'),
    path('admin/templates', AdminComplianceTemplatesView.as_view(), name='admin_compliance_templates'),
]
