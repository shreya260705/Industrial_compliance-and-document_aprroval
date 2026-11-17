"""
Grievances & Escalation URL Patterns.
Phase 6 Module 3.
"""

from django.urls import path
from .views import (
    # Applicant Views
    GrievanceListCreateView,
    GrievanceDetailView,
    GrievanceRespondClarificationView,
    GrievanceReopenView,
    GrievanceWithdrawView,
    GrievanceFeedbackView,
    GrievanceCategoryListView,

    # Officer Views
    OfficerGrievanceQueueView,
    OfficerGrievanceDetailView,
    OfficerGrievanceAssignView,
    OfficerGrievanceStartReviewView,
    OfficerGrievanceClarificationView,
    OfficerGrievanceInternalNoteView,
    OfficerGrievanceProposeResolutionView,
    OfficerGrievanceResolveView,
    OfficerGrievanceCloseView,
    OfficerGrievanceEscalateView,

    # Super Admin Views
    AdminGrievanceOversightView,
    AdminGrievanceReassignView,
    AdminGrievanceCategoryListCreateView,
    AdminGrievanceEscalationRuleListView,
    AdminGrievanceEscalationRuleUpdateView,
    AdminGrievanceAuditView,
    AdminGrievanceExportCSVView
)

urlpatterns = [
    # Applicant endpoints
    path('grievances/', GrievanceListCreateView.as_view(), name='grievance-list-create'),
    path('grievances/categories/', GrievanceCategoryListView.as_view(), name='grievance-categories'),
    path('grievances/<str:pk>/', GrievanceDetailView.as_view(), name='grievance-detail'),
    path('grievances/<str:pk>/respond-clarification/', GrievanceRespondClarificationView.as_view(), name='grievance-respond-clarification'),
    path('grievances/<str:pk>/reopen/', GrievanceReopenView.as_view(), name='grievance-reopen'),
    path('grievances/<str:pk>/withdraw/', GrievanceWithdrawView.as_view(), name='grievance-withdraw'),
    path('grievances/<str:pk>/feedback/', GrievanceFeedbackView.as_view(), name='grievance-feedback'),

    # Officer endpoints
    path('officer/grievances/', OfficerGrievanceQueueView.as_view(), name='officer-grievance-queue'),
    path('officer/grievances/<str:pk>/', OfficerGrievanceDetailView.as_view(), name='officer-grievance-detail'),
    path('officer/grievances/<str:pk>/assign/', OfficerGrievanceAssignView.as_view(), name='officer-grievance-assign'),
    path('officer/grievances/<str:pk>/start-review/', OfficerGrievanceStartReviewView.as_view(), name='officer-grievance-start-review'),
    path('officer/grievances/<str:pk>/clarification/', OfficerGrievanceClarificationView.as_view(), name='officer-grievance-clarification'),
    path('officer/grievances/<str:pk>/notes/', OfficerGrievanceInternalNoteView.as_view(), name='officer-grievance-notes'),
    path('officer/grievances/<str:pk>/propose-resolution/', OfficerGrievanceProposeResolutionView.as_view(), name='officer-grievance-propose-resolution'),
    path('officer/grievances/<str:pk>/resolve/', OfficerGrievanceResolveView.as_view(), name='officer-grievance-resolve'),
    path('officer/grievances/<str:pk>/close/', OfficerGrievanceCloseView.as_view(), name='officer-grievance-close'),
    path('officer/grievances/<str:pk>/escalate/', OfficerGrievanceEscalateView.as_view(), name='officer-grievance-escalate'),

    # Super Admin endpoints
    path('admin/grievances/oversight/', AdminGrievanceOversightView.as_view(), name='admin-grievance-oversight'),
    path('admin/grievances/<str:pk>/reassign/', AdminGrievanceReassignView.as_view(), name='admin-grievance-reassign'),
    path('admin/grievances/categories/', AdminGrievanceCategoryListCreateView.as_view(), name='admin-grievance-categories'),
    path('admin/grievances/escalation-rules/', AdminGrievanceEscalationRuleListView.as_view(), name='admin-grievance-escalation-rules'),
    path('admin/grievances/escalation-rules/<str:code>/', AdminGrievanceEscalationRuleUpdateView.as_view(), name='admin-grievance-escalation-rule-update'),
    path('admin/grievances/audit/', AdminGrievanceAuditView.as_view(), name='admin-grievance-audit'),
    path('admin/grievances/export/csv/', AdminGrievanceExportCSVView.as_view(), name='admin-grievance-export-csv'),
]
