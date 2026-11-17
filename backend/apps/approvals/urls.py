from django.urls import path
from apps.approvals.views import (
    ApprovalCatalogueListView,
    ApprovalDetailView,
    ApplicabilityEvaluateView,
    AdminRuleListView
)

urlpatterns = [
    path('approvals', ApprovalCatalogueListView.as_view(), name='approval_list_create'),
    path('approvals/<str:approval_code>', ApprovalDetailView.as_view(), name='approval_detail'),
    path('kya/evaluate', ApplicabilityEvaluateView.as_view(), name='kya_evaluate'),
    path('admin/rules', AdminRuleListView.as_view(), name='admin_rules'),
]
