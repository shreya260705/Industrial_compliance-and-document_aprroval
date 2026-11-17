from django.urls import path
from apps.departments.views import DepartmentListView, DepartmentDetailView

urlpatterns = [
    path('departments', DepartmentListView.as_view(), name='department_list_create'),
    path('departments/<str:department_code>', DepartmentDetailView.as_view(), name='department_detail'),
]
