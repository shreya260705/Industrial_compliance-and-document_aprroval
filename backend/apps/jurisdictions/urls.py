from django.urls import path
from apps.jurisdictions.views import (
    StateListView,
    JurisdictionDetailView,
    JurisdictionChildrenView,
    JurisdictionHierarchyView
)

urlpatterns = [
    path('jurisdictions/states', StateListView.as_view(), name='jurisdiction_states'),
    path('jurisdictions/<str:code>', JurisdictionDetailView.as_view(), name='jurisdiction_detail'),
    path('jurisdictions/<str:code>/children', JurisdictionChildrenView.as_view(), name='jurisdiction_children'),
    path('jurisdictions/<str:code>/hierarchy', JurisdictionHierarchyView.as_view(), name='jurisdiction_hierarchy'),
]
