"""
Management Command to Seed Authoritative Statutory Compliance Templates.
All statutory references cite official government gazettes and rules.
"""

from django.core.management.base import BaseCommand
from apps.compliance.repository import ComplianceTemplateRepository


class Command(BaseCommand):
    help = "Seeds verified statutory compliance templates across Environmental, Safety, Boiler, and Labor domains."

    def handle(self, *args, **options):
        self.stdout.write("Seeding statutory compliance templates...")
        tpl_repo = ComplianceTemplateRepository()

        templates = [
            # 1. Environmental Statement Form V
            {
                "template_code": "ENV-FORM-V",
                "title": "Annual Environmental Statement (Form V)",
                "description": "Mandatory annual submission of water/raw material consumption, pollution discharge, and hazardous waste generated during the financial year.",
                "authority_name": "State Pollution Control Board",
                "department_code": "GPCB-ENV",
                "compliance_category": "ENVIRONMENTAL",
                "frequency": "ANNUAL",
                "fixed_due_month": 9,
                "fixed_due_day": 30,
                "source_reference": "Rule 14 of the Environment (Protection) Rules, 1986",
                "source_verification_status": "VERIFIED",
                "official_source_url": "https://cpcb.nic.in",
                "last_verified_date": "2026-10-15",
                "related_approval_code": "GPCB-CTO-IND",
                "applicability_rules": {
                    "pollution_categories": ["RED", "ORANGE"]
                },
                "indicative_sla_days": 30,
                "statutory_penalty_summary": "Notice of direction under Section 5 of Environment (Protection) Act, 1986 and environmental compensation.",
                "requires_operational_confirmation": False,
                "renewal_applicability": False,
                "is_active": True
            },
            # 2. Half-Yearly Environmental Compliance Monitoring Report
            {
                "template_code": "ENV-HALF-YEARLY",
                "title": "Half-Yearly Environmental Monitoring & ETP Compliance Report",
                "description": "Six-monthly submission of ambient air quality, stack emissions, and treated effluent analysis report from MOEF&CC/NABL accredited laboratory.",
                "authority_name": "State Pollution Control Board",
                "department_code": "GPCB-ENV",
                "compliance_category": "POLLUTION_CONTROL",
                "frequency": "HALF_YEARLY",
                "fixed_due_month": 6,
                "fixed_due_day": 1,
                "source_reference": "General Conditions of Consent to Operate under Water Act 1974 & Air Act 1981",
                "source_verification_status": "VERIFIED",
                "official_source_url": "https://parivesh.nic.in",
                "last_verified_date": "2026-10-15",
                "related_approval_code": "GPCB-CTO-IND",
                "applicability_rules": {
                    "pollution_categories": ["RED", "ORANGE"]
                },
                "indicative_sla_days": 15,
                "statutory_penalty_summary": "Show cause notice for revocation of Consent to Operate.",
                "requires_operational_confirmation": False,
                "renewal_applicability": False,
                "is_active": True
            },
            # 3. Boiler Annual Inspection & Hydraulic Test
            {
                "template_code": "BOIL-ANNUAL-INSP",
                "title": "Annual Steam Boiler Inspection & Hydraulic Test Certificate",
                "description": "Statutory annual boiler shut-down inspection, open steam-trial, and hydraulic pressure testing by Deputy Director of Steam Boilers.",
                "authority_name": "Directorate of Industrial Safety & Health (Boilers Division)",
                "department_code": "GJ-DISH",
                "compliance_category": "BOILER_PRESSURE",
                "frequency": "ANNUAL",
                "fixed_due_month": 12,
                "fixed_due_day": 31,
                "source_reference": "Section 7, 8 & 14 of The Indian Boilers Act, 1923 & Indian Boiler Regulations (IBR)",
                "source_verification_status": "VERIFIED",
                "official_source_url": "https://dish.gujarat.gov.in",
                "last_verified_date": "2026-10-15",
                "related_approval_code": "GJ-DISH-BOIL-REG",
                "applicability_rules": {
                    "requires_boiler": True,
                    "pollution_categories": ["ALL"]
                },
                "indicative_sla_days": 21,
                "statutory_penalty_summary": "Prohibition of steam boiler operation under Section 23 of Boilers Act.",
                "requires_operational_confirmation": False,
                "renewal_applicability": True,
                "is_active": True
            },
            # 4. Factories Act Annual Return
            {
                "template_code": "FAC-ANNUAL-RETURN",
                "title": "Annual Factory Return (Form 27 / Combined Annual Return)",
                "description": "Comprehensive annual report detailing average daily workforce, man-hours worked, health/welfare provisions, and occupational accident logs.",
                "authority_name": "Chief Inspector of Factories",
                "department_code": "GJ-DISH",
                "compliance_category": "LABOUR_WELFARE",
                "frequency": "ANNUAL",
                "fixed_due_month": 1,
                "fixed_due_day": 15,
                "source_reference": "Section 110 of The Factories Act, 1948 & State Factories Rules",
                "source_verification_status": "VERIFIED",
                "official_source_url": "https://labour.gov.in",
                "last_verified_date": "2026-10-15",
                "related_approval_code": "GJ-DISH-FAC-LIC",
                "applicability_rules": {
                    "min_workforce": 10,
                    "pollution_categories": ["ALL"]
                },
                "indicative_sla_days": 30,
                "statutory_penalty_summary": "Financial fine and penal prosecution under Section 92 of Factories Act.",
                "requires_operational_confirmation": False,
                "renewal_applicability": False,
                "is_active": True
            },
            # 5. Hazardous Chemicals MSIHC Return
            {
                "template_code": "HAZ-CHEM-RETURN",
                "title": "Half-Yearly Hazardous Chemicals Inventory & Safety Audit Manifest",
                "description": "Biannual submission of hazardous chemical inventory, Material Safety Data Sheets (MSDS), on-site emergency disaster plan updates.",
                "authority_name": "Petroleum and Explosives Safety Organization (PESO) & DISH",
                "department_code": "PESO-CENTRAL",
                "compliance_category": "HAZARDOUS_MATERIALS",
                "frequency": "HALF_YEARLY",
                "fixed_due_month": 4,
                "fixed_due_day": 30,
                "source_reference": "Rule 7 & 10 of Manufacture, Storage and Import of Hazardous Chemical (MSIHC) Rules, 1989",
                "source_verification_status": "VERIFIED",
                "official_source_url": "https://peso.gov.in",
                "last_verified_date": "2026-10-15",
                "related_approval_code": "PESO-LIC-CHEM",
                "applicability_rules": {
                    "requires_hazardous_chemicals": True,
                    "pollution_categories": ["ALL"]
                },
                "indicative_sla_days": 15,
                "statutory_penalty_summary": "Suspension of storage license and seizure of chemical consignments.",
                "requires_operational_confirmation": False,
                "renewal_applicability": False,
                "is_active": True
            },
            # 6. CGWA Groundwater Extraction Return
            {
                "template_code": "CGWA-ANNUAL-RETURN",
                "title": "Annual Groundwater Withdrawal & Digital Flowmeter Calibration Return",
                "description": "Annual submission of logbook data of groundwater extraction volumes, piezometer water table levels, and digital flowmeter NABL calibration.",
                "authority_name": "Central Ground Water Authority (CGWA)",
                "department_code": "CGWA-CENTRAL",
                "compliance_category": "WATER_GROUNDWATER",
                "frequency": "ANNUAL",
                "fixed_due_month": 6,
                "fixed_due_day": 30,
                "source_reference": "Section 5 of Environment (Protection) Act, 1986 & CGWA Guidelines 2020",
                "source_verification_status": "VERIFIED",
                "official_source_url": "https://cgwa-noc.gov.in",
                "last_verified_date": "2026-10-15",
                "related_approval_code": "CGWA-NOC-BORE",
                "applicability_rules": {
                    "requires_groundwater_borewell": True,
                    "pollution_categories": ["ALL"]
                },
                "indicative_sla_days": 30,
                "statutory_penalty_summary": "Environmental compensation charges and disconnection of borewell power supply.",
                "requires_operational_confirmation": False,
                "renewal_applicability": False,
                "is_active": True
            },
            # 7. Fire Safety Certificate Renewal
            {
                "template_code": "FIRE-ANNUAL-AUDIT",
                "title": "Annual Fire Prevention & Safety Measure Maintenance Certificate (Form B)",
                "description": "Certification by a licensed fire agency confirming functional readiness of fire pumps, hydrant lines, sprinkler networks, and panic alarms.",
                "authority_name": "State Fire & Emergency Services",
                "department_code": "GJ-FIRE",
                "compliance_category": "SAFETY_OCCUPATIONAL",
                "frequency": "ANNUAL",
                "fixed_due_month": 3,
                "fixed_due_day": 31,
                "source_reference": "Section 18 of State Fire Prevention and Life Safety Measures Act",
                "source_verification_status": "VERIFIED",
                "official_source_url": "https://gujfiresafetycop.in",
                "last_verified_date": "2026-10-15",
                "related_approval_code": "GJ-FIRE-NOC-IND",
                "applicability_rules": {
                    "pollution_categories": ["ALL"]
                },
                "indicative_sla_days": 15,
                "statutory_penalty_summary": "Notice of sealing premises under Section 20 of Fire Safety Act.",
                "requires_operational_confirmation": False,
                "renewal_applicability": True,
                "is_active": True
            },
            # 8. CTO Statutory License Renewal Tracker
            {
                "template_code": "CTO-RENEWAL-TRACKER",
                "title": "Consent to Operate (CTO) 5-Year Statutory Renewal Application",
                "description": "Statutory renewal of Consent to Operate required at least 120 days prior to license expiry. Exact expiry date requires confirmation by plant owner.",
                "authority_name": "State Pollution Control Board",
                "department_code": "GPCB-ENV",
                "compliance_category": "ENVIRONMENTAL",
                "frequency": "RENEWAL_BASED",
                "fixed_due_month": 12,
                "fixed_due_day": 31,
                "source_reference": "Section 25 of Water Act 1974 & Section 21 of Air Act 1981",
                "source_verification_status": "NEEDS_CONFIRMATION",
                "official_source_url": "https://gpcb.gujarat.gov.in",
                "last_verified_date": "2026-10-15",
                "related_approval_code": "GPCB-CTO-IND",
                "applicability_rules": {
                    "pollution_categories": ["RED", "ORANGE", "GREEN"]
                },
                "indicative_sla_days": 60,
                "statutory_penalty_summary": "Operating without valid consent attracts closure directions under Section 31A of Air Act.",
                "requires_operational_confirmation": True,
                "renewal_applicability": True,
                "is_active": True
            }
        ]

        count = 0
        for tpl in templates:
            tpl_repo.upsert_template(tpl)
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} statutory compliance templates!"))
