"""
Django REST Framework Serializers for Government Schemes & Incentives Engine.
"""

from rest_framework import serializers


class SchemeListSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    scheme_code = serializers.CharField()
    name = serializers.CharField()
    short_name = serializers.CharField()
    description = serializers.CharField()
    authority_level = serializers.CharField()
    state_code = serializers.CharField()
    department_code = serializers.CharField()
    financial_instrument_type = serializers.CharField()
    scheme_lifecycle_status = serializers.CharField()
    fresh_intake_status = serializers.CharField()
    scheme_rule_version = serializers.CharField()
    statutory_reference = serializers.DictField()
    benefits_structure = serializers.DictField(required=False)


class SchemeDetailSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    scheme_code = serializers.CharField()
    name = serializers.CharField()
    short_name = serializers.CharField()
    description = serializers.CharField()
    authority_level = serializers.CharField()
    state_code = serializers.CharField()
    department_code = serializers.CharField()
    financial_instrument_type = serializers.CharField()
    scheme_rule_version = serializers.CharField()
    scheme_lifecycle_status = serializers.CharField()
    fresh_intake_status = serializers.CharField()
    intake_open_date = serializers.CharField(allow_null=True)
    intake_close_date = serializers.CharField(allow_null=True)
    implementation_period = serializers.DictField()
    beneficiary_claim_period = serializers.DictField()
    operating_or_ppa_period = serializers.DictField()
    successor_scheme_code = serializers.CharField(allow_null=True)
    statutory_reference = serializers.DictField()
    eligibility_rules = serializers.DictField()
    benefits_structure = serializers.DictField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class CriterionResultSerializer(serializers.Serializer):
    criterion_key = serializers.CharField()
    label = serializers.CharField()
    status = serializers.ChoiceField(choices=["SATISFIED", "UNMET", "MISSING_EVIDENCE", "MANUAL_CONFIRMATION_REQUIRED"])
    statutory_reference = serializers.CharField()
    required_value = serializers.CharField()
    actual_value = serializers.CharField()
    explanation = serializers.CharField()


class SchemeRecommendationSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    location_id = serializers.CharField()
    business_id = serializers.CharField()
    user_id = serializers.CharField()
    scheme_code = serializers.CharField()
    scheme_name = serializers.CharField(required=False, allow_blank=True)
    scheme_rule_version = serializers.CharField()
    profile_snapshot_hash = serializers.CharField()
    evaluated_at = serializers.DateTimeField()
    overall_eligibility = serializers.ChoiceField(choices=["ELIGIBLE", "INELIGIBLE", "NEEDS_MANUAL_REVIEW", "MISSING_EVIDENCE"])
    criteria_results = CriterionResultSerializer(many=True)
    financial_summary = serializers.DictField(required=False)
    disclaimers = serializers.ListField(child=serializers.CharField(), required=False)
    is_latest = serializers.BooleanField()
    is_stale = serializers.BooleanField()
    invalidation_reason = serializers.CharField(allow_null=True, required=False)
    invalidation_timestamp = serializers.DateTimeField(allow_null=True, required=False)


class SchemeEvaluationRequestSerializer(serializers.Serializer):
    location_id = serializers.CharField(required=True)
    scheme_code = serializers.CharField(required=False, allow_blank=True)


class SchemeApplicationCreateSerializer(serializers.Serializer):
    location_id = serializers.CharField(required=True)
    scheme_code = serializers.CharField(required=True)
    recommendation_id = serializers.CharField(required=False, allow_blank=True)
    dossier_data = serializers.DictField(required=False)
    is_legacy_claim = serializers.BooleanField(required=False, default=False)
    legacy_approval_reference = serializers.CharField(required=False, allow_blank=True)
    legacy_sanction_date = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data.get("is_legacy_claim"):
            if not data.get("legacy_approval_reference") or not str(data["legacy_approval_reference"]).strip():
                raise serializers.ValidationError({"legacy_approval_reference": "Legacy claims require a valid prior approval reference."})
            if not data.get("legacy_sanction_date") or not str(data["legacy_sanction_date"]).strip():
                raise serializers.ValidationError({"legacy_sanction_date": "Legacy claims require a valid prior sanction date."})
        return data


class AdminDeclarativeRuleSerializer(serializers.Serializer):
    criterion_id = serializers.CharField(required=True)
    criterion_type = serializers.ChoiceField(
        choices=[
            "STATE_MATCH", "TALUKA_CATEGORY", "ENTERPRISE_SIZE", "MSME_REGISTRATION",
            "DCOP_DATE", "CAPEX_AMOUNT", "REQUIRED_APPROVALS", "SECTOR_ELIGIBILITY", "LENDER_CATEGORY"
        ]
    )
    operator = serializers.ChoiceField(
        choices=["EQ", "NEQ", "IN", "NOT_IN", "GTE", "LTE", "BETWEEN", "EXISTS"]
    )
    value = serializers.JSONField(required=False)
    label = serializers.CharField(required=False)
    required_evidence = serializers.CharField(required=False)
    statutory_reference = serializers.CharField(required=False)


