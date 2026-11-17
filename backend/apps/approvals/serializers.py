"""
DRF Serializers for Approvals, Rules, and KYA Evaluation Requests.
"""

from rest_framework import serializers

class DocumentChecklistItemSerializer(serializers.Serializer):
    document_type = serializers.CharField(required=True)
    name = serializers.CharField(required=True)
    is_mandatory = serializers.BooleanField(default=True)
    accepted_formats = serializers.ListField(child=serializers.CharField(), required=False)
    max_size_mb = serializers.IntegerField(required=False, default=15)

class FeeStructureSerializer(serializers.Serializer):
    currency = serializers.CharField(default="INR")
    base_amount = serializers.FloatField(required=False, default=0.0)
    statutory_portal_fee_url = serializers.URLField(required=False, allow_blank=True)

class ApprovalCatalogueSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    approval_code = serializers.CharField(required=True)
    title = serializers.CharField(required=True)
    short_name = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    tier = serializers.ChoiceField(choices=['CENTRAL', 'STATE', 'LOCAL'])
    department_code = serializers.CharField(required=True)
    state_code = serializers.CharField(required=False, allow_null=True)
    stage = serializers.ChoiceField(choices=['PRE_ESTABLISHMENT', 'PRE_OPERATION', 'OPERATIONAL'])
    statutory_act = serializers.CharField(required=False, allow_blank=True)
    standard_sla_days = serializers.IntegerField(required=False, default=30)
    fee_structure = FeeStructureSerializer(required=False)
    document_checklist = DocumentChecklistItemSerializer(many=True, required=False)
    official_portal_url = serializers.URLField(required=False, allow_blank=True)
    source_url = serializers.URLField(required=False, allow_blank=True)
    last_verified_at = serializers.CharField(required=False, allow_null=True)
    verification_status = serializers.ChoiceField(
        choices=['VERIFIED', 'NEEDS_REVIEW', 'DEMO', 'INACTIVE'],
        default='VERIFIED'
    )
    is_active = serializers.BooleanField(default=True)
    applicability_rules = serializers.DictField(required=False)


class ApplicabilityEvaluationRequestSerializer(serializers.Serializer):
    state_code = serializers.CharField(required=True)
    district_code = serializers.CharField(required=False, allow_blank=True)
    local_body_type = serializers.CharField(required=False, allow_blank=True)
    nic_code = serializers.CharField(required=False, allow_blank=True)
    scale = serializers.ChoiceField(choices=['MICRO', 'SMALL', 'MEDIUM', 'LARGE'], default='MEDIUM')
    pollution_category = serializers.ChoiceField(choices=['RED', 'ORANGE', 'GREEN', 'WHITE'], default='ORANGE')
    total_power_load_hp = serializers.IntegerField(required=False, default=0)
    workforce_capacity = serializers.IntegerField(required=False, default=0)
    has_boiler = serializers.BooleanField(required=False, default=False)
    has_hazardous_chemicals = serializers.BooleanField(required=False, default=False)
    has_groundwater_borewell = serializers.BooleanField(required=False, default=False)
    water_requirement_kld = serializers.FloatField(required=False, default=0.0)

    def validate_state_code(self, value):
        from apps.jurisdictions.repository import JurisdictionRepository
        val = value.strip().upper()
        doc = JurisdictionRepository().find_by_code(val)
        if not doc or doc.get("tier") not in ("STATE", "UT", "CENTRAL"):
            raise serializers.ValidationError(
                f"Invalid jurisdiction code: '{value}'. Must be a valid Indian State or Union Territory."
            )
        return val


class ApplicabilityRuleSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    rule_code = serializers.CharField(required=True)
    rule_name = serializers.CharField(required=True)
    target_approval_code = serializers.CharField(required=True)
    conditions = serializers.DictField(required=True)
    priority = serializers.IntegerField(default=10)
    stage = serializers.CharField(default="PRE_ESTABLISHMENT")
    reasoning_text = serializers.CharField(required=True)
    statutory_citation = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(default=True)
