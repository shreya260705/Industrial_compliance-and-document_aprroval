"""
Business and Location API Views.
Enforces multi-location logic, strict ownership isolation,
and location-specific statutory clearance evaluation.
"""

from rest_framework.views import APIView
from apps.common.responses import api_success_response, api_error_response
from apps.common.base_repository import BaseRepository
from apps.common.exceptions import ResourceNotFoundException, PermissionDeniedException, ValidationException
from apps.common.audit import log_audit_event
from apps.authentication.permissions import IsBusinessOwner
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.businesses.serializers import (
    BusinessCreateSerializer,
    BusinessUpdateSerializer,
    LocationCreateSerializer,
    LocationUpdateSerializer
)
from apps.approvals.services.applicability_engine import ApplicabilityEngineService

business_repo = BusinessRepository()
location_repo = LocationRepository()

class BusinessListCreateView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request):
        businesses = business_repo.find_by_owner(request.user.id)
        serialized = []
        for b in businesses:
            b_data = BaseRepository.serialize_doc(b)
            # Attach location count
            locs = location_repo.find_by_business(b["_id"])
            b_data["locations_count"] = len(locs)
            serialized.append(b_data)
        return api_success_response(data=serialized, request=request)

    def post(self, request):
        serializer = BusinessCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        doc = business_repo.create_business(
            owner_user_id=request.user.id,
            legal_name=data['legal_name'],
            trade_name=data.get('trade_name'),
            entity_type=data['entity_type'],
            pan=data['pan'],
            gstin=data.get('gstin'),
            cin=data.get('cin'),
            udyam_registration_number=data.get('udyam_registration_number'),
            registered_office_address=data.get('registered_office_address'),
            authorized_signatory=data.get('authorized_signatory'),
            industry_sector=data.get('industry_sector'),
            nic_code=data.get('nic_code'),
            business_description=data.get('business_description'),
            contact_email=data.get('contact_email'),
            contact_phone=data.get('contact_phone')
        )

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="BUSINESS_CREATED",
            target_collection="businesses",
            target_id=doc['_id'],
            delta={"pan": doc['pan'], "legal_name": doc['legal_name']},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Business entity successfully registered.",
            status_code=201,
            request=request
        )


class BusinessDetailView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request, pk):
        business = business_repo.find_by_id_for_owner(pk, request.user.id)
        if not business:
            raise ResourceNotFoundException("Business entity not found or access unauthorized.")
        
        data = BaseRepository.serialize_doc(business)
        locations = location_repo.find_by_business(business["_id"])
        data["locations"] = [BaseRepository.serialize_doc(l) for l in locations]
        data["locations_count"] = len(locations)
        return api_success_response(data=data, request=request)

    def patch(self, request, pk):
        serializer = BusinessUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = business_repo.update_business(
            business_id=pk,
            user_id=request.user.id,
            update_data=serializer.validated_data
        )
        if not updated:
            raise ResourceNotFoundException("Business entity not found or access unauthorized.")

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="BUSINESS_UPDATED",
            target_collection="businesses",
            target_id=pk,
            delta=serializer.validated_data,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Business profile updated successfully.",
            request=request
        )

    def delete(self, request, pk):
        success = business_repo.soft_delete_business(pk, request.user.id)
        if not success:
            raise ResourceNotFoundException("Business entity not found or access unauthorized.")

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="BUSINESS_ARCHIVED",
            target_collection="businesses",
            target_id=pk,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data={"business_id": pk, "is_active": False},
            message="Business entity and associated facilities archived successfully.",
            request=request
        )


class LocationListCreateView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request, business_id):
        business = business_repo.find_by_id_for_owner(business_id, request.user.id)
        if not business:
            raise ResourceNotFoundException("Business entity not found or access unauthorized.")

        locations = location_repo.find_by_business(business_id)
        serialized = [BaseRepository.serialize_doc(loc) for loc in locations]
        return api_success_response(data=serialized, request=request)

    def post(self, request, business_id):
        business = business_repo.find_by_id_for_owner(business_id, request.user.id)
        if not business:
            raise ResourceNotFoundException("Business entity not found or access unauthorized.")

        serializer = LocationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        doc = location_repo.create_location(
            business_id=business_id,
            location_name=data['location_name'],
            facility_type=data.get('facility_type', 'MANUFACTURING_PLANT'),
            operational_status=data.get('operational_status', 'PROPOSED'),
            address=data['address'],
            jurisdiction_hierarchy=data['jurisdiction_hierarchy'],
            industrial_profile=data['industrial_profile'],
            geo_point=data.get('geo_point')
        )

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="FACILITY_LOCATION_CREATED",
            target_collection="locations",
            target_id=doc['_id'],
            delta={"business_id": str(business_id), "location_name": doc['location_name']},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Industrial facility registered successfully.",
            status_code=201,
            request=request
        )


