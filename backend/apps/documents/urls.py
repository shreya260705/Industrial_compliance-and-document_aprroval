from django.urls import path
from apps.documents.views import (
    DocumentListView,
    UploadSessionView,
    ConfirmUploadView,
    DirectUploadView,
    DocumentDetailView,
    DocumentPreviewView,
    DocumentDownloadView,
    DocumentVerificationView,
    DocumentResubmitView,
    DocumentAssignView
)

urlpatterns = [
    path('documents', DocumentListView.as_view(), name='document_list'),
    path('documents/upload-session', UploadSessionView.as_view(), name='document_upload_session'),
    path('documents/confirm-upload', ConfirmUploadView.as_view(), name='document_confirm_upload'),
    path('documents/direct-upload', DirectUploadView.as_view(), name='document_direct_upload'),
    path('documents/<str:document_id>', DocumentDetailView.as_view(), name='document_detail'),
    path('documents/<str:document_id>/preview', DocumentPreviewView.as_view(), name='document_preview'),
    path('documents/<str:document_id>/download', DocumentDownloadView.as_view(), name='document_download'),
    path('documents/<str:document_id>/verify', DocumentVerificationView.as_view(), name='document_verify'),
    path('documents/<str:document_id>/resubmit', DocumentResubmitView.as_view(), name='document_resubmit'),
    path('documents/<str:document_id>/assign', DocumentAssignView.as_view(), name='document_assign'),
]
