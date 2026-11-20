"""
API Views for Applications Dossiers, Filing Lifecycle, and Officer Scrutiny Desk.
"""

from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.common.responses import api_success_response
from apps.common.base_repository import BaseRepository
from apps.common.exceptions import (
    ResourceNotFoundException,
    PermissionDeniedException,
    ValidationException
)
from apps.authentication.permissions import (
    IsBusinessOwner,
    IsDepartmentOfficer,
    IsSuperAdmin,
    IsOwnerOrOfficer
)
from apps.common.audit import log_audit_event
from apps.applications.repository import (
    ApplicationRepository,
    ApplicationStatusHistoryRepository
)
from apps.applications.serializers import (
    ApplicationCreateSerializer,
    ApplicationUpdateSerializer,
    DocumentAttachSerializer,
    ApplicationSubmitSerializer,
    ClarificationResponseSerializer,
    OfficerScrutinyActionSerializer
)
from apps.applications.services.pdf_generator import ApplicationPdfService
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.notifications.repository import NotificationRepository

app_repo = ApplicationRepository()
history_repo = ApplicationStatusHistoryRepository()
biz_repo = BusinessRepository()
loc_repo = LocationRepository()
notif_repo = NotificationRepository()


class ApplicationListCreateView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request):
        business_id = request.query_params.get('business_id')
        location_id = request.query_params.get('location_id')
        status = request.query_params.get('status')
        search_query = request.query_params.get('search')
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        skip = (page - 1) * page_size

        apps = app_repo.find_by_user(
            user_id=request.user.id,
            business_id=business_id,
            location_id=location_id,
            status=status,
            search_query=search_query,
            skip=skip,
            limit=page_size
        )
        total = app_repo.count_by_user(
            user_id=request.user.id,
            business_id=business_id,
            location_id=location_id,
            status=status,
            search_query=search_query
        )

        serialized = [BaseRepository.serialize_doc(a) for a in apps]
        return api_success_response(
            data=serialized,
            meta={
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total,
                    "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
                }
            },
            request=request
        )

    def post(self, request):
        serializer = ApplicationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        business_id = data['business_id']
        location_id = data['location_id']
        approval_code = data['approval_code']

        # Prevent duplicate active application
        existing_active = app_repo.find_active_by_location_and_approval(location_id, approval_code)
        if existing_active:
            # If still in draft, return existing draft to allow resumption
            if existing_active.get("status") == "DRAFT":
                return api_success_response(
                    data=BaseRepository.serialize_doc(existing_active),
                    message="Resuming existing incomplete draft application.",
                    status_code=200,
                    request=request
                )
            raise ValidationException(
                f"An active application ({existing_active.get('application_number')}) in status "
                f"'{existing_active.get('status')}' already exists for this plant clearance.",
                error_code="DUPLICATE_ACTIVE_APPLICATION"
            )

        try:
            created = app_repo.create_draft(
                owner_user_id=request.user.id,
                business_id=business_id,
                location_id=location_id,
                approval_code=approval_code,
                applicant_form_data=data.get('applicant_form_data')
            )
        except ValueError as err:
            raise ValidationException(str(err))

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="APPLICATION_DRAFT_CREATED",
            target_collection="applications",
            target_id=created["_id"],
            delta={"app_number": created["application_number"], "approval_code": approval_code},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(created),
            message="Application dossier draft created successfully.",
            status_code=201,
            request=request
        )


class ApplicationMetricsView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request):
        metrics = app_repo.get_metrics_for_user(
            request.user.id,
            business_id=request.query_params.get("business_id")
        )
        return api_success_response(data=metrics, request=request)


