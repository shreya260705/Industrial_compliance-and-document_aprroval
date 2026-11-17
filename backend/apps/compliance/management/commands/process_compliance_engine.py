"""
Management Command for Render Cron Jobs & Scheduled Execution:
Evaluates all active compliance obligations, recalculates statuses dynamically,
and dispatches deduplicated reminders.
"""

from django.core.management.base import BaseCommand
from apps.compliance.services.reminder_service import ComplianceReminderService


class Command(BaseCommand):
    help = "Processes active compliance obligations, updates dynamic statuses, and dispatches reminders (Render Cron compatible)."

    def handle(self, *args, **options):
        self.stdout.write("Executing BizPermit Compliance Automation Engine...")
        stats = ComplianceReminderService.process_all_active_obligations()
        self.stdout.write(
            self.style.SUCCESS(
                f"Compliance run complete: {stats['processed']} processed, "
                f"{stats['status_updated']} statuses updated, "
                f"{stats['reminders_dispatched']} reminders dispatched."
            )
        )
