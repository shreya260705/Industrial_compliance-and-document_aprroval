"""
RESTful API Views for Grievances & Escalations Engine.
Phase 6 Module 3.
Implements Applicant, Officer, and Super Admin endpoints with strict server-side scoping and RBAC.
"""

import csv
from datetime import datetime, timezone
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.common.responses import api_success_response, api_error_response
from apps.authentication.permissions import (
    IsBusinessOwner,
    IsDepartmentOfficer,
    IsSuperAdmin,
    IsOwnerOrOfficer
)
from apps.common.base_repository import BaseRepository
from apps.documents.repository import DocumentRepository
from apps.documents.services.supabase_storage import SupabaseStorageService
from .repository import (
    GrievanceRepository,
    GrievanceCategoryRepository,
    GrievanceEscalationRuleRepository,
    GrievanceAuditRepository
)
from .serializers import (
    GrievanceSubmitSerializer,
    GrievanceClarificationRequestSerializer,
    GrievanceClarificationResponseSerializer,
    GrievanceInternalNoteSerializer,
    GrievanceProposeResolutionSerializer,
    GrievanceResolveSerializer,
    GrievanceCloseSerializer,
    GrievanceReopenSerializer,
    GrievanceFeedbackSerializer,
    GrievanceWithdrawSerializer,
    GrievanceEscalateSerializer,
    GrievanceAssignSerializer,
    GrievanceReassignSerializer,
    GrievanceCategorySerializer,
    GrievanceEscalationRuleUpdateSerializer
)


def _enrich_document_previews(vault_ids):
    """Enriches vault document IDs with 15-minute temporary signed preview URLs."""
    if not vault_ids:
        return []
    doc_repo = DocumentRepository()
    storage_service = SupabaseStorageService()
    results = []
    for vid in vault_ids:
        doc = doc_repo.find_by_id(vid)
        if doc:
            storage_path = doc.get("storage_object_path") or doc.get("storage_path") or doc.get("file_path")
            signed_url = None
            if storage_path:
                try:
                    signed_url = storage_service.create_signed_download_url(storage_path, expires_in=900)
                except Exception:
                    signed_url = None
            results.append({
                "vault_document_id": str(doc["_id"]),
                "document_name": doc.get("document_name") or doc.get("original_filename"),
                "mime_type": doc.get("mime_type"),
                "file_size": doc.get("file_size_bytes") or doc.get("file_size"),
                "sha256_checksum": doc.get("sha256_checksum"),
                "signed_preview_url": signed_url
            })
    return results


# =============================================================================
# APPLICANT ENDPOINTS
# =============================================================================

