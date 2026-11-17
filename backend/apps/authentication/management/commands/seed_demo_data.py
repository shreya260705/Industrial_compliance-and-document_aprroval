"""
Management command to seed initial demo accounts, enterprises, and facilities.
"""

from django.core.management.base import BaseCommand
from apps.authentication.password import hash_password
from apps.authentication.repository import UserRepository
from apps.businesses.repository import BusinessRepository, LocationRepository

class Command(BaseCommand):
    help = "Seeds initial demo users, businesses, and industrial locations for BizPermit."

    def handle(self, *args, **options):
        user_repo = UserRepository()
        biz_repo = BusinessRepository()
        loc_repo = LocationRepository()

        default_pass_hash = hash_password("Password123")

        # 1. Business Owner
        owner_email = "owner@horizonauto.in"
        owner_user = user_repo.find_by_email(owner_email)
        if not owner_user:
            owner_user = user_repo.create_user(
                email=owner_email,
                password_hash=default_pass_hash,
                full_name="Vikram Malhotra",
                phone_number="+919876543210",
                role="BUSINESS_OWNER"
            )
            self.stdout.write(self.style.SUCCESS(f"Created Business Owner: {owner_email}"))
        else:
            self.stdout.write(f"Business Owner already exists: {owner_email}")

        # Seed Business
        pan = "AAACB1234F"
        business = biz_repo.find_by_pan(pan)
        if not business:
            business = biz_repo.create_business(
                owner_user_id=owner_user["_id"],
                legal_name="Horizon AutoTech Private Limited",
                trade_name="Horizon Components",
                entity_type="PRIVATE_LIMITED",
                pan=pan,
                gstin="27AAACB1234F1Z5",
                cin="U29100MH2021PTC123456",
                udyam_registration_number="UDYAM-MH-26-0012345",
                registered_office_address={
                    "line1": "Plot 45, MIDC Industrial Area, Chakan",
                    "city": "Pune",
                    "district": "Pune",
                    "state_code": "IN-MH",
                    "pincode": "410501"
                },
                authorized_signatory={
                    "name": "Vikram Malhotra",
                    "din": "08912345",
                    "email": owner_email,
                    "phone": "+919876543210"
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Created Enterprise: {business['legal_name']}"))

            # Seed Facility 1: Sanand Unit
            loc_repo.create_location(
                business_id=business["_id"],
                location_name="Sanand Heavy Stamping Unit",
                facility_type="MANUFACTURING_PLANT",
                address={
                    "line1": "Plot G-12, GIDC Industrial Estate",
                    "city": "Sanand",
                    "district": "Ahmedabad",
                    "state_code": "IN-GJ",
                    "pincode": "382170"
                },
                jurisdiction_hierarchy={
                    "state_code": "IN-GJ",
                    "district_code": "IN-GJ-AHM",
                    "local_body_code": "GIDC-SANAND",
                    "industrial_zone_type": "STATE_GIDC"
                },
                industrial_profile={
                    "nic_code": "2930",
                    "sector_name": "Automotive Parts & Accessories",
                    "scale": "MEDIUM",
                    "pollution_category": "RED",
                    "total_power_load_hp": 850,
                    "water_requirement_kld": 45.0,
                    "workforce_capacity": 320,
                    "has_boiler": True,
                    "has_hazardous_chemicals": True
                }
            )
            self.stdout.write(self.style.SUCCESS("Created Facility: Sanand Heavy Stamping Unit (Gujarat)"))

            # Seed Facility 2: Hosur Unit
            loc_repo.create_location(
                business_id=business["_id"],
                location_name="Hosur Stamping Unit",
                facility_type="MANUFACTURING_PLANT",
                address={
                    "line1": "Plot 18, SIPCOT Industrial Complex",
                    "city": "Hosur",
                    "district": "Krishnagiri",
                    "state_code": "IN-TN",
                    "pincode": "635126"
                },
                jurisdiction_hierarchy={
                    "state_code": "IN-TN",
                    "district_code": "IN-TN-KRI",
                    "local_body_code": "SIPCOT-HOSUR",
                    "industrial_zone_type": "STATE_SIPCOT"
                },
                industrial_profile={
                    "nic_code": "2930",
                    "sector_name": "Automotive Parts & Accessories",
                    "scale": "MEDIUM",
                    "pollution_category": "ORANGE",
                    "total_power_load_hp": 400,
                    "water_requirement_kld": 15.0,
                    "workforce_capacity": 180,
                    "has_boiler": False,
                    "has_hazardous_chemicals": False
                }
            )
            self.stdout.write(self.style.SUCCESS("Created Facility: Hosur Stamping Unit (Tamil Nadu)"))

        # 2. Gujarat Scrutiny Officer
        gpcb_email = "officer.gpcb@gujarat.gov.in"
        if not user_repo.find_by_email(gpcb_email):
            user_repo.create_user(
                email=gpcb_email,
                password_hash=default_pass_hash,
                full_name="Rajesh Patel",
                phone_number="+919876543211",
                role="DEPARTMENT_OFFICER",
                officer_profile={
                    "department_code": "GPCB-ENV",
                    "jurisdiction_code": "IN-GJ",
                    "designation": "Regional Environmental Officer",
                    "badge_number": "GJ-ENV-4091"
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Created Officer: {gpcb_email}"))

        # 3. Maharashtra Scrutiny Officer
        mpcb_email = "officer.mpcb@maharashtra.gov.in"
        if not user_repo.find_by_email(mpcb_email):
            user_repo.create_user(
                email=mpcb_email,
                password_hash=default_pass_hash,
                full_name="Sanjay Deshmukh",
                phone_number="+919876543212",
                role="DEPARTMENT_OFFICER",
                officer_profile={
                    "department_code": "MPCB-ENV",
                    "jurisdiction_code": "IN-MH",
                    "designation": "Sub-Regional Scrutiny Officer",
                    "badge_number": "MH-ENV-8812"
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Created Officer: {mpcb_email}"))

        # 4. Super Admin
        admin_email = "admin@bizpermit.gov.in"
        if not user_repo.find_by_email(admin_email):
            user_repo.create_user(
                email=admin_email,
                password_hash=default_pass_hash,
                full_name="National System Administrator",
                phone_number="+919876543200",
                role="SUPER_ADMIN"
            )
            self.stdout.write(self.style.SUCCESS(f"Created Super Admin: {admin_email}"))

        self.stdout.write(self.style.SUCCESS("Demo data seeding completed successfully!"))
