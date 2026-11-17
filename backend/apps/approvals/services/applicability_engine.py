"""
Deterministic Rule-Based Industrial Approval Applicability Engine.
Evaluates industrial profiles against Central, State, and Local statutory criteria.
"""

from typing import Any, Dict, List, Optional
from apps.approvals.repository import ApprovalCatalogueRepository, ApplicabilityRuleRepository
from apps.jurisdictions.repository import JurisdictionRepository

approval_repo = ApprovalCatalogueRepository()
rule_repo = ApplicabilityRuleRepository()
jurisdiction_repo = JurisdictionRepository()

DISCLAIMER_TEXT = (
    "BizPermit is an independent architectural prototype developed under SIH26130. "
    "This automated roadmap is generated deterministically based on prevailing official statutes, "
    "gazette notifications, and citizen charters. It does not constitute legal counsel or a guarantee of approval grant."
)

class ApplicabilityEngineService:
    @staticmethod
    def evaluate_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
        state_code = profile.get("state_code", "").strip().upper()
        pollution_cat = profile.get("pollution_category", "ORANGE").strip().upper()
        scale = profile.get("scale", "MEDIUM").strip().upper()
        workforce = int(profile.get("workforce_capacity", 0))
        power_hp = int(profile.get("total_power_load_hp", 0))
        has_boiler = bool(profile.get("has_boiler", False))
        has_chemicals = bool(profile.get("has_hazardous_chemicals", False))
        has_groundwater = bool(profile.get("has_groundwater_borewell", False))
        local_body_type = profile.get("local_body_type", "").strip().upper()

        # Query all relevant approvals for this state and central bodies
        available_approvals = approval_repo.filter_catalogue(
            state_code=state_code,
            is_active=True,
            limit=200
        )

        matched_approvals: List[Dict[str, Any]] = []
        cumulative_sla_days = 0
        total_estimated_fee_inr = 0

        for app in available_approvals:
            is_matched = False
            reasons = []
            statutory_basis = app.get("statutory_act", "General Industrial Regulations")

            rules_cfg = app.get("applicability_rules", {})
            allowed_pollution = rules_cfg.get("pollution_categories", ["ALL"])
            requires_boiler = rules_cfg.get("requires_boiler", False)
            requires_hazardous = rules_cfg.get("requires_hazardous_chemicals", False)
            min_workers = rules_cfg.get("min_workforce", 0)
            min_power = rules_cfg.get("min_power_load_hp", 0)
            requires_groundwater = rules_cfg.get("requires_groundwater", False)

            # 1. Pollution Category match
            if "ALL" in allowed_pollution or pollution_cat in allowed_pollution:
                if "RED" in allowed_pollution or "ORANGE" in allowed_pollution or "GREEN" in allowed_pollution:
                    is_matched = True
                    reasons.append(f"Applicable for {pollution_cat} category industrial operations.")

            # 2. Boiler trigger
            if requires_boiler:
                if has_boiler:
                    is_matched = True
                    reasons.append("Triggered by presence of industrial steam boiler/pressure vessel under Indian Boilers Act, 1923.")
                else:
                    is_matched = False

            # 3. Hazardous Chemicals trigger
            if requires_hazardous:
                if has_chemicals:
                    is_matched = True
                    reasons.append("Triggered by storage/handling of hazardous substances under MSIHC Rules & PESO.")
                else:
                    is_matched = False

            # 4. Workforce trigger (Factories Act)
            if min_workers > 0 and workforce >= min_workers:
                is_matched = True
                reasons.append(f"Workforce of {workforce} workers exceeds statutory threshold ({min_workers}+) under Factories Act, 1948.")

            # 5. Connected Power Load trigger
            if min_power > 0 and power_hp >= min_power:
                is_matched = True
                reasons.append(f"Connected load of {power_hp} HP triggers High Tension electrical compliance ({min_power}+ HP).")

            # 6. Groundwater trigger
            if requires_groundwater:
                if has_groundwater:
                    is_matched = True
                    reasons.append("Triggered by ground water borewell extraction requiring CGWA / State Ground Water NOC.")
                else:
                    is_matched = False

            # 7. General statutory clearances (Fire, Local zoning)
            if not rules_cfg or (not requires_boiler and not requires_hazardous and min_workers == 0 and min_power == 0 and not requires_groundwater and "ALL" in allowed_pollution):
                is_matched = True
                reasons.append("Standard mandatory clearance for industrial establishment in this jurisdiction.")

            if is_matched:
                sla = app.get("standard_sla_days", 30)
                fee = app.get("fee_structure", {}).get("base_amount", 0)

                matched_item = {
                    "approval_code": app.get("approval_code"),
                    "title": app.get("title"),
                    "short_name": app.get("short_name", app.get("title")),
                    "authority_level": app.get("tier"),
                    "department_code": app.get("department_code"),
                    "stage": app.get("stage", "PRE_ESTABLISHMENT"),
                    "statutory_act": statutory_basis,
                    "standard_sla_days": sla,
                    "estimated_fee_inr": fee,
                    "matching_reasons": reasons,
                    "document_checklist": app.get("document_checklist", []),
                    "official_portal_url": app.get("official_portal_url", ""),
                    "source_url": app.get("source_url", ""),
                    "verification_status": app.get("verification_status", "VERIFIED"),
                    "last_verified_at": app.get("last_verified_at")
                }
                matched_approvals.append(matched_item)
                cumulative_sla_days += sla
                total_estimated_fee_inr += fee

        # Segregate into the 3 project stages
        stages_output = {
            "PRE_ESTABLISHMENT": [],
            "PRE_OPERATION": [],
            "OPERATIONAL": []
        }

        for item in matched_approvals:
            stage_key = item.get("stage", "PRE_ESTABLISHMENT")
            if stage_key in stages_output:
                stages_output[stage_key].append(item)
            else:
                stages_output["PRE_ESTABLISHMENT"].append(item)

        return {
            "total_approvals_required": len(matched_approvals),
            "estimated_cumulative_sla_days": cumulative_sla_days,
            "estimated_total_statutory_fees_inr": total_estimated_fee_inr,
            "evaluated_parameters": {
                "state_code": state_code,
                "pollution_category": pollution_cat,
                "scale": scale,
                "workforce": workforce,
                "power_hp": power_hp,
                "has_boiler": has_boiler,
                "has_hazardous_chemicals": has_chemicals
            },
            "stages": stages_output,
            "disclaimer": DISCLAIMER_TEXT
        }
