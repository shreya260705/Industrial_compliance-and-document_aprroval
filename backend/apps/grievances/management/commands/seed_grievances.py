"""
Management command to seed default grievance categories and escalation rules.
Phase 6 Module 3.
"""

from django.core.management.base import BaseCommand
from apps.grievances.repository import (
    GrievanceCategoryRepository,
    GrievanceEscalationRuleRepository
)


class Command(BaseCommand):
    help = "Seed default grievance categories and escalation rules for BizPermit Phase 6 Module 3."

    def handle(self, *args, **options):
        self.stdout.write("Seeding default grievance categories...")
        cat_repo = GrievanceCategoryRepository()
        cat_repo.seed_defaults()
        self.stdout.write(self.style.SUCCESS(f"Seeded grievance categories."))

        self.stdout.write("Seeding default grievance escalation rules...")
        rule_repo = GrievanceEscalationRuleRepository()
        rule_repo.seed_defaults()
        self.stdout.write(self.style.SUCCESS(f"Seeded grievance escalation rules."))
