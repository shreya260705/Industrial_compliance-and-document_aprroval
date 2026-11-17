"""
API Views for Phase 5 Compliance Obligations, Calendar & Renewal Engine.
Enforces multi-tenant query isolation, RBAC, and parameter validation.
"""

from datetime import datetime, timezone
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
from apps.compliance.repository import (
    ComplianceObligationRepository,
    ComplianceCycleRepository,
    ComplianceCompletionRepository,
    ComplianceTemplateRepository
)
from apps.compliance.services.compliance_engine import ComplianceEngineService
from apps.compliance.serializers import (
    ComplianceObligationCreateSerializer,
    ComplianceObligationUpdateSerializer,
    ComplianceDateConfirmSerializer,
    ComplianceCompleteSerializer,
    ComplianceOfficerReviewSerializer
)
from apps.businesses.repository import BusinessRepository, LocationRepository

ob_repo = ComplianceObligationRepository()
cycle_repo = ComplianceCycleRepository()
comp_repo = ComplianceCompletionRepository()
tpl_repo = ComplianceTemplateRepository()
biz_repo = BusinessRepository()
loc_repo = LocationRepository()


class ComplianceObligationListCreateView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request):
        business_id = request.query_params.get("business_id")
        location_id = request.query_params.get("location_id")
        status = request.query_params.get("status")
        category = request.query_params.get("category")
        frequency = request.query_params.get("frequency")
        search_query = request.query_params.get("search")
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
        skip = (page - 1) * page_size

        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        start_date = None
        end_date = None

        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
            except ValueError:
                pass
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            except ValueError:
                pass

        obligations = ob_repo.find_by_user(
            user_id=request.user.id,
            business_id=business_id,
            location_id=location_id,
            status=status,
            category=category,
            frequency=frequency,
            search_query=search_query,
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=page_size
        )
        total = ob_repo.count_by_user(
            user_id=request.user.id,
            business_id=business_id,
            location_id=location_id,
            status=status,
            category=category,
            frequency=frequency,
            search_query=search_query,
            start_date=start_date,
            end_date=end_date
        )

        serialized = [BaseRepository.serialize_doc(o) for o in obligations]

        # Attach facility name for display
        for item in serialized:
            loc = loc_repo.find_by_id(item["location_id"])
            if loc:
                item["facility_name"] = loc.get("location_name")

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
        serializer = ComplianceObligationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Verify user owns the target business and facility
        biz = biz_repo.find_by_id_for_owner(data["business_id"], request.user.id)
        if not biz:
            raise PermissionDeniedException("You do not have permission for this business.")

        loc = loc_repo.find_by_id_for_business(data["location_id"], biz["_id"])
        if not loc:
            raise PermissionDeniedException("Facility location does not belong to this business.")

        created = ob_repo.create_obligation(
            owner_user_id=request.user.id,
            business_id=biz["_id"],
            location_id=loc["_id"],
            title=data["title"],
            description=data["description"],
            authority_name=data["authority_name"],
            department_code=data["department_code"],
            jurisdiction_code=data["jurisdiction_code"],
            compliance_category=data["compliance_category"],
            frequency=data["frequency"],
            due_date=data["due_date"],
            source_reference=data.get("source_reference", "Internal Enterprise Policy"),
            source_verification_status=data.get("source_verification_status", "INDICATIVE_INTERNAL"),
            approval_code=data.get("approval_code"),
            renewal_applicability=data.get("renewal_applicability", False),
            indicative_sla_days=data.get("indicative_sla_days", 15),
            statutory_penalty_summary=data.get("statutory_penalty_summary")
        )

        # Create cycle #1
        cycle_repo.create_cycle(
            obligation_id=created["_id"],
            cycle_number=1,
            due_date=data["due_date"],
            cycle_start_date=datetime.now(timezone.utc),
            status=created["status"]
        )

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="COMPLIANCE_OBLIGATION_CREATED",
            target_collection="compliance_obligations",
            target_id=created["_id"],
            delta={"title": created["title"], "frequency": created["frequency"]},
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT")
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(created),
            message="Compliance obligation created successfully.",
            status_code=201,
            request=request
        )


class ComplianceLocationGenerateView(APIView):
    permission_classes = [IsBusinessOwner]

    def post(self, request, location_id):
        try:
            generated = ComplianceEngineService.generate_obligations_for_location(
                location_id=location_id,
                user_id=request.user.id
            )
        except ValueError as err:
            raise ValidationException(str(err))

        serialized = [BaseRepository.serialize_doc(g) for g in generated]
        return api_success_response(
            data=serialized,
            message=f"Generated {len(serialized)} statutory compliance obligations for facility.",
            status_code=201 if serialized else 200,
            request=request
        )


