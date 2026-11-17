"""
Django settings for BizPermit project.
Phase 1: Environment Setup, Database Repositories, Backend Foundations & Authentication.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory (backend/)
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-fallback-key-2026')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [host.strip() for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,.onrender.com').split(',') if host.strip()]
if 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

# Application definition
INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party packages
    'rest_framework',
    'corsheaders',
    
    # BizPermit Domain Apps
    'apps.common.apps.CommonConfig',
    'apps.database.apps.DatabaseConfig',
    'apps.authentication.apps.AuthenticationConfig',
    'apps.businesses.apps.BusinessesConfig',
    'apps.jurisdictions.apps.JurisdictionsConfig',
    'apps.departments.apps.DepartmentsConfig',
    'apps.approvals.apps.ApprovalsConfig',
    'apps.documents.apps.DocumentsConfig',
    'apps.applications.apps.ApplicationsConfig',
    'apps.notifications.apps.NotificationsConfig',
    'apps.compliance.apps.ComplianceConfig',
    'apps.schemes.apps.SchemesConfig',
    'apps.grievances.apps.GrievancesConfig',
    'apps.administration.apps.AdministrationConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'bizpermit_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'bizpermit_core.wsgi.application'

# Django standard database - used strictly for Django internals if required.
# All application data (Users, Businesses, Approvals, Vault) lives exclusively in MongoDB via PyMongo.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

try:
    import whitenoise
    MIDDLEWARE.insert(2, 'whitenoise.middleware.WhiteNoiseMiddleware')
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
except ImportError:
    pass

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.authentication.MongoJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'EXCEPTION_HANDLER': 'apps.common.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '180/minute',
        'auth_burst': '10/minute',
    },
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
    if origin.strip()
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
]
CORS_ALLOW_CREDENTIALS = True

# MongoDB Atlas Configuration (PyMongo)
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'bizpermit_db')
USE_MOCK_DB_IF_UNAVAILABLE = os.getenv('USE_MOCK_DB_IF_UNAVAILABLE', 'True').lower() in ('true', '1', 'yes')

# JWT Cryptographic Settings
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'bizpermit-default-jwt-secret-phase1-2026')
JWT_ACCESS_EXPIRY_MINUTES = int(os.getenv('JWT_ACCESS_EXPIRY_MINUTES', 15))
JWT_REFRESH_EXPIRY_DAYS = int(os.getenv('JWT_REFRESH_EXPIRY_DAYS', 7))

# Email / Password Recovery Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@bizpermit.local')
FRONTEND_BASE_URL = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173')

# Supabase Private Storage Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SECRET_KEY
SUPABASE_BUCKET_NAME = os.getenv('SUPABASE_BUCKET_NAME') or os.getenv('SUPABASE_VAULT_BUCKET', 'bizpermit')
SUPABASE_VAULT_BUCKET = SUPABASE_BUCKET_NAME
