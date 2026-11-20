"""
REST API Views for Government Schemes & Incentives Engine.
Implements multi-tenant isolation, location-based deterministic evaluation,
append-only evaluation history, and external filing self-attestation.
"""

import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from bson import ObjectId

from apps.common.responses import api_success_response, api_error_response
from apps.common.base_repository import BaseRepository
from apps.common.exceptions import (
    ResourceNotFoundException,
    PermissionDeniedException,
    ValidationException
)
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository
from apps.schemes.repository import (
    SchemeRepository,
    SchemeRecommendationRepository,
    SchemeApplicationRepository
)
from apps.schemes.services.eligibility_engine import EligibilityEngine
from apps.schemes.serializers import (
    SchemeListSerializer,
    SchemeDetailSerializer,
    SchemeRecommendationSerializer,
    SchemeEvaluationRequestSerializer,
    SchemeApplicationCreateSerializer,
    SchemeApplicationUpdateSerializer,
    SchemeApplicationAttachDocSerializer,
    SchemeApplicationAttestSerializer,
    SchemeApplicationDetailSerializer,
    AdminSchemeCreateSerializer,
    AdminSchemeUpdateMetadataSerializer,
    AdminRuleVersionCreateSerializer,
    AdminEvidenceVerifySerializer,
    AdminRuleVersionActivateSerializer
)

logger = logging.getLogger('bizpermit.schemes')


class IsSuperAdminUser(BasePermission):
    """Allows access only to authenticated users with SUPER_ADMIN role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, "role", None) == "SUPER_ADMIN"
        )

scheme_repo = SchemeRepository()
rec_repo = SchemeRecommendationRepository()
app_repo = SchemeApplicationRepository()
loc_repo = LocationRepository()
bus_repo = BusinessRepository()
doc_repo = DocumentRepository()


class SchemeListView(APIView):
    """
    GET /api/v1/schemes/
    Public/Authenticated searchable and filterable scheme catalogue.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        state_code = request.query_params.get("state_code")
        authority_level = request.query_params.get("authority_level")
        financial_instrument_type = request.query_params.get("financial_instrument_type")
        scheme_lifecycle_status = request.query_params.get("scheme_lifecycle_status")
        fresh_intake_status = request.query_params.get("fresh_intake_status")
        search = request.query_params.get("search")

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            limit = min(100, max(1, int(request.query_params.get("limit", 20))))
        except ValueError:
            page, limit = 1, 20

        skip = (page - 1) * limit

        schemes = scheme_repo.filter_schemes(
            state_code=state_code,
            authority_level=authority_level,
            financial_instrument_type=financial_instrument_type,
            scheme_lifecycle_status=scheme_lifecycle_status,
            fresh_intake_status=fresh_intake_status,
            search=search,
            skip=skip,
            limit=limit
        )

        total_count = scheme_repo.count()
        serialized = [BaseRepository.serialize_doc(s) for s in schemes]

        return api_success_response(
            data={
                "schemes": serialized,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total_count": total_count,
                    "returned_count": len(serialized)
                }
            },
            message="Schemes retrieved successfully",
            request=request
        )


class SchemeDetailView(APIView):
    """
    GET /api/v1/schemes/{code}/
    Detailed scheme view with rules, citations, and benefits structure.
    """
    permission_classes = [AllowAny]

    def get(self, request, code):
        scheme = scheme_repo.find_by_code(code)
        if not scheme:
            raise ResourceNotFoundException(f"Scheme with code '{code}' not found.")

        serialized = BaseRepository.serialize_doc(scheme)
        return api_success_response(
            data={"scheme": serialized},
            message="Scheme details retrieved successfully",
            request=request
        )


