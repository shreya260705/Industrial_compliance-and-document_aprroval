"""
DRF Serializers for Phase 5 Compliance Module.
Validates custom obligation creation, date confirmations, vault evidence attachments, and officer reviews.
"""

from rest_framework import serializers
from apps.compliance.services.compliance_engine import VALID_FREQUENCIES, VALID_STATUSES


class ComplianceObligationCreateSerializer(serializers.Serializer):
    business_id = serializers.CharField(required=True)
    location_id = serializers.CharField(required=True)
    title = serializers.CharField(max_length=255, required=True)
    description = serializers.CharField(max_length=2000, required=True)
    authority_name = serializers.CharField(max_length=255, required=True)
    department_code = serializers.CharField(max_length=50, required=True)
    jurisdiction_code = serializers.CharField(max_length=20, required=True)
    compliance_category = serializers.CharField(max_length=50, required=True)
    frequency = serializers.ChoiceField(choices=list(VALID_FREQUENCIES), default="ANNUAL")
    due_date = serializers.DateTimeField(required=True)
    source_reference = serializers.CharField(max_length=500, default="Internal Enterprise Compliance Policy")
    source_verification_status = serializers.ChoiceField(
        choices=["VERIFIED", "INDICATIVE_INTERNAL", "DEMO", "NEEDS_CONFIRMATION"],
        default="INDICATIVE_INTERNAL"
    )
    approval_code = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    renewal_applicability = serializers.BooleanField(default=False)
    indicative_sla_days = serializers.IntegerField(required=False, default=15)
    statutory_penalty_summary = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)


class ComplianceObligationUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(max_length=2000, required=False)
    due_date = serializers.DateTimeField(required=False)
    compliance_category = serializers.CharField(max_length=50, required=False)
    frequency = serializers.ChoiceField(choices=list(VALID_FREQUENCIES), required=False)
    renewal_applicability = serializers.BooleanField(required=False)


class ComplianceDateConfirmSerializer(serializers.Serializer):
    confirmed_due_date = serializers.DateTimeField(required=True)
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)


class ComplianceCompleteSerializer(serializers.Serializer):
    completion_remarks = serializers.CharField(max_length=2000, required=True)
    vault_document_ids = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    needs_officer_review = serializers.BooleanField(default=False)


class ComplianceOfficerReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["VERIFIED_COMPLETE", "REVISION_REQUIRED"], required=True)
    remarks = serializers.CharField(max_length=2000, required=True)
