from django.urls import path
from apps.schemes.views import (
    SchemeListView,
    SchemeDetailView,
    SchemeEvaluationView,
    SchemeRecommendationListView,
    SchemeApplicationListCreateView,
    SchemeApplicationDetailView,
    SchemeApplicationAttachDocView,
    SchemeApplicationRemoveDocView,
    SchemeApplicationAttestView,
    AdminSchemeListCreateView,
    AdminSchemeDetailView,
    AdminSchemeRuleVersionView,
    AdminSchemeSubmitVerificationView,
    AdminSchemeVerifyEvidenceView,
    AdminSchemeActivateRuleVersionView,
    AdminSchemeHistoryView
)
from apps.schemes.review_views import (
    OfficerReviewQueueView,
    OfficerReviewDetailView,
    OfficerReviewAssignView,
    OfficerReviewStartView,
    OfficerReviewClarificationView,
    ApplicantClarificationResponseView,
    OfficerReviewCompleteView,
    OfficerReviewReferralView,
    OfficerReviewWithdrawView,
    AdminSchemeReviewOversightView,
    AdminSchemeReviewReassignView
)

urlpatterns = [
    # Catalogue & Recommendations
    path('schemes/', SchemeListView.as_view(), name='scheme_list'),
    path('schemes/evaluate/', SchemeEvaluationView.as_view(), name='scheme_evaluate'),
    path('schemes/recommendations/', SchemeRecommendationListView.as_view(), name='scheme_recommendations'),
    path('schemes/<str:code>/', SchemeDetailView.as_view(), name='scheme_detail'),

    # Application Dossiers & Attestation
    path('scheme-applications/', SchemeApplicationListCreateView.as_view(), name='scheme_application_list_create'),
    path('scheme-applications/<str:id>/', SchemeApplicationDetailView.as_view(), name='scheme_application_detail'),
    path('scheme-applications/<str:id>/documents/', SchemeApplicationAttachDocView.as_view(), name='scheme_application_attach_doc'),
    path('scheme-applications/<str:id>/documents/<str:vault_doc_id>/', SchemeApplicationRemoveDocView.as_view(), name='scheme_application_remove_doc'),
    path('scheme-applications/<str:id>/attest/', SchemeApplicationAttestView.as_view(), name='scheme_application_attest'),
    path('scheme-applications/<str:id>/respond-clarification/', ApplicantClarificationResponseView.as_view(), name='scheme_application_respond_clarification'),
    path('scheme-applications/<str:id>/withdraw/', OfficerReviewWithdrawView.as_view(), name='scheme_application_withdraw'),

    # Phase 6 Module 2: Officer Review Scrutiny Desk
    path('officer/scheme-reviews/', OfficerReviewQueueView.as_view(), name='officer_scheme_review_queue'),
    path('officer/scheme-reviews/<str:id>/', OfficerReviewDetailView.as_view(), name='officer_scheme_review_detail'),
    path('officer/scheme-reviews/<str:id>/assign/', OfficerReviewAssignView.as_view(), name='officer_scheme_review_assign'),
    path('officer/scheme-reviews/<str:id>/start/', OfficerReviewStartView.as_view(), name='officer_scheme_review_start'),
    path('officer/scheme-reviews/<str:id>/clarification/', OfficerReviewClarificationView.as_view(), name='officer_scheme_review_clarification'),
    path('officer/scheme-reviews/<str:id>/complete/', OfficerReviewCompleteView.as_view(), name='officer_scheme_review_complete'),
    path('officer/scheme-reviews/<str:id>/refer/', OfficerReviewReferralView.as_view(), name='officer_scheme_review_refer'),

    # Phase 6 Module 2: Super Admin Review Oversight
    path('admin/scheme-reviews/oversight/', AdminSchemeReviewOversightView.as_view(), name='admin_scheme_review_oversight'),
    path('admin/scheme-reviews/<str:id>/reassign/', AdminSchemeReviewReassignView.as_view(), name='admin_scheme_review_reassign'),

    # Super Admin Scheme Governance Endpoints
    path('admin/schemes/', AdminSchemeListCreateView.as_view(), name='admin_scheme_list_create'),
    path('admin/schemes/<str:code>/', AdminSchemeDetailView.as_view(), name='admin_scheme_detail'),
    path('admin/schemes/<str:code>/rules/', AdminSchemeRuleVersionView.as_view(), name='admin_scheme_rule_version'),
    path('admin/schemes/<str:code>/submit-verification/', AdminSchemeSubmitVerificationView.as_view(), name='admin_scheme_submit_verification'),
    path('admin/schemes/<str:code>/verify/', AdminSchemeVerifyEvidenceView.as_view(), name='admin_scheme_verify'),
    path('admin/schemes/<str:code>/activate/', AdminSchemeActivateRuleVersionView.as_view(), name='admin_scheme_activate'),
    path('admin/schemes/<str:code>/history/', AdminSchemeHistoryView.as_view(), name='admin_scheme_history'),
]
