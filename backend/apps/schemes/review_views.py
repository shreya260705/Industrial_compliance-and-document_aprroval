"""
DRF Views for Phase 6 Module 2: Officer Review Workflow, Clarification Engine & Audit Desk.
"""

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.authentication.permissions import IsDepartmentOfficer, IsSuperAdmin, IsOwnerOrOfficer
from apps.common.responses import api_success_response, api_error_response
from apps.common.base_repository import BaseRepository
from apps.common.exceptions import (
    ResourceNotFoundException,
    PermissionDeniedException,
    ValidationException
)
from apps.schemes.review_repository import SchemeReviewRepository, SchemeReviewAuditRepository
from apps.schemes.review_serializers import (
    OfficerReviewAssignSerializer,
    OfficerClarificationRequestSerializer,
    ApplicantClarificationResponseSerializer,
    OfficerReviewCompleteSerializer,
    OfficerReviewReferralSerializer,
    OfficerReviewWithdrawSerializer,
    OfficerReviewReassignSerializer
)
from apps.authentication.repository import UserRepository

user_repo = UserRepository()

review_repo = SchemeReviewRepository()
audit_repo = SchemeReviewAuditRepository()


class OfficerReviewQueueView(APIView):
    """
    Queue of scheme dossiers for Department Scrutiny Officers.
    Strictly scoped to officer's assigned department and state jurisdiction.
    Super Admins can view across all departments and states.
    """
    permission_classes = [IsOwnerOrOfficer]

    def get(self, request):
        user_role = getattr(request.user, "role", "")
        if user_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        review_status = request.query_params.get("review_status")
        assigned_filter = request.query_params.get("assigned_filter")
        scheme_code = request.query_params.get("scheme_code")
        state_code = request.query_params.get("state_code")
        search_query = request.query_params.get("search")

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            limit = min(100, max(1, int(request.query_params.get("limit", 20))))
        except ValueError:
            page, limit = 1, 20
        skip = (page - 1) * limit

        result = review_repo.get_officer_queue(
            officer_user=request.user,
            review_status=review_status,
            assigned_filter=assigned_filter,
            scheme_code=scheme_code,
            state_code=state_code,
            search_query=search_query,
            skip=skip,
            limit=limit
        )

        return api_success_response(
            data={
                "reviews": result["items"],
                "total_count": result["total_count"],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total_pages": (result["total_count"] + limit - 1) // limit if result["total_count"] > 0 else 1
                }
            },
            message="Officer scheme review queue retrieved successfully",
            request=request
        )


class OfficerReviewDetailView(APIView):
    """
    Detailed workspace for reviewing an application dossier.
    Enforces server-side department and geographical scoping barriers.
    Includes attached vault documents with secure temporary signed preview URLs.
    """
    permission_classes = [IsOwnerOrOfficer]

    def get(self, request, id):
        user_role = getattr(request.user, "role", "")
        if user_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        try:
            detail = review_repo.get_review_detail(dossier_id=id, officer_user=request.user)
        except ValueError as err:
            raise ResourceNotFoundException(str(err))
        except PermissionError as err:
            raise PermissionDeniedException(str(err))

        return api_success_response(
            data={"dossier": detail},
            message="Scheme review detail retrieved successfully",
            request=request
        )


