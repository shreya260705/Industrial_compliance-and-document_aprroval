"""
DRF Serializers for Jurisdictions and Hierarchies.
"""

from rest_framework import serializers

class JurisdictionSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    code = serializers.CharField(required=True)
    name = serializers.CharField(required=True)
    tier = serializers.ChoiceField(choices=['CENTRAL', 'STATE', 'UT', 'DISTRICT', 'LOCAL_BODY', 'INDUSTRIAL_ZONE'])
    parent_code = serializers.CharField(required=False, allow_null=True)
    state_code = serializers.CharField(required=False, allow_null=True)
    iso_3166_2 = serializers.CharField(required=False, allow_null=True)
    zone = serializers.CharField(required=False, allow_null=True)
    capital = serializers.CharField(required=False, allow_null=True)
    local_body_type = serializers.CharField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)
