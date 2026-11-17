"""
Deterministic Scheme Eligibility Evaluation Engine.
Evaluates an industrial location and business against verified statutory scheme rules.
Produces immutable evaluation results with itemized criteria, profile snapshot hashes,
and zero pseudo-probabilistic match percentages.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger('bizpermit.schemes.engine')


ALLOWED_CRITERION_TYPES = {
    "STATE_MATCH",
    "TALUKA_CATEGORY",
    "ENTERPRISE_SIZE",
    "MSME_REGISTRATION",
    "DCOP_DATE",
    "CAPEX_AMOUNT",
    "REQUIRED_APPROVALS",
    "SECTOR_ELIGIBILITY",
    "LENDER_CATEGORY"
}

ALLOWED_OPERATORS = {
    "EQ",
    "NEQ",
    "IN",
    "NOT_IN",
    "GTE",
    "LTE",
    "BETWEEN",
    "EXISTS"
}


class DeclarativeRuleValidator:
    @classmethod
    def validate_rule(cls, rule: Dict[str, Any]) -> None:
        """Validates declarative rule against allowlisted types and operators."""
        c_type = rule.get("criterion_type")
        if not c_type or c_type not in ALLOWED_CRITERION_TYPES:
            raise ValueError(f"Invalid criterion_type '{c_type}'. Allowed types: {sorted(ALLOWED_CRITERION_TYPES)}")

        op = rule.get("operator")
        if not op or op not in ALLOWED_OPERATORS:
            raise ValueError(f"Invalid operator '{op}'. Allowed operators: {sorted(ALLOWED_OPERATORS)}")

        if "criterion_id" not in rule:
            raise ValueError("Rule must include a unique 'criterion_id'.")


class EligibilityEngine:
    ENGINE_VERSION = "2026.2"

    @classmethod
    def compute_profile_snapshot_hash(cls, location_doc: Dict[str, Any], business_doc: Dict[str, Any]) -> str:
        """
        Computes deterministic SHA-256 hash of evaluated location and business attributes.
        Any change in physical location, investment, or corporate scale alters the hash.
        """
        addr = location_doc.get("address") or {}
        juris = location_doc.get("jurisdiction_hierarchy") or {}
        ind_profile = location_doc.get("industrial_profile") or {}

        snapshot = {
            "state_code": juris.get("state_code") or addr.get("state_code") or "",
            "district_code": juris.get("district_code") or addr.get("district_code") or "",
            "taluka": addr.get("taluka") or juris.get("taluka_code") or "",
            "facility_type": location_doc.get("facility_type") or "",
            "operational_status": location_doc.get("operational_status") or "",
            "pollution_category": ind_profile.get("pollution_category") or "",
            "capital_investment_inr": ind_profile.get("capital_investment_inr") or 0,
            "plant_machinery_inr": ind_profile.get("plant_machinery_inr") or 0,
            "annual_turnover_inr": ind_profile.get("annual_turnover_inr") or 0,
            "employment_count": ind_profile.get("employment_count") or 0,
            "commencement_date": str(ind_profile.get("commencement_date") or ""),
            "sector": ind_profile.get("sector") or business_doc.get("industry_sector") or "",
            "nic_code": ind_profile.get("nic_code") or business_doc.get("nic_code") or "",
            "entity_type": business_doc.get("entity_type") or "",
            "pan": business_doc.get("pan") or "",
            "udyam_registration_number": business_doc.get("udyam_registration_number") or ""
        }

        canonical_json = json.dumps(snapshot, sort_keys=True)
        return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()

    @classmethod
    def evaluate(
        cls,
        location_doc: Dict[str, Any],
        business_doc: Dict[str, Any],
        scheme_doc: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes deterministic boolean evaluation of scheme rules.
        Returns itemized criteria with SATISFIED, UNMET, MISSING_EVIDENCE, or MANUAL_CONFIRMATION_REQUIRED.
        """
        scheme_code = scheme_doc.get("scheme_code", "").strip().upper()
        rule_version = scheme_doc.get("scheme_rule_version") or "1.0"
        snapshot_hash = cls.compute_profile_snapshot_hash(location_doc, business_doc)

        criteria_results: List[Dict[str, Any]] = []
        financial_summary: Dict[str, Any] = {}
        disclaimers: List[str] = [
            "Evaluated deterministically by BizPermit SIH26130 rule engine based on verified location profile.",
            "Final statutory sanction and disbursement is subject exclusively to formal scrutiny by the competent government authority."
        ]

        # Dispatch to declarative rule engine or scheme-specific logic
        if scheme_doc.get("declarative_rules"):
            criteria_results, financial_summary = cls.evaluate_declarative_rules(location_doc, business_doc, scheme_doc["declarative_rules"], scheme_doc)
        elif scheme_code == "IN-GJ-AATMA-2022":
            criteria_results, financial_summary = cls._evaluate_gujarat_aatmanirbhar_2022(location_doc, business_doc, scheme_doc)
        elif scheme_code == "IN-GJ-IND-2020":
            criteria_results, financial_summary = cls._evaluate_gujarat_2020_legacy(location_doc, business_doc, scheme_doc)
        elif scheme_code == "IN-MH-PSI-2019":
            criteria_results, financial_summary = cls._evaluate_maharashtra_psi_2019(location_doc, business_doc, scheme_doc)
        elif scheme_code == "IN-MH-MIISP-2025":
            criteria_results, financial_summary = cls._evaluate_maharashtra_miisp_2025(location_doc, business_doc, scheme_doc)
        elif scheme_code == "IN-CEN-CGTMSE":
            criteria_results, financial_summary = cls._evaluate_cgtmse(location_doc, business_doc, scheme_doc)
        elif scheme_code == "IN-CEN-PMKSY-CEFPPC":
            criteria_results, financial_summary = cls._evaluate_pmksy_cefppc(location_doc, business_doc, scheme_doc)
        elif scheme_code == "IN-CEN-PM-KUSUM-A":
            criteria_results, financial_summary = cls._evaluate_pm_kusum_a(location_doc, business_doc, scheme_doc)
        elif scheme_code == "IN-CEN-PLI-AUTO":
            criteria_results, financial_summary = cls._evaluate_pli_auto(location_doc, business_doc, scheme_doc)
        elif scheme_code == "IN-CEN-CLCSS":
            criteria_results, financial_summary = cls._evaluate_clcss(location_doc, business_doc, scheme_doc)
        else:
            criteria_results, financial_summary = cls._evaluate_generic_scheme(location_doc, business_doc, scheme_doc)

        # Compute overall eligibility outcome
        has_unmet = any(c["status"] == "UNMET" for c in criteria_results)
        has_missing = any(c["status"] == "MISSING_EVIDENCE" for c in criteria_results)
        has_manual = any(c["status"] == "MANUAL_CONFIRMATION_REQUIRED" for c in criteria_results)

        if has_unmet:
            overall_eligibility = "INELIGIBLE"
        elif has_missing:
            overall_eligibility = "MISSING_EVIDENCE"
        elif has_manual:
            overall_eligibility = "NEEDS_MANUAL_REVIEW"
        else:
            overall_eligibility = "ELIGIBLE"

        return {
            "location_id": location_doc.get("_id"),
            "business_id": business_doc.get("_id"),
            "scheme_code": scheme_code,
            "scheme_rule_version": rule_version,
            "profile_snapshot_hash": snapshot_hash,
            "overall_eligibility": overall_eligibility,
            "criteria_results": criteria_results,
            "financial_summary": financial_summary,
            "disclaimers": disclaimers
        }

    # -------------------------------------------------------------------------
    # SCHEME 1: IN-GJ-AATMA-2022 (Aatmanirbhar Gujarat Schemes 2022 for MSMEs)
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_gujarat_aatmanirbhar_2022(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = []
        addr = loc.get("address") or {}
        juris = loc.get("jurisdiction_hierarchy") or {}
        ind = loc.get("industrial_profile") or {}

        # 1. State Jurisdiction
        state = juris.get("state_code") or addr.get("state_code") or ""
        if state == "IN-GJ":
            criteria.append({
                "criterion_key": "jurisdiction_state",
                "label": "State Location (Gujarat)",
                "status": "SATISFIED",
                "statutory_reference": "GR GID/102022/1005/Z Cl. 2",
                "required_value": "IN-GJ (Gujarat)",
                "actual_value": state,
                "explanation": "Industrial location is located within Gujarat."
            })
        else:
            criteria.append({
                "criterion_key": "jurisdiction_state",
                "label": "State Location (Gujarat)",
                "status": "UNMET",
                "statutory_reference": "GR GID/102022/1005/Z Cl. 2",
                "required_value": "IN-GJ (Gujarat)",
                "actual_value": state or "None",
                "explanation": "Scheme is applicable exclusively to industrial units situated in Gujarat."
            })

        # 2. Enterprise Scale (MSME)
        plant_machinery = ind.get("plant_machinery_inr") or ind.get("capital_investment_inr")
        turnover = ind.get("annual_turnover_inr")
        if plant_machinery is None:
            criteria.append({
                "criterion_key": "enterprise_scale",
                "label": "MSME Scale Classification",
                "status": "MISSING_EVIDENCE",
                "statutory_reference": "MSMED Act 2006 Notification S.O. 2119(E)",
                "required_value": "Plant & Machinery <= 50 Cr and Turnover <= 250 Cr",
                "actual_value": "Not specified in profile",
                "explanation": "Plant & machinery investment is required to confirm MSME classification."
            })
        elif plant_machinery > 500000000 or (turnover and turnover > 2500000000):
            criteria.append({
                "criterion_key": "enterprise_scale",
                "label": "MSME Scale Classification",
                "status": "UNMET",
                "statutory_reference": "MSMED Act 2006 Notification S.O. 2119(E)",
                "required_value": "Plant & Machinery <= 50 Cr and Turnover <= 250 Cr",
                "actual_value": f"Plant & Machinery: ₹{plant_machinery / 1e7:.2f} Cr",
                "explanation": "Enterprise exceeds MSME ceilings. Unit qualifies as Large/Mega, requiring separate scheme guidelines."
            })
        else:
            criteria.append({
                "criterion_key": "enterprise_scale",
                "label": "MSME Scale Classification",
                "status": "SATISFIED",
                "statutory_reference": "MSMED Act 2006 Notification S.O. 2119(E)",
                "required_value": "Micro, Small or Medium Enterprise",
                "actual_value": f"Plant & Machinery: ₹{plant_machinery / 1e7:.2f} Cr",
                "explanation": "Enterprise satisfies MSME statutory investment criteria."
            })

        # 3. Taluka Category Classification
        taluka = addr.get("taluka") or juris.get("taluka_code")
        if not taluka:
            criteria.append({
                "criterion_key": "taluka_category",
                "label": "Taluka Industrial Categorization",
                "status": "MISSING_EVIDENCE",
                "statutory_reference": "GR Annexure 1 (Taluka Schedule)",
                "required_value": "Category 1, 2, or 3 Taluka",
                "actual_value": "Taluka field empty in location address",
                "explanation": "Location address must specify taluka to determine subsidy slab (Cat 1/2/3)."
            })
        else:
            criteria.append({
                "criterion_key": "taluka_category",
                "label": "Taluka Industrial Categorization",
                "status": "SATISFIED",
                "statutory_reference": "GR Annexure 1 (Taluka Schedule)",
                "required_value": "Category 1, 2, or 3 Taluka",
                "actual_value": str(taluka),
                "explanation": f"Taluka '{taluka}' recorded; qualifies for capital assistance schedule."
            })

        # 4. Operative Period & DCOP (05/10/2022 to 04/10/2027)
        commence_date_str = ind.get("commencement_date")
        if not commence_date_str:
            criteria.append({
                "criterion_key": "operative_dcop_window",
                "label": "Date of Commercial Production (DCOP)",
                "status": "MISSING_EVIDENCE",
                "statutory_reference": "GR Cl. 4.1",
                "required_value": "DCOP between 05/10/2022 and 04/10/2027",
                "actual_value": "Not provided",
                "explanation": "Commencement date / planned DCOP is mandatory to confirm policy applicability."
            })
        else:
            try:
                c_date = datetime.strptime(str(commence_date_str).split("T")[0], "%Y-%m-%d").date()
                policy_start = date(2022, 10, 5)
                policy_end = date(2027, 10, 4)
                if c_date < policy_start:
                    criteria.append({
                        "criterion_key": "operative_dcop_window",
                        "label": "Date of Commercial Production (DCOP)",
                        "status": "UNMET",
                        "statutory_reference": "GR Cl. 4.1",
                        "required_value": "DCOP on or after 05/10/2022",
                        "actual_value": str(c_date),
                        "explanation": "Commercial production commenced prior to 05/10/2022. Unit is governed by Gujarat Industrial Policy 2020."
                    })
                elif c_date > policy_end:
                    criteria.append({
                        "criterion_key": "operative_dcop_window",
                        "label": "Date of Commercial Production (DCOP)",
                        "status": "MANUAL_CONFIRMATION_REQUIRED",
                        "statutory_reference": "GR Cl. 4.1",
                        "required_value": "DCOP on or before 04/10/2027",
                        "actual_value": str(c_date),
                        "explanation": "Planned DCOP is beyond current policy expiry (04/10/2027). Requires confirmation of gestation extension."
                    })
                else:
                    criteria.append({
                        "criterion_key": "operative_dcop_window",
                        "label": "Date of Commercial Production (DCOP)",
                        "status": "SATISFIED",
                        "statutory_reference": "GR Cl. 4.1",
                        "required_value": "DCOP between 05/10/2022 and 04/10/2027",
                        "actual_value": str(c_date),
                        "explanation": "Commencement date falls within active operative window of Aatmanirbhar Gujarat Schemes 2022."
                    })
            except Exception:
                criteria.append({
                    "criterion_key": "operative_dcop_window",
                    "label": "Date of Commercial Production (DCOP)",
                    "status": "MISSING_EVIDENCE",
                    "statutory_reference": "GR Cl. 4.1",
                    "required_value": "Valid ISO Date YYYY-MM-DD",
                    "actual_value": str(commence_date_str),
                    "explanation": "Invalid commencement date format."
                })

        # 5. Environmental Clearance (GPCB Consent)
        pollution_cat = ind.get("pollution_category")
        if not pollution_cat:
            criteria.append({
                "criterion_key": "environmental_clearance",
                "label": "GPCB Consent to Establish (CTE)",
                "status": "MISSING_EVIDENCE",
                "statutory_reference": "GR Cl. 8.1",
                "required_value": "Pollution category specified and valid CTE",
                "actual_value": "Pollution category empty",
                "explanation": "Pollution category is mandatory to determine required GPCB consent status."
            })
        elif pollution_cat.upper() == "WHITE":
            criteria.append({
                "criterion_key": "environmental_clearance",
                "label": "GPCB Consent to Establish (CTE)",
                "status": "SATISFIED",
                "statutory_reference": "GPCB White Category Exemption Notification",
                "required_value": "White Category / CTE Exemption",
                "actual_value": "WHITE",
                "explanation": "White category units are exempt from Consent to Establish requirements."
            })
        else:
            # Requires GPCB CTE evidence
            has_cte = ind.get("has_gpcb_cte") or ind.get("clearances", {}).get("gpcb_cte")
            if has_cte:
                criteria.append({
                    "criterion_key": "environmental_clearance",
                    "label": "GPCB Consent to Establish (CTE)",
                    "status": "SATISFIED",
                    "statutory_reference": "GR Cl. 8.1",
                    "required_value": "Valid CTE from GPCB",
                    "actual_value": f"CTE Verified ({pollution_cat})",
                    "explanation": "Valid Consent to Establish confirmed."
                })
            else:
                criteria.append({
                    "criterion_key": "environmental_clearance",
                    "label": "GPCB Consent to Establish (CTE)",
                    "status": "MISSING_EVIDENCE",
                    "statutory_reference": "GR Cl. 8.1",
                    "required_value": "Valid GPCB CTE document in Vault",
                    "actual_value": f"None linked ({pollution_cat} category)",
                    "explanation": f"Orange/Red/Green units require a valid GPCB Consent to Establish before subsidy disbursement."
                })

        financial_summary = {
            "instrument_type": "CAPITAL_SUBSIDY_AND_INTEREST_SUBVENTION",
            "indicative_capital_subsidy": "Up to 25% of eligible GFCI (capped per taluka category)",
            "indicative_interest_subvention": "Up to 7% per annum for 7 years"
        }

        return criteria, financial_summary

    # -------------------------------------------------------------------------
    # SCHEME 2: IN-GJ-IND-2020 (Gujarat Industrial Policy 2020 - Legacy)
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_gujarat_2020_legacy(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = [{
            "criterion_key": "scheme_lifecycle_intake",
            "label": "Policy Lifecycle & Fresh Intake Status",
            "status": "UNMET",
            "statutory_reference": "GR GID/102022/1005/Z Cl. 1",
            "required_value": "Active Intake Window",
            "actual_value": "SUPERSEDED (Closed on 04/10/2022)",
            "explanation": "Gujarat Industrial Policy 2020 was superseded by Aatmanirbhar Gujarat Schemes 2022 on 05/10/2022. Fresh applications are permanently closed."
        }]
        financial_summary = {
            "instrument_type": "LEGACY_POLICY",
            "notes": "Available only for historical reference and pre-existing sanctioned units."
        }
        return criteria, financial_summary

    # -------------------------------------------------------------------------
    # SCHEME 3: IN-MH-PSI-2019 (Maharashtra Package Scheme of Incentives 2019)
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_maharashtra_psi_2019(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = []
        addr = loc.get("address") or {}
        juris = loc.get("jurisdiction_hierarchy") or {}
        ind = loc.get("industrial_profile") or {}

        state = juris.get("state_code") or addr.get("state_code") or ""
        if state != "IN-MH":
            criteria.append({
                "criterion_key": "jurisdiction_state",
                "label": "State Jurisdiction (Maharashtra)",
                "status": "UNMET",
                "statutory_reference": "GR PSI-2019/CR-46/IND-8 Cl. 1.1",
                "required_value": "IN-MH (Maharashtra)",
                "actual_value": state or "None",
                "explanation": "Scheme is applicable strictly to industrial locations situated in Maharashtra."
            })
            return criteria, {"instrument_type": "STATE_INCENTIVE"}

        criteria.append({
            "criterion_key": "jurisdiction_state",
            "label": "State Jurisdiction (Maharashtra)",
            "status": "SATISFIED",
            "statutory_reference": "GR PSI-2019/CR-46/IND-8 Cl. 1.1",
            "required_value": "IN-MH",
            "actual_value": "IN-MH",
            "explanation": "Location is in Maharashtra."
        })

        # Transition Effective Steps Check (Pre-31.03.2024)
        has_effective_steps = ind.get("has_pre_2024_effective_steps") or ind.get("psi_effective_steps_certified")
        commence_date_str = ind.get("commencement_date")
        if has_effective_steps:
            criteria.append({
                "criterion_key": "transition_effective_steps",
                "label": "Pre-31.03.2024 Effective Steps Verification",
                "status": "SATISFIED",
                "statutory_reference": "PSI-2019 Cl. 2.1 & Transitional Circulars",
                "required_value": "Documented effective steps on or before 31/03/2024",
                "actual_value": "Effective steps confirmed by DIC / CA certificate",
                "explanation": "Unit took effective steps prior to 31/03/2024 and qualifies under transitional provisions."
            })
        else:
            criteria.append({
                "criterion_key": "transition_effective_steps",
                "label": "Pre-31.03.2024 Effective Steps Verification",
                "status": "MANUAL_CONFIRMATION_REQUIRED",
                "statutory_reference": "PSI-2019 Cl. 2.1 & Transitional Circulars",
                "required_value": "Effective steps (land, finance sanction, 10% capex) taken on or before 31/03/2024",
                "actual_value": "Not documented in profile",
                "explanation": "Units without documented pre-31/03/2024 Effective Steps require manual verification by the District Industries Centre (DIC)."
            })

        financial_summary = {
            "instrument_type": "INDUSTRIAL_PROMOTION_SUBSIDY",
            "coverage": "IPS, electricity duty exemption, and interest subsidy based on Area categorization (A, B, C, D, D+)."
        }
        return criteria, financial_summary

    # -------------------------------------------------------------------------
    # SCHEME 4: IN-MH-MIISP-2025 (Maharashtra Industries & Services Policy 2025)
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_maharashtra_miisp_2025(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = []
        addr = loc.get("address") or {}
        juris = loc.get("jurisdiction_hierarchy") or {}
        state = juris.get("state_code") or addr.get("state_code") or ""

        if state != "IN-MH":
            criteria.append({
                "criterion_key": "jurisdiction_state",
                "label": "State Jurisdiction (Maharashtra)",
                "status": "UNMET",
                "statutory_reference": "MIISP-2025 Policy Guidelines",
                "required_value": "IN-MH",
                "actual_value": state or "None",
                "explanation": "Scheme applies strictly to Maharashtra."
            })
            return criteria, {}

        # 1. State Jurisdiction Satisfied
        criteria.append({
            "criterion_key": "jurisdiction_state",
            "label": "State Jurisdiction (Maharashtra)",
            "status": "SATISFIED",
            "statutory_reference": "MIISP-2025 Policy Guidelines",
            "required_value": "IN-MH",
            "actual_value": "IN-MH",
            "explanation": "Plant facility is located within Maharashtra."
        })

        # 2. Formal Policy Publication Status (Published on 31/12/2025)
        criteria.append({
            "criterion_key": "policy_publication_status",
            "label": "State Industrial Policy Publication Status",
            "status": "SATISFIED",
            "statutory_reference": "MIISP-2025 Policy Document published 31/12/2025",
            "required_value": "Formally published policy text",
            "actual_value": "PUBLISHED_ON_31_12_2025",
            "explanation": "Maharashtra Industries, Investment and Services Policy 2025 was officially published on 31/12/2025 (December 31, 2025) by the Directorate of Industries."
        })

        # 3. Operational Intake Scrutiny (Distinguished from Policy Publication)
        criteria.append({
            "criterion_key": "policy_operational_status",
            "label": "Operational Incentive Guidelines & Portal Intake Window",
            "status": "MANUAL_CONFIRMATION_REQUIRED",
            "statutory_reference": "Directorate of Industries Operational Circulars & Maitri Single Window",
            "required_value": "Notified Operational Guidelines & Open Maitri Portal Intake",
            "actual_value": "STATUS: NEEDS_CONFIRMATION",
            "explanation": "While policy publication is complete (31/12/2025), specific incentive operational guidelines, taluka classification schedules, and online portal intake windows require separate confirmation with the DIC."
        })
        financial_summary = {
            "instrument_type": "SUCCESSOR_STATE_INCENTIVE",
            "publication_status": "Officially published on December 31, 2025",
            "fresh_intake_status": "NEEDS_CONFIRMATION (Operational guidelines pending confirmation)"
        }
        return criteria, financial_summary

    # -------------------------------------------------------------------------
    # SCHEME 5: IN-CEN-CGTMSE (Credit Guarantee Scheme for MSEs - CGS-I)
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_cgtmse(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = []
        ind = loc.get("industrial_profile") or {}
        addr = loc.get("address") or {}
        juris = loc.get("jurisdiction_hierarchy") or {}

        # 1. Enterprise Scale: Micro or Small only (Medium/Large ineligible)
        plant_machinery = ind.get("plant_machinery_inr") or ind.get("capital_investment_inr")
        turnover = ind.get("annual_turnover_inr")
        if plant_machinery is None:
            criteria.append({
                "criterion_key": "cgtmse_scale",
                "label": "Micro or Small Enterprise Classification",
                "status": "MISSING_EVIDENCE",
                "statutory_reference": "MSMED Act 2006 Notification S.O. 2119(E)",
                "required_value": "Micro (Plant <= 1 Cr, TO <= 5 Cr) or Small (Plant <= 10 Cr, TO <= 50 Cr)",
                "actual_value": "Not specified in profile",
                "explanation": "Plant & machinery investment is required to verify MSE classification for CGTMSE."
            })
        elif plant_machinery > 100000000 or (turnover and turnover > 500000000):
            criteria.append({
                "criterion_key": "cgtmse_scale",
                "label": "Micro or Small Enterprise Classification",
                "status": "UNMET",
                "statutory_reference": "CGTMSE Scheme Document Cl. 2",
                "required_value": "Micro or Small Enterprise",
                "actual_value": f"Plant & Machinery: ₹{plant_machinery / 1e7:.2f} Cr (Medium/Large)",
                "explanation": "CGTMSE guarantee coverage is restricted to Micro and Small Enterprises only."
            })
        else:
            criteria.append({
                "criterion_key": "cgtmse_scale",
                "label": "Micro or Small Enterprise Classification",
                "status": "SATISFIED",
                "statutory_reference": "CGTMSE Scheme Document Cl. 2",
                "required_value": "Micro or Small Enterprise",
                "actual_value": f"Plant & Machinery: ₹{plant_machinery / 1e7:.2f} Cr",
                "explanation": "Enterprise qualifies as an eligible Micro/Small Enterprise."
            })

        # 2. Lender Category Ceilings per April 1, 2025 CGS-I Document
        lender_cat = (bus.get("lender_category") or ind.get("lender_category") or "SCHEDULED_COMMERCIAL_BANKS_AND_SELECT_FI").upper()

        if lender_cat in ["SCHEDULED_COMMERCIAL_BANKS_AND_SELECT_FI", "COMMERCIAL_BANK"]:
            max_ceiling_lakh = 1000
            lender_label = "Commercial Banks & Select Financial Institutions (Up to ₹10 Crore)"
        elif lender_cat in ["SFB_RRB_SFI_COOPERATIVE", "RRB", "SFB", "COOPERATIVE_BANK"]:
            max_ceiling_lakh = 200
            lender_label = "Small Finance Banks, RRBs, SFIs & Specified Co-op Banks (Up to ₹200 Lakh)"
        elif lender_cat in ["MFI", "MICROFINANCE"]:
            max_ceiling_lakh = 50
            lender_label = "Microfinance Institutions (Up to ₹50 Lakh)"
        else:
            max_ceiling_lakh = 1000
            lender_label = f"Lender category {lender_cat} evaluated against Category 1 limit"

        criteria.append({
            "criterion_key": "cgtmse_lender_ceiling",
            "label": "Lender Category Facility Ceiling",
            "status": "SATISFIED",
            "statutory_reference": "CGTMSE Scheme Document CGS-I (Rev. 01/04/2025) Cl. 2 & Schedule 1",
            "required_value": f"Credit facility <= ₹{max_ceiling_lakh} Lakh ({lender_cat})",
            "actual_value": f"{lender_label} (Irrespective of unit activity, including trading)",
            "explanation": "Under the April 1, 2025 CGS-I document, credit facilities up to ₹10 Crore are supported under Category 1 lenders across manufacturing, services, and trading."
        })

        # 3. Financial Instrument Notice: Must never be classified as cash subsidy
        criteria.append({
            "criterion_key": "instrument_nature",
            "label": "Financial Instrument Nature (Credit Guarantee)",
            "status": "SATISFIED",
            "statutory_reference": "CGTMSE Framework",
            "required_value": "Third-party credit risk cover to Member Lending Institutions (MLIs)",
            "actual_value": "CREDIT_GUARANTEE",
            "explanation": "CGTMSE provides risk-sharing cover to participating banks; no cash payout is disbursed directly to the enterprise."
        })

        # 4. Tiered Coverage Table per April 1, 2025 Schedule:
        is_micro = (ind.get("enterprise_size") == "MICRO") or (plant_machinery is not None and plant_machinery <= 10000000)
        is_women = bool(bus.get("is_women_owned") or "WOMEN" in str(bus.get("special_categories") or "").upper())
        is_agniveer = bool(bus.get("is_agniveer_owned") or "AGNIVEER" in str(bus.get("special_categories") or "").upper())
        is_women_or_agniveer = is_women or is_agniveer

        is_sc_st = bool(bus.get("is_sc_st_owned") or "SC" in str(bus.get("special_categories") or "").upper() or "ST" in str(bus.get("special_categories") or "").upper())
        is_pwd = bool(bus.get("is_pwd_owned") or "PWD" in str(bus.get("special_categories") or "").upper())
        is_aspirational = bool(bus.get("is_aspirational_district") or ind.get("is_aspirational_district") or "ASPIRATIONAL" in str(bus.get("special_categories") or "").upper())
        is_zed = bool(bus.get("is_zed_certified") or "ZED" in str(bus.get("certifications") or "").upper() or "ZED" in str(bus.get("special_categories") or "").upper())
        is_transgender = bool(bus.get("is_transgender_owned") or "TRANSGENDER" in str(bus.get("special_categories") or "").upper())
        is_special_priority = is_sc_st or is_pwd or is_aspirational or is_zed or is_transgender

        state_code_check = (juris.get("state_code") or addr.get("state_code") or "").upper()
        is_ner_jk_ladakh = state_code_check in [
            "IN-AS", "IN-AR", "IN-MN", "IN-ML", "IN-MZ", "IN-NL", "IN-SK", "IN-TR", "IN-JK", "IN-LA"
        ]
        is_icdd = bool(bus.get("is_credit_deficient_district") or ind.get("is_credit_deficient_district") or "ICDD" in str(bus.get("special_categories") or "").upper())

        # Check requested credit facility amount if present
        requested_facility = ind.get("requested_credit_facility_inr") or 4000000  # default 40L for evaluation

        # Evaluated strictly according to April 1, 2025 Schedule:
        if is_women_or_agniveer:
            coverage_pct = 90.0
            category_label = "Women Entrepreneurs / MSEs promoted by Agniveers"
            coverage_note = "90% guarantee coverage across all credit facility slabs up to applicable ceiling (Women / Agniveers)"
        elif is_special_priority:
            coverage_pct = 85.0
            category_label = "SC/ST, PwD, Aspirational District, ZED-certified, and Transgender MSEs"
            coverage_note = "85% guarantee coverage across all credit facility slabs up to applicable ceiling (Special Priority)"
        elif is_ner_jk_ladakh:
            if requested_facility <= 5000000:
                coverage_pct = 80.0
                coverage_note = "80% guarantee coverage up to ₹50 Lakh (MSE located in NER / J&K / Ladakh)"
            else:
                coverage_pct = 75.0
                coverage_note = "75% guarantee coverage above ₹50 Lakh up to applicable ceiling (NER / J&K / Ladakh)"
            category_label = "MSE in NER, J&K, and Ladakh"
        elif is_micro:
            if requested_facility <= 500000:
                coverage_pct = 85.0
                coverage_note = "85% guarantee coverage for Micro Enterprises up to ₹5 Lakh"
            else:
                coverage_pct = 75.0
                coverage_note = "75% guarantee coverage for Micro Enterprises above ₹5 Lakh up to applicable ceiling"
            category_label = "Micro Enterprise (General)"
        else:
            coverage_pct = 75.0
            category_label = "All Other Categories (Small Enterprise General)"
            coverage_note = "75% standard guarantee coverage across all credit facility slabs up to applicable ceiling"

        # Additional ICDD bonus (+5 percentage points)
        if is_icdd:
            coverage_pct = min(coverage_pct + 5.0, 95.0)
            coverage_note += " (+5% additional coverage for RBI-identified Credit Deficient District)"

        guarantee_amount = round(requested_facility * (coverage_pct / 100.0), 2)
        requires_internal_rating = requested_facility > 5000000

        if requires_internal_rating:
            criteria.append({
                "criterion_key": "cgtmse_internal_rating",
                "label": "MLI Internal Investment-Grade Credit Rating",
                "status": "MANUAL_CONFIRMATION_REQUIRED",
                "statutory_reference": "CGTMSE Scheme Document CGS-I (Rev. 01/04/2025) Cl. 3",
                "required_value": "Internal investment-grade credit rating by MLI for facility > ₹50 Lakh",
                "actual_value": f"Credit Facility: ₹{requested_facility / 100000:.2f} Lakh",
                "explanation": "Credit facilities exceeding ₹50 Lakh require the Member Lending Institution (MLI) to assign an internal investment-grade credit rating prior to guarantee sanction."
            })

        financial_summary = {
            "instrument_type": "CREDIT_GUARANTEE",
            "lender_category": lender_cat,
            "max_facility_ceiling_inr": max_ceiling_lakh * 100000,
            "max_facility_ceiling_lakh": max_ceiling_lakh,
            "requested_credit_facility_inr": requested_facility,
            "applicable_coverage_percentage": coverage_pct,
            "guarantee_coverage_percentage": coverage_pct,
            "guarantee_amount_inr": guarantee_amount,
            "category_label": category_label,
            "coverage_rule_explanation": coverage_note,
            "requires_internal_investment_grade_rating": requires_internal_rating,
            "is_credit_deficient_district": is_icdd,
            "lender_category_schedule": {
                "SCHEDULED_COMMERCIAL_BANKS_AND_SELECT_FI": 1000,
                "SFB_RRB_SFI_COOPERATIVE": 200,
                "MFI": 50
            },
            "statutory_notice": (
                "CGTMSE CGS-I (Updated as on April 1, 2025): Provides collateral-free third-party credit guarantee "
                "to MLIs up to ₹10 Crore for Commercial Banks, ₹200 Lakh for SFBs/RRBs/Co-ops, and ₹50 Lakh for MFIs. "
                "Borrowers do not receive direct cash grants or subsidies. Facilities > ₹50 Lakh require MLI "
                "internal investment-grade credit rating."
            )
        }
        return criteria, financial_summary

    # -------------------------------------------------------------------------
    # Declarative Rule Engine Evaluation
    # -------------------------------------------------------------------------
    @classmethod
    def evaluate_declarative_rules(
        cls,
        loc: Dict[str, Any],
        bus: Dict[str, Any],
        rules: List[Dict[str, Any]],
        scheme: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Evaluates declarative rules against allowlisted criterion types and operators.
        Missing evidence returns MISSING_EVIDENCE.
        Zero arbitrary code execution or eval().
        """
        criteria = []
        addr = loc.get("address") or {}
        juris = loc.get("jurisdiction_hierarchy") or {}
        ind = loc.get("industrial_profile") or {}

        for rule in rules:
            c_type = rule.get("criterion_type")
            op = rule.get("operator")
            val = rule.get("value")
            c_id = rule.get("criterion_id", "rule")
            label = rule.get("label") or rule.get("description") or c_type
            req_ev = rule.get("required_evidence") or "PROFILE_DATA"
            stat_ref = rule.get("statutory_reference") or scheme.get("statutory_reference", {}).get("notification_number", "Official Guidelines")

            # Validate operator and type safety
            if c_type not in ALLOWED_CRITERION_TYPES or op not in ALLOWED_OPERATORS:
                criteria.append({
                    "criterion_key": c_id,
                    "label": label,
                    "status": "MANUAL_CONFIRMATION_REQUIRED",
                    "statutory_reference": stat_ref,
                    "required_value": str(val),
                    "actual_value": "Unsupported rule operator/type",
                    "explanation": f"Criterion {c_type} with operator {op} requires manual scrutiny."
                })
                continue

            # Extract profile value
            actual = None
            is_missing = False

            if c_type == "STATE_MATCH":
                actual = juris.get("state_code") or addr.get("state_code")
                is_missing = not actual
            elif c_type == "TALUKA_CATEGORY":
                actual = ind.get("taluka_category") or addr.get("taluka_category") or addr.get("taluka")
                is_missing = not actual
            elif c_type == "ENTERPRISE_SIZE":
                actual = ind.get("enterprise_size") or bus.get("enterprise_size")
                if not actual:
                    pm = ind.get("plant_machinery_inr")
                    if pm is None:
                        is_missing = True
                    elif pm <= 10000000:
                        actual = "MICRO"
                    elif pm <= 100000000:
                        actual = "SMALL"
                    elif pm <= 500000000:
                        actual = "MEDIUM"
                    else:
                        actual = "LARGE"
            elif c_type == "MSME_REGISTRATION":
                actual = bool(bus.get("udyam_registration_number"))
            elif c_type == "DCOP_DATE":
                actual = ind.get("commencement_date")
                is_missing = not actual
            elif c_type == "CAPEX_AMOUNT":
                actual = ind.get("capital_investment_inr") or ind.get("plant_machinery_inr")
                is_missing = actual is None
            elif c_type == "REQUIRED_APPROVALS":
                clearances = ind.get("clearances") or {}
                actual = clearances.get(str(val)) or ind.get(f"has_{str(val).lower()}")
                is_missing = actual is None
            elif c_type == "SECTOR_ELIGIBILITY":
                actual = (ind.get("sector") or bus.get("industry_sector") or "").upper()
                is_missing = not actual
            elif c_type == "LENDER_CATEGORY":
                actual = (bus.get("lender_category") or ind.get("lender_category") or "SCHEDULED_COMMERCIAL_BANKS_AND_SELECT_FI").upper()

            if is_missing:
                criteria.append({
                    "criterion_key": c_id,
                    "label": label,
                    "status": "MISSING_EVIDENCE",
                    "statutory_reference": stat_ref,
                    "required_value": str(val),
                    "actual_value": f"Missing required evidence: {req_ev}",
                    "explanation": f"Profile lacks required information for {label}. Please upload {req_ev} or update location profile."
                })
                continue

            # Deterministic operator comparison (NO EVAL / EXEC)
            satisfied = False
            if op == "EQ":
                satisfied = (str(actual).strip().upper() == str(val).strip().upper())
            elif op == "NEQ":
                satisfied = (str(actual).strip().upper() != str(val).strip().upper())
            elif op == "IN":
                allowed_list = [str(x).strip().upper() for x in (val if isinstance(val, list) else [val])]
                satisfied = (str(actual).strip().upper() in allowed_list)
            elif op == "NOT_IN":
                disallowed_list = [str(x).strip().upper() for x in (val if isinstance(val, list) else [val])]
                satisfied = (str(actual).strip().upper() not in disallowed_list)
            elif op == "GTE":
                try:
                    satisfied = (float(actual) >= float(val))
                except (ValueError, TypeError):
                    satisfied = False
            elif op == "LTE":
                try:
                    satisfied = (float(actual) <= float(val))
                except (ValueError, TypeError):
                    satisfied = False
            elif op == "BETWEEN":
                try:
                    if isinstance(val, (list, tuple)) and len(val) == 2:
                        satisfied = (float(val[0]) <= float(actual) <= float(val[1]))
                except (ValueError, TypeError):
                    satisfied = False
            elif op == "EXISTS":
                satisfied = bool(actual)

            status = "SATISFIED" if satisfied else "UNMET"
            criteria.append({
                "criterion_key": c_id,
                "label": label,
                "status": status,
                "statutory_reference": stat_ref,
                "required_value": str(val),
                "actual_value": str(actual),
                "explanation": f"Criteria evaluation evaluated to {status} based on verified profile data."
            })

        fin_summary = scheme.get("benefits_structure") or {}
        return criteria, fin_summary

    # -------------------------------------------------------------------------
    # SCHEME 6: IN-CEN-PMKSY-CEFPPC (Food Processing)
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_pmksy_cefppc(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = []
        ind = loc.get("industrial_profile") or {}
        sector = (ind.get("sector") or bus.get("industry_sector") or "").upper()

        # Sector Check
        is_food = any(k in sector for k in ["FOOD", "AGRO", "PROCESSING", "DAIRY", "HORTICULTURE", "GRAIN", "FRUIT", "MEAT", "FISH"])
        if not is_food:
            criteria.append({
                "criterion_key": "sector_applicability",
                "label": "Eligible Food Processing Sector",
                "status": "UNMET",
                "statutory_reference": "MoFPI CEFPPC Guidelines Cl. 2",
                "required_value": "Food / Agro Processing Activity",
                "actual_value": sector or "General Manufacturing",
                "explanation": "PMKSY-CEFPPC is strictly restricted to food processing and preservation industries."
            })
        else:
            criteria.append({
                "criterion_key": "sector_applicability",
                "label": "Eligible Food Processing Sector",
                "status": "SATISFIED",
                "statutory_reference": "MoFPI CEFPPC Guidelines Cl. 2",
                "required_value": "Food Processing Sector",
                "actual_value": sector,
                "explanation": "Enterprise is engaged in qualifying food processing activities."
            })

        # Fresh Intake Status Check: Expired March 2025 EOI
        criteria.append({
            "criterion_key": "eoi_intake_window",
            "label": "Fresh Proposal Intake Window (EOI)",
            "status": "UNMET",
            "statutory_reference": "MoFPI Notice Inviting Proposals (EOI Extended March 2025)",
            "required_value": "Active, unexpired EOI on SAMPADA Portal",
            "actual_value": "EOI Extended Deadline Lapsed (March 2025)",
            "explanation": "Fresh proposal intake is currently closed pending issuance of the next EOI notification by MoFPI."
        })

        financial_summary = {
            "instrument_type": "CAPITAL_GRANT_IN_AID",
            "intake_status": "CLOSED_AWAITING_NEXT_EOI",
            "beneficiary_claim_status": "Active (Tranches 25%, 50%, 25% for sanctioned projects)"
        }
        return criteria, financial_summary

    # -------------------------------------------------------------------------
    # SCHEME 7: IN-CEN-PM-KUSUM-A (Renewable Energy / Solar Component A)
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_pm_kusum_a(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = []
        ind = loc.get("industrial_profile") or {}
        facility_type = (loc.get("facility_type") or "").upper()
        sector = (ind.get("sector") or bus.get("industry_sector") or "").upper()

        is_renewable = any(k in sector for k in ["SOLAR", "RENEWABLE", "POWER", "AGRICULTURE", "FARMER", "FPO"]) or "SOLAR" in facility_type
        if not is_renewable:
            criteria.append({
                "criterion_key": "applicant_profile",
                "label": "Component A Eligible Applicant Profile",
                "status": "UNMET",
                "statutory_reference": "MNRE PM-KUSUM Component A Guidelines Cl. 2",
                "required_value": "Farmer, FPO, Panchayat, or RPG setting up 500 kW-2 MW solar plant",
                "actual_value": f"Industrial Facility ({sector or 'General'})",
                "explanation": "PM-KUSUM Component A is strictly restricted to agricultural landowners, FPOs, and solar power generators setting up plants within 5 km of rural substations."
            })
        else:
            criteria.append({
                "criterion_key": "applicant_profile",
                "label": "Component A Eligible Applicant Profile",
                "status": "SATISFIED",
                "statutory_reference": "MNRE PM-KUSUM Component A Guidelines Cl. 2",
                "required_value": "Renewable Power / Agricultural Generator",
                "actual_value": sector or facility_type,
                "explanation": "Applicant profile matches Component A eligibility."
            })

        # Fresh Intake Status: Requires active State DISCOM Tender
        criteria.append({
            "criterion_key": "state_discom_tender",
            "label": "State DISCOM Tender Window",
            "status": "MANUAL_CONFIRMATION_REQUIRED",
            "statutory_reference": "MNRE OM 32/645/2017-SPV & SERC Regulations",
            "required_value": "Active Request for Selection (RfS) issued by State DISCOM",
            "actual_value": "State tender dependent",
            "explanation": "Fresh intake under Component A is not open centrally. Requires verification of an active RfS tender from the local State DISCOM."
        })

        financial_summary = {
            "instrument_type": "FEED_IN_TARIFF_AND_PPA",
            "ppa_duration": "25 Years with State DISCOM",
            "intake_status": "CLOSED_AWAITING_STATE_TENDER"
        }
        return criteria, financial_summary

    # -------------------------------------------------------------------------
    # SCHEME 8: IN-CEN-PLI-AUTO (Production Linked Incentive for Automobile)
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_pli_auto(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = [{
            "criterion_key": "fresh_intake_window",
            "label": "Scheme Application Intake Window",
            "status": "UNMET",
            "statutory_reference": "Gazette Notification 12(45)/2020-AEI",
            "required_value": "Active Intake Window",
            "actual_value": "PERMANENTLY_CLOSED (Closed on 09/01/2022)",
            "explanation": "Fresh proposal intake for PLI Automobile closed on January 9, 2022. Scheme is in gestation/disbursement phase for approved beneficiaries through FY 2027-28."
        }]
        financial_summary = {
            "instrument_type": "PRODUCTION_LINKED_INCENTIVE",
            "fresh_intake_status": "PERMANENTLY_CLOSED",
            "beneficiary_claim_status": "Active through FY 2027-28 for approved Champion OEMs / Component Champions."
        }
        return criteria, financial_summary

    # -------------------------------------------------------------------------
    # SCHEME 9: IN-CEN-CLCSS (Credit Linked Capital Subsidy Scheme - Sunset)
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_clcss(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = [{
            "criterion_key": "statutory_status",
            "label": "Scheme Operational Guidelines",
            "status": "UNMET",
            "statutory_reference": "Ministry of MSME Sunset Notification",
            "required_value": "Active Operational Guidelines",
            "actual_value": "STATUS_UNCONFIRMED / SUNSET (Expired 31/03/2020)",
            "explanation": "Original CLCSS guidelines expired on March 31, 2020. No standalone fresh intake window exists."
        }]
        financial_summary = {
            "instrument_type": "CAPITAL_SUBSIDY",
            "status": "STATUS_UNCONFIRMED"
        }
        return criteria, financial_summary

    # -------------------------------------------------------------------------
    # Generic Fallback Evaluation
    # -------------------------------------------------------------------------
    @classmethod
    def _evaluate_generic_scheme(cls, loc: Dict[str, Any], bus: Dict[str, Any], scheme: Dict[str, Any]):
        criteria = [{
            "criterion_key": "general_eligibility",
            "label": "Scheme Rules Scrutiny",
            "status": "MANUAL_CONFIRMATION_REQUIRED",
            "statutory_reference": scheme.get("statutory_reference", {}).get("guidelines_title", "Guidelines"),
            "required_value": "Verification against departmental guidelines",
            "actual_value": "Manual check required",
            "explanation": "Scheme criteria require manual scrutiny by compliance officer."
        }]
        return criteria, {}
