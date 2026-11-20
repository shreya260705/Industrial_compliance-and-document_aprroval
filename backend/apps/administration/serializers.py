"""
Serializers for Super Admin Platform Management.
Validates officer creation, assignment transfers, user statuses, and jurisdictions.
"""

from rest_framework import serializers
import re

class OfficerCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, min_length=8, write_only=True)
    full_name = serializers.CharField(required=True, min_length=2, max_length=120)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    department_code = serializers.CharField(required=True, max_length=50)
    jurisdiction_code = serializers.CharField(required=True, max_length=20)
    district_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    designation = serializers.CharField(required=True, max_length=120)
    badge_number = serializers.CharField(required=True, max_length=50)
    is_verified = serializers.BooleanField(required=False, default=True)
    permitted_approval_categories = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    permitted_workflow_actions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=lambda: ["RECOMMEND", "REQUEST_CLARIFICATION", "REJECT", "RECORD_OBSERVATION"]
    )

    def validate_password(self, value):
        if not re.search(r'[A-Za-z]', value) or not re.search(r'[0-9]', value):
            raise serializers.ValidationError(
                "Password must be at least 8 characters long and contain at least one letter and one number."
            )
        return value

    def validate_phone_number(self, value):
        if value:
            cleaned = re.sub(r'[\s\-]', '', value)
            if not re.match(r'^(\+91)?[6-9]\d{9}$', cleaned):
                raise serializers.ValidationError("Please provide a valid Indian mobile number.")
            return cleaned
        return None

class OfficerUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False, min_length=2, max_length=120)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    department_code = serializers.CharField(required=False, max_length=50)
    jurisdiction_code = serializers.CharField(required=False, max_length=20)
    district_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    designation = serializers.CharField(required=False, max_length=120)
    badge_number = serializers.CharField(required=False, max_length=50)
    permitted_approval_categories = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    permitted_workflow_actions = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

class UserStatusUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField(required=False)
    is_verified = serializers.BooleanField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=300)

class JurisdictionCreateSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, max_length=50)
    name = serializers.CharField(required=True, max_length=150)
    type = serializers.ChoiceField(
        choices=["STATE", "UT", "DISTRICT", "LOCAL_BODY", "INDUSTRIAL_ZONE"],
        required=True
    )
    parent_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=50)
    is_active = serializers.BooleanField(default=True)

class JurisdictionUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=150)
    type = serializers.ChoiceField(
        choices=["STATE", "UT", "DISTRICT", "LOCAL_BODY", "INDUSTRIAL_ZONE"],
        required=False
    )
    parent_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=50)
    is_active = serializers.BooleanField(required=False)
