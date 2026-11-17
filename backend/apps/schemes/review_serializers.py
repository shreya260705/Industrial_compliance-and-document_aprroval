"""
DRF Serializers for Phase 6 Module 2: Officer Review Workflow & Clarification Engine.
"""

from rest_framework import serializers


class OfficerReviewAssignSerializer(serializers.Serializer):
    target_officer_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")


class OfficerClarificationRequestSerializer(serializers.Serializer):
    question = serializers.CharField(required=True)
    related_criterion_key = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    deadline_days = serializers.IntegerField(required=False, default=15, min_value=1, max_value=90)


class ApplicantClarificationResponseSerializer(serializers.Serializer):
    clarification_id = serializers.CharField(required=True)
    response_text = serializers.CharField(required=True)
    vault_document_ids = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )


class OfficerReviewCompleteSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=["INTERNAL_VERIFIED", "INTERNAL_REJECTED", "DISCREPANCIES_NOTED"],
        required=True
    )
    remarks = serializers.CharField(required=True)
    discrepancies = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )


class OfficerReviewReferralSerializer(serializers.Serializer):
    escalation_reason = serializers.CharField(required=True)
    referred_authority = serializers.CharField(required=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")


class OfficerReviewWithdrawSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True)


class OfficerReviewReassignSerializer(serializers.Serializer):
    new_officer_id = serializers.CharField(required=True)
    justification = serializers.CharField(required=True)
