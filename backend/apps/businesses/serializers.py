"""
DRF Serializers for Businesses and Industrial Locations.
"""

import re
from rest_framework import serializers
from apps.businesses.repository import BusinessRepository

business_repo = BusinessRepository()

class RegisteredAddressSerializer(serializers.Serializer):
    line1 = serializers.CharField(required=False, allow_blank=True)
    address_line1 = serializers.CharField(required=False, allow_blank=True)
    line2 = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    district = serializers.CharField(required=False, allow_blank=True)
    state_code = serializers.CharField(required=False, allow_blank=True)
    pincode = serializers.CharField(required=False, allow_blank=True)

class AuthorizedSignatorySerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True)
    din = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

class BusinessCreateSerializer(serializers.Serializer):
    legal_name = serializers.CharField(required=True, min_length=3, max_length=150)
    trade_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    entity_type = serializers.ChoiceField(
        choices=[
            'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'LLP',
            'PARTNERSHIP', 'SOLE_PROPRIETORSHIP', 'PROPRIETORSHIP', 'OTHER'
        ],
        required=True
    )
    pan = serializers.CharField(required=True, min_length=10, max_length=10)
    gstin = serializers.CharField(required=False, allow_blank=True, max_length=15)
    cin = serializers.CharField(required=False, allow_blank=True, max_length=21)
    udyam_registration_number = serializers.CharField(required=False, allow_blank=True, max_length=25)
    registered_office_address = serializers.DictField(required=False)
    authorized_signatory = serializers.DictField(required=False)
    industry_sector = serializers.CharField(required=False, allow_blank=True, max_length=100)
    nic_code = serializers.CharField(required=False, allow_blank=True, max_length=20)
    business_description = serializers.CharField(required=False, allow_blank=True, max_length=500)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def validate_pan(self, value):
        normalized = value.strip().upper()
        if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', normalized):
            raise serializers.ValidationError("Invalid Indian Permanent Account Number (PAN) format.")
        if business_repo.find_by_pan(normalized):
            raise serializers.ValidationError("An enterprise with this PAN is already registered.")
        return normalized

    def validate_gstin(self, value):
        if value:
            normalized = value.strip().upper()
            if not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', normalized):
                raise serializers.ValidationError("Invalid GSTIN format.")
            return normalized
        return None

class BusinessUpdateSerializer(serializers.Serializer):
    legal_name = serializers.CharField(required=False, min_length=3, max_length=150)
    trade_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    entity_type = serializers.ChoiceField(
        choices=[
            'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'LLP',
            'PARTNERSHIP', 'SOLE_PROPRIETORSHIP', 'PROPRIETORSHIP', 'OTHER'
        ],
        required=False
    )
    gstin = serializers.CharField(required=False, allow_blank=True, max_length=15)
    cin = serializers.CharField(required=False, allow_blank=True, max_length=21)
    udyam_registration_number = serializers.CharField(required=False, allow_blank=True, max_length=25)
    registered_office_address = serializers.DictField(required=False)
    authorized_signatory = serializers.DictField(required=False)
    industry_sector = serializers.CharField(required=False, allow_blank=True, max_length=100)
    nic_code = serializers.CharField(required=False, allow_blank=True, max_length=20)
    business_description = serializers.CharField(required=False, allow_blank=True, max_length=500)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def validate_gstin(self, value):
        if value:
            normalized = value.strip().upper()
            if not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', normalized):
                raise serializers.ValidationError("Invalid GSTIN format.")
            return normalized
        return None

class IndustrialProfileSerializer(serializers.Serializer):
    nic_code = serializers.CharField(required=True)
    sector_name = serializers.CharField(required=True)
    scale = serializers.ChoiceField(choices=['MICRO', 'SMALL', 'MEDIUM', 'LARGE'], default='MEDIUM')
    pollution_category = serializers.ChoiceField(choices=['RED', 'ORANGE', 'GREEN', 'WHITE'], default='ORANGE')
    total_builtup_area_sqm = serializers.FloatField(required=False, default=0.0)
    plot_area_sqm = serializers.FloatField(required=False, default=0.0)
    total_power_load_hp = serializers.IntegerField(required=False, default=0)
    water_requirement_kld = serializers.FloatField(required=False, default=0.0)
    workforce_capacity = serializers.IntegerField(required=False, default=0)
    has_boiler = serializers.BooleanField(required=False, default=False)
    has_hazardous_chemicals = serializers.BooleanField(required=False, default=False)
    has_groundwater_borewell = serializers.BooleanField(required=False, default=False)
    diesel_generator_capacity_kva = serializers.IntegerField(required=False, default=0)

class LocationCreateSerializer(serializers.Serializer):
    location_name = serializers.CharField(required=True, min_length=3, max_length=120)
    facility_type = serializers.ChoiceField(
        choices=[
            'MANUFACTURING_PLANT', 'FACTORY', 'WAREHOUSE',
            'PROCESSING_UNIT', 'CORPORATE_OFFICE', 'INDUSTRIAL_UNIT', 'OTHER'
        ],
        default='MANUFACTURING_PLANT'
    )
    address = serializers.DictField(required=True)
    jurisdiction_hierarchy = serializers.DictField(required=True)
    geo_point = serializers.DictField(required=False)
    industrial_profile = IndustrialProfileSerializer(required=True)
    operational_status = serializers.ChoiceField(
        choices=['PROPOSED', 'UNDER_CONSTRUCTION', 'COMMISSIONED', 'OPERATIONAL', 'INACTIVE'],
        default='PROPOSED'
    )

class LocationUpdateSerializer(serializers.Serializer):
    location_name = serializers.CharField(required=False, min_length=3, max_length=120)
    facility_type = serializers.ChoiceField(
        choices=[
            'MANUFACTURING_PLANT', 'FACTORY', 'WAREHOUSE',
            'PROCESSING_UNIT', 'CORPORATE_OFFICE', 'INDUSTRIAL_UNIT', 'OTHER'
        ],
        required=False
    )
    address = serializers.DictField(required=False)
    jurisdiction_hierarchy = serializers.DictField(required=False)
    geo_point = serializers.DictField(required=False)
    industrial_profile = serializers.DictField(required=False)
    operational_status = serializers.ChoiceField(
        choices=['PROPOSED', 'UNDER_CONSTRUCTION', 'COMMISSIONED', 'OPERATIONAL', 'INACTIVE'],
        required=False
    )
