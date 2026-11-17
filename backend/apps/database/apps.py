import sys
import logging
from django.apps import AppConfig

logger = logging.getLogger('bizpermit.database')

class DatabaseConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.database'

    def ready(self):
        # Auto-initialize indexes when Django starts up
        from apps.database.indexes import ensure_all_indexes
        try:
            ensure_all_indexes()
        except Exception:
            # Gracefully log or defer if connection is pending
            pass

        # Auto-seed demo users & baseline catalog if DB is unseeded
        is_testing = 'pytest' in sys.modules or (len(sys.argv) > 1 and sys.argv[1] == 'test')
        is_management_task = (len(sys.argv) > 1 and sys.argv[1] in ['makemigrations', 'migrate', 'collectstatic', 'help'])
        if not is_testing and not is_management_task:
            try:
                from apps.authentication.repository import UserRepository
                user_repo = UserRepository()
                if not user_repo.find_by_email("admin@bizpermit.gov.in"):
                    logger.info("Database appears unseeded. Automatically seeding demo accounts and baseline data...")
                    from django.core.management import call_command
                    call_command('seed_demo_data')
                    call_command('seed_national_data')
                    call_command('seed_compliance_templates')
                    call_command('seed_schemes')
                    call_command('seed_grievances')
                    logger.info("Automatic baseline seeding completed successfully.")
            except Exception as e:
                logger.warning(f"Auto-seeding encountered an issue: {e}")

