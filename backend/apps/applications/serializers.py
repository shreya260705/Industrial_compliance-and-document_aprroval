"""
DRF Serializers for Applications and Officer Scrutiny Workflow.
"""

from rest_framework import serializers

class ApplicationCreateSerializer(serializers.Serializer):
    business_id = serializers.CharField(required=True)
    location_id = serializers.CharField(required=True)
    approval_code = serializers.CharField(required=True)
    applicant_form_data = serializers.DictField(required=False)


class ApplicationUpdateSerializer(serializers.Serializer):
    applicant_form_data = serializers.DictField(required=True)


class DocumentAttachSerializer(serializers.Serializer):
    vault_document_id = serializers.CharField(required=True)


class ApplicationSubmitSerializer(serializers.Serializer):
    confirmation = serializers.BooleanField(required=True)

    def validate_confirmation(self, value):
        if not value:
            raise serializers.ValidationError("You must confirm acceptance of the statutory disclaimer before submission.")
        return value


class ClarificationResponseSerializer(serializers.Serializer):
    response_text = serializers.CharField(required=True, min_length=5, max_length=2000)


class OfficerScrutinyActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=['MARK_SCRUTINY', 'REQUEST_CLARIFICATION', 'APPROVE', 'REJECT'],
        required=True
    )
    remarks = serializers.CharField(required=True, min_length=3, max_length=1500)
    clarification_query = serializers.CharField(required=False, allow_blank=True, max_length=1500)
    valid_until = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        action = attrs.get('action')
        if action == 'REQUEST_CLARIFICATION' and not attrs.get('clarification_query'):
            raise serializers.ValidationError({"clarification_query": "Clarification query details are required."})
        return attrs
