from django.urls import path
from apps.applications.views import (
    OfficerApplicationListView,
    OfficerApplicationDetailView,
    OfficerApplicationActionView
)

urlpatterns = [
    path('', OfficerApplicationListView.as_view(), name='officer-applications-list'),
    path('/<str:pk>', OfficerApplicationDetailView.as_view(), name='officer-applications-detail'),
    path('/<str:pk>/action', OfficerApplicationActionView.as_view(), name='officer-applications-action'),
]
