"""
WSGI config for BizPermit project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bizpermit_core.settings')
application = get_wsgi_application()