class SchemeEvaluationView(APIView):
    """
    POST /api/v1/schemes/evaluate/
    Evaluates an industrial location against scheme rules.
    Writes append-only evaluation history to MongoDB.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SchemeEvaluationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        location_id = serializer.validated_data["location_id"]
        target_scheme_code = serializer.validated_data.get("scheme_code")

        # Verify location ownership (Multi-Tenant IDOR defense)
        loc = loc_repo.find_by_id_for_user(location_id, request.user.id)
        if not loc:
            raise ResourceNotFoundException("Industrial location not found or unauthorized.")

        bus = bus_repo.find_by_id_for_owner(loc["business_id"], request.user.id)
        if not bus:
            raise ResourceNotFoundException("Associated business enterprise not found.")

        # Determine schemes to evaluate
        if target_scheme_code:
            target_scheme = scheme_repo.find_by_code(target_scheme_code)
            if not target_scheme:
                raise ResourceNotFoundException(f"Scheme '{target_scheme_code}' not found.")
            schemes_to_eval = [target_scheme]
        else:
            # Evaluate all schemes applicable to location's state or central
            state_code = loc.get("address", {}).get("state_code") or loc.get("jurisdiction_hierarchy", {}).get("state_code")
            schemes_to_eval = scheme_repo.filter_schemes(state_code=state_code, limit=50)
            if not schemes_to_eval:
                schemes_to_eval = scheme_repo.find_all(limit=50)

        eval_results = []
        for s in schemes_to_eval:
            eval_data = EligibilityEngine.evaluate(loc, bus, s)
            eval_data["user_id"] = request.user.id
            saved_rec = rec_repo.create_evaluation(eval_data)
            serialized_rec = BaseRepository.serialize_doc(saved_rec)
            serialized_rec["scheme_name"] = s.get("name")
            serialized_rec["short_name"] = s.get("short_name")
            eval_results.append(serialized_rec)

        return api_success_response(
            data={
                "location_id": str(loc["_id"]),
                "evaluations": eval_results,
                "count": len(eval_results)
            },
            message=f"Successfully evaluated {len(eval_results)} schemes for location",
            request=request
        )


class SchemeRecommendationListView(APIView):
    """
    GET /api/v1/schemes/recommendations/
    Retrieves latest recommendations or historical evaluations for a location.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get("location_id")
        if not location_id:
            raise ValidationException("Query parameter 'location_id' is required.")

        loc = loc_repo.find_by_id_for_user(location_id, request.user.id)
        if not loc:
            raise ResourceNotFoundException("Industrial location not found or unauthorized.")

        history_mode = request.query_params.get("history", "false").lower() == "true"
        scheme_code = request.query_params.get("scheme_code")

        if history_mode:
            try:
                page = max(1, int(request.query_params.get("page", 1)))
                limit = min(100, max(1, int(request.query_params.get("limit", 20))))
            except ValueError:
                page, limit = 1, 20
            skip = (page - 1) * limit
            recs = rec_repo.find_history_by_location(location_id, scheme_code=scheme_code, skip=skip, limit=limit)
        else:
            recs = rec_repo.find_latest_by_location(location_id)

        # Enrich with scheme names
        serialized = []
        for r in recs:
            s_doc = BaseRepository.serialize_doc(r)
            scheme_meta = scheme_repo.find_by_code(r.get("scheme_code"))
            if scheme_meta:
                s_doc["scheme_name"] = scheme_meta.get("name")
                s_doc["short_name"] = scheme_meta.get("short_name")
                s_doc["financial_instrument_type"] = scheme_meta.get("financial_instrument_type")
                s_doc["fresh_intake_status"] = scheme_meta.get("fresh_intake_status")
                s_doc["scheme_lifecycle_status"] = scheme_meta.get("scheme_lifecycle_status")
            serialized.append(s_doc)

        return api_success_response(
            data={
                "location_id": str(loc["_id"]),
                "recommendations": serialized,
                "history_mode": history_mode,
                "count": len(serialized)
            },
            message="Recommendations retrieved successfully",
            request=request
        )