class ApplicationDetailView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request, pk):
        app = app_repo.find_by_id_for_user(pk, request.user.id)
        if not app:
            raise ResourceNotFoundException("Application not found or access unauthorized.")

        serialized = BaseRepository.serialize_doc(app)
        history = history_repo.find_by_application(app["_id"])
        serialized["status_history"] = [BaseRepository.serialize_doc(h) for h in history]

        return api_success_response(data=serialized, request=request)

    def patch(self, request, pk):
        serializer = ApplicationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = app_repo.update_draft_data(
                application_id=pk,
                user_id=request.user.id,
                form_data=serializer.validated_data['applicant_form_data']
            )
        except ValueError as err:
            raise ValidationException(str(err))

        if not updated:
            raise ResourceNotFoundException("Application not found or access unauthorized.")

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="APPLICATION_DRAFT_UPDATED",
            target_collection="applications",
            target_id=pk,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Application form saved successfully.",
            request=request
        )

    def delete(self, request, pk):
        existing = app_repo.find_by_id_for_user(pk, request.user.id)
        if not existing:
            raise ResourceNotFoundException("Application not found or access unauthorized.")

        if existing.get("status") != "DRAFT":
            raise ValidationException(
                f"Cannot delete application with status '{existing.get('status')}'. Only drafts may be deleted.",
                error_code="CANNOT_DELETE_SUBMITTED_APPLICATION"
            )

        app_repo.collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"is_active": False}}
        )

        return api_success_response(
            data={"application_id": pk, "is_active": False},
            message="Draft application deleted successfully.",
            request=request
        )


class ApplicationSubmitView(APIView):
    permission_classes = [IsBusinessOwner]

    def post(self, request, pk):
        app = app_repo.find_by_id_for_user(pk, request.user.id)
        if not app:
            raise ResourceNotFoundException("Application dossier not found.")

        serializer = ApplicationSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            submitted = app_repo.submit_application(pk, request.user.id)
        except ValueError as err:
            raise ValidationException(str(err))

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="APPLICATION_SUBMITTED",
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            target_collection="applications",
            target_id=pk,
            title=f"Application {submitted['application_number']} Submitted",
            message=f"Application for '{submitted['approval_title']}' has been submitted for departmental scrutiny.",
            payload={"app_number": submitted["application_number"], "dept": submitted["department_code"], "state": submitted["state_code"]},
            recipient_user_ids=[request.user.id],
            reference_id=submitted["application_number"]
        )

        officer = WorkflowEngine.select_least_loaded_officer(
            submitted.get("department_code"),
            submitted.get("state_code") or submitted.get("jurisdiction_code")
        )
        if officer:
            submitted = WorkflowEngine.assign_officer(
                target_collection="applications",
                target_id=pk,
                officer_user_id=officer["_id"],
                assigned_by_user_id=None,
                assigned_by_role="SYSTEM",
                remarks="Automatically assigned to the least-loaded eligible officer."
            )
            response_message = (
                f"Application submitted and assigned to {submitted.get('assigned_officer_name')} "
                "for departmental scrutiny."
            )
        else:
            response_message = (
                "Application submitted successfully. It is awaiting assignment to an eligible "
                "department scrutiny officer."
            )

        return api_success_response(
            data=BaseRepository.serialize_doc(submitted),
            message=response_message,
            request=request
        )


class ApplicationAttachDocumentView(APIView):
    permission_classes = [IsBusinessOwner]

    def post(self, request, pk):
        app = app_repo.find_by_id_for_user(pk, request.user.id)
        if not app:
            raise ResourceNotFoundException("Application dossier not found.")

        serializer = DocumentAttachSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = app_repo.attach_vault_document(
                application_id=pk,
                user_id=request.user.id,
                vault_document_id=serializer.validated_data['vault_document_id']
            )
        except ValueError as err:
            raise ValidationException(str(err))

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Vault document attached to application dossier successfully.",
            request=request
        )

    def delete(self, request, pk, vault_doc_id):
        app = app_repo.find_by_id_for_user(pk, request.user.id)
        if not app:
            raise ResourceNotFoundException("Application dossier not found.")

        try:
            updated = app_repo.remove_attachment(
                application_id=pk,
                user_id=request.user.id,
                vault_document_id=vault_doc_id
            )
        except ValueError as err:
            raise ValidationException(str(err))

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Document attachment removed from application dossier.",
            request=request
        )


