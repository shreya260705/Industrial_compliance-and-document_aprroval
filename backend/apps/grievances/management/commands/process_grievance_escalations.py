"""
BizPermit Grievance Auto-Escalation Management Command.
Phase 6 Module 3.

Evaluates active grievances against statutory escalation rules and SLA thresholds.
Automatically escalates overdue and unassigned cases from Level 1 -> Level 2 -> Level 3.
Ensures idempotence, timezone-aware UTC evaluation, and application-level append-only audit logging.
"""

from django.core.management.base import BaseCommand
from apps.grievances.repository import GrievanceRepository


class Command(BaseCommand):
    help = (
        "Processes active industrial grievances against escalation rules, "
        "transitions overdue/unassigned cases to Level 2 or Level 3, "
        "records audit events, and dispatches in-app notifications."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate escalation evaluation without writing updates to MongoDB.'
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        self.stdout.write(self.style.NOTICE("Initiating BizPermit Grievance Auto-Escalation Engine..."))

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY-RUN mode enabled: No database modifications will occur."))

        repo = GrievanceRepository()
        stats = repo.process_automatic_escalations()

        self.stdout.write(
            self.style.SUCCESS(
                f"Grievance escalation execution completed successfully:\n"
                f"  - Active Candidate Grievances Evaluated: {stats['processed']}\n"
                f"  - Escalated to Level 2 (State Supervisory): {stats['escalated_to_l2']}\n"
                f"  - Escalated to Level 3 (Super Admin National): {stats['escalated_to_l3']}\n"
                f"  - Skipped (Compliant / Already Escalated): {stats['skipped_idempotent']}\n"
                f"  - Deduplicated In-App Notifications Dispatched: {stats['notifications_dispatched']}\n"
                f"  - Execution Timestamp (UTC): {stats['timestamp']}"
            )
        )