class SchemeApplicationListCreateView(APIView):
    """
    GET /api/v1/scheme-applications/
    POST /api/v1/scheme-applications/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status = request.query_params.get("status")
        business_id = request.query_params.get("business_id")
        location_id = request.query_params.get("location_id")
        scheme_code = request.query_params.get("scheme_code")

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            limit = min(100, max(1, int(request.query_params.get("limit", 20))))
        except ValueError:
            page, limit = 1, 20
        skip = (page - 1) * limit

        apps = app_repo.find_by_user(
            user_id=request.user.id,
            status=status,
            business_id=business_id,
            location_id=location_id,
            scheme_code=scheme_code,
            skip=skip,
            limit=limit
        )

        serialized = []
        for a in apps:
            doc = BaseRepository.serialize_doc(a)
            scheme = scheme_repo.find_by_code(a.get("scheme_code"))
            if scheme:
                doc["scheme_name"] = scheme.get("name")
                doc["short_name"] = scheme.get("short_name")
            serialized.append(doc)

        return api_success_response(
            data={"applications": serialized, "count": len(serialized)},
            message="Applications retrieved successfully",
            request=request
        )

    def post(self, request):
        serializer = SchemeApplicationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        location_id = serializer.validated_data["location_id"]
        scheme_code = serializer.validated_data["scheme_code"].strip().upper()
        dossier_data = serializer.validated_data.get("dossier_data")

        # 1. Ownership validation
        loc = loc_repo.find_by_id_for_user(location_id, request.user.id)
        if not loc:
            raise ResourceNotFoundException("Industrial location not found or unauthorized.")

        bus = bus_repo.find_by_id_for_owner(loc["business_id"], request.user.id)
        if not bus:
            raise ResourceNotFoundException("Associated business enterprise not found.")

        # 2. Scheme existence & intake validation
        scheme = scheme_repo.find_by_code(scheme_code)
        if not scheme:
            raise ResourceNotFoundException(f"Scheme '{scheme_code}' does not exist.")

        intake_status = scheme.get("fresh_intake_status", "OPEN").upper()
        is_legacy_claim = serializer.validated_data.get("is_legacy_claim", False)
        legacy_approval_ref = serializer.validated_data.get("legacy_approval_reference")
        legacy_sanction_date = serializer.validated_data.get("legacy_sanction_date")

        if intake_status != "OPEN":
            if not is_legacy_claim or not legacy_approval_ref:
                raise ValidationException(
                    f"Cannot create application: Fresh proposal intake for scheme '{scheme_code}' is currently closed ({intake_status}). Ordinary fresh intake is restricted to schemes with status OPEN."
                )

        # 3. Resolve or execute evaluation snapshot
        latest_rec = rec_repo.find_latest_by_location_and_scheme(loc["_id"], scheme_code)
        if not latest_rec:
            # Automatically evaluate to capture snapshot
            eval_data = EligibilityEngine.evaluate(loc, bus, scheme)
            eval_data["user_id"] = request.user.id
            latest_rec = rec_repo.create_evaluation(eval_data)

        # 4. Create application dossier
        try:
            created_app = app_repo.create_dossier(
                business_id=loc["business_id"],
                location_id=loc["_id"],
                user_id=request.user.id,
                scheme_code=scheme_code,
                recommendation_id=latest_rec["_id"],
                profile_snapshot_hash=latest_rec["profile_snapshot_hash"],
                scheme_rule_version=latest_rec.get("scheme_rule_version", "1.0"),
                dossier_data=dossier_data,
                is_legacy_claim=is_legacy_claim,
                legacy_approval_reference=legacy_approval_ref,
                legacy_sanction_date=legacy_sanction_date
            )
        except ValueError as e:
            raise ValidationException(str(e))

        serialized = BaseRepository.serialize_doc(created_app)
        serialized["scheme_name"] = scheme.get("name")
        serialized["short_name"] = scheme.get("short_name")

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="SCHEME_APPLICATION_CREATED",
            actor_user_id=request.user.id,
            actor_role=getattr(request.user, "role", "BUSINESS_OWNER"),
            target_collection="scheme_applications",
            target_id=created_app["_id"],
            title=f"Scheme Dossier Initialized: {scheme_code}",
            message=f"Proposal dossier initialized for {scheme.get('name')}.",
            payload={"scheme_code": scheme_code, "reference": created_app.get("application_reference")},
            recipient_user_ids=[request.user.id],
            reference_id=created_app.get("application_reference")
        )

        return api_success_response(
            data={"application": serialized},
            message="Scheme application dossier created successfully",
            status_code=201,
            request=request
        )


class SchemeApplicationDetailView(APIView):
    """
    GET /api/v1/scheme-applications/{id}/
    PATCH /api/v1/scheme-applications/{id}/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        app = app_repo.find_by_id_for_user(id, request.user.id)
        if not app:
            raise ResourceNotFoundException("Scheme application not found or unauthorized.")

        serialized = BaseRepository.serialize_doc(app)
        scheme = scheme_repo.find_by_code(app.get("scheme_code"))
        if scheme:
            serialized["scheme_name"] = scheme.get("name")
            serialized["short_name"] = scheme.get("short_name")
            serialized["statutory_reference"] = scheme.get("statutory_reference")
            serialized["benefits_structure"] = scheme.get("benefits_structure")

        # Include recommendation snapshot
        rec = rec_repo.find_by_id(app.get("recommendation_id"))
        if rec:
            serialized["recommendation_snapshot"] = BaseRepository.serialize_doc(rec)

        return api_success_response(
            data={"application": serialized},
            message="Application details retrieved successfully",
            request=request
        )

    def patch(self, request, id):
        serializer = SchemeApplicationUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        try:
            updated = app_repo.update_dossier(
                application_id=id,
                user_id=request.user.id,
                update_data=serializer.validated_data
            )
        except ValueError as e:
            raise ValidationException(str(e))

        if not updated:
            raise ResourceNotFoundException("Scheme application not found or unauthorized.")

        serialized = BaseRepository.serialize_doc(updated)
        return api_success_response(
            data={"application": serialized},
            message="Application updated successfully",
            request=request
        )