class ApplicationAcknowledgementPdfView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def get(self, request, pk):
        # Look up application
        app = app_repo.find_by_id(pk)
        if not app or not app.get("is_active", True):
            raise ResourceNotFoundException("Application not found.")

        # Permission check: must be owner, or matching officer, or admin
        user_role = getattr(request.user, 'role', '')
        if user_role == 'BUSINESS_OWNER' and str(app.get("owner_user_id")) != str(request.user.id):
            raise PermissionDeniedException("Access unauthorized to this application acknowledgement.")
        elif user_role == 'DEPARTMENT_OFFICER':
            off_prof = getattr(request.user, 'officer_profile', {})
            off_dept = off_prof.get("department_code")
            off_state = off_prof.get("jurisdiction_code")
            if off_dept and off_dept != app.get("department_code"):
                raise PermissionDeniedException("Officer not authorized for this regulatory department.")
            if off_state and off_state != app.get("state_code"):
                raise PermissionDeniedException("Officer not authorized for this geographical state.")

        business = biz_repo.find_by_id(app["business_id"]) or {}
        location = loc_repo.find_by_id(app["location_id"]) or {}

        pdf_bytes = ApplicationPdfService.generate_acknowledgement_pdf(app, business, location)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        filename = f"BizPermit_Acknowledgement_{app.get('application_number', 'Doc')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ApplicationClarificationRespondView(APIView):
    permission_classes = [IsBusinessOwner]

    def post(self, request, pk):
        app = app_repo.find_by_id_for_user(pk, request.user.id)
        if not app:
            raise ResourceNotFoundException("Application dossier not found.")

        serializer = ClarificationResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = app_repo.respond_to_clarification(
                application_id=pk,
                user_id=request.user.id,
                response_text=serializer.validated_data['response_text']
            )
        except ValueError as err:
            raise ValidationException(str(err))

        recipients = [request.user.id]
        if updated.get("assigned_officer_id"):
            recipients.append(updated["assigned_officer_id"])

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="APPLICATION_RESUBMITTED",
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            target_collection="applications",
            target_id=pk,
            title=f"Clarification Submitted: {updated['application_number']}",
            message=f"Applicant submitted clarification response for {updated['application_number']}.",
            payload={"app_number": updated["application_number"], "status": "RESUBMITTED"},
            recipient_user_ids=recipients,
            reference_id=updated["application_number"]
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Clarification response submitted. Status updated to RESUBMITTED.",
            request=request
        )


# =========================================================================
# OFFICER SCRUTINY DESK ENDPOINTS
# =========================================================================

class OfficerApplicationListView(APIView):
    """
    Officer queue strictly scoped to officer's assigned department & state jurisdiction.
    Super Admins can view all queues across India.
    """
    permission_classes = [IsOwnerOrOfficer]

    def get(self, request):
        user_role = getattr(request.user, 'role', '')
        if user_role not in ('DEPARTMENT_OFFICER', 'SUPER_ADMIN'):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        officer_dept = None
        officer_state = None

        if user_role == 'DEPARTMENT_OFFICER':
            off_prof = getattr(request.user, 'officer_profile', {})
            officer_dept = off_prof.get("department_code")
            officer_state = off_prof.get("jurisdiction_code")

        # Allow query parameters to filter further if permitted
        param_dept = request.query_params.get('department_code')
        param_state = request.query_params.get('state_code')

        dept = officer_dept or param_dept
        state = officer_state or param_state
        status = request.query_params.get('status')
        search_query = request.query_params.get('search')
        assigned_filter = request.query_params.get('assigned')
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        skip = (page - 1) * page_size

        apps = app_repo.find_for_officer(
            department_code=dept,
            state_code=state,
            status=status,
            search_query=search_query,
            officer_user_id=request.user.id if user_role == 'DEPARTMENT_OFFICER' else None,
            assigned_filter=assigned_filter,
            user_role=user_role,
            skip=skip,
            limit=page_size
        )
        total = app_repo.count_for_officer(
            department_code=dept,
            state_code=state,
            status=status,
            search_query=search_query,
            officer_user_id=request.user.id if user_role == 'DEPARTMENT_OFFICER' else None,
            assigned_filter=assigned_filter,
            user_role=user_role
        )

        serialized = [BaseRepository.serialize_doc(a) for a in apps]
        return api_success_response(
            data=serialized,
            meta={
                "officer_department": dept,
                "officer_state": state,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total,
                    "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
                }
            },
            request=request
        )


