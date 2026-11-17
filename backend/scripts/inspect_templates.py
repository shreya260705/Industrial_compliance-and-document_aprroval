import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bizpermit_core.settings')
import django
django.setup()

from apps.compliance.repository import ComplianceTemplateRepository
from django.core.management import call_command

call_command('seed_compliance_templates')
repo = ComplianceTemplateRepository()
templates = repo.list_all(limit=10)

print(f"TOTAL_TEMPLATES_SEEDED: {len(templates)}\n")
for idx, t in enumerate(templates, 1):
    print(f"[{idx}] TEMPLATE CODE: {t.get('template_code')}")
    print(f"    Title: {t.get('title')}")
    print(f"    Authority: {t.get('authority_name')} ({t.get('department_code')})")
    print(f"    Official Portal: {t.get('official_source_url')}")
    print(f"    Statutory Reference: {t.get('source_reference')}")
    print(f"    Verification Status: {t.get('source_verification_status')}")
    print(f"    Last Verified Date: {t.get('last_verified_date')}")
    print(f"    Frequency: {t.get('frequency')}")
    print(f"    Statutory Penalties: {t.get('statutory_penalty_summary')}")
    print("-" * 75)
