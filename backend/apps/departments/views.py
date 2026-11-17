"""
Department API Views.
Public read-only directory with Admin-only governance.
"""

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from apps.common.responses import api_success_response, api_error_response
from apps.common.exceptions import ResourceNotFoundException, ValidationException
from apps.common.base_repository import BaseRepository
from apps.authentication.permissions import IsSuperAdmin
from apps.departments.repository import DepartmentRepository
from apps.departments.serializers import DepartmentSerializer

repo = DepartmentRepository()

class DepartmentListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tier = request.query_params.get('tier')
        state_code = request.query_params.get('state_code')
        search_query = request.query_params.get('search')
        
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 50))))
        except ValueError:
            page = 1
            page_size = 50

        skip = (page - 1) * page_size
        departments = repo.list_departments(
            tier=tier,
            state_code=state_code,
            search_query=search_query,
            skip=skip,
            limit=page_size
        )
        total_count = repo.count_departments(
            tier=tier,
            state_code=state_code,
            search_query=search_query
        )

        serialized = [BaseRepository.serialize_doc(item) for item in departments]
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

        return api_success_response(
            data=serialized,
            meta={
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total_count,
                    "total_pages": total_pages
                }
            },
            request=request
        )

    def post(self, request):
        # Admin-only creation
        if not (request.user and request.user.is_authenticated and request.user.role == 'SUPER_ADMIN'):
            return api_error_response(
                code="PERMISSION_DENIED",
                message="Only Super Administrators can register new statutory departments.",
                status_code=403,
                request=request
            )

        serializer = DepartmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = repo.upsert_department(serializer.validated_data)

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="DEPARTMENT_CREATED",
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            target_collection="departments",
            target_id=doc.get("department_code"),
            title=f"Statutory Department Registered: {doc.get('department_name')}",
            message=f"Department {doc.get('department_code')} has been registered by platform administration.",
            payload={"code": doc.get("department_code"), "name": doc.get("department_name")}
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Department registered successfully",
            status_code=201,
            request=request
        )

class DepartmentDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsSuperAdmin()]

    def get(self, request, department_code):
        doc = repo.find_by_code(department_code)
        if not doc:
            raise ResourceNotFoundException(f"Department '{department_code}' not found.")
        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            request=request
        )

    def put(self, request, department_code):
        existing = repo.find_by_code(department_code)
        if not existing:
            raise ResourceNotFoundException(f"Department '{department_code}' not found.")

        serializer = DepartmentSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        update_data = serializer.validated_data
        update_data["department_code"] = department_code.upper()

        doc = repo.upsert_department(update_data)

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="DEPARTMENT_UPDATED",
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            target_collection="departments",
            target_id=department_code.upper(),
            title=f"Statutory Department Updated: {doc.get('department_name')}",
            message=f"Department configuration for {department_code.upper()} updated by administration.",
            payload={"code": department_code.upper()}
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Department updated successfully",
            request=request
        )
