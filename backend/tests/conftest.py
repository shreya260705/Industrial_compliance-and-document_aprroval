import os
import django
import pytest

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bizpermit_core.settings')
django.setup()

@pytest.fixture(autouse=True)
def seed_test_database():
    from django.core.management import call_command
    from apps.jurisdictions.repository import JurisdictionRepository
    from apps.compliance.repository import ComplianceTemplateRepository
    if JurisdictionRepository().collection.count_documents({}) == 0:
        call_command('seed_national_data')
    if ComplianceTemplateRepository().collection.count_documents({}) == 0:
        call_command('seed_compliance_templates')
