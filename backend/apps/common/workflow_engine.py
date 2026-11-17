"""
Central Event-Driven Workflow Engine for BizPermit.
Persists workflow events to MongoDB 'platform_events', dispatches targeted deduplicated in-app notifications,
and enforces authoritative task assignment, reassignment, and state consistency across role portals.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId
from apps.database.connection import get_db
from apps.common.base_repository import BaseRepository
from apps.common.audit import log_audit_event
from apps.notifications.repository import NotificationRepository


class PlatformEventRepository(BaseRepository):
    collection_name = "platform_events"

    def record_event(
        self,
        event_type: str,
        actor_user_id: Optional[Union[str, ObjectId]],
        actor_role: str,
        target_collection: str,
        target_id: Optional[Union[str, ObjectId]],
        title: str,
        message: str,
        payload: Optional[Dict[str, Any]] = None,
        recipient_user_ids: Optional[List[Union[str, ObjectId]]] = None,
        session=None
    ) -> Dict[str, Any]:
        actor_oid = self.to_object_id(actor_user_id) if actor_user_id else None
        target_oid = self.to_object_id(target_id) if target_id else None
        target_val = target_oid if target_oid is not None else (str(target_id) if target_id else None)
        recipients_oid = [self.to_object_id(r) for r in (recipient_user_ids or []) if self.to_object_id(r)]

        now = datetime.now(timezone.utc)
        doc = {
            "event_type": event_type.strip().upper(),
            "actor_user_id": actor_oid,
            "actor_role": actor_role.strip().upper() if actor_role else "SYSTEM",
            "target_collection": target_collection.strip().lower(),
            "target_id": target_val,
            "title": title.strip(),
            "message": message.strip(),
            "payload": payload or {},
            "recipient_user_ids": recipients_oid,
            "created_at": now
        }
        return self.create(doc, session=session)

    def find_events_for_target(
        self,
        target_collection: str,
        target_id: Union[str, ObjectId],
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        target_oid = self.to_object_id(target_id)
        queries = [{"target_id": str(target_id)}]
        if target_oid:
            queries.append({"target_id": target_oid})
        return list(
            self.collection.find({
                "target_collection": target_collection.strip().lower(),
                "$or": queries
            }).sort("created_at", -1).limit(limit)
        )


class WorkflowEngine:
    """
    Authoritative workflow and notification coordinator.
    """

    AUTHORITATIVE_DEPARTMENT_ALIASES = {
        "IN-GJ-IND": {"IN-GJ-IND", "IND", "GJ-IND", "COMMISSIONERATE-OF-INDUSTRIES-GJ"},
        "IN-MH-IND": {"IN-MH-IND", "IND", "MH-IND", "DIRECTORATE-OF-INDUSTRIES-MH"},
        "IN-CEN-MSME": {"IN-CEN-MSME", "MSME", "MINISTRY-OF-MSME"},
        "IN-CEN-MOFPI": {"IN-CEN-MOFPI", "MOFPI", "MINISTRY-OF-FOOD-PROCESSING"},
        "IN-CEN-MNRE": {"IN-CEN-MNRE", "MNRE", "MINISTRY-OF-NEW-AND-RENEWABLE-ENERGY"},
        "IN-CEN-MHI": {"IN-CEN-MHI", "MHI", "MINISTRY-OF-HEAVY-INDUSTRIES"},
        "GPCB-ENV": {"GPCB-ENV", "GPCB", "IN-GJ-GPCB"},
        "MPCB-ENV": {"MPCB-ENV", "MPCB", "IN-MH-MPCB"},
        "GJ-DISH": {"GJ-DISH", "DISH"},
    }

    @classmethod
    def _is_dept_match(cls, off_dept: str, target_dept: str) -> bool:
        if not off_dept or not target_dept:
            return True
        o = str(off_dept).strip().upper()
        t = str(target_dept).strip().upper()
        if o == t:
            return True
        for canonical, aliases in cls.AUTHORITATIVE_DEPARTMENT_ALIASES.items():
            aliases_upper = {a.upper() for a in aliases}
            aliases_upper.add(canonical.upper())
            if t in aliases_upper and o in aliases_upper:
                return True
        return False

    @classmethod
    def publish_event(
        cls,
        event_type: str,
        actor_user_id: Optional[Union[str, ObjectId]],
        actor_role: str,
        target_collection: str,
        target_id: Union[str, ObjectId],
        title: str,
        message: str,
        payload: Optional[Dict[str, Any]] = None,
        recipient_user_ids: Optional[List[Union[str, ObjectId]]] = None,
        reference_id: Optional[str] = None,
        session=None
    ) -> Dict[str, Any]:
        """
        1. Persists event in platform_events.
        2. Logs immutable security audit entry.
        3. Dispatches targeted, deduplicated in-app notifications to all specified recipients.
        """
        event_repo = PlatformEventRepository()
        event_doc = event_repo.record_event(
            event_type=event_type,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            target_collection=target_collection,
            target_id=target_id,
            title=title,
            message=message,
            payload=payload,
            recipient_user_ids=recipient_user_ids,
            session=session
        )

        # Log audit entry
        try:
            log_audit_event(
                actor_user_id=actor_user_id,
                actor_role=actor_role or "SYSTEM",
                action=event_type,
                target_collection=target_collection,
                target_id=target_id,
                delta={"title": title, "payload": payload or {}},
                session=session
            )
        except Exception:
            pass

        # Dispatch in-app notifications
        if recipient_user_ids:
            notif_repo = NotificationRepository()
            db = get_db()
            ref_str = str(reference_id) if reference_id else str(target_id)

            for r_id in recipient_user_ids:
                r_oid = BaseRepository.to_object_id(r_id)
                if not r_oid or r_oid == BaseRepository.to_object_id(actor_user_id):
                    # Do not notify self of own action
                    continue

                # Deduplication check: prevent identical unread notification within 5 minutes
                existing_dup = db.notifications.find_one({
                    "recipient_user_id": r_oid,
                    "notification_type": event_type.strip().upper(),
                    "reference_id": ref_str,
                    "is_read": False
                })
                if not existing_dup:
                    notif_repo.create_notification(
                        recipient_user_id=r_oid,
                        notification_type=event_type,
                        title=title,
                        message=message,
                        reference_id=ref_str,
                        metadata=payload or {},
                        session=session
                    )

        return event_doc

    @classmethod
    def assign_officer(
        cls,
        target_collection: str,
        target_id: Union[str, ObjectId],
        officer_user_id: Union[str, ObjectId],
        assigned_by_user_id: Union[str, ObjectId],
        assigned_by_role: str,
        remarks: str = "",
        session=None
    ) -> Dict[str, Any]:
        """
        Explicitly assigns an active, eligible Department Officer to a target item
        (application, document, scheme, grievance).
        Validates officer existence, active status, role, and jurisdiction matching.
        Revokes previous officer access and appends to assignment_history.
        """
        db = get_db()
        target_oid = BaseRepository.to_object_id(target_id)
        officer_oid = BaseRepository.to_object_id(officer_user_id)
        assigner_oid = BaseRepository.to_object_id(assigned_by_user_id)

        # 1. Fetch and validate officer
        officer = db.users.find_one({"_id": officer_oid, "role": "DEPARTMENT_OFFICER"})
        if not officer:
            raise ValueError(f"Officer with ID '{officer_user_id}' not found or is not a Department Officer.")
        if not officer.get("is_active", True):
            raise PermissionError(f"Officer '{officer.get('email')}' account is inactive/suspended.")

        off_prof = officer.get("officer_profile", {})
        off_dept = off_prof.get("department_code") or officer.get("department_code")
        off_state = off_prof.get("jurisdiction_code") or officer.get("jurisdiction_code")

        # Validate officer permitted action permissions
        permitted_actions = [str(a).strip().upper() for a in off_prof.get("permitted_workflow_actions", [])]
        if permitted_actions and not any(a in permitted_actions for a in ("REVIEW", "RECOMMEND", "SCRUTINY", "APPROVE", "RECORD_OBSERVATION", "ALL", "ASSIGN")):
            raise PermissionError(f"Officer '{officer.get('email')}' does not possess permitted workflow action permissions.")

        # 2. Fetch target record
        coll_name = target_collection.strip().lower()
        if coll_name in ("schemes", "scheme", "scheme_application", "scheme_applications"):
            coll_name = "scheme_applications"
        elif coll_name in ("documents", "document", "business_documents", "vault"):
            coll_name = "business_documents"
        elif coll_name in ("grievances", "grievance"):
            coll_name = "grievances"
        elif coll_name in ("applications", "application"):
            coll_name = "applications"
        elif coll_name in ("compliance", "compliance_obligations", "obligations"):
            coll_name = "compliance_obligations"

        coll = db[coll_name]
        target_doc = coll.find_one({"_id": target_oid}) if target_oid else None
        if not target_doc:
            target_doc = coll.find_one({"_id": str(target_id)})
        if not target_doc:
            target_doc = coll.find_one({
                "$or": [
                    {"application_number": str(target_id)},
                    {"grievance_token": str(target_id)},
                    {"grievance_reference": str(target_id)},
                    {"application_reference": str(target_id)},
                    {"document_id": str(target_id)},
                    {"token": str(target_id)}
                ]
            })
        if not target_doc:
            raise ValueError(f"Target record in '{target_collection}' not found.")
        target_oid = target_doc["_id"]

        # Validate department & jurisdiction alignment
        target_dept = target_doc.get("department_code")
        target_state = target_doc.get("state_code") or target_doc.get("jurisdiction_code")

        if off_dept and target_dept and not cls._is_dept_match(off_dept, target_dept):
            raise PermissionError(
                f"Officer belongs to department '{off_dept}', but target requires '{target_dept}'."
            )
        if off_state and target_state and off_state != target_state and off_state != "IN-ALL":
            raise PermissionError(
                f"Officer jurisdiction is '{off_state}', but target requires '{target_state}'."
            )

        now = datetime.now(timezone.utc)
        prev_officer_id = target_doc.get("assigned_officer_id")

        assignment_entry = {
            "assigned_officer_id": officer_oid,
            "assigned_officer_name": officer.get("full_name"),
            "assigned_officer_email": officer.get("email"),
            "assigned_officer_designation": off_prof.get("designation") or officer.get("designation", "Statutory Officer"),
            "assigned_officer_badge": off_prof.get("badge_number") or officer.get("badge_number", "N/A"),
            "assigned_officer_department": off_dept,
            "assigned_by_user_id": assigner_oid,
            "assigned_by_role": assigned_by_role,
            "assigned_at": now,
            "remarks": remarks.strip() if remarks else "Officer assignment updated.",
            "previous_officer_id": prev_officer_id
        }

        # Update target document
        update_payload = {
            "assigned_officer_id": officer_oid,
            "assigned_officer_name": officer.get("full_name"),
            "assigned_officer_email": officer.get("email"),
            "assigned_officer_designation": assignment_entry["assigned_officer_designation"],
            "assigned_officer_badge": assignment_entry["assigned_officer_badge"],
            "assigned_officer_department": off_dept,
            "assigned_at": now,
            "updated_at": now
        }

        # Align status transition on assignment
        if coll_name == "applications" and target_doc.get("status") in ("SUBMITTED", "DRAFT"):
            update_payload["status"] = "UNDER_SCRUTINY"
        elif coll_name == "business_documents" and target_doc.get("verification_status") in ("PENDING", "UPLOADED", "UNVERIFIED", None):
            update_payload["verification_status"] = "PENDING_VERIFICATION"
        elif coll_name == "scheme_applications" and target_doc.get("review_status") in ("PENDING_REVIEW", "SUBMITTED", "USER_REPORTED_EXTERNAL_SUBMISSION", None):
            update_payload["review_status"] = "ASSIGNED"
        elif coll_name == "grievances" and target_doc.get("status") in ("SUBMITTED", "PENDING_ASSIGNMENT", "TRIAGED"):
            update_payload["status"] = "ASSIGNED"

        update_res = coll.update_one(
            {"_id": target_oid},
            {
                "$set": update_payload,
                "$push": {"assignment_history": assignment_entry}
            },
            session=session
        )
        if update_res.matched_count == 0:
            raise ValueError(f"Failed to update target record '{target_oid}' in collection '{coll_name}'. Record not found.")

        ref_ident = (
            target_doc.get("application_number")
            or target_doc.get("grievance_token")
            or target_doc.get("grievance_reference")
            or target_doc.get("scheme_application_number")
            or target_doc.get("application_reference")
            or target_doc.get("document_name")
            or str(target_oid)
        )

        # Notify assigned officer and business owner
        owner_id = target_doc.get("owner_user_id") or target_doc.get("user_id")
        if not owner_id and target_doc.get("business_id"):
            b_oid = BaseRepository.to_object_id(target_doc["business_id"])
            if b_oid:
                biz = db.businesses.find_one({"_id": b_oid})
                if biz:
                    owner_id = biz.get("owner_user_id") or biz.get("user_id")

        recipients = [officer_oid]
        if owner_id:
            recipients.append(owner_id)
        if prev_officer_id and prev_officer_id != officer_oid:
            recipients.append(prev_officer_id)

        cls.publish_event(
            event_type=f"{coll_name.upper()}_OFFICER_ASSIGNED",
            actor_user_id=assigned_by_user_id,
            actor_role=assigned_by_role,
            target_collection=coll_name,
            target_id=target_oid,
            title=f"Officer Assigned: {ref_ident}",
            message=f"{officer.get('full_name')} ({off_dept or 'Regulatory Department'}) has been assigned to {ref_ident}.",
            payload={
                "assigned_officer_id": str(officer_oid),
                "officer_name": officer.get("full_name"),
                "officer_email": officer.get("email"),
                "reference": ref_ident
            },
            recipient_user_ids=recipients,
            reference_id=ref_ident,
            session=session
        )

        return coll.find_one({"_id": target_oid})