class GrievanceListCreateView(APIView):
    permission_classes = [IsBusinessOwner]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def get(self, request):
        """Lists grievances belonging to the authenticated business owner."""
        track = request.query_params.get("track")
        status_filter = request.query_params.get("status")
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 50))

        result = self.repo.list_by_applicant(
            owner_user=request.user,
            track=track,
            status=status_filter,
            skip=skip,
            limit=limit
        )
        return api_success_response(data=result, message="Applicant grievances retrieved.")

    def post(self, request):
        """Submits a new Track A or Track B grievance."""
        serializer = GrievanceSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid submission data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        # Secure document ownership check: verify applicant owns attached documents
        vault_ids = serializer.validated_data.get("vault_document_ids", [])
        if vault_ids:
            doc_repo = DocumentRepository()
            user_id = str(getattr(request.user, "id", None) or getattr(request.user, "_id", None))
            for vid in vault_ids:
                doc = doc_repo.find_by_id(vid)
                if not doc or str(doc.get("owner_user_id")) != user_id:
                    return api_error_response(
                        message=f"Access forbidden: Vault document '{vid}' does not belong to you.",
                        status_code=status.HTTP_403_FORBIDDEN
                    )

        try:
            grievance = self.repo.submit_grievance(
                owner_user=request.user,
                data=serializer.validated_data
            )
            from apps.common.workflow_engine import WorkflowEngine
            grv_id = grievance.get("_id") or grievance.get("id")
            department_code = grievance.get("department_code")
            state_code = grievance.get("state_code")
            eligible_officers = (
                WorkflowEngine.find_eligible_officers(department_code, state_code)
                if grievance.get("track") == "INTERNAL"
                else []
            )
            officer_ids = [officer["_id"] for officer in eligible_officers]
            officer_name = getattr(request.user, "full_name", None) or "A business owner"
            reference = grievance.get("grievance_reference")
            notification_content = {
                str(officer["_id"]): {
                    "title": f"New grievance for {department_code}: {reference}",
                    "message": (
                        f"{officer_name} submitted grievance '{grievance.get('subject')}' "
                        f"against {department_code} in {state_code}. Review it in your grievance queue."
                    )
                }
                for officer in eligible_officers
            }
            WorkflowEngine.publish_event(
                event_type="GRIEVANCE_SUBMITTED",
                actor_user_id=request.user.id,
                actor_role=getattr(request.user, "role", "BUSINESS_OWNER"),
                target_collection="grievances",
                target_id=grv_id,
                title=f"Grievance Submitted: {reference}",
                message=f"Grievance {reference} was submitted against {department_code}.",
                payload={"reference": reference, "department": department_code, "state": state_code},
                recipient_user_ids=officer_ids,
                reference_id=reference,
                notification_content_by_user=notification_content
            )

            return api_success_response(
                data={"grievance": grievance},
                message="Grievance submitted successfully.",
                status_code=status.HTTP_201_CREATED
            )
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)


class GrievanceDetailView(APIView):
    permission_classes = [IsBusinessOwner]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def get(self, request, pk):
        """Retrieves grievance details for the applicant (internal notes strictly redacted)."""
        grievance = self.repo.get_by_id(pk)
        if not grievance:
            return api_error_response(message="Grievance not found.", status_code=status.HTTP_404_NOT_FOUND)

        # Tenant isolation
        user_id = str(getattr(request.user, "id", None) or getattr(request.user, "_id", None))
        if str(grievance.get("owner_user_id")) != user_id:
            return api_error_response(message="Access forbidden: You do not own this grievance.", status_code=status.HTTP_403_FORBIDDEN)

        # Redact internal confidential notes
        grievance.pop("internal_notes", None)

        # Enrich attached documents with signed preview URLs
        grievance["attached_documents"] = _enrich_document_previews(grievance.get("vault_document_ids", []))

        # Public audit history
        audit_history = self.repo.audit_repo.get_audit_history(pk, include_internal=False)

        return api_success_response(
            data={"grievance": grievance, "audit_history": audit_history},
            message="Grievance detail retrieved."
        )


