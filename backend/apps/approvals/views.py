"""
Approval Catalogue & Applicability Engine API Views.
Enforces public discovery and Admin-only catalogue governance.
"""

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from apps.common.responses import api_success_response, api_error_response
from apps.common.exceptions import ResourceNotFoundException, ValidationException
from apps.common.base_repository import BaseRepository
from apps.authentication.permissions import IsSuperAdmin
from apps.approvals.repository import ApprovalCatalogueRepository, ApplicabilityRuleRepository
from apps.approvals.serializers import (
    ApprovalCatalogueSerializer,
    ApplicabilityEvaluationRequestSerializer,
    ApplicabilityRuleSerializer
)
from apps.approvals.services.applicability_engine import ApplicabilityEngineService

approval_repo = ApprovalCatalogueRepository()
rule_repo = ApplicabilityRuleRepository()

class ApprovalCatalogueListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        authority_level = request.query_params.get('authority_level')
        state_code = request.query_params.get('state_code')
        stage = request.query_params.get('stage')
        pollution_category = request.query_params.get('pollution_category')
        verification_status = request.query_params.get('verification_status')
        search_query = request.query_params.get('search')

        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        except ValueError:
            page = 1
            page_size = 20

        skip = (page - 1) * page_size
        items = approval_repo.filter_catalogue(
            authority_level=authority_level,
            state_code=state_code,
            stage=stage,
            pollution_category=pollution_category,
            verification_status=verification_status,
            search_query=search_query,
            skip=skip,
            limit=page_size
        )
        total_count = approval_repo.count_catalogue(
            authority_level=authority_level,
            state_code=state_code,
            stage=stage,
            pollution_category=pollution_category,
            verification_status=verification_status,
            search_query=search_query
        )

        serialized = [BaseRepository.serialize_doc(item) for item in items]
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
                message="Only Super Administrators can create new statutory approval catalogue records.",
                status_code=403,
                request=request
            )

        serializer = ApprovalCatalogueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = approval_repo.upsert_approval(serializer.validated_data)

        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Statutory approval registered in catalogue successfully",
            status_code=201,
            request=request
        )

class ApprovalDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsSuperAdmin()]

    def get(self, request, approval_code):
        doc = approval_repo.find_by_code(approval_code)
        if not doc:
            raise ResourceNotFoundException(f"Approval '{approval_code}' not found in master catalogue.")
        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            request=request
        )

    def put(self, request, approval_code):
        existing = approval_repo.find_by_code(approval_code)
        if not existing:
            raise ResourceNotFoundException(f"Approval '{approval_code}' not found.")

        serializer = ApprovalCatalogueSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        update_data = serializer.validated_data
        update_data["approval_code"] = approval_code.upper()

        doc = approval_repo.upsert_approval(update_data)
        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Approval record updated successfully",
            request=request
        )

    def delete(self, request, approval_code):
        existing = approval_repo.find_by_code(approval_code)
        if not existing:
            raise ResourceNotFoundException(f"Approval '{approval_code}' not found.")

        # Soft delete / deactivation
        doc = approval_repo.upsert_approval({"approval_code": approval_code, "is_active": False})
        return api_success_response(
            data={"approval_code": approval_code, "is_active": False},
            message="Approval marked inactive",
            request=request
        )

class ApplicabilityEvaluateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ApplicabilityEvaluationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.validated_data

        evaluation_result = ApplicabilityEngineService.evaluate_profile(profile)
        return api_success_response(
            data=evaluation_result,
            message="Applicable approvals evaluated successfully",
            request=request
        )

class AdminRuleListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        rules = rule_repo.list_active_rules()
        serialized = [BaseRepository.serialize_doc(r) for r in rules]
        return api_success_response(
            data=serialized,
            meta={"count": len(serialized)},
            request=request
        )

    def post(self, request):
        serializer = ApplicabilityRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = rule_repo.upsert_rule(serializer.validated_data)
        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Rule created/updated successfully",
            status_code=201,
            request=request
        )