class OfficerReviewAssignView(APIView):
    """
    Assigns a review dossier to an officer.
    Officers can pick up unassigned dossiers in their department & state.
    Super Admins can assign to any qualified officer.
    """
    permission_classes = [IsOwnerOrOfficer]

    def post(self, request, id):
        user_role = getattr(request.user, "role", "")
        if user_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        serializer = OfficerReviewAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        target_uid = data.get("target_officer_id")
        if target_uid and user_role == "SUPER_ADMIN":
            target_user = user_repo.find_by_id(target_uid)
            if not target_user:
                raise ResourceNotFoundException("Target officer user not found.")
        elif user_role == "DEPARTMENT_OFFICER":
            dossier = review_repo.find_by_id(id)
            if not dossier:
                raise ResourceNotFoundException("Scheme dossier not found.")
            if dossier.get("assigned_officer_id") and str(dossier["assigned_officer_id"]) != str(request.user.id):
                raise PermissionDeniedException("Dossier is already assigned to another officer.")
            target_uid = request.user.id

        from apps.common.workflow_engine import WorkflowEngine
        remarks = data.get("remarks") or ("Scheme dossier assigned." if user_role == "SUPER_ADMIN" else "Self-claimed for review.")
        try:
            target_user = user_repo.find_by_id(target_uid) if target_uid else None
            updated = review_repo.assign_review(
                dossier_id=id,
                acting_user=request.user,
                target_officer_user=target_user,
                remarks=remarks
            )
            WorkflowEngine.assign_officer(
                target_collection="scheme_applications",
                target_id=id,
                officer_user_id=target_uid or request.user.id,
                assigned_by_user_id=request.user.id,
                assigned_by_role=user_role,
                remarks=remarks
            )
        except ValueError as err:
            raise ValidationException(str(err))
        except PermissionError as err:
            raise PermissionDeniedException(str(err))

        return api_success_response(
            data={"dossier": BaseRepository.serialize_doc(updated)},
            message="Review assigned successfully",
            request=request
        )


class OfficerReviewStartView(APIView):
    """
    Transitions state from ASSIGNED or APPLICANT_RESPONSE_RECEIVED to UNDER_REVIEW.
    """
    permission_classes = [IsOwnerOrOfficer]

    def post(self, request, id):
        user_role = getattr(request.user, "role", "")
        if user_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        remarks = request.data.get("remarks", "")
        try:
            updated = review_repo.start_review(
                dossier_id=id,
                officer_user=request.user,
                remarks=remarks
            )
        except ValueError as err:
            raise ValidationException(str(err))
        except PermissionError as err:
            raise PermissionDeniedException(str(err))


        return api_success_response(
            data={"dossier": BaseRepository.serialize_doc(updated)},
            message="Internal review scrutiny commenced",
            request=request
        )


class OfficerReviewClarificationView(APIView):
    """
    Officer requests specific missing information or evidence from the applicant.
    Transitions state to CLARIFICATION_REQUESTED.
    """
    permission_classes = [IsOwnerOrOfficer]

    def post(self, request, id):
        user_role = getattr(request.user, "role", "")
        if user_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        serializer = OfficerClarificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            updated = review_repo.request_clarification(
                dossier_id=id,
                officer_user=request.user,
                question=data["question"],
                related_criterion_key=data.get("related_criterion_key"),
                deadline_days=data.get("deadline_days", 15)
            )
        except ValueError as err:
            raise ValidationException(str(err))
        except PermissionError as err:
            raise PermissionDeniedException(str(err))


        return api_success_response(
            data={"dossier": BaseRepository.serialize_doc(updated)},
            message="Clarification request dispatched to applicant",
            request=request
        )