class GrievanceRespondClarificationView(APIView):
    permission_classes = [IsBusinessOwner]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        serializer = GrievanceClarificationResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid clarification response", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        # Validate attached vault documents ownership
        vault_ids = serializer.validated_data.get("vault_document_ids", [])
        if vault_ids:
            doc_repo = DocumentRepository()
            user_id = str(getattr(request.user, "id", None) or getattr(request.user, "_id", None))
            for vid in vault_ids:
                doc = doc_repo.find_by_id(vid)
                if not doc or str(doc.get("owner_user_id")) != user_id:
                    return api_error_response(
                        message=f"Access forbidden: Vault document '{vid}' does not belong to you.",
                        status_code=status.HTTP_403_FORBIDDEN
                    )

        try:
            res = self.repo.respond_clarification(
                grievance_id=pk,
                applicant_user=request.user,
                clarification_id=serializer.validated_data["clarification_id"],
                response_text=serializer.validated_data["response_text"],
                vault_document_ids=vault_ids
            )
            return api_success_response(data=res, message="Clarification response recorded.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GrievanceReopenView(APIView):
    permission_classes = [IsBusinessOwner]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        serializer = GrievanceReopenSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid reopen request", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            res = self.repo.reopen_grievance(
                grievance_id=pk,
                applicant_user=request.user,
                reason=serializer.validated_data["reason"]
            )
            return api_success_response(data={"grievance": res}, message="Grievance reopened successfully.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GrievanceWithdrawView(APIView):
    permission_classes = [IsBusinessOwner]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        serializer = GrievanceWithdrawSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid withdrawal request", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            res = self.repo.withdraw_grievance(
                grievance_id=pk,
                applicant_user=request.user,
                reason=serializer.validated_data["reason"]
            )
            return api_success_response(data={"grievance": res}, message="Grievance withdrawn.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GrievanceFeedbackView(APIView):
    permission_classes = [IsBusinessOwner]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        serializer = GrievanceFeedbackSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid feedback data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            res = self.repo.submit_feedback(
                grievance_id=pk,
                applicant_user=request.user,
                rating=serializer.validated_data["rating"],
                feedback_text=serializer.validated_data.get("feedback_text", "")
            )
            return api_success_response(data={"feedback": res}, message="Feedback submitted.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GrievanceCategoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceCategoryRepository()

    def get(self, request):
        track = request.query_params.get("track")
        categories = self.repo.list_active(track=track)
        return api_success_response(data={"categories": categories}, message="Active categories retrieved.")


# =============================================================================
# OFFICER ENDPOINTS
# =============================================================================

class OfficerGrievanceQueueView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def get(self, request):
        role = getattr(request.user, "role", "")
        if role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            return api_error_response(message="Access restricted to Department Officers and Super Administrators.", status_code=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get("status")
        assigned_filter = request.query_params.get("assigned")  # "ME", "UNASSIGNED", "ALL"
        priority_filter = request.query_params.get("priority")
        search_query = request.query_params.get("search")
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 50))

        result = self.repo.get_officer_queue(
            officer_user=request.user,
            status_filter=status_filter,
            assigned_filter=assigned_filter,
            priority_filter=priority_filter,
            search_query=search_query,
            skip=skip,
            limit=limit
        )
        return api_success_response(data=result, message="Officer grievance queue retrieved.")


class OfficerGrievanceDetailView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def get(self, request, pk):
        role = getattr(request.user, "role", "")
        if role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            return api_error_response(message="Access restricted to Department Officers and Super Administrators.", status_code=status.HTTP_403_FORBIDDEN)

        grievance = self.repo.get_by_id(pk)
        if not grievance:
            return api_error_response(message="Grievance not found.", status_code=status.HTTP_404_NOT_FOUND)

        try:
            self.repo.check_officer_scoping(request.user, grievance)
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)

        # Officer gets full document previews and full audit history including internal notes
        grievance["attached_documents"] = _enrich_document_previews(grievance.get("vault_document_ids", []))
        audit_history = self.repo.audit_repo.get_audit_history(pk, include_internal=True)

        return api_success_response(
            data={"grievance": grievance, "audit_history": audit_history},
            message="Officer grievance detail retrieved."
        )


