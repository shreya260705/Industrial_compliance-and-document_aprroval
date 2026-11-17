"""
WSGI config for BizPermit project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bizpermit_core.settings')
application = get_wsgi_application()

# Ensure demo accounts and core catalog exist on boot
try:
    from apps.authentication.repository import UserRepository
    u_repo = UserRepository()
    if not u_repo.find_by_email("admin@bizpermit.gov.in"):
        from django.core.management import call_command
        call_command('seed_demo_data')
        call_command('seed_national_data')
        call_command('seed_compliance_templates')
        call_command('seed_schemes')
        call_command('seed_grievances')
except Exception:
    pass