class ComplianceObligationDetailView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request, pk):
        ob = ob_repo.find_by_id_for_user(pk, request.user.id)
        if not ob:
            raise ResourceNotFoundException("Compliance obligation not found or access unauthorized.")

        serialized = BaseRepository.serialize_doc(ob)

        # Attach facility and business details
        loc = loc_repo.find_by_id(ob["location_id"])
        if loc:
            serialized["facility"] = BaseRepository.serialize_doc(loc)
        biz = biz_repo.find_by_id(ob["business_id"])
        if biz:
            serialized["business"] = BaseRepository.serialize_doc(biz)

        # Attach cycle history & completion records
        cycles = cycle_repo.find_by_obligation(ob["_id"])
        serialized["cycles"] = [BaseRepository.serialize_doc(c) for c in cycles]

        records = comp_repo.find_by_obligation(ob["_id"])
        serialized["completion_records"] = [BaseRepository.serialize_doc(r) for r in records]

        return api_success_response(data=serialized, request=request)

    def patch(self, request, pk):
        ob = ob_repo.find_by_id_for_user(pk, request.user.id)
        if not ob:
            raise ResourceNotFoundException("Compliance obligation not found or access unauthorized.")

        serializer = ComplianceObligationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_set = {k: v for k, v in data.items() if v is not None}
        update_set["updated_at"] = datetime.now(timezone.utc)

        ob_repo.collection.update_one({"_id": ob["_id"]}, {"$set": update_set})
        updated = ob_repo.find_by_id_for_user(pk, request.user.id)

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Compliance obligation updated successfully.",
            request=request
        )

    def delete(self, request, pk):
        ob = ob_repo.find_by_id_for_user(pk, request.user.id)
        if not ob:
            raise ResourceNotFoundException("Compliance obligation not found or access unauthorized.")

        ob_repo.collection.update_one(
            {"_id": ob["_id"]},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )

        return api_success_response(
            data={"obligation_id": pk, "is_active": False},
            message="Compliance obligation archived successfully.",
            request=request
        )


class ComplianceDateConfirmView(APIView):
    permission_classes = [IsBusinessOwner]

    def post(self, request, pk):
        serializer = ComplianceDateConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            updated = ComplianceEngineService.confirm_obligation_date(
                obligation_id=pk,
                user_id=request.user.id,
                confirmed_due_date=data["confirmed_due_date"],
                notes=data.get("notes")
            )
        except ValueError as err:
            raise ValidationException(str(err))

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Compliance due date confirmed successfully.",
            request=request
        )


class ComplianceCompleteView(APIView):
    permission_classes = [IsBusinessOwner]

    def post(self, request, pk):
        serializer = ComplianceCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            updated = ComplianceEngineService.complete_obligation(
                obligation_id=pk,
                user_id=request.user.id,
                user_role=request.user.role,
                completion_remarks=data["completion_remarks"],
                vault_document_ids=data.get("vault_document_ids"),
                needs_officer_review=data.get("needs_officer_review", False)
            )
        except ValueError as err:
            raise ValidationException(str(err))

        from apps.common.workflow_engine import WorkflowEngine
        recipients = [request.user.id]

        WorkflowEngine.publish_event(
            event_type="COMPLIANCE_OBLIGATION_COMPLETED",
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            target_collection="compliance_obligations",
            target_id=pk,
            title=f"Compliance Completed: {updated.get('title')}",
            message=f"Compliance obligation cycle marked completed: {data['completion_remarks'][:100]}",
            payload={"status": updated.get("status"), "remarks": data["completion_remarks"]},
            recipient_user_ids=recipients,
            reference_id=str(pk)
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Compliance cycle marked completed and evidence archived successfully.",
            request=request
        )


class ComplianceOfficerReviewView(APIView):
    permission_classes = [IsOwnerOrOfficer]

    def post(self, request, pk, record_id):
        user_role = getattr(request.user, "role", "")
        if user_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            raise PermissionDeniedException("Access restricted to Department Officers and Administrators.")

        serializer = ComplianceOfficerReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        off_prof = getattr(request.user, "officer_profile", {})
        dept = off_prof.get("department_code")
        state = off_prof.get("jurisdiction_code")

        try:
            reviewed = ComplianceEngineService.review_completion_officer(
                obligation_id=pk,
                record_id=record_id,
                officer_user_id=request.user.id,
                officer_role=user_role,
                officer_dept=dept,
                officer_jurisdiction=state,
                decision=data["decision"],
                remarks=data["remarks"]
            )
        except PermissionError as err:
            raise PermissionDeniedException(str(err))
        except ValueError as err:
            raise ValidationException(str(err))

        from apps.common.workflow_engine import WorkflowEngine
        owner_id = reviewed.get("owner_user_id") or reviewed.get("created_by")
        WorkflowEngine.publish_event(
            event_type=f"COMPLIANCE_REVIEW_{data['decision']}",
            actor_user_id=request.user.id,
            actor_role=user_role,
            target_collection="compliance_obligations",
            target_id=pk,
            title=f"Compliance Review: {data['decision']}",
            message=f"Department officer completed review for compliance record. Decision: {data['decision']}. Remarks: {data['remarks']}",
            payload={"decision": data["decision"], "remarks": data["remarks"]},
            recipient_user_ids=[owner_id] if owner_id else [],
            reference_id=str(pk)
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(reviewed),
            message=f"Compliance evidence review completed with decision '{data['decision']}'.",
            request=request
        )