class OfficerApplicationDetailView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def get(self, request, pk):
        user_role = getattr(request.user, 'role', '')
        if user_role not in ('DEPARTMENT_OFFICER', 'SUPER_ADMIN'):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        app = app_repo.find_by_id(pk)
        if not app or not app.get("is_active", True) or app.get("status") == "DRAFT":
            raise ResourceNotFoundException("Application not found in officer queue.")

        # Check jurisdiction and explicit assignment
        if user_role == 'DEPARTMENT_OFFICER':
            off_prof = getattr(request.user, 'officer_profile', {})
            off_dept = off_prof.get("department_code") or getattr(request.user, 'department_code', '')
            off_state = off_prof.get("jurisdiction_code") or getattr(request.user, 'jurisdiction_code', '')
            if off_dept and off_dept != app.get("department_code"):
                raise PermissionDeniedException("You are not authorized to access applications for another department.")
            if off_state and off_state != app.get("state_code") and off_state != "IN-ALL":
                raise PermissionDeniedException("You are not authorized to access applications from another state jurisdiction.")
            assigned_id = app.get("assigned_officer_id")
            if assigned_id and str(assigned_id) != str(request.user.id):
                raise PermissionDeniedException("You are not authorized to access this application as it is assigned to another officer.")

        serialized = BaseRepository.serialize_doc(app)
        history = history_repo.find_by_application(app["_id"])
        serialized["status_history"] = [BaseRepository.serialize_doc(h) for h in history]

        # Attach business and location info
        business = biz_repo.find_by_id(app["business_id"])
        location = loc_repo.find_by_id(app["location_id"])
        if business:
            serialized["business"] = BaseRepository.serialize_doc(business)
        if location:
            serialized["location"] = BaseRepository.serialize_doc(location)

        return api_success_response(data=serialized, request=request)


