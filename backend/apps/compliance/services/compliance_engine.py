"""
Compliance Engine Service:
Generates obligations from location profiles and templates, performs safe leap-year/month-end
recurrence calculations, coordinates completion workflows with vault evidence, and manages status transitions.
"""

import calendar
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union
from bson import ObjectId

from apps.compliance.repository import (
    ComplianceObligationRepository,
    ComplianceCycleRepository,
    ComplianceCompletionRepository,
    ComplianceTemplateRepository
)
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository
from apps.notifications.repository import NotificationRepository

VALID_FREQUENCIES = {"ONE_TIME", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL", "RENEWAL_BASED", "CUSTOM"}

VALID_STATUSES = {
    "UPCOMING", "DUE_SOON", "DUE_TODAY", "OVERDUE",
    "IN_PROGRESS", "SUBMITTED_FOR_REVIEW", "COMPLETED",
    "NEEDS_CONFIRMATION", "NOT_APPLICABLE"
}


class ComplianceEngineService:
    @staticmethod
    def add_months(sourcedate: datetime, months: int) -> datetime:
        """
        Adds months to a datetime, safely clamping to month-end and handling leap years.
        E.g. Jan 31 + 1 month -> Feb 28 (or Feb 29 on leap year).
        Feb 29 + 12 months -> Feb 28 on non-leap year.
        """
        month = sourcedate.month - 1 + months
        year = sourcedate.year + month // 12
        month = month % 12 + 1
        day = min(sourcedate.day, calendar.monthrange(year, month)[1])
        return sourcedate.replace(year=year, month=month, day=day)

    @classmethod
    def compute_next_cycle_date(cls, current_due_date: datetime, frequency: str) -> Optional[datetime]:
        """
        Calculates the next due date based on frequency.
        Returns None for ONE_TIME obligations.
        """
        freq = frequency.strip().upper()
        if freq == "ONE_TIME":
            return None
        elif freq == "MONTHLY":
            return cls.add_months(current_due_date, 1)
        elif freq == "QUARTERLY":
            return cls.add_months(current_due_date, 3)
        elif freq == "HALF_YEARLY":
            return cls.add_months(current_due_date, 6)
        elif freq == "ANNUAL":
            return cls.add_months(current_due_date, 12)
        elif freq == "RENEWAL_BASED":
            # Default renewal horizon: 12 months unless otherwise configured
            return cls.add_months(current_due_date, 12)
        elif freq == "CUSTOM":
            # Default custom recurrence step: 12 months
            return cls.add_months(current_due_date, 12)
        return None

    @staticmethod
    def calculate_status(due_date: datetime, current_status: str, has_completed: bool = False) -> str:
        """
        Pure function for dynamic status calculation based on Indian Standard Time (IST, UTC+5:30)
        and UTC timestamps, ensuring accurate date-boundary handling without premature overdue flags.
        """
        if has_completed:
            return "COMPLETED"
        if current_status in ("NEEDS_CONFIRMATION", "NOT_APPLICABLE", "IN_PROGRESS", "SUBMITTED_FOR_REVIEW"):
            return current_status

        now = datetime.now(timezone.utc)
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)

        IST = timezone(timedelta(hours=5, minutes=30))
        now_ist = now.astimezone(IST)
        due_ist = due_date.astimezone(IST)

        diff_seconds = (due_date - now).total_seconds()

        # If the date has passed in IST and the timestamp is expired
        if due_ist.date() < now_ist.date() and diff_seconds < 0:
            return "OVERDUE"

        # If it is the same calendar day in India or within 12 hours
        if due_ist.date() == now_ist.date() or (0 <= diff_seconds <= 43200):
            return "DUE_TODAY"

        # If due within 7 calendar days
        days_diff = (due_ist.date() - now_ist.date()).days
        if 1 <= days_diff <= 7 or (0 < diff_seconds <= 7 * 86400):
            return "DUE_SOON"

        return "UPCOMING"

    @classmethod
    def generate_obligations_for_location(
        cls,
        location_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId]
    ) -> List[Dict[str, Any]]:
        """
        Evaluates facility industrial profile and generates applicable verified compliance obligations.
        Guarantees idempotency: will not generate duplicate active obligations for the same template.
        """
        loc_repo = LocationRepository()
        biz_repo = BusinessRepository()
        ob_repo = ComplianceObligationRepository()
        cycle_repo = ComplianceCycleRepository()
        tpl_repo = ComplianceTemplateRepository()

        location = loc_repo.find_by_id(location_id)
        if not location:
            raise ValueError("Location not found.")

        biz = biz_repo.find_by_id_for_owner(location["business_id"], user_id)
        if not biz:
            raise ValueError("Access unauthorized to this business facility.")

        industrial = location.get("industrial_profile", {})
        hierarchy = location.get("jurisdiction_hierarchy", {})
        state_code = hierarchy.get("state_code", "IN-GJ")
        pollution = industrial.get("pollution_category", "WHITE")
        has_boiler = industrial.get("has_boiler", False)
        has_hazmat = industrial.get("has_hazardous_chemicals", False)
        has_borewell = industrial.get("has_groundwater_borewell", False)
        workforce = industrial.get("workforce_capacity", 0)

        now = datetime.now(timezone.utc)
        current_year = now.year

        # Get all active templates from repository
        templates = tpl_repo.list_all(limit=100)
        generated = []

        for tpl in templates:
            rules = tpl.get("applicability_rules", {})

            # Rule evaluation
            if "pollution_categories" in rules:
                allowed_poll = rules["pollution_categories"]
                if "ALL" not in allowed_poll and pollution not in allowed_poll:
                    continue

            if rules.get("requires_boiler") and not has_boiler:
                continue

            if rules.get("requires_hazardous_chemicals") and not has_hazmat:
                continue

            if rules.get("requires_groundwater_borewell") and not has_borewell:
                continue

            if "min_workforce" in rules and workforce < rules["min_workforce"]:
                continue

            # Idempotency check: does an active obligation for this template already exist for this plant?
            existing = ob_repo.collection.find_one({
                "location_id": location["_id"],
                "template_code": tpl["template_code"],
                "is_active": {"$ne": False}
            })
            if existing:
                continue

            # Calculate initial due date
            target_month = tpl.get("fixed_due_month", 9)
            target_day = tpl.get("fixed_due_day", 30)

            try:
                candidate_date = datetime(current_year, target_month, target_day, 18, 30, tzinfo=timezone.utc)
            except ValueError:
                candidate_date = datetime(current_year, target_month, 28, 18, 30, tzinfo=timezone.utc)

            # If date has already passed this year, roll over to next year for recurring items
            if candidate_date < now and tpl.get("frequency") != "ONE_TIME":
                try:
                    candidate_date = datetime(current_year + 1, target_month, target_day, 18, 30, tzinfo=timezone.utc)
                except ValueError:
                    candidate_date = datetime(current_year + 1, target_month, 28, 18, 30, tzinfo=timezone.utc)

            # Handle source verification status
            src_status = tpl.get("source_verification_status", "VERIFIED")
            if tpl.get("requires_operational_confirmation"):
                src_status = "NEEDS_CONFIRMATION"

            ob = ob_repo.create_obligation(
                owner_user_id=user_id,
                business_id=biz["_id"],
                location_id=location["_id"],
                title=tpl["title"],
                description=tpl["description"],
                authority_name=tpl["authority_name"],
                department_code=tpl["department_code"],
                jurisdiction_code=state_code,
                compliance_category=tpl["compliance_category"],
                frequency=tpl["frequency"],
                due_date=candidate_date,
                source_reference=tpl["source_reference"],
                source_verification_status=src_status,
                approval_code=tpl.get("related_approval_code"),
                renewal_applicability=tpl.get("renewal_applicability", False),
                indicative_sla_days=tpl.get("indicative_sla_days"),
                statutory_penalty_summary=tpl.get("statutory_penalty_summary"),
                template_code=tpl["template_code"]
            )

            # Create initial cycle #1 record
            cycle_repo.create_cycle(
                obligation_id=ob["_id"],
                cycle_number=1,
                due_date=candidate_date,
                cycle_start_date=now,
                status=ob["status"]
            )
            generated.append(ob)

        return generated

    @classmethod
    def complete_obligation(
        cls,
        obligation_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        user_role: str,
        completion_remarks: str,
        vault_document_ids: Optional[List[str]] = None,
        needs_officer_review: bool = False
    ) -> Dict[str, Any]:
        """
        Records completion evidence for an obligation cycle, attaches verified vault documents,
        and automatically schedules the next cycle if recurring.
        """
        ob_repo = ComplianceObligationRepository()
        cycle_repo = ComplianceCycleRepository()
        comp_repo = ComplianceCompletionRepository()
        doc_repo = DocumentRepository()

        obligation = ob_repo.find_by_id_for_user(obligation_id, user_id)
        if not obligation:
            raise ValueError("Compliance obligation not found or access unauthorized.")

        if obligation["status"] == "COMPLETED":
            raise ValueError("This obligation cycle has already been completed.")

        now = datetime.now(timezone.utc)
        current_cycle_num = obligation.get("current_cycle_number", 1)

        # Validate vault document attachments and verify tenant ownership
        attached_docs = []
        if vault_document_ids:
            for doc_id_str in vault_document_ids:
                doc = doc_repo.find_by_id_for_user(doc_id_str, user_id)
                if not doc:
                    raise ValueError(f"Vault document {doc_id_str} not found or does not belong to your enterprise.")
                attached_docs.append({
                    "vault_document_id": doc["_id"],
                    "document_name": doc["document_name"],
                    "document_category": doc["document_category"],
                    "original_filename": doc["original_filename"],
                    "storage_object_path": doc["storage_object_path"],
                    "sha256_checksum": doc["sha256_checksum"],
                    "attached_at": now
                })

        # Create completion record
        completion_rec = comp_repo.create_completion_record(
            obligation_id=obligation["_id"],
            cycle_number=current_cycle_num,
            completed_by_user_id=user_id,
            completed_by_role=user_role,
            completion_remarks=completion_remarks,
            attached_documents=attached_docs,
            needs_officer_review=needs_officer_review
        )

        # Update current cycle in compliance_cycles
        latest_cycle = cycle_repo.find_specific_cycle(obligation["_id"], current_cycle_num)
        if latest_cycle:
            cycle_repo.collection.update_one(
                {"_id": latest_cycle["_id"]},
                {"$set": {
                    "status": "COMPLETED",
                    "completed_at": now,
                    "completion_record_id": completion_rec["_id"],
                    "updated_at": now
                }}
            )

        # Determine next cycle if recurring
        freq = obligation.get("frequency", "ONE_TIME")
        next_due = cls.compute_next_cycle_date(obligation["due_date"], freq)

        update_fields: Dict[str, Any] = {
            "last_completed_at": now,
            "updated_at": now
        }

        if next_due:
            # Recurring obligation: Advance to next cycle
            next_cycle_num = current_cycle_num + 1
            next_status = cls.calculate_status(next_due, "UPCOMING", has_completed=False)

            update_fields["due_date"] = next_due
            update_fields["next_due_date"] = next_due
            update_fields["current_cycle_number"] = next_cycle_num
            update_fields["status"] = next_status

            # Instantiate next cycle record in compliance_cycles
            cycle_repo.create_cycle(
                obligation_id=obligation["_id"],
                cycle_number=next_cycle_num,
                due_date=next_due,
                cycle_start_date=now,
                status=next_status
            )
        else:
            # One-time obligation: Mark terminal completion
            update_fields["status"] = "COMPLETED"

        ob_repo.collection.update_one(
            {"_id": obligation["_id"]},
            {"$set": update_fields}
        )

        return ob_repo.find_by_id_for_user(obligation["_id"], user_id)

    @classmethod
    def confirm_obligation_date(
        cls,
        obligation_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        confirmed_due_date: datetime,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Converts a NEEDS_CONFIRMATION obligation to an active confirmed obligation.
        """
        ob_repo = ComplianceObligationRepository()
        cycle_repo = ComplianceCycleRepository()

        obligation = ob_repo.find_by_id_for_user(obligation_id, user_id)
        if not obligation:
            raise ValueError("Obligation not found or access unauthorized.")

        now = datetime.now(timezone.utc)
        new_status = cls.calculate_status(confirmed_due_date, "UPCOMING", has_completed=False)

        ob_repo.collection.update_one(
            {"_id": obligation["_id"]},
            {"$set": {
                "due_date": confirmed_due_date,
                "status": new_status,
                "source_verification_status": "INDICATIVE_INTERNAL",
                "confirmation_notes": notes.strip() if notes else None,
                "confirmed_at": now,
                "updated_at": now
            }}
        )

        # Update cycle due_date
        current_cycle_num = obligation.get("current_cycle_number", 1)
        cycle_repo.collection.update_one(
            {"obligation_id": obligation["_id"], "cycle_number": current_cycle_num},
            {"$set": {
                "due_date": confirmed_due_date,
                "status": new_status,
                "updated_at": now
            }}
        )

        return ob_repo.find_by_id_for_user(obligation["_id"], user_id)

    @classmethod
    def review_completion_officer(
        cls,
        obligation_id: Union[str, ObjectId],
        record_id: Union[str, ObjectId],
        officer_user_id: Union[str, ObjectId],
        officer_role: str,
        officer_dept: Optional[str],
        officer_jurisdiction: Optional[str],
        decision: str,  # VERIFIED_COMPLETE | REVISION_REQUIRED
        remarks: str
    ) -> Dict[str, Any]:
        """
        Allows department officers to conduct internal technical reviews of submitted compliance evidence.
        Strictly enforces department & jurisdiction boundaries.
        """
        ob_repo = ComplianceObligationRepository()
        comp_repo = ComplianceCompletionRepository()
        notif_repo = NotificationRepository()

        obligation = ob_repo.collection.find_one({"_id": ob_repo.to_object_id(obligation_id)})
        if not obligation:
            raise ValueError("Compliance obligation not found.")

        # Officer scoping checks
        if officer_role != "SUPER_ADMIN":
            if officer_dept and officer_dept != obligation.get("department_code"):
                raise PermissionError("You are not authorized to review obligations for another department.")
            if officer_jurisdiction and officer_jurisdiction != obligation.get("jurisdiction_code"):
                raise PermissionError("You are not authorized to review obligations in another state jurisdiction.")

        r_oid = comp_repo.to_object_id(record_id)
        record = comp_repo.collection.find_one({"_id": r_oid, "obligation_id": obligation["_id"]})
        if not record:
            raise ValueError("Completion record not found.")

        now = datetime.now(timezone.utc)
        new_status = "VERIFIED_COMPLETE" if decision == "VERIFIED_COMPLETE" else "REVISION_REQUIRED"

        comp_repo.collection.update_one(
            {"_id": r_oid},
            {"$set": {
                "review_status": new_status,
                "reviewed_by_officer_id": comp_repo.to_object_id(officer_user_id),
                "reviewed_at": now,
                "officer_remarks": remarks.strip()
            }}
        )

        # Notify business owner of review decision
        notif_repo.create_notification(
            recipient_user_id=obligation["owner_user_id"],
            notification_type="COMPLIANCE_REVIEW_COMPLETED",
            title=f"Compliance Evidence Review: {new_status}",
            message=f"Review completed for '{obligation['title']}': {remarks}",
            reference_id=obligation.get("obligation_number")
        )

        return comp_repo.collection.find_one({"_id": r_oid})
