"""
Django management command to seed authoritative Government Schemes and Incentives.
Strictly adheres to REV 4 specifications and verified statutory sources.
"""

from django.core.management.base import BaseCommand
from apps.schemes.repository import SchemeRepository

SEED_SCHEMES = [
    {
        "scheme_code": "IN-GJ-AATMA-2022",
        "name": "Aatmanirbhar Gujarat Schemes 2022 for Assistance to Industries (MSMEs)",
        "short_name": "Aatmanirbhar Gujarat MSME 2022",
        "description": "Comprehensive fiscal package providing capital investment subsidies and interest subvention for Micro, Small, and Medium Enterprises setting up manufacturing units in Gujarat.",
        "authority_level": "STATE",
        "state_code": "IN-GJ",
        "department_code": "IN-GJ-IND",
        "financial_instrument_type": "CAPITAL_SUBSIDY",
        "scheme_rule_version": "2025.1",
        "scheme_lifecycle_status": "ACTIVE",
        "fresh_intake_status": "OPEN",
        "intake_open_date": "2022-10-05",
        "intake_close_date": "2027-10-04",
        "implementation_period": {
            "start_date": "2022-10-05",
            "end_date": "2027-10-04",
            "notes": "Operative for 5 years from notification date. Units must commence DCOP within policy period."
        },
        "beneficiary_claim_period": {
            "is_active": True,
            "valid_until": "2034-10-04",
            "claim_frequency": "ANNUAL",
            "notes": "Interest subvention disbursed annually for up to 7 years post-DCOP."
        },
        "operating_or_ppa_period": {
            "is_applicable": False,
            "duration_years": None,
            "notes": "Standard manufacturing policy; no utility PPA."
        },
        "successor_scheme_code": None,
        "verification_status": "NEEDS_CONFIRMATION",
        "statutory_reference": {
            "notification_number": "GID/102022/1005/Z",
            "issuing_authority": "Industries and Mines Department, Government of Gujarat",
            "issuing_date": "2022-10-05",
            "effective_from": "2022-10-05",
            "effective_to": "2027-10-04",
            "relevant_clause": "Clause 4 & Annexure 1 (Taluka Schedule)",
            "guidelines_title": "Aatmanirbhar Gujarat Schemes for Assistance to Industries",
            "source_url": "https://ic.gujarat.gov.in",
            "last_verified_date": "2026-11-15",
            "verification_confidence": "NEEDS_CONFIRMATION"
        },
        "eligibility_rules": {
            "state_code": "IN-GJ",
            "enterprise_scales": ["MICRO", "SMALL", "MEDIUM"],
            "max_plant_machinery_inr": 500000000,
            "max_turnover_inr": 2500000000,
            "taluka_categories": ["CATEGORY_1", "CATEGORY_2", "CATEGORY_3"],
            "allowed_legal_structures": ["PROPRIETORSHIP", "PARTNERSHIP", "LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED"],
            "required_clearances": ["GPCB_CTE_OR_WHITE_EXEMPTION"]
        },
        "benefits_structure": {
            "capital_subsidy": "Up to 25% of eligible Gross Fixed Capital Investment (GFCI) capped by taluka category",
            "interest_subvention": "Up to 7% per annum for 7 years on term loan",
            "electricity_duty_exemption": "100% exemption for 5 years"
        }
    },
    {
        "scheme_code": "IN-GJ-IND-2020",
        "name": "Gujarat Industrial Policy 2020 (Legacy)",
        "short_name": "Gujarat Industrial Policy 2020",
        "description": "Legacy industrial promotion framework of Gujarat, succeeded on October 5, 2022 by the Aatmanirbhar Gujarat Schemes 2022.",
        "authority_level": "STATE",
        "state_code": "IN-GJ",
        "department_code": "IN-GJ-IND",
        "financial_instrument_type": "CAPITAL_SUBSIDY",
        "scheme_rule_version": "1.0",
        "scheme_lifecycle_status": "SUPERSEDED",
        "fresh_intake_status": "PERMANENTLY_CLOSED",
        "intake_open_date": "2020-09-01",
        "intake_close_date": "2022-10-04",
        "implementation_period": {
            "start_date": "2020-09-01",
            "end_date": "2022-10-04",
            "notes": "Succeeded by Aatmanirbhar Gujarat Schemes 2022. Ongoing claims honored under transition rules."
        },
        "beneficiary_claim_period": {
            "is_active": True,
            "valid_until": "2029-10-04",
            "claim_frequency": "ANNUAL",
            "notes": "Active exclusively for already approved legacy units with valid Eligibility Certificates."
        },
        "operating_or_ppa_period": {
            "is_applicable": False,
            "duration_years": None,
            "notes": "Standard industrial policy."
        },
        "successor_scheme_code": "IN-GJ-AATMA-2022",
        "statutory_reference": {
            "notification_number": "GIP-102020-330689-Z",
            "issuing_authority": "Industries and Mines Department, Government of Gujarat",
            "issuing_date": "2020-09-01",
            "effective_from": "2020-09-01",
            "effective_to": "2022-10-04",
            "relevant_clause": "Clause 3",
            "guidelines_title": "Gujarat Industrial Policy 2020",
            "source_url": "https://ic.gujarat.gov.in",
            "last_verified_date": "2026-11-15",
            "verification_confidence": "VERIFIED"
        },
        "eligibility_rules": {
            "state_code": "IN-GJ",
            "intake_blocked": True
        },
        "benefits_structure": {
            "notice": "Fresh intake closed. Governed by successor policy IN-GJ-AATMA-2022."
        }
    },
    {
        "scheme_code": "IN-MH-PSI-2019",
        "name": "Package Scheme of Incentives 2019 (Maharashtra)",
        "short_name": "Maharashtra PSI 2019",
        "description": "State industrial promotion scheme offering Industrial Promotion Subsidy (IPS), electricity duty exemption, and interest subvention based on taluka area categories (A, B, C, D, D+).",
        "authority_level": "STATE",
        "state_code": "IN-MH",
        "department_code": "IN-MH-IND",
        "financial_instrument_type": "CAPITAL_SUBSIDY",
        "scheme_rule_version": "2024.1",
        "scheme_lifecycle_status": "SUPERSEDED",
        "fresh_intake_status": "TRANSITIONAL_LEGACY_ONLY",
        "intake_open_date": "2019-04-01",
        "intake_close_date": "2024-03-31",
        "implementation_period": {
            "start_date": "2019-04-01",
            "end_date": "2024-03-31",
            "notes": "Operative window ended 31/03/2024. Units with pre-31/03/2024 effective steps qualify under transitional rules."
        },
        "beneficiary_claim_period": {
            "is_active": True,
            "valid_until": "2034-03-31",
            "claim_frequency": "ANNUAL",
            "notes": "Active for Eligibility Certificate (EC) holders for 7 to 10+ years depending on Taluka category."
        },
        "operating_or_ppa_period": {
            "is_applicable": False,
            "duration_years": None,
            "notes": "Standard manufacturing policy."
        },
        "successor_scheme_code": "IN-MH-MIISP-2025",
        "statutory_reference": {
            "notification_number": "PSI-2019/CR-46/IND-8",
            "issuing_authority": "Industries, Energy and Labour Department, Government of Maharashtra",
            "issuing_date": "2019-09-16",
            "effective_from": "2019-04-01",
            "effective_to": "2024-03-31",
            "relevant_clause": "Clause 2.1 & 3.2 (Effective Steps & Gestation)",
            "guidelines_title": "Package Scheme of Incentives 2019",
            "source_url": "https://di.maharashtra.gov.in",
            "last_verified_date": "2026-11-15",
            "verification_confidence": "PARTIALLY_VERIFIED"
        },
        "eligibility_rules": {
            "state_code": "IN-MH",
            "requires_pre_2024_effective_steps": True,
            "area_categories": ["AREA_B", "AREA_C", "AREA_D", "AREA_D_PLUS", "NO_INDUSTRY_DISTRICT"]
        },
        "benefits_structure": {
            "ips_percentage": "Up to 80% of eligible fixed capital investment via SGST reimbursement",
            "interest_subvention": "5% per annum for MSMEs in backward areas",
            "electricity_duty_exemption": "100% exemption for 7 to 10 years"
        }
    },
    {
        "scheme_code": "IN-MH-MIISP-2025",
        "name": "Maharashtra Industries, Investment and Services Policy 2025",
        "short_name": "Maharashtra Policy 2025 (MIISP)",
        "description": "Successor industrial framework officially published on December 31, 2025 by the Directorate of Industries, Government of Maharashtra to succeed PSI-2019.",
        "authority_level": "STATE",
        "state_code": "IN-MH",
        "department_code": "IN-MH-IND",
        "financial_instrument_type": "CAPITAL_SUBSIDY",
        "scheme_rule_version": "2025.1",
        "scheme_lifecycle_status": "ACTIVE",
        "fresh_intake_status": "NEEDS_CONFIRMATION",
        "intake_open_date": None,
        "intake_close_date": None,
        "implementation_period": {
            "start_date": "2025-04-01",
            "end_date": "2030-03-31",
            "notes": "Officially published on December 31, 2025. Operational intake guidelines and online portal intake windows pending confirmation."
        },
        "beneficiary_claim_period": {
            "is_active": False,
            "valid_until": "2035-03-31",
            "claim_frequency": "ANNUAL",
            "notes": "Not yet operational for claims."
        },
        "operating_or_ppa_period": {
            "is_applicable": False,
            "duration_years": None,
            "notes": "Standard industrial policy."
        },
        "successor_scheme_code": None,
        "statutory_reference": {
            "notification_number": "MIISP-2025 Policy Notification",
            "issuing_authority": "Directorate of Industries, Government of Maharashtra",
            "issuing_date": "2025-12-31",
            "effective_from": "2025-04-01",
            "effective_to": "2030-03-31",
            "relevant_clause": "Full Policy Text",
            "guidelines_title": "Maharashtra Industries, Investment and Services Policy 2025",
            "source_url": "https://industry.maharashtra.gov.in/index.php/en/services/policies/maharashtra-industries-investment-services-policy-2025",
            "last_verified_date": "2026-11-15",
            "verification_confidence": "PARTIALLY_VERIFIED"
        },
        "eligibility_rules": {
            "state_code": "IN-MH",
            "status_unconfirmed": True
        },
        "benefits_structure": {
            "notice": "Policy officially published on 31/12/2025. Operational scheme guidelines, taluka schedules, and intake portal opening require separate confirmation."
        }
    },
    {
        "scheme_code": "IN-CEN-CGTMSE",
        "name": "Credit Guarantee Scheme for Micro and Small Enterprises (CGS-I)",
        "short_name": "CGTMSE Credit Guarantee",
        "description": "Collateral-free credit guarantee coverage extended to Member Lending Institutions (MLIs) under Credit Guarantee Scheme-I (updated as on April 1, 2025) to enable credit facilities for Micro and Small Enterprises.",
        "authority_level": "CENTRAL",
        "state_code": "IN-ALL",
        "department_code": "CEN-MSME",
        "financial_instrument_type": "CREDIT_GUARANTEE",
        "scheme_rule_version": "2025.1",
        "scheme_lifecycle_status": "ACTIVE",
        "fresh_intake_status": "OPEN",
        "intake_open_date": "2000-08-01",
        "intake_close_date": None,
        "implementation_period": {
            "start_date": "2000-08-01",
            "end_date": "Ongoing",
            "notes": "Standing central trust framework. Revamped CGS-I updated as on April 1, 2025."
        },
        "beneficiary_claim_period": {
            "is_active": True,
            "valid_until": "Ongoing",
            "claim_frequency": "MILESTONE_BASED",
            "notes": "Claims settled directly between MLI bank branches and CGTMSE upon default."
        },
        "operating_or_ppa_period": {
            "is_applicable": False,
            "duration_years": None,
            "notes": "Credit facility guarantee."
        },
        "successor_scheme_code": None,
        "statutory_reference": {
            "notification_number": "CGTMSE - Scheme Document CGS I (Updated as on Apr 1, 2025)",
            "issuing_authority": "Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE)",
            "issuing_date": "2025-04-01",
            "effective_from": "2025-04-01",
            "effective_to": "Ongoing",
            "relevant_clause": "Clause 2, 7 & Schedule 1 (Ceilings and Guarantee Coverage)",
            "guidelines_title": "Credit Guarantee Scheme for Micro and Small Enterprises (CGS-I)",
            "source_url": "https://www.cgtmse.in/Default/ViewFile/?id=1743176302611_CGTMSE+-+Scheme+Document+CGS+I_updated+as+on+Apr+1+2025.pdf&path=Page",
            "last_verified_date": "2026-11-15",
            "verification_confidence": "VERIFIED"
        },
        "facility_ceilings_by_lender": {
            "SCHEDULED_COMMERCIAL_BANKS_AND_SELECT_FI": {
                "max_facility_lakh": 1000,
                "description": "Public-sector banks, private-sector banks, foreign banks and select financial institutions: up to ₹10 Crore (₹1000 Lakh) per borrower irrespective of unit activity (including trading)."
            },
            "SFB_RRB_SFI_COOPERATIVE": {
                "max_facility_lakh": 200,
                "description": "Small Finance Banks, Regional Rural Banks, State Financial Institutions and specified cooperative banks: up to ₹200 Lakh (₹2 Crore) per borrower."
            },
            "MFI": {
                "max_facility_lakh": 50,
                "description": "Microfinance Institutions: up to ₹50 Lakh per borrower."
            }
        },
        "guarantee_coverage_table": {
            "women_and_agniveer": {
                "coverage_percentage": 90.0,
                "slabs": "Up to ₹5L: 90% | Above ₹5-50L: 90% | Above ₹50L-₹10Cr: 90%",
                "applicable_categories": ["WOMEN_OWNED_GE_51", "AGNIVEER"],
                "notes": "Women entrepreneurs (>=51% stake) and MSEs promoted by Agniveers: 90% across all slabs."
            },
            "sc_st_pwd_aspirational_zed_transgender": {
                "coverage_percentage": 85.0,
                "slabs": "Up to ₹5L: 85% | Above ₹5-50L: 85% | Above ₹50L-₹10Cr: 85%",
                "applicable_categories": ["SC_ST", "PWD", "ASPIRATIONAL_DISTRICT", "ZED_CERTIFIED", "TRANSGENDER"],
                "notes": "SC/ST, PwD, Aspirational District, ZED-certified and transgender categories: 85% across all slabs."
            },
            "ner_j_k_ladakh": {
                "coverage_percentage": "80% (up to ₹50L) / 75% (> ₹50L)",
                "slabs": "Up to ₹5L: 80% | Above ₹5-50L: 80% | Above ₹50L-₹10Cr: 75%",
                "notes": "MSEs situated in NER (incl. Sikkim), UT of J&K, UT of Ladakh: 80% up to ₹50 Lakh, 75% above ₹50 Lakh."
            },
            "micro_enterprises": {
                "coverage_percentage": "85% (up to ₹5L) / 75% (> ₹5L)",
                "slabs": "Up to ₹5L: 85% | Above ₹5-50L: 75% | Above ₹50L-₹10Cr: 75%",
                "notes": "Micro enterprises: 85% for credit facility up to ₹5 Lakh, 75% above ₹5 Lakh."
            },
            "all_other_categories": {
                "coverage_percentage": 75.0,
                "slabs": "Up to ₹5L: 75% | Above ₹5-50L: 75% | Above ₹50L-₹10Cr: 75%",
                "notes": "All other categories (e.g. Small Enterprises general): 75% across all slabs."
            },
            "credit_deficient_districts_icdd": {
                "bonus_percentage": 5.0,
                "notes": "Eligible MSEs in RBI-identified Credit Deficient Districts receive an additional 5 percentage points over applicable coverage."
            }
        },
        "eligibility_rules": {
            "enterprise_scales": ["MICRO", "SMALL"],
            "eligible_sectors": ["MANUFACTURING", "SERVICES", "TRADING"],
            "financial_instrument": "CREDIT_GUARANTEE"
        },
        "benefits_structure": {
            "summary": "Collateral-free credit guarantee up to ₹10 Crore depending on lender category and borrower segment.",
            "instrument_classification": "CREDIT_GUARANTEE (Not a cash subsidy or grant)",
            "lender_category_ceilings": "Commercial Banks/FIs: ₹10 Cr; SFBs/RRBs/Co-ops: ₹2 Cr; MFIs: ₹50 Lakh",
            "coverage_slabs": "Women/Agniveers: 90% across all slabs; SC/ST/PwD/ZED/Aspirational/Transgender: 85% across all slabs; NER/J&K/Ladakh: 80% (<=50L) / 75% (>50L); Micro: 85% (<=5L) / 75% (>5L); Other: 75%; ICDD: +5% additional coverage.",
            "internal_rating_condition": "Facilities above ₹50 Lakh require MLI internal investment-grade credit rating."
        }
    },
    {
        "scheme_code": "IN-CEN-PMKSY-CEFPPC",
        "name": "PMKSY — Creation/Expansion of Food Processing & Preservation Capacities",
        "short_name": "PMKSY CEFPPC (Food Processing)",
        "description": "Capital grant-in-aid assistance for establishing modern food processing units and expanding existing processing capacities to reduce post-harvest agricultural losses.",
        "authority_level": "CENTRAL",
        "state_code": "IN-ALL",
        "department_code": "CEN-MOFPI",
        "financial_instrument_type": "CAPITAL_SUBSIDY",
        "scheme_rule_version": "2025.1",
        "scheme_lifecycle_status": "ACTIVE",
        "fresh_intake_status": "CLOSED_AWAITING_NEXT_EOI",
        "intake_open_date": "2025-01-15",
        "intake_close_date": "2025-03-31",
        "implementation_period": {
            "start_date": "2021-04-01",
            "end_date": "2026-03-31",
            "notes": "Active under 15th Finance Commission cycle. Proposal intake occurs via periodic Expression of Interest (EOI) notices."
        },
        "beneficiary_claim_period": {
            "is_active": True,
            "valid_until": "2028-03-31",
            "claim_frequency": "MILESTONE_BASED",
            "notes": "Grant released in 3 tranches (25%, 50%, 25%) against verified capital expenditure."
        },
        "operating_or_ppa_period": {
            "is_applicable": False,
            "duration_years": None,
            "notes": "Food processing infrastructure."
        },
        "successor_scheme_code": None,
        "statutory_reference": {
            "notification_number": "16-MFPI/14-Admin/Part-1",
            "issuing_authority": "Ministry of Food Processing Industries, Government of India",
            "issuing_date": "2022-06-08",
            "effective_from": "2022-06-08",
            "effective_to": "2026-03-31",
            "relevant_clause": "EOI Notice dated 15/01/2025 & Extension",
            "guidelines_title": "Guidelines for Scheme for Creation / Expansion of Food Processing Capacities",
            "source_url": "https://mofpi.gov.in",
            "last_verified_date": "2026-11-15",
            "verification_confidence": "VERIFIED"
        },
        "eligibility_rules": {
            "sectors": ["FOOD_PROCESSING", "AGRO_PROCESSING", "DAIRY", "MEAT", "HORTICULTURE"],
            "max_grant_in_aid_inr": 50000000,
            "general_areas_grant_pct": 35.0,
            "difficult_areas_grant_pct": 50.0
        },
        "benefits_structure": {
            "grant_in_aid": "35% of eligible plant & machinery cost (50% in North East and Himalayan states), capped at ₹5 Crore"
        }
    },
    {
        "scheme_code": "IN-CEN-PM-KUSUM-A",
        "name": "PM-KUSUM Component A (Decentralized Solar Power Plants)",
        "short_name": "PM-KUSUM Component A",
        "description": "Setting up of 500 kW to 2 MW decentralized grid-connected solar or other renewable power plants on rural lands within 5 km of 33/11 kV substations.",
        "authority_level": "CENTRAL",
        "state_code": "IN-ALL",
        "department_code": "CEN-MNRE",
        "financial_instrument_type": "INFRASTRUCTURE_ASSISTANCE",
        "scheme_rule_version": "2023.1",
        "scheme_lifecycle_status": "ACTIVE",
        "fresh_intake_status": "CLOSED_AWAITING_STATE_TENDER",
        "intake_open_date": "2019-03-08",
        "intake_close_date": None,
        "implementation_period": {
            "start_date": "2019-03-08",
            "end_date": "2026-03-31",
            "notes": "Central completion timeline extended to 31/03/2026 for sanctioned projects. Fresh intake requires active State DISCOM tenders."
        },
        "beneficiary_claim_period": {
            "is_active": True,
            "valid_until": "2051-03-31",
            "claim_frequency": "ANNUAL",
            "notes": "Feed-in tariff disbursed monthly under 25-year Power Purchase Agreement with State DISCOM."
        },
        "operating_or_ppa_period": {
            "is_applicable": True,
            "duration_years": 25,
            "notes": "25-year Power Purchase Agreement (PPA) with local State DISCOM."
        },
        "successor_scheme_code": None,
        "statutory_reference": {
            "notification_number": "32/645/2017-SPV",
            "issuing_authority": "Ministry of New and Renewable Energy, Government of India",
            "issuing_date": "2019-03-08",
            "effective_from": "2019-03-08",
            "effective_to": "2026-03-31",
            "relevant_clause": "Component A Operational Guidelines",
            "guidelines_title": "Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan",
            "source_url": "https://mnre.gov.in",
            "last_verified_date": "2026-11-15",
            "verification_confidence": "VERIFIED"
        },
        "eligibility_rules": {
            "applicant_classes": ["FARMER", "FARMER_GROUP", "FPO", "PANCHAYAT", "RENEWABLE_POWER_GENERATOR"],
            "plant_capacity_range_kw": [500, 2000],
            "substation_proximity_km": 5.0
        },
        "benefits_structure": {
            "ppa_tariff": "Guaranteed feed-in tariff determined by State Electricity Regulatory Commission (SERC) for 25 years"
        }
    },
    {
        "scheme_code": "IN-CEN-PLI-AUTO",
        "name": "Production Linked Incentive (PLI) Scheme for Automobile and Auto Component Industry",
        "short_name": "PLI Automobile & Auto Components",
        "description": "Financial incentives on incremental sales of Advanced Automotive Technology (AAT) products and zero-emission vehicles to boost domestic manufacturing and supply chains.",
        "authority_level": "CENTRAL",
        "state_code": "IN-ALL",
        "department_code": "CEN-MHI",
        "financial_instrument_type": "PRODUCTION_LINKED_INCENTIVE",
        "scheme_rule_version": "2024.1",
        "scheme_lifecycle_status": "ACTIVE",
        "fresh_intake_status": "PERMANENTLY_CLOSED",
        "intake_open_date": "2021-09-23",
        "intake_close_date": "2022-01-09",
        "implementation_period": {
            "start_date": "2022-04-01",
            "end_date": "2028-03-31",
            "notes": "5-year incentive eligibility tenure (FY 2022-23 to FY 2026-27, with 1-year shift through FY 2027-28)."
        },
        "beneficiary_claim_period": {
            "is_active": True,
            "valid_until": "2029-03-31",
            "claim_frequency": "ANNUAL",
            "notes": "Annual claim disbursements disbursed in subsequent financial years through FY 2028-29 for approved beneficiaries."
        },
        "operating_or_ppa_period": {
            "is_applicable": False,
            "duration_years": None,
            "notes": "Incentive scheme."
        },
        "successor_scheme_code": None,
        "statutory_reference": {
            "notification_number": "12(45)/2020-AEI & Gazette Amdt 29/12/2023",
            "issuing_authority": "Ministry of Heavy Industries, Government of India",
            "issuing_date": "2021-09-23",
            "effective_from": "2021-09-23",
            "effective_to": "2028-03-31",
            "relevant_clause": "Clause 3 & Gazette Amendment dated 01/01/2024",
            "guidelines_title": "PLI Scheme for Automobile and Auto Components",
            "source_url": "https://heavyindustries.gov.in",
            "last_verified_date": "2026-11-15",
            "verification_confidence": "VERIFIED"
        },
        "eligibility_rules": {
            "fresh_intake_closed": True,
            "minimum_domestic_value_addition_pct": 50.0
        },
        "benefits_structure": {
            "incentive_rate": "8% to 18% on determined incremental sales of certified AAT vehicles and components"
        }
    },
    {
        "scheme_code": "IN-CEN-CLCSS",
        "name": "Credit Linked Capital Subsidy Scheme for Technology Upgradation (CLCSS - Sunset)",
        "short_name": "CLCSS Technology Subsidy (Sunset)",
        "description": "Historical MSME capital subsidy scheme providing 15% upfront capital subsidy for institutional finance availed for technology upgradation. Standalone scheme expired on 31/03/2020.",
        "authority_level": "CENTRAL",
        "state_code": "IN-ALL",
        "department_code": "CEN-MSME",
        "financial_instrument_type": "CAPITAL_SUBSIDY",
        "scheme_rule_version": "1.0-SUNSET",
        "scheme_lifecycle_status": "SUNSET",
        "fresh_intake_status": "NEEDS_CONFIRMATION",
        "intake_open_date": "2000-10-01",
        "intake_close_date": "2020-03-31",
        "implementation_period": {
            "start_date": "2000-10-01",
            "end_date": "2020-03-31",
            "notes": "Operational guidelines expired 31/03/2020. Standalone fresh intake is not operational."
        },
        "beneficiary_claim_period": {
            "is_active": False,
            "valid_until": "2020-03-31",
            "claim_frequency": "MILESTONE_BASED",
            "notes": "Sunset scheme."
        },
        "operating_or_ppa_period": {
            "is_applicable": False,
            "duration_years": None,
            "notes": "Capital subsidy."
        },
        "successor_scheme_code": None,
        "statutory_reference": {
            "notification_number": "Sunset Notification",
            "issuing_authority": "Ministry of Micro, Small and Medium Enterprises, Government of India",
            "issuing_date": "2020-03-31",
            "effective_from": "2000-10-01",
            "effective_to": "2020-03-31",
            "relevant_clause": "Scheme Sunset Notice",
            "guidelines_title": "Credit Linked Capital Subsidy Scheme Guidelines",
            "source_url": "https://champions.gov.in",
            "last_verified_date": "2026-11-15",
            "verification_confidence": "NEEDS_LEGAL_REVIEW"
        },
        "eligibility_rules": {
            "status_unconfirmed": True
        },
        "benefits_structure": {
            "notice": "Original scheme expired on 31/03/2020. Fresh standalone applications are not accepted."
        }
    }
]


class Command(BaseCommand):
    help = "Seeds authoritative Government Schemes and Incentives into MongoDB"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding Government Schemes into MongoDB..."))
        repo = SchemeRepository()
        seeded_count = 0

        for scheme_data in SEED_SCHEMES:
            code = scheme_data["scheme_code"]
            repo.upsert_scheme(code, scheme_data)
            seeded_count += 1
            self.stdout.write(self.style.SUCCESS(f"  [+] Seeded: {code} ({scheme_data['short_name']})"))

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {seeded_count} government scheme records."))