class SchemeApplicationAttachDocView(APIView):
    """
    POST /api/v1/scheme-applications/{id}/documents/
    Attaches an existing document from Document Vault to the dossier.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        serializer = SchemeApplicationAttachDocSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        vault_doc_id = serializer.validated_data["vault_document_id"]
        category = serializer.validated_data.get("document_category", "GENERAL_COMPLIANCE")

        try:
            updated = app_repo.attach_vault_document(
                application_id=id,
                user_id=request.user.id,
                vault_document_id=vault_doc_id,
                document_category=category
            )
        except PermissionError as e:
            raise PermissionDeniedException(str(e))
        except ValueError as e:
            raise ValidationException(str(e))

        if not updated:
            raise ResourceNotFoundException("Scheme application not found.")

        return api_success_response(
            data={"application": BaseRepository.serialize_doc(updated)},
            message="Document attached to application dossier successfully",
            request=request
        )


class SchemeApplicationRemoveDocView(APIView):
    """
    DELETE /api/v1/scheme-applications/{id}/documents/{vault_doc_id}/
    Removes an attached document from the dossier.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, id, vault_doc_id):
        try:
            updated = app_repo.remove_vault_document(
                application_id=id,
                user_id=request.user.id,
                vault_document_id=vault_doc_id
            )
        except ValueError as e:
            raise ValidationException(str(e))

        if not updated:
            raise ResourceNotFoundException("Scheme application not found.")

        return api_success_response(
            data={"application": BaseRepository.serialize_doc(updated)},
            message="Document removed from application dossier",
            request=request
        )


