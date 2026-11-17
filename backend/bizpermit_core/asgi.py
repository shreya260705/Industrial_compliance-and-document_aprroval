"""
ASGI config for BizPermit project.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bizpermit_core.settings')
application = get_asgi_application()
