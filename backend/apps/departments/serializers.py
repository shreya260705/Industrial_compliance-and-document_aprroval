"""
DRF Serializers for Departments and Line Authorities.
"""

from rest_framework import serializers

class NodalOfficerSerializer(serializers.Serializer):
    designation = serializers.CharField(required=False, allow_blank=True)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True)

class DepartmentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    department_code = serializers.CharField(required=True)
    name = serializers.CharField(required=True)
    short_name = serializers.CharField(required=False, allow_blank=True)
    tier = serializers.ChoiceField(choices=['CENTRAL', 'STATE', 'LOCAL'])
    state_code = serializers.CharField(required=False, allow_null=True)
    jurisdiction_code = serializers.CharField(required=False, allow_null=True)
    portal_url = serializers.URLField(required=False, allow_blank=True)
    regulatory_domain = serializers.CharField(required=False, allow_blank=True)
    nodal_officer = NodalOfficerSerializer(required=False)
    verification_status = serializers.ChoiceField(
        choices=['VERIFIED', 'NEEDS_REVIEW', 'DEMO', 'INACTIVE'],
        default='VERIFIED'
    )
    source_url = serializers.URLField(required=False, allow_blank=True)
    last_verified_at = serializers.CharField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)