class AdminSchemeCreateSerializer(serializers.Serializer):
    scheme_code = serializers.CharField(required=True, max_length=50)
    name = serializers.CharField(required=True, max_length=255)
    short_name = serializers.CharField(required=True, max_length=100)
    description = serializers.CharField(required=True)
    authority_level = serializers.ChoiceField(choices=["CENTRAL", "STATE"])
    state_code = serializers.CharField(required=True, max_length=10)
    department_code = serializers.CharField(required=False, default="IND")
    nodal_ministry = serializers.CharField(required=False, allow_blank=True)
    implementing_agency = serializers.CharField(required=False, allow_blank=True)
    financial_instrument_type = serializers.ChoiceField(
        choices=["CREDIT_GUARANTEE", "CAPITAL_SUBSIDY", "PRODUCTION_LINKED_INCENTIVE", "INFRASTRUCTURE_ASSISTANCE"]
    )
    scheme_lifecycle_status = serializers.ChoiceField(
        choices=["ACTIVE", "SUPERSEDED", "SUSPENDED", "SUNSET", "UPCOMING"],
        default="ACTIVE"
    )
    fresh_intake_status = serializers.ChoiceField(
        choices=[
            "OPEN", "CLOSED_AWAITING_NEXT_EOI", "CLOSED_AWAITING_STATE_TENDER",
            "PERMANENTLY_CLOSED", "TRANSITIONAL_LEGACY_ONLY", "NEEDS_CONFIRMATION"
        ],
        default="NEEDS_CONFIRMATION"
    )
    scheme_rule_version = serializers.CharField(required=False, default="1.0")
    statutory_reference = serializers.DictField(required=False)
    benefits_structure = serializers.DictField(required=False)
    facility_ceilings_by_lender = serializers.DictField(required=False)
    guarantee_coverage_table = serializers.DictField(required=False)
    declarative_rules = serializers.ListField(child=AdminDeclarativeRuleSerializer(), required=False)


class AdminSchemeUpdateMetadataSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    short_name = serializers.CharField(required=False)
    description = serializers.CharField(required=False)
    nodal_ministry = serializers.CharField(required=False, allow_blank=True)
    implementing_agency = serializers.CharField(required=False, allow_blank=True)
    department_code = serializers.CharField(required=False)
    financial_instrument_type = serializers.CharField(required=False)
    statutory_reference = serializers.DictField(required=False)
    benefits_structure = serializers.DictField(required=False)
    facility_ceilings_by_lender = serializers.DictField(required=False)
    guarantee_coverage_table = serializers.DictField(required=False)
    implementation_period = serializers.DictField(required=False)
    beneficiary_claim_period = serializers.DictField(required=False)
    operating_or_ppa_period = serializers.DictField(required=False)


class AdminRuleVersionCreateSerializer(serializers.Serializer):
    version = serializers.CharField(required=True, max_length=20)
    rules = serializers.ListField(child=AdminDeclarativeRuleSerializer(), required=True)


class AdminEvidenceVerifySerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["VERIFIED", "REJECTED"])
    notes = serializers.CharField(required=True, min_length=5)
    verified_source_url = serializers.URLField(required=False, allow_blank=True)


class AdminRuleVersionActivateSerializer(serializers.Serializer):
    version = serializers.CharField(required=True)
    fresh_intake_status = serializers.ChoiceField(
        choices=[
            "OPEN", "CLOSED_AWAITING_NEXT_EOI", "CLOSED_AWAITING_STATE_TENDER",
            "PERMANENTLY_CLOSED", "TRANSITIONAL_LEGACY_ONLY", "NEEDS_CONFIRMATION"
        ],
        default="OPEN"
    )


class SchemeApplicationUpdateSerializer(serializers.Serializer):
    dossier_data = serializers.DictField(required=False)
    status = serializers.ChoiceField(choices=["DRAFT", "DOCUMENT_ASSEMBLY", "READY_FOR_FILING"], required=False)


class SchemeApplicationAttachDocSerializer(serializers.Serializer):
    vault_document_id = serializers.CharField(required=True)
    document_category = serializers.CharField(required=False, default="GENERAL_COMPLIANCE")


class SchemeApplicationAttestSerializer(serializers.Serializer):
    external_portal_name = serializers.CharField(required=True, min_length=2, max_length=200)
    external_acknowledgement_number = serializers.CharField(required=True, min_length=2, max_length=150)
    external_submission_date = serializers.CharField(required=True)
    attestation_confirmed = serializers.BooleanField(required=True)
    acknowledgement_vault_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class SchemeApplicationDetailSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    application_reference = serializers.CharField()
    business_id = serializers.CharField()
    location_id = serializers.CharField()
    user_id = serializers.CharField()
    scheme_code = serializers.CharField()
    scheme_name = serializers.CharField(required=False)
    recommendation_id = serializers.CharField(allow_null=True)
    profile_snapshot_hash = serializers.CharField()
    scheme_rule_version = serializers.CharField()
    status = serializers.CharField()
    dossier_data = serializers.DictField()
    attached_vault_documents = serializers.ListField(child=serializers.DictField())
    external_submission = serializers.DictField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    submitted_at = serializers.DateTimeField(allow_null=True, required=False)
