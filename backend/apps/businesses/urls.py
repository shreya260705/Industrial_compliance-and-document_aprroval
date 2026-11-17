from django.urls import path
from apps.businesses.views import (
    BusinessListCreateView,
    BusinessDetailView,
    LocationListCreateView,
    LocationDetailView,
    LocationEvaluateView,
    LocationApprovalsView
)

urlpatterns = [
    # Business endpoints
    path('businesses', BusinessListCreateView.as_view(), name='business_list_create'),
    path('businesses/<str:pk>', BusinessDetailView.as_view(), name='business_detail'),
    
    # Location endpoints under business
    path('businesses/<str:business_id>/locations', LocationListCreateView.as_view(), name='location_list_create'),
    
    # Direct location endpoints
    path('locations/<str:location_id>', LocationDetailView.as_view(), name='location_detail'),
    path('locations/<str:location_id>/evaluate', LocationEvaluateView.as_view(), name='location_evaluate'),
    path('locations/<str:location_id>/approvals', LocationApprovalsView.as_view(), name='location_approvals'),
]