class SchemeApplicationAttestView(APIView):
    """
    POST /api/v1/scheme-applications/{id}/attest/
    Records REV 4 USER-SELF-ATTESTATION and locks application status to
    USER_REPORTED_EXTERNAL_SUBMISSION.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        serializer = SchemeApplicationAttestSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        user_role = getattr(request.user, "role", "BUSINESS_OWNER")
        user_email = getattr(request.user, "email", "applicant@bizpermit.in")

        try:
            attested_app = app_repo.attest_external_submission(
                application_id=id,
                user_id=request.user.id,
                user_email=user_email,
                user_role=user_role,
                attestation_payload=serializer.validated_data
            )
        except PermissionError as e:
            raise PermissionDeniedException(str(e))
        except ValueError as e:
            raise ValidationException(str(e))

        serialized = BaseRepository.serialize_doc(attested_app)

        from apps.common.workflow_engine import WorkflowEngine
        assigned_officer_id = attested_app.get("assigned_officer_id")
        if assigned_officer_id:
            recipient_ids = [assigned_officer_id]
        else:
            eligible_officers = WorkflowEngine.find_eligible_officers(
                attested_app.get("department_code"),
                attested_app.get("state_code")
            )
            recipient_ids = [officer["_id"] for officer in eligible_officers]

        applicant_name = getattr(request.user, "full_name", None) or "A business owner"
        application_reference = attested_app.get("application_reference")
        scheme_code = attested_app.get("scheme_code")
        notification_content = {
            str(officer_id): {
                "title": f"Scheme dossier ready for review: {application_reference}",
                "message": (
                    f"{applicant_name} submitted and self-attested scheme dossier "
                    f"{application_reference} for {scheme_code}. Review it in your scheme queue."
                )
            }
            for officer_id in recipient_ids
        }
        WorkflowEngine.publish_event(
            event_type="SCHEME_APPLICATION_SUBMITTED",
            actor_user_id=request.user.id,
            actor_role=user_role,
            target_collection="scheme_applications",
            target_id=attested_app["_id"],
            title=f"Scheme Application Submitted: {scheme_code}",
            message=f"Scheme dossier {application_reference} was submitted and self-attested for {scheme_code}.",
            payload={
                "application_reference": application_reference,
                "scheme_code": scheme_code,
                "department": attested_app.get("department_code"),
                "state": attested_app.get("state_code")
            },
            recipient_user_ids=recipient_ids,
            reference_id=application_reference,
            notification_content_by_user=notification_content
        )

        return api_success_response(
            data={"application": serialized},
            message="External submission self-attestation successfully recorded. Application dossier is locked.",
            request=request
        )


# =============================================================================
# SUPER ADMIN SCHEME GOVERNANCE VIEWS
# Enforces IsSuperAdminUser: Business owners & Department Officers receive 403
# =============================================================================

class AdminSchemeListCreateView(APIView):
    """
    GET  /api/v1/admin/schemes/ — Lists all schemes (including unverified & drafts).
    POST /api/v1/admin/schemes/ — Creates a new scheme in DRAFT/UNVERIFIED state.
    """
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        verification_status = request.query_params.get("verification_status")
        authority_level = request.query_params.get("authority_level")
        search = request.query_params.get("search")

        query = {}
        if verification_status:
            query["verification_status"] = verification_status.strip().upper()
        if authority_level:
            query["authority_level"] = authority_level.strip().upper()
        if search:
            s = search.strip()
            query["$or"] = [
                {"name": {"$regex": s, "$options": "i"}},
                {"scheme_code": {"$regex": s, "$options": "i"}},
                {"short_name": {"$regex": s, "$options": "i"}}
            ]

        schemes = list(scheme_repo.collection.find(query).sort("created_at", -1))
        serialized = [BaseRepository.serialize_doc(s) for s in schemes]

        return api_success_response(
            data={"schemes": serialized, "count": len(serialized)},
            message="Admin schemes retrieved successfully",
            request=request
        )

    def post(self, request):
        serializer = AdminSchemeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        try:
            created = scheme_repo.create_scheme(
                scheme_data=serializer.validated_data,
                actor_id=request.user.id,
                actor_email=request.user.email,
                actor_role=getattr(request.user, "role", "SUPER_ADMIN")
            )
        except ValueError as e:
            raise ValidationException(str(e))

        return api_success_response(
            data={"scheme": BaseRepository.serialize_doc(created)},
            message=f"Scheme '{created['scheme_code']}' created in DRAFT/UNVERIFIED state",
            status_code=201,
            request=request
        )


class AdminSchemeDetailView(APIView):
    """
    GET   /api/v1/admin/schemes/{code}/ — Retrieves full admin details for a scheme.
    PATCH /api/v1/admin/schemes/{code}/ — Updates metadata and statutory references.
    """
    permission_classes = [IsSuperAdminUser]

    def get(self, request, code):
        scheme = scheme_repo.find_by_code(code)
        if not scheme:
            raise ResourceNotFoundException(f"Scheme with code '{code}' not found.")

        return api_success_response(
            data={"scheme": BaseRepository.serialize_doc(scheme)},
            message="Scheme details retrieved successfully",
            request=request
        )

    def patch(self, request, code):
        serializer = AdminSchemeUpdateMetadataSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        updated = scheme_repo.update_scheme_metadata(
            scheme_code=code,
            update_data=serializer.validated_data,
            actor_id=request.user.id,
            actor_email=request.user.email,
            actor_role=getattr(request.user, "role", "SUPER_ADMIN")
        )
        if not updated:
            raise ResourceNotFoundException(f"Scheme with code '{code}' not found.")

        return api_success_response(
            data={"scheme": BaseRepository.serialize_doc(updated)},
            message="Scheme metadata updated successfully",
            request=request
        )


class AdminSchemeRuleVersionView(APIView):
    """
    POST /api/v1/admin/schemes/{code}/rules/ — Appends a new declarative rule version.
    """
    permission_classes = [IsSuperAdminUser]

    def post(self, request, code):
        serializer = AdminRuleVersionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        version = serializer.validated_data["version"]
        rules = serializer.validated_data["rules"]

        try:
            updated = scheme_repo.create_rule_version(
                scheme_code=code,
                version=version,
                rules=rules,
                actor_id=request.user.id,
                actor_email=request.user.email,
                actor_role=getattr(request.user, "role", "SUPER_ADMIN")
            )
        except ValueError as e:
            raise ValidationException(str(e))

        return api_success_response(
            data={"scheme": BaseRepository.serialize_doc(updated)},
            message=f"Rule version '{version}' created successfully for scheme '{code}'",
            status_code=201,
            request=request
        )


class AdminSchemeSubmitVerificationView(APIView):
    """
    POST /api/v1/admin/schemes/{code}/submit-verification/ — Submits for statutory audit.
    """
    permission_classes = [IsSuperAdminUser]

    def post(self, request, code):
        try:
            updated = scheme_repo.submit_for_verification(
                scheme_code=code,
                actor_id=request.user.id,
                actor_email=request.user.email,
                actor_role=getattr(request.user, "role", "SUPER_ADMIN")
            )
        except ValueError as e:
            raise ValidationException(str(e))

        return api_success_response(
            data={"scheme": BaseRepository.serialize_doc(updated)},
            message=f"Scheme '{code}' submitted for formal evidence verification",
            request=request
        )


class AdminSchemeVerifyEvidenceView(APIView):
    """
    POST /api/v1/admin/schemes/{code}/verify/ — Verifies or rejects statutory source evidence.
    """
    permission_classes = [IsSuperAdminUser]

    def post(self, request, code):
        serializer = AdminEvidenceVerifySerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        try:
            updated = scheme_repo.verify_evidence(
                scheme_code=code,
                decision=serializer.validated_data["decision"],
                notes=serializer.validated_data["notes"],
                verified_source_url=serializer.validated_data.get("verified_source_url"),
                actor_id=request.user.id,
                actor_email=request.user.email,
                actor_role=getattr(request.user, "role", "SUPER_ADMIN")
            )
        except ValueError as e:
            raise ValidationException(str(e))

        return api_success_response(
            data={"scheme": BaseRepository.serialize_doc(updated)},
            message=f"Scheme '{code}' statutory evidence marked as {serializer.validated_data['decision']}",
            request=request
        )


class AdminSchemeActivateRuleVersionView(APIView):
    """
    POST /api/v1/admin/schemes/{code}/activate/ — Activates verified rule version.
    Guards: Blocks activation if statutory evidence is unverified.
    """
    permission_classes = [IsSuperAdminUser]

    def post(self, request, code):
        serializer = AdminRuleVersionActivateSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException(field_errors=serializer.errors)

        try:
            updated = scheme_repo.activate_rule_version(
                scheme_code=code,
                version=serializer.validated_data["version"],
                fresh_intake_status=serializer.validated_data["fresh_intake_status"],
                actor_id=request.user.id,
                actor_email=request.user.email,
                actor_role=getattr(request.user, "role", "SUPER_ADMIN")
            )
        except ValueError as e:
            raise ValidationException(str(e))

        return api_success_response(
            data={"scheme": BaseRepository.serialize_doc(updated)},
            message=f"Scheme '{code}' activated with rule version '{serializer.validated_data['version']}'",
            request=request
        )


class AdminSchemeHistoryView(APIView):
    """
    GET /api/v1/admin/schemes/{code}/history/ — Reviews version history and admin audit log.
    """
    permission_classes = [IsSuperAdminUser]

    def get(self, request, code):
        history = scheme_repo.get_scheme_history(code)
        return api_success_response(
            data=history,
            message=f"Audit history retrieved for scheme '{code}'",
            request=request
        )