class ComplianceCalendarEventsView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request):
        business_id = request.query_params.get("business_id")
        location_id = request.query_params.get("location_id")
        category = request.query_params.get("category")
        status = request.query_params.get("status")

        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        start_date = None
        end_date = None

        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
            except ValueError:
                pass
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            except ValueError:
                pass

        obligations = ob_repo.find_by_user(
            user_id=request.user.id,
            business_id=business_id,
            location_id=location_id,
            status=status,
            category=category,
            start_date=start_date,
            end_date=end_date,
            limit=200
        )

        events = []
        for ob in obligations:
            loc = loc_repo.find_by_id(ob["location_id"])
            fac_name = loc.get("location_name", "Primary Facility") if loc else "Facility"
            events.append({
                "id": str(ob["_id"]),
                "title": ob["title"],
                "obligation_number": ob.get("obligation_number"),
                "due_date": ob["due_date"].isoformat() if hasattr(ob["due_date"], "isoformat") else str(ob["due_date"]),
                "status": ob["status"],
                "compliance_category": ob["compliance_category"],
                "frequency": ob["frequency"],
                "source_verification_status": ob["source_verification_status"],
                "renewal_applicability": ob.get("renewal_applicability", False),
                "facility_name": fac_name,
                "department_code": ob.get("department_code")
            })

        return api_success_response(data=events, request=request)


class ComplianceMetricsView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request):
        business_id = request.query_params.get("business_id")
        metrics = ob_repo.get_metrics_for_user(request.user.id, business_id=business_id)

        # Facility summary
        facility_aggs = ob_repo.get_facility_summary_for_user(request.user.id, business_id=business_id)
        facilities_list = []
        for agg in facility_aggs:
            loc = loc_repo.find_by_id(agg["_id"])
            if loc:
                facilities_list.append({
                    "facility_id": str(agg["_id"]),
                    "facility_name": loc.get("location_name"),
                    "state_code": loc.get("jurisdiction_hierarchy", {}).get("state_code"),
                    "total": agg.get("total", 0),
                    "completed": agg.get("completed", 0),
                    "overdue": agg.get("overdue", 0),
                    "due_soon": agg.get("due_soon", 0),
                    "pending_renewals": agg.get("pending_renewals", 0)
                })

        metrics["facilities"] = facilities_list
        return api_success_response(data=metrics, request=request)


class ComplianceRenewalsListView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request):
        business_id = request.query_params.get("business_id")
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
        skip = (page - 1) * page_size

        renewals = ob_repo.get_renewals_for_user(
            user_id=request.user.id,
            business_id=business_id,
            skip=skip,
            limit=page_size
        )

        serialized = [BaseRepository.serialize_doc(r) for r in renewals]
        for item in serialized:
            loc = loc_repo.find_by_id(item["location_id"])
            if loc:
                item["facility_name"] = loc.get("location_name")

        return api_success_response(data=serialized, request=request)


class AdminComplianceOverviewView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        total_obs = ob_repo.count_all_for_admin()
        overdue_obs = ob_repo.count_all_for_admin(status="OVERDUE")
        completed_obs = ob_repo.count_all_for_admin(status="COMPLETED")
        needs_confirm_obs = ob_repo.count_all_for_admin(status="NEEDS_CONFIRMATION")

        # State-wise distribution
        pipeline = [
            {"$match": {"is_active": {"$ne": False}}},
            {"$group": {
                "_id": "$jurisdiction_code",
                "total": {"$sum": 1},
                "overdue": {"$sum": {"$cond": [{"$eq": ["$status", "OVERDUE"]}, 1, 0]}},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "COMPLETED"]}, 1, 0]}}
            }},
            {"$sort": {"total": -1}}
        ]
        state_aggs = list(ob_repo.collection.aggregate(pipeline))

        return api_success_response(
            data={
                "total_obligations_nationwide": total_obs,
                "overdue_nationwide": overdue_obs,
                "completed_nationwide": completed_obs,
                "needs_confirmation_nationwide": needs_confirm_obs,
                "national_compliance_rate": round((completed_obs / total_obs * 100), 1) if total_obs > 0 else 100.0,
                "states": state_aggs
            },
            request=request
        )


class AdminComplianceTemplatesView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        templates = tpl_repo.list_all(limit=100)
        return api_success_response(
            data=[BaseRepository.serialize_doc(t) for t in templates],
            request=request
        )