class LocationDetailView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request, location_id):
        loc = location_repo.find_by_id_for_user(location_id, request.user.id)
        if not loc:
            raise ResourceNotFoundException("Facility location not found or access unauthorized.")
        return api_success_response(data=BaseRepository.serialize_doc(loc), request=request)

    def patch(self, request, location_id):
        serializer = LocationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = location_repo.update_location(
            location_id=location_id,
            user_id=request.user.id,
            update_data=serializer.validated_data
        )
        if not updated:
            raise ResourceNotFoundException("Facility location not found or access unauthorized.")

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="FACILITY_LOCATION_UPDATED",
            target_collection="locations",
            target_id=location_id,
            delta=serializer.validated_data,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Facility parameters updated successfully.",
            request=request
        )

    def delete(self, request, location_id):
        success = location_repo.soft_delete_location(location_id, request.user.id)
        if not success:
            raise ResourceNotFoundException("Facility location not found or access unauthorized.")

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="FACILITY_LOCATION_ARCHIVED",
            target_collection="locations",
            target_id=location_id,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data={"location_id": location_id, "is_active": False},
            message="Facility location archived successfully.",
            request=request
        )


class LocationEvaluateView(APIView):
    """
    Evaluates statutory approvals applicable specifically to this facility location
    using the deterministic Phase 2 KYA rule engine.
    """
    permission_classes = [IsBusinessOwner]

    def post(self, request, location_id):
        loc = location_repo.find_by_id_for_user(location_id, request.user.id)
        if not loc:
            raise ResourceNotFoundException("Facility location not found or access unauthorized.")

        hierarchy = loc.get("jurisdiction_hierarchy", {})
        profile = loc.get("industrial_profile", {})

        # Formulate evaluation payload from location parameters
        eval_profile = {
            "state_code": hierarchy.get("state_code", ""),
            "district_code": hierarchy.get("district_code", ""),
            "local_body_type": hierarchy.get("local_body_type", ""),
            "nic_code": profile.get("nic_code", ""),
            "scale": profile.get("scale", "MEDIUM"),
            "pollution_category": profile.get("pollution_category", "ORANGE"),
            "workforce_capacity": profile.get("workforce_capacity", 0),
            "total_power_load_hp": profile.get("total_power_load_hp", 0),
            "has_boiler": profile.get("has_boiler", False),
            "has_hazardous_chemicals": profile.get("has_hazardous_chemicals", False),
            "has_groundwater_borewell": profile.get("has_groundwater_borewell", False),
            "water_requirement_kld": profile.get("water_requirement_kld", 0.0)
        }

        evaluation_result = ApplicabilityEngineService.evaluate_profile(eval_profile)

        # Cache evaluation result onto the location document
        location_repo.save_evaluation(location_id, evaluation_result)

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role=request.user.role,
            action="FACILITY_KYA_EVALUATED",
            target_collection="locations",
            target_id=location_id,
            delta={
                "state_code": eval_profile["state_code"],
                "total_approvals": evaluation_result["total_approvals_required"]
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return api_success_response(
            data=evaluation_result,
            message="Location statutory compliance roadmap evaluated successfully.",
            request=request
        )


class LocationApprovalsView(APIView):
    """
    Retrieves the statutory approvals roadmap for this location.
    If not previously evaluated, triggers an automated evaluation.
    """
    permission_classes = [IsBusinessOwner]

    def get(self, request, location_id):
        loc = location_repo.find_by_id_for_user(location_id, request.user.id)
        if not loc:
            raise ResourceNotFoundException("Facility location not found or access unauthorized.")

        evaluation = loc.get("kya_evaluation")
        if not evaluation:
            # Trigger evaluation on the fly
            hierarchy = loc.get("jurisdiction_hierarchy", {})
            profile = loc.get("industrial_profile", {})
            eval_profile = {
                "state_code": hierarchy.get("state_code", ""),
                "district_code": hierarchy.get("district_code", ""),
                "local_body_type": hierarchy.get("local_body_type", ""),
                "nic_code": profile.get("nic_code", ""),
                "scale": profile.get("scale", "MEDIUM"),
                "pollution_category": profile.get("pollution_category", "ORANGE"),
                "workforce_capacity": profile.get("workforce_capacity", 0),
                "total_power_load_hp": profile.get("total_power_load_hp", 0),
                "has_boiler": profile.get("has_boiler", False),
                "has_hazardous_chemicals": profile.get("has_hazardous_chemicals", False),
                "has_groundwater_borewell": profile.get("has_groundwater_borewell", False),
                "water_requirement_kld": profile.get("water_requirement_kld", 0.0)
            }
            evaluation = ApplicabilityEngineService.evaluate_profile(eval_profile)
            location_repo.save_evaluation(location_id, evaluation)

        return api_success_response(
            data=evaluation,
            meta={"location_name": loc.get("location_name"), "location_id": str(loc["_id"])},
            request=request
        )