class OfficerGrievanceAssignView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        role = getattr(request.user, "role", "")
        if role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            return api_error_response(message="Access restricted to Department Officers and Super Administrators.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = GrievanceAssignSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid assignment data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        target_officer_id = serializer.validated_data.get("target_officer_id")
        remarks = serializer.validated_data.get("remarks", "")

        if role == "DEPARTMENT_OFFICER":
            grv = self.repo.get_by_id(pk)
            if not grv:
                return api_error_response(message="Grievance not found.", status_code=status.HTTP_404_NOT_FOUND)
            if grv.get("assigned_officer_id") and str(grv["assigned_officer_id"]) != str(request.user.id):
                return api_error_response(message="Grievance is already assigned to another officer.", status_code=status.HTTP_403_FORBIDDEN)
            target_officer_id = request.user.id
            if not remarks:
                remarks = "Self-claimed for grievance examination."

        from apps.common.workflow_engine import WorkflowEngine
        try:
            res = self.repo.assign_officer(
                grievance_id=pk,
                officer_user=request.user,
                target_officer_id=target_officer_id,
                remarks=remarks or ""
            )
            WorkflowEngine.assign_officer(
                target_collection="grievances",
                target_id=pk,
                officer_user_id=target_officer_id or request.user.id,
                assigned_by_user_id=request.user.id,
                assigned_by_role=role,
                remarks=remarks or "Officer assigned to grievance."
            )
            return api_success_response(data={"grievance": BaseRepository.serialize_doc(res)}, message="Officer assigned.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfficerGrievanceStartReviewView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        role = getattr(request.user, "role", "")
        if role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            return api_error_response(message="Access restricted to Department Officers and Super Administrators.", status_code=status.HTTP_403_FORBIDDEN)

        try:
            res = self.repo.transition_status(
                grievance_id=pk,
                new_status="UNDER_REVIEW",
                actor_user=request.user,
                action_name="START_REVIEW",
                remarks="Officer commenced active scrutiny."
            )
            return api_success_response(data={"grievance": res}, message="Grievance moved to UNDER_REVIEW.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfficerGrievanceClarificationView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        role = getattr(request.user, "role", "")
        if role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            return api_error_response(message="Access restricted to Department Officers and Super Administrators.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = GrievanceClarificationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid clarification request", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            item = self.repo.request_clarification(
                grievance_id=pk,
                officer_user=request.user,
                question=serializer.validated_data["question"],
                issue_link=serializer.validated_data.get("issue_link"),
                internal_target_days=serializer.validated_data.get("internal_target_days", 5)
            )
            return api_success_response(data={"clarification": item}, message="Clarification requested.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfficerGrievanceInternalNoteView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        role = getattr(request.user, "role", "")
        if role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            return api_error_response(message="Access restricted to Department Officers and Super Administrators.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = GrievanceInternalNoteSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid internal note data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            note = self.repo.add_internal_note(
                grievance_id=pk,
                officer_user=request.user,
                note_text=serializer.validated_data["note_text"]
            )
            return api_success_response(data={"note": note}, message="Internal confidential note saved.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfficerGrievanceProposeResolutionView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        role = getattr(request.user, "role", "")
        if role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            return api_error_response(message="Access restricted to Department Officers and Super Administrators.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = GrievanceProposeResolutionSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid proposal data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            res = self.repo.propose_resolution(
                grievance_id=pk,
                officer_user=request.user,
                remarks=serializer.validated_data["remarks"],
                corrective_actions=serializer.validated_data.get("corrective_actions")
            )
            return api_success_response(data={"grievance": res}, message="Resolution proposed.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfficerGrievanceResolveView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        role = getattr(request.user, "role", "")
        if role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            return api_error_response(message="Access restricted to Department Officers and Super Administrators.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = GrievanceResolveSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid resolution data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            res = self.repo.resolve_grievance(
                grievance_id=pk,
                officer_user=request.user,
                resolution_summary=serializer.validated_data["resolution_summary"],
                corrective_actions=serializer.validated_data.get("corrective_actions")
            )

            from apps.common.workflow_engine import WorkflowEngine
            WorkflowEngine.publish_event(
                event_type="GRIEVANCE_RESOLVED",
                actor_user_id=request.user.id,
                actor_role=role,
                target_collection="grievances",
                target_id=pk,
                title=f"Grievance Resolved: {res.get('grievance_reference')}",
                message=f"Grievance {res.get('grievance_reference')} has been marked resolved: {serializer.validated_data['resolution_summary'][:100]}",
                payload={"resolution": serializer.validated_data["resolution_summary"]},
                recipient_user_ids=[res.get("owner_user_id")] if res.get("owner_user_id") else [],
                reference_id=res.get("grievance_reference")
            )

            return api_success_response(data={"grievance": res}, message="Grievance marked as RESOLVED.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfficerGrievanceCloseView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        role = getattr(request.user, "role", "")
        if role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            return api_error_response(message="Access restricted to Department Officers and Super Administrators.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = GrievanceCloseSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid closure data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            res = self.repo.close_grievance(
                grievance_id=pk,
                actor_user=request.user,
                closure_remarks=serializer.validated_data.get("closure_remarks", "")
            )
            return api_success_response(data={"grievance": res}, message="Grievance closed.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfficerGrievanceEscalateView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        serializer = GrievanceEscalateSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid escalation data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            res = self.repo.escalate_grievance(
                grievance_id=pk,
                actor_user=request.user,
                new_level=serializer.validated_data["new_level"],
                trigger=serializer.validated_data["trigger"],
                reason=serializer.validated_data["reason"]
            )
            return api_success_response(data={"grievance": res}, message="Grievance escalated.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# SUPER ADMIN OVERSIGHT & GOVERNANCE ENDPOINTS
# =============================================================================

class AdminGrievanceOversightView(APIView):
    permission_classes = [IsSuperAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def get(self, request):
        metrics = self.repo.get_national_oversight()
        filter_query = {}
        search = request.query_params.get("search")
        if search:
            filter_query["$or"] = [
                {"grievance_id": {"$regex": search, "$options": "i"}},
                {"title": {"$regex": search, "$options": "i"}},
                {"category_code": {"$regex": search, "$options": "i"}},
            ]
        if request.query_params.get("status"):
            filter_query["status"] = request.query_params.get("status")
        if request.query_params.get("priority"):
            filter_query["priority"] = request.query_params.get("priority")
        if request.query_params.get("track"):
            filter_query["track"] = request.query_params.get("track")
        limit = int(request.query_params.get("limit", 100))
        cursor = self.repo.collection.find(filter_query).sort("created_at", -1).limit(limit)
        grievances = [self.repo.serialize_doc(doc) for doc in cursor]
        data = {**metrics, "grievances": grievances, "results": grievances}
        return api_success_response(data=data, message="National grievance oversight metrics retrieved.")


class AdminGrievanceReassignView(APIView):
    permission_classes = [IsSuperAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def post(self, request, pk):
        serializer = GrievanceReassignSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid reassignment data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        from apps.common.workflow_engine import WorkflowEngine
        try:
            res = self.repo.reassign_officer_admin(
                grievance_id=pk,
                admin_user=request.user,
                new_officer_id=serializer.validated_data["new_officer_id"],
                justification=serializer.validated_data["justification"]
            )
            WorkflowEngine.assign_officer(
                target_collection="grievances",
                target_id=pk,
                officer_user_id=serializer.validated_data["new_officer_id"],
                assigned_by_user_id=request.user.id,
                assigned_by_role="SUPER_ADMIN",
                remarks=f"Administrative reassignment: {serializer.validated_data['justification']}"
            )
            return api_success_response(data={"grievance": BaseRepository.serialize_doc(res)}, message="Grievance administratively reassigned.")
        except PermissionError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return api_error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return api_error_response(message=str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminGrievanceCategoryListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceCategoryRepository()

    def get(self, request):
        cats = self.repo.list_all()
        return api_success_response(data={"categories": cats}, message="All categories retrieved.")

    def post(self, request):
        serializer = GrievanceCategorySerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid category data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        doc = self.repo.create(serializer.validated_data)
        return api_success_response(data={"category": doc}, message="Category created.", status_code=status.HTTP_201_CREATED)


class AdminGrievanceEscalationRuleListView(APIView):
    permission_classes = [IsSuperAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceEscalationRuleRepository()

    def get(self, request):
        level_filter = request.query_params.get("level")
        rules = self.repo.list_all()
        if level_filter:
            rules = [r for r in rules if r.get("level") == level_filter]
        return api_success_response(data={"rules": rules}, message="Escalation rules retrieved.")

    def post(self, request):
        rule_name = request.data.get("rule_name")
        if not rule_name:
            return api_error_response(message="rule_name is required", status_code=status.HTTP_400_BAD_REQUEST)
        level = request.data.get("level", "LEVEL_2")
        trigger_days = int(request.data.get("trigger_days", 7))
        description = request.data.get("description", "")
        target_department = request.data.get("target_department")
        auto_reassign = bool(request.data.get("auto_reassign", False))

        doc = {
            "code": request.data.get("code") or f"ESC-{level}-{int(datetime.now(timezone.utc).timestamp())}",
            "rule_name": rule_name,
            "level": level,
            "trigger_days": trigger_days,
            "description": description,
            "target_department": target_department,
            "auto_reassign": auto_reassign,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        res = self.repo.insert_one(doc)
        return api_success_response(data={"rule": self.repo.serialize_doc(res)}, message="Escalation rule created.", status_code=status.HTTP_201_CREATED)


class AdminGrievanceEscalationRuleUpdateView(APIView):
    permission_classes = [IsSuperAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceEscalationRuleRepository()

    def put(self, request, code):
        serializer = GrievanceEscalationRuleUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error_response(message="Invalid rule update data", field_errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        ok = self.repo.update_rule(code, serializer.validated_data)
        if not ok:
            return api_error_response(message="Rule not found.", status_code=status.HTTP_404_NOT_FOUND)

        return api_success_response(data={"rule_code": code}, message="Rule updated successfully.")


class AdminGrievanceAuditView(APIView):
    permission_classes = [IsSuperAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceAuditRepository()

    def get(self, request):
        """Returns national grievance audit events with pagination and filters."""
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 100))

        filter_q = {}
        grievance_id = request.query_params.get("grievance_id")
        if grievance_id:
            filter_q["$or"] = [
                {"grievance_id": grievance_id},
                {"metadata.grievance_id": grievance_id}
            ]
        action = request.query_params.get("action")
        if action:
            filter_q["action"] = action

        cursor = self.repo.collection.find(filter_q).sort("timestamp", -1).skip(skip).limit(limit)
        events = [self.repo.serialize_doc(doc) for doc in cursor]
        total = self.repo.collection.count_documents(filter_q)

        return api_success_response(
            data={"total_count": total, "events": events, "logs": events, "skip": skip, "limit": limit},
            message="Audit events retrieved."
        )


class AdminGrievanceExportCSVView(APIView):
    permission_classes = [IsSuperAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repo = GrievanceRepository()

    def get(self, request):
        """Authorized CSV export of grievance register."""
        response = HttpResponse(content_type='text/csv')
        filename = f"bizpermit_grievance_register_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow([
            "Grievance Reference",
            "Track",
            "Category",
            "State",
            "Department",
            "Priority",
            "Severity",
            "Status",
            "Escalation Level",
            "Assigned Officer",
            "Subject",
            "Created Date (UTC)",
            "Internal Target Date (UTC)",
            "Resolution Date (UTC)"
        ])

        cursor = self.repo.collection.find().sort("created_at", -1)
        for doc in cursor:
            res_details = doc.get("resolution_details") or {}
            writer.writerow([
                doc.get("grievance_reference", ""),
                doc.get("track", ""),
                doc.get("category_code", ""),
                doc.get("state_code", ""),
                doc.get("department_code", ""),
                doc.get("priority", ""),
                doc.get("severity", ""),
                doc.get("status", ""),
                doc.get("escalation_level", ""),
                doc.get("assigned_officer_email") or "Unassigned",
                doc.get("subject", ""),
                doc.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if doc.get("created_at") else "",
                doc.get("internal_target_date").strftime("%Y-%m-%d") if doc.get("internal_target_date") else "",
                res_details.get("resolved_at").strftime("%Y-%m-%d %H:%M:%S") if res_details.get("resolved_at") else ""
            ])

        return response
