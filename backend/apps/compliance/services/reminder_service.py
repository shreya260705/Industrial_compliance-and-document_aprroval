"""
Compliance Reminder & Background Automation Service:
Evaluates active obligations, recalculates statuses dynamically, and dispatches
deduplicated in-app notifications according to reminder schedules.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from apps.compliance.repository import (
    ComplianceObligationRepository,
    ComplianceReminderLogRepository
)
from apps.compliance.services.compliance_engine import ComplianceEngineService
from apps.notifications.repository import NotificationRepository

logger = logging.getLogger('bizpermit.compliance')


def get_applicable_threshold(days_left: float, schedule: List[int]) -> Optional[int]:
    """
    Determines the single most appropriate reminder threshold for the current days_left.
    Schedule is a list of integers, e.g. [30, 15, 7, 1, 0, -1, -7].
    """
    if not schedule:
        return None

    pos_thresholds = sorted([int(t) for t in schedule if int(t) > 0])
    neg_thresholds = sorted([int(t) for t in schedule if int(t) < 0], reverse=True)
    has_zero = any(int(t) == 0 for t in schedule)

    # Due today window (-0.5 to 0.5 days)
    if has_zero and -0.5 <= days_left <= 0.5:
        return 0

    # Overdue window (days_left < -0.5)
    if days_left < -0.5 and neg_thresholds:
        # Check from most overdue to least overdue
        for t in sorted(neg_thresholds):
            if days_left <= t:
                return t
        return None

    # Upcoming window (days_left > 0.5)
    if days_left > 0.5 and pos_thresholds:
        # Find the smallest threshold that days_left is within
        for t in pos_thresholds:
            if days_left <= t:
                return t
        return None

    return None


class ComplianceReminderService:
    @classmethod
    def process_all_active_obligations(cls) -> Dict[str, int]:
        """
        Processes all active obligations across the system:
        1. Recalculates dynamic status based on current UTC time.
        2. Evaluates reminder schedule thresholds and dispatches deduplicated alerts.
        Safe and idempotent to run repeatedly via cron jobs.
        """
        ob_repo = ComplianceObligationRepository()
        reminder_repo = ComplianceReminderLogRepository()
        notif_repo = NotificationRepository()

        now = datetime.now(timezone.utc)
        stats = {
            "processed": 0,
            "status_updated": 0,
            "reminders_dispatched": 0
        }

        # Query all active non-terminal obligations
        query = {
            "is_active": True,
            "status": {"$nin": ["COMPLETED", "NOT_APPLICABLE", "NEEDS_CONFIRMATION"]}
        }
        cursor = ob_repo.collection.find(query)

        for ob in cursor:
            stats["processed"] += 1
            due_date = ob["due_date"]
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)

            current_status = ob.get("status", "UPCOMING")
            new_status = ComplianceEngineService.calculate_status(due_date, current_status, has_completed=False)

            if new_status != current_status:
                ob_repo.collection.update_one(
                    {"_id": ob["_id"]},
                    {"$set": {"status": new_status, "updated_at": now}}
                )
                stats["status_updated"] += 1

            # Reminder evaluation
            cycle_number = ob.get("current_cycle_number", 1)
            days_left = (due_date - now).total_seconds() / 86400.0
            schedule = ob.get("reminder_schedule") or [30, 15, 7, 1, 0, -1, -7]

            threshold = get_applicable_threshold(days_left, schedule)
            if threshold is not None:
                already_sent = reminder_repo.has_reminder_been_sent(ob["_id"], cycle_number, threshold)
                if not already_sent:
                    # Construct alert message
                    if threshold > 0:
                        title = f"Compliance Reminder: Due in {threshold} Days"
                        msg = f"Obligation '{ob['title']}' for {ob.get('department_code')} is due in {threshold} days on {due_date.strftime('%d %b %Y')}."
                        notif_type = "COMPLIANCE_UPCOMING"
                    elif threshold == 0:
                        title = "Compliance Alert: Due TODAY"
                        msg = f"Obligation '{ob['title']}' for {ob.get('department_code')} is due TODAY."
                        notif_type = "COMPLIANCE_DUE_TODAY"
                    else:
                        title = f"URGENT: Compliance OVERDUE by {abs(threshold)} Days"
                        msg = f"Obligation '{ob['title']}' was due on {due_date.strftime('%d %b %Y')} and is now OVERDUE."
                        notif_type = "COMPLIANCE_OVERDUE"

                    # Dispatch in-app notification
                    notif_repo.create_notification(
                        recipient_user_id=ob["owner_user_id"],
                        notification_type=notif_type,
                        title=title,
                        message=msg,
                        reference_id=ob.get("obligation_number")
                    )

                    # Log dispatched reminder to prevent duplication
                    reminder_repo.log_reminder(
                        obligation_id=ob["_id"],
                        cycle_number=cycle_number,
                        threshold_days=threshold,
                        recipient_user_id=ob["owner_user_id"]
                    )

                    # Also mark all larger positive thresholds as logged so they never fire retroactively
                    if threshold > 0:
                        for higher_t in [int(t) for t in schedule if int(t) > threshold]:
                            if not reminder_repo.has_reminder_been_sent(ob["_id"], cycle_number, higher_t):
                                reminder_repo.log_reminder(
                                    obligation_id=ob["_id"],
                                    cycle_number=cycle_number,
                                    threshold_days=higher_t,
                                    recipient_user_id=ob["owner_user_id"]
                                )

                    stats["reminders_dispatched"] += 1

        logger.info(f"Compliance engine run completed: {stats}")
        return stats