class OfficerApplicationActionView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def post(self, request, pk):
        user_role = getattr(request.user, 'role', '')
        if user_role not in ('DEPARTMENT_OFFICER', 'SUPER_ADMIN'):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        app = app_repo.find_by_id(pk)
        if not app or not app.get("is_active", True) or app.get("status") == "DRAFT":
            raise ResourceNotFoundException("Application not found.")

        # Check jurisdiction and explicit assignment
        if user_role == 'DEPARTMENT_OFFICER':
            off_prof = getattr(request.user, 'officer_profile', {})
            off_dept = off_prof.get("department_code") or getattr(request.user, 'department_code', '')
            off_state = off_prof.get("jurisdiction_code") or getattr(request.user, 'jurisdiction_code', '')
            if off_dept and off_dept != app.get("department_code"):
                raise PermissionDeniedException("You are not authorized to perform actions for another department.")
            if off_state and off_state != app.get("state_code") and off_state != "IN-ALL":
                raise PermissionDeniedException("You are not authorized to perform actions in another state jurisdiction.")
            assigned_id = app.get("assigned_officer_id")
            if assigned_id and str(assigned_id) != str(request.user.id):
                raise PermissionDeniedException("You are not authorized to scrutinize this application as it is assigned to another officer.")

        serializer = OfficerScrutinyActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        action = data['action']
        remarks = data['remarks']
        clarification_query = data.get('clarification_query')

        action_status_map = {
            'MARK_SCRUTINY': 'UNDER_SCRUTINY',
            'REQUEST_CLARIFICATION': 'CLARIFICATION',
            'APPROVE': 'APPROVED',
            'REJECT': 'REJECTED'
        }
        target_status = action_status_map[action]

        decision_details = None
        if target_status in ('APPROVED', 'REJECTED'):
            decision_details = {
                "valid_until": data.get('valid_until')
            }

        try:
            updated = app_repo.transition_status_officer(
                application_id=pk,
                officer_user_id=request.user.id,
                officer_role=user_role,
                new_status=target_status,
                remarks=remarks,
                decision_details=decision_details,
                clarification_query=clarification_query
            )
        except ValueError as err:
            raise ValidationException(str(err))

        # Workflow Engine notification and audit dispatch
        from apps.common.workflow_engine import WorkflowEngine
        notif_msg_map = {
            'UNDER_SCRUTINY': f"Application {updated['application_number']} is now under technical scrutiny.",
            'CLARIFICATION': f"Query raised for {updated['application_number']}: {clarification_query}",
            'APPROVED': f"Application {updated['application_number']} has been APPROVED by {updated['department_code']}.",
            'REJECTED': f"Application {updated['application_number']} has been rejected: {remarks}"
        }

        recipients = [updated["owner_user_id"]]
        if updated.get("assigned_officer_id"):
            recipients.append(updated["assigned_officer_id"])

        WorkflowEngine.publish_event(
            event_type=f"APPLICATION_{target_status}",
            actor_user_id=request.user.id,
            actor_role=user_role,
            target_collection="applications",
            target_id=pk,
            title=f"Update on {updated['application_number']}: {target_status}",
            message=notif_msg_map.get(target_status, f"Status transitioned to {target_status}"),
            payload={
                "app_number": updated["application_number"],
                "new_status": target_status,
                "remarks": remarks
            },
            recipient_user_ids=recipients,
            reference_id=updated["application_number"]
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message=f"Application status successfully transitioned to {target_status}.",
            request=request
        )


class ApplicationAssignView(APIView):
    """
    Explicit officer assignment and reassignment for statutory applications.
    Super Admins can assign to any eligible Department Officer.
    Department Officers can claim an unassigned application within their department and state.
    """
    permission_classes = [IsOwnerOrOfficer]

    def post(self, request, pk):
        user_role = getattr(request.user, 'role', '')
        if user_role not in ('SUPER_ADMIN', 'DEPARTMENT_OFFICER'):
            raise PermissionDeniedException("Access restricted to Administrators and Department Officers.")

        officer_id = request.data.get("officer_user_id")
        if user_role == 'DEPARTMENT_OFFICER':
            # Officers can only assign to themselves if not already claimed
            app = app_repo.find_by_id(pk)
            if not app:
                raise ResourceNotFoundException("Application not found.")
            if app.get("assigned_officer_id") and str(app["assigned_officer_id"]) != str(request.user.id):
                raise PermissionDeniedException("Application is already assigned to another officer.")
            officer_id = request.user.id

        if not officer_id:
            raise ValidationException("officer_user_id is required.")

        remarks = request.data.get("remarks", "Application assigned for technical scrutiny.")

        from apps.common.workflow_engine import WorkflowEngine
        try:
            updated = WorkflowEngine.assign_officer(
                target_collection="applications",
                target_id=pk,
                officer_user_id=officer_id,
                assigned_by_user_id=request.user.id,
                assigned_by_role=user_role,
                remarks=remarks
            )
        except ValueError as err:
            raise ValidationException(str(err))

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Application assigned to officer successfully.",
            request=request
        )
