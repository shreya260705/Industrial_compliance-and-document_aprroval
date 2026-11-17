"""
Jurisdiction API Views.
Exposes public read-only discovery of 28 States, 8 UTs, districts, and hierarchy.
"""

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from apps.common.responses import api_success_response
from apps.common.exceptions import ResourceNotFoundException
from apps.common.base_repository import BaseRepository
from apps.jurisdictions.repository import JurisdictionRepository

repo = JurisdictionRepository()

class StateListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        states_uts = repo.get_states_and_uts()
        serialized = [BaseRepository.serialize_doc(item) for item in states_uts]
        return api_success_response(
            data=serialized,
            meta={"count": len(serialized)},
            message="National States and Union Territories list retrieved successfully",
            request=request
        )

class JurisdictionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        doc = repo.find_by_code(code)
        if not doc:
            raise ResourceNotFoundException(f"Jurisdiction '{code}' not found.")
        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            request=request
        )

class JurisdictionChildrenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        children = repo.get_children(code)
        serialized = [BaseRepository.serialize_doc(item) for item in children]
        return api_success_response(
            data=serialized,
            meta={"parent_code": code.upper(), "count": len(serialized)},
            request=request
        )

class JurisdictionHierarchyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        hierarchy = repo.get_hierarchy(code)
        if not hierarchy:
            raise ResourceNotFoundException(f"Jurisdiction hierarchy for '{code}' not found.")
        
        # Serialize lineage
        serialized_lineage = [BaseRepository.serialize_doc(item) for item in hierarchy.get("lineage", [])]
        hierarchy["lineage"] = serialized_lineage
        hierarchy["target"] = BaseRepository.serialize_doc(hierarchy.get("target"))

        return api_success_response(
            data=hierarchy,
            request=request
        )