class ApplicantClarificationResponseView(APIView):
    """
    Applicant responds to an officer's clarification request.
    Permitted strictly for the dossier owner (BUSINESS_OWNER).
    RULE B6: Applicant cannot alter the officer's question or clarification record.
    Transitions state to APPLICANT_RESPONSE_RECEIVED.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        serializer = ApplicantClarificationResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            updated = review_repo.respond_to_clarification(
                dossier_id=id,
                applicant_user=request.user,
                clarification_id=data["clarification_id"],
                response_text=data["response_text"],
                vault_document_ids=data.get("vault_document_ids", [])
            )
        except ValueError as err:
            raise ValidationException(str(err))
        except PermissionError as err:
            raise PermissionDeniedException(str(err))


        return api_success_response(
            data={"dossier": BaseRepository.serialize_doc(updated)},
            message="Clarification response submitted successfully. Review resumed.",
            request=request
        )


class OfficerReviewCompleteView(APIView):
    """
    Officer records internal review decision.
    Decisions: INTERNAL_VERIFIED, INTERNAL_REJECTED, DISCREPANCIES_NOTED.
    Embeds non-statutory SIH26130 prototype disclaimer.
    """
    permission_classes = [IsOwnerOrOfficer]

    def post(self, request, id):
        user_role = getattr(request.user, "role", "")
        if user_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        serializer = OfficerReviewCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            updated = review_repo.complete_review(
                dossier_id=id,
                officer_user=request.user,
                decision=data["decision"],
                remarks=data["remarks"],
                discrepancies=data.get("discrepancies", [])
            )
        except ValueError as err:
            raise ValidationException(str(err))
        except PermissionError as err:
            raise PermissionDeniedException(str(err))


        return api_success_response(
            data={"dossier": BaseRepository.serialize_doc(updated)},
            message=f"Internal review completed with decision: {data['decision']}",
            request=request
        )


class OfficerReviewReferralView(APIView):
    """
    Escalates dossier to senior nodal authority / manual review.
    Transitions state to REFERRED_FOR_MANUAL_REVIEW.
    """
    permission_classes = [IsOwnerOrOfficer]

    def post(self, request, id):
        user_role = getattr(request.user, "role", "")
        if user_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        serializer = OfficerReviewReferralSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            updated = review_repo.refer_for_manual_review(
                dossier_id=id,
                officer_user=request.user,
                escalation_reason=data["escalation_reason"],
                referred_authority=data["referred_authority"],
                remarks=data.get("remarks", "")
            )
        except ValueError as err:
            raise ValidationException(str(err))
        except PermissionError as err:
            raise PermissionDeniedException(str(err))


        return api_success_response(
            data={"dossier": BaseRepository.serialize_doc(updated)},
            message="Dossier referred for senior manual review",
            request=request
        )


class OfficerReviewWithdrawView(APIView):
    """
    Withdraws review dossier. Permitted for applicant owner or Super Admin.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        serializer = OfficerReviewWithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            updated = review_repo.withdraw_review(
                dossier_id=id,
                acting_user=request.user,
                reason=data["reason"]
            )
        except ValueError as err:
            raise ValidationException(str(err))
        except PermissionError as err:
            raise PermissionDeniedException(str(err))


        return api_success_response(
            data={"dossier": BaseRepository.serialize_doc(updated)},
            message="Review withdrawn successfully",
            request=request
        )


class AdminSchemeReviewOversightView(APIView):
    """
    National-level administrative review analytics for Super Admins.
    Aggregates review queues across all departments and states.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        data = review_repo.get_super_admin_oversight()
        return api_success_response(
            data=data,
            message="National review oversight analytics retrieved successfully",
            request=request
        )


class AdminSchemeReviewReassignView(APIView):
    """
    Super Admin endpoint to reassign a review dossier to another officer.
    Mandates justification remarks.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, id):
        serializer = OfficerReviewReassignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        target_officer = user_repo.find_by_id(data["new_officer_id"])
        if not target_officer:
            raise ResourceNotFoundException("Target officer not found.")

        target_email = target_officer.get("email", "")

        from apps.common.workflow_engine import WorkflowEngine
        try:
            updated = review_repo.assign_review(
                dossier_id=id,
                acting_user=request.user,
                target_officer_user=target_officer,
                remarks=data["justification"]
            )
            WorkflowEngine.assign_officer(
                target_collection="scheme_applications",
                target_id=id,
                officer_user_id=data["new_officer_id"],
                assigned_by_user_id=request.user.id,
                assigned_by_role="SUPER_ADMIN",
                remarks=f"Administrative Reassignment: {data['justification']}"
            )
        except ValueError as err:
            raise ValidationException(str(err))
        except PermissionError as err:
            raise PermissionDeniedException(str(err))

        return api_success_response(
            data={"dossier": BaseRepository.serialize_doc(updated)},
            message=f"Review reassigned to officer {target_email}",
            request=request
        )
