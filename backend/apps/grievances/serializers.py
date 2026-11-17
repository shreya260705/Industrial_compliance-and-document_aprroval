"""
DRF Serializers for Grievances & Escalations.
Phase 6 Module 3.
"""

from rest_framework import serializers


class GrievanceSubmitSerializer(serializers.Serializer):
    track = serializers.ChoiceField(choices=["INTERNAL", "EXTERNAL"], default="INTERNAL")
    business_id = serializers.CharField(required=True)
    location_id = serializers.CharField(required=False, allow_null=True)
    department_code = serializers.CharField(required=False, default="IN-GJ-IND")
    state_code = serializers.CharField(required=False, default="IN-GJ")
    district_code = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    category_code = serializers.CharField(required=False, default="OTHER")
    subcategory = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    priority = serializers.ChoiceField(choices=["LOW", "NORMAL", "HIGH", "URGENT"], default="NORMAL")
    severity = serializers.ChoiceField(choices=["MINOR", "MODERATE", "MAJOR", "CRITICAL"], default="MODERATE")
    subject = serializers.CharField(required=True, min_length=3, max_length=200)
    description = serializers.CharField(required=True, min_length=10)
    related_application_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    related_scheme_application_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    related_compliance_obligation_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    vault_document_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    statutory_source_reference = serializers.DictField(required=False, default=dict)
    external_tracking = serializers.DictField(required=False, default=dict)


class GrievanceClarificationRequestSerializer(serializers.Serializer):
    question = serializers.CharField(required=True, min_length=5)
    issue_link = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    internal_target_days = serializers.IntegerField(required=False, default=5, min_value=1, max_value=30)


class GrievanceClarificationResponseSerializer(serializers.Serializer):
    clarification_id = serializers.CharField(required=True)
    response_text = serializers.CharField(required=True, min_length=5)
    vault_document_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class GrievanceInternalNoteSerializer(serializers.Serializer):
    note_text = serializers.CharField(required=True, min_length=3)


class GrievanceProposeResolutionSerializer(serializers.Serializer):
    remarks = serializers.CharField(required=True, min_length=5)
    corrective_actions = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class GrievanceResolveSerializer(serializers.Serializer):
    resolution_summary = serializers.CharField(required=True, min_length=5)
    corrective_actions = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class GrievanceCloseSerializer(serializers.Serializer):
    closure_remarks = serializers.CharField(required=False, allow_blank=True, default="")


class GrievanceReopenSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=5)


class GrievanceFeedbackSerializer(serializers.Serializer):
    rating = serializers.IntegerField(required=True, min_value=1, max_value=5)
    feedback_text = serializers.CharField(required=False, allow_blank=True, default="")


class GrievanceWithdrawSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=3)


class GrievanceEscalateSerializer(serializers.Serializer):
    new_level = serializers.ChoiceField(choices=["LEVEL_2", "LEVEL_3"], required=True)
    trigger = serializers.CharField(required=True, min_length=3)
    reason = serializers.CharField(required=True, min_length=5)


class GrievanceAssignSerializer(serializers.Serializer):
    target_officer_id = serializers.CharField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")


class GrievanceReassignSerializer(serializers.Serializer):
    new_officer_id = serializers.CharField(required=True)
    justification = serializers.CharField(required=True, min_length=5)


class GrievanceCategorySerializer(serializers.Serializer):
    category_code = serializers.CharField(required=True)
    name = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    applicable_tracks = serializers.ListField(child=serializers.CharField(), required=False, default=lambda: ["INTERNAL", "EXTERNAL"])
    default_priority = serializers.ChoiceField(choices=["LOW", "NORMAL", "HIGH", "URGENT"], default="NORMAL")
    default_internal_target_days = serializers.IntegerField(default=15, min_value=1, max_value=90)
    is_active = serializers.BooleanField(default=True)


class GrievanceEscalationRuleUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    threshold_days = serializers.IntegerField(required=False, min_value=0, max_value=90)
    from_level = serializers.ChoiceField(choices=["LEVEL_1", "LEVEL_2"], required=False)
    to_level = serializers.ChoiceField(choices=["LEVEL_2", "LEVEL_3"], required=False)
    auto_escalate = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)
