from django.urls import path
from apps.applications.views import (
    ApplicationListCreateView,
    ApplicationMetricsView,
    ApplicationDetailView,
    ApplicationSubmitView,
    ApplicationAttachDocumentView,
    ApplicationAcknowledgementPdfView,
    ApplicationClarificationRespondView,
    OfficerApplicationListView,
    OfficerApplicationDetailView,
    OfficerApplicationActionView,
    ApplicationAssignView
)

urlpatterns = [
    # Business Owner Application Lifecycle
    path('', ApplicationListCreateView.as_view(), name='application-list-create'),
    path('/metrics', ApplicationMetricsView.as_view(), name='application-metrics'),
    path('/<str:pk>', ApplicationDetailView.as_view(), name='application-detail'),
    path('/<str:pk>/submit', ApplicationSubmitView.as_view(), name='application-submit'),
    path('/<str:pk>/attachments', ApplicationAttachDocumentView.as_view(), name='application-attachments'),
    path('/<str:pk>/attachments/<str:vault_doc_id>', ApplicationAttachDocumentView.as_view(), name='application-attachment-delete'),
    path('/<str:pk>/acknowledgement', ApplicationAcknowledgementPdfView.as_view(), name='application-pdf-acknowledgement'),
    path('/<str:pk>/respond-clarification', ApplicationClarificationRespondView.as_view(), name='application-respond-clarification'),
    path('/<str:pk>/assign', ApplicationAssignView.as_view(), name='application-assign'),

    # Officer Scrutiny Desk
    path('/officer/queue', OfficerApplicationListView.as_view(), name='officer-application-queue'),
    path('/officer/queue/<str:pk>', OfficerApplicationDetailView.as_view(), name='officer-application-detail'),
    path('/officer/queue/<str:pk>/action', OfficerApplicationActionView.as_view(), name='officer-application-action'),
    path('/officer/queue/<str:pk>/assign', ApplicationAssignView.as_view(), name='officer-application-queue-assign'),
]
