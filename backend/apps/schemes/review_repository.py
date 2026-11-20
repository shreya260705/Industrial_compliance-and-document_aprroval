"""
BizPermit Phase 6 Module 2: Officer Review Workflow & Immutable Audit Engine.
Implements internal administrative scrutiny desk for scheme dossiers, clarification loops,
and an append-only audit trail.

CRITICAL ARCHITECTURAL BOUNDARY:
BizPermit is an independent prototype under SIH26130.
Officer review actions are strictly internal BizPermit administrative assessments.
They do NOT represent statutory government sanctions, subsidy releases, or formal legal clearances.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId

from apps.common.base_repository import BaseRepository
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository
from apps.documents.services.supabase_storage import SupabaseStorageService
from apps.notifications.repository import NotificationRepository
from apps.schemes.repository import SchemeRepository


class SchemeReviewAuditRepository(BaseRepository):
    """
    Append-only audit log collection for all scheme dossier review events.
    Strictly immutable: no update or delete operations are exposed or supported.
    """
    collection_name = "scheme_review_audit_logs"

    def log_event(
        self,
        dossier_id: Union[str, ObjectId],
        application_reference: str,
        actor_id: Union[str, ObjectId],
        actor_email: str,
        actor_role: str,
        actor_department: Optional[str],
        actor_jurisdiction: Optional[str],
        action: str,
        previous_state: str,
        new_state: str,
        remarks: str,
        metadata: Optional[Dict[str, Any]] = None,
        session=None
    ) -> Dict[str, Any]:
        """Creates an immutable audit record for an administrative review event."""
        now = datetime.now(timezone.utc)
        dossier_oid = self.to_object_id(dossier_id)
        actor_oid = self.to_object_id(actor_id)

        audit_entry = {
            "event_id": str(uuid.uuid4()),
            "dossier_id": dossier_oid,
            "application_reference": application_reference,
            "actor_id": actor_oid,
            "actor_email": actor_email,
            "actor_role": actor_role,
            "actor_department": actor_department,
            "actor_jurisdiction": actor_jurisdiction,
            "action": action.strip().upper(),
            "previous_state": previous_state,
            "new_state": new_state,
            "timestamp": now,
            "remarks": remarks.strip(),
            "metadata": metadata or {},
            "prototype_disclaimer": (
                "BizPermit Prototype - SIH26130: Internal administrative audit record. "
                "Does not represent statutory government department record."
            )
        }

        result = self.collection.insert_one(audit_entry, session=session)
        audit_entry["_id"] = result.inserted_id
        return audit_entry

    def get_dossier_audit_history(
        self,
        dossier_id: Union[str, ObjectId]
    ) -> List[Dict[str, Any]]:
        """Returns the chronological audit history for a dossier."""
        dossier_oid = self.to_object_id(dossier_id)
        if not dossier_oid:
            return []
        cursor = self.collection.find({"dossier_id": dossier_oid}).sort("timestamp", -1)
        return [BaseRepository.serialize_doc(doc) for doc in cursor]


# Explicit, authoritative validated alias mapping:
# Key: canonical department identifier. Value: set of validated authoritative aliases/short-codes.
# Suffix matching is STRICTLY PROHIBITED.
AUTHORITATIVE_DEPARTMENT_ALIASES: Dict[str, Set[str]] = {
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


def is_department_match(officer_dept: str, dossier_dept: str, officer_state: Optional[str] = None) -> bool:
    """
    Evaluates department scoping using EXACT authoritative matching or explicit validated alias mapping.
    Unsafe suffix-based matching is strictly prohibited.
    """
    if not officer_dept or not dossier_dept:
        return False

    off_d = str(officer_dept).strip().upper()
    dos_d = str(dossier_dept).strip().upper()

    # 1. Exact authoritative match
    if off_d == dos_d:
        return True

    # 2. Check explicit validated alias mapping
    for canonical, aliases in AUTHORITATIVE_DEPARTMENT_ALIASES.items():
        canonical_upper = canonical.upper()
        aliases_upper = {a.upper() for a in aliases}
        if dos_d == canonical_upper or dos_d in aliases_upper:
            if off_d in aliases_upper:
                return True

    return False


def _get_user_attr(user, attr: str, default=None):
    if user is None:
        return default
    if isinstance(user, dict):
        if attr == "id":
            return user.get("_id") or user.get("id") or default
        return user.get(attr, default)
    return getattr(user, attr, default)


class SchemeReviewRepository(BaseRepository):
    """
    Repository for Department Officer scrutiny, review queues, clarification loops,
    and Super Admin review oversight. Operates on `scheme_applications` collection.
    """
    collection_name = "scheme_applications"

    def __init__(self):
        super().__init__()
        self.audit_repo = SchemeReviewAuditRepository()
        self.notification_repo = NotificationRepository()

    def check_officer_scoping(self, officer_user, dossier: Dict[str, Any]) -> None:
        """
        Enforces server-side department and geographical scoping barriers.
        Never trusts frontend claims.
        """
        if not officer_user:
            raise PermissionError("Access forbidden: Authentication required.")

        user_role = _get_user_attr(officer_user, "role", "")
        if user_role == "SUPER_ADMIN":
            return  # Super Admin has national oversight across all departments and states

        if user_role != "DEPARTMENT_OFFICER":
            raise PermissionError("Access forbidden: Only Department Officers and Super Administrators can access the review desk.")

        # 1. Profile validity and active status check
        is_active = _get_user_attr(officer_user, "is_active", True)
        if is_active is False:
            raise PermissionError("Access forbidden: Officer account is deactivated.")

        off_prof = _get_user_attr(officer_user, "officer_profile", None)
        if not isinstance(off_prof, dict) or not off_prof:
            raise PermissionError("Access forbidden: Department Officer profile is missing or invalid.")

        # 2. Officer department assignment check
        off_dept = off_prof.get("department_code")
        if not off_dept or not str(off_dept).strip():
            raise PermissionError("Access forbidden: Officer has no assigned department.")
        off_dept = str(off_dept).strip()

        # 3. Officer jurisdiction assignment check
        off_state = off_prof.get("jurisdiction_code")
        if not off_state or not str(off_state).strip():
            raise PermissionError("Access forbidden: Officer has no assigned jurisdiction.")
        off_state = str(off_state).strip()

        # 4. Dossier department and state presence check
        dossier_dept = dossier.get("department_code")
        dossier_state = dossier.get("state_code")

        if not dossier_dept or not str(dossier_dept).strip():
            raise PermissionError("Access forbidden: Application dossier has no designated department.")
        dossier_dept = str(dossier_dept).strip()

        if not dossier_state or not str(dossier_state).strip():
            raise PermissionError("Access forbidden: Application dossier has no designated jurisdiction.")
        dossier_state = str(dossier_state).strip()

        # 5. Department scoping defense (exact match or validated alias, NO suffix matching)
        if not is_department_match(off_dept, dossier_dept, off_state):
            raise PermissionError(
                f"Department Scoping Violation: You are assigned to department '{off_dept}', "
                f"which cannot review dossiers for department '{dossier_dept}'."
            )

        # 6. State jurisdiction scoping defense
        if off_state != "IN-ALL":
            if dossier_state != "IN-ALL" and off_state != dossier_state:
                raise PermissionError(
                    f"Geographical Jurisdiction Violation: You are assigned to jurisdiction '{off_state}', "
                    f"which cannot review dossiers from '{dossier_state}'."
                )

        # 7. Assignment locking defense (another officer cannot access task assigned to someone else)
        assigned_id = dossier.get("assigned_officer_id")
        officer_uid = _get_user_attr(officer_user, "id")
        if assigned_id and str(assigned_id) != str(officer_uid):
            raise PermissionError("Access forbidden: You are not authorized to access this scheme application as it is assigned to another officer.")

    def get_officer_queue(
        self,
        officer_user,
        review_status: Optional[str] = None,
        assigned_filter: Optional[str] = None,  # "ME", "UNASSIGNED", "ALL"
        scheme_code: Optional[str] = None,
        state_code: Optional[str] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Retrieves the scoped review queue for an officer or Super Admin.
        Computes ageing in days and priority indicators.
        """
        user_role = _get_user_attr(officer_user, "role", "")
        query: Dict[str, Any] = {}

        # 1. Scoping by role, department, and state
        if user_role == "DEPARTMENT_OFFICER":
            is_active = _get_user_attr(officer_user, "is_active", True)
            off_prof = _get_user_attr(officer_user, "officer_profile", None)
            if is_active is False or not isinstance(off_prof, dict) or not off_prof:
                return {"total_count": 0, "items": [], "skip": skip, "limit": limit}

            off_dept = str(off_prof.get("department_code") or "").strip()
            off_state = str(off_prof.get("jurisdiction_code") or "").strip()
            if not off_dept or not off_state:
                return {"total_count": 0, "items": [], "skip": skip, "limit": limit}

            # Find matching authoritative departments and explicit aliases
            matched_depts = {off_dept}
            for canonical, aliases in AUTHORITATIVE_DEPARTMENT_ALIASES.items():
                if off_dept.upper() == canonical.upper() or off_dept.upper() in {a.upper() for a in aliases}:
                    if off_dept.upper() == "IND" and "-" in canonical.upper():
                        if off_state != "IN-ALL" and not canonical.upper().startswith(off_state.upper()):
                            continue
                    matched_depts.add(canonical)
                    matched_depts.update(aliases)

            query["department_code"] = {"$in": list(matched_depts)}
            if off_state != "IN-ALL":
                query["state_code"] = off_state

        # 2. Status filter
        if review_status:
            query["review_status"] = review_status.strip().upper()
        else:
            query["review_status"] = {"$ne": "REVIEW_WITHDRAWN"}

        # 3. Assignment filter
        officer_oid = self.to_object_id(_get_user_attr(officer_user, "id"))
        if assigned_filter == "ME":
            query["assigned_officer_id"] = officer_oid
        elif assigned_filter == "UNASSIGNED":
            query["$or"] = [
                {"assigned_officer_id": None},
                {"assigned_officer_id": {"$exists": False}}
            ]
        elif user_role == "DEPARTMENT_OFFICER":
            query["$or"] = [
                {"assigned_officer_id": officer_oid},
                {"assigned_officer_id": None},
                {"assigned_officer_id": {"$exists": False}}
            ]

        # 4. Scheme & State query filters
        if scheme_code:
            query["scheme_code"] = scheme_code.strip().upper()
        if state_code and user_role == "SUPER_ADMIN":
            query["state_code"] = state_code.strip().upper()

        # 5. Search query
        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"application_reference": regex},
                {"scheme_code": regex}
            ]

        now = datetime.now(timezone.utc)
        total_count = self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)

        items = []
        loc_repo = LocationRepository()
        bus_repo = BusinessRepository()

        for doc in cursor:
            created_at = doc.get("submitted_at") or doc.get("created_at") or now
            if isinstance(created_at, datetime):
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                ageing_days = max(0, (now - created_at).days)
            else:
                ageing_days = 0

            # Priority calculation
            cur_status = doc.get("review_status", "PENDING_REVIEW")
            if cur_status == "APPLICANT_RESPONSE_RECEIVED" or ageing_days >= 14:
                priority = "HIGH"
            elif ageing_days >= 7 or cur_status == "CLARIFICATION_REQUESTED":
                priority = "MEDIUM"
            else:
                priority = "NORMAL"

            serialized = BaseRepository.serialize_doc(doc) or {}
            serialized["ageing_days"] = ageing_days
            serialized["priority"] = priority

            # Enrich with entity name preview
            bus = bus_repo.find_by_id(doc.get("business_id"))
            if bus:
                serialized["business_legal_name"] = bus.get("legal_name")
                serialized["business_trade_name"] = bus.get("trade_name")

            loc = loc_repo.find_by_id(doc.get("location_id"))
            if loc:
                serialized["location_name"] = loc.get("location_name")

            items.append(serialized)

        return {
            "total_count": total_count,
            "items": items,
            "skip": skip,
            "limit": limit
        }

    def get_review_detail(
        self,
        dossier_id: Union[str, ObjectId],
        officer_user
    ) -> Dict[str, Any]:
        """
        Retrieves full dossier review workspace for an authorized officer.
        Generates temporary secure signed URLs for attached Document Vault files.
        """
        dossier = self.find_by_id(dossier_id)
        if not dossier:
            raise ValueError("Scheme application dossier not found.")

        # Enforce server-side scoping
        self.check_officer_scoping(officer_user, dossier)

        serialized = BaseRepository.serialize_doc(dossier) or {}

        # Enrich Scheme metadata
        scheme_repo = SchemeRepository()
        scheme = scheme_repo.find_by_code(dossier.get("scheme_code"))
        serialized["scheme_detail"] = BaseRepository.serialize_doc(scheme)

        # Enrich Business details
        bus_repo = BusinessRepository()
        bus = bus_repo.find_by_id(dossier.get("business_id"))
        serialized["business_detail"] = BaseRepository.serialize_doc(bus)

        # Enrich Location profile
        loc_repo = LocationRepository()
        loc = loc_repo.find_by_id(dossier.get("location_id"))
        serialized["location_detail"] = BaseRepository.serialize_doc(loc)

        # Enrich Recommendation snapshot
        rec_col = self.get_collection("scheme_recommendations")
        rec = rec_col.find_one({"_id": self.to_object_id(dossier.get("recommendation_id"))})
        serialized["recommendation_snapshot"] = BaseRepository.serialize_doc(rec)

        # Enrich attached documents with secure preview tokens
        storage_service = SupabaseStorageService()
        doc_repo = DocumentRepository()
        enriched_attachments = []
        for att in dossier.get("attached_vault_documents", []):
            v_id = att.get("vault_document_id")
            att_data = dict(att)
            if v_id:
                v_doc = doc_repo.find_by_id(v_id)
                if v_doc:
                    att_data["file_name"] = v_doc.get("original_filename") or v_doc.get("document_name") or v_doc.get("file_name") or att.get("file_name")
                    att_data["file_size"] = v_doc.get("file_size_bytes") or v_doc.get("file_size") or att.get("file_size")
                    att_data["mime_type"] = v_doc.get("mime_type") or att.get("mime_type")
                    att_data["document_integrity_sha256"] = v_doc.get("sha256_checksum") or v_doc.get("document_integrity_sha256")
                    # Generate 15-minute temporary secure signed download URL
                    try:
                        storage_path = v_doc.get("storage_object_path") or v_doc.get("storage_path") or v_doc.get("file_path")
                        if storage_path:
                            signed_url = storage_service.create_signed_download_url(storage_path, expires_in=900)
                            att_data["signed_preview_url"] = signed_url
                    except Exception:
                        att_data["signed_preview_url"] = None

            att_data["vault_document_id"] = str(v_id) if v_id else None
            enriched_attachments.append(att_data)

        serialized["attached_vault_documents"] = enriched_attachments

        # Append audit history
        serialized["audit_history"] = self.audit_repo.get_dossier_audit_history(dossier_id)

        return serialized

    def assign_review(
        self,
        dossier_id: Union[str, ObjectId],
        acting_user,
        target_officer_user=None,
        remarks: str = "",
        session=None
    ) -> Dict[str, Any]:
        """
        Assigns or reassigns an officer to a review dossier.
        Permitted states: PENDING_REVIEW, ASSIGNED.
        """
        dossier = self.find_by_id(dossier_id)
        if not dossier:
            raise ValueError("Scheme dossier not found.")

        self.check_officer_scoping(acting_user, dossier)

        assigned_user = target_officer_user or acting_user
        assigned_prof = _get_user_attr(assigned_user, "officer_profile", {}) or {}

        # Validate target officer scoping if assigned by admin
        self.check_officer_scoping(assigned_user, dossier)

        prev_state = dossier.get("review_status", "PENDING_REVIEW")
        if prev_state not in ["PENDING_REVIEW", "ASSIGNED", "UNDER_REVIEW"]:
            raise ValueError(f"Cannot reassign review in state '{prev_state}'.")

        now = datetime.now(timezone.utc)
        officer_uid = _get_user_attr(assigned_user, "id")
        officer_oid = self.to_object_id(officer_uid)
        officer_email = _get_user_attr(assigned_user, "email", "")
        officer_name = _get_user_attr(assigned_user, "full_name", officer_email)

        update_payload = {
            "review_status": "ASSIGNED",
            "assigned_officer_id": officer_oid,
            "assigned_officer_email": officer_email,
            "assigned_officer_name": officer_name,
            "assigned_at": now,
            "updated_at": now
        }

        self.collection.update_one({"_id": dossier["_id"]}, {"$set": update_payload}, session=session)

        # Log immutable audit event
        self.audit_repo.log_event(
            dossier_id=dossier["_id"],
            application_reference=dossier.get("application_reference", "UNKNOWN"),
            actor_id=_get_user_attr(acting_user, "id"),
            actor_email=_get_user_attr(acting_user, "email"),
            actor_role=_get_user_attr(acting_user, "role", "OFFICER"),
            actor_department=assigned_prof.get("department_code"),
            actor_jurisdiction=assigned_prof.get("jurisdiction_code"),
            action="ASSIGN_OFFICER",
            previous_state=prev_state,
            new_state="ASSIGNED",
            remarks=remarks or f"Assigned to {officer_email} for internal review.",
            metadata={"assigned_officer_id": str(officer_oid), "assigned_officer_email": officer_email},
            session=session
        )

        return self.find_by_id(dossier_id)

    def start_review(
        self,
        dossier_id: Union[str, ObjectId],
        officer_user,
        remarks: str = "",
        session=None
    ) -> Dict[str, Any]:
        """Transitions state from ASSIGNED or APPLICANT_RESPONSE_RECEIVED to UNDER_REVIEW."""
        dossier = self.find_by_id(dossier_id)
        if not dossier:
            raise ValueError("Scheme dossier not found.")

        self.check_officer_scoping(officer_user, dossier)

        # Verify officer is assigned officer or Super Admin
        assigned_id = dossier.get("assigned_officer_id")
        user_role = _get_user_attr(officer_user, "role", "")
        officer_uid = _get_user_attr(officer_user, "id")
        if user_role != "SUPER_ADMIN" and assigned_id and str(assigned_id) != str(officer_uid):
            raise PermissionError("You are not the assigned officer for this review dossier.")

        prev_state = dossier.get("review_status", "PENDING_REVIEW")
        if prev_state not in ["ASSIGNED", "APPLICANT_RESPONSE_RECEIVED"]:
            raise ValueError(f"Cannot start review from state '{prev_state}'. Must be ASSIGNED or APPLICANT_RESPONSE_RECEIVED.")

        now = datetime.now(timezone.utc)
        off_prof = _get_user_attr(officer_user, "officer_profile", {}) or {}

        self.collection.update_one(
            {"_id": dossier["_id"]},
            {
                "$set": {
                    "review_status": "UNDER_REVIEW",
                    "review_started_at": now,
                    "updated_at": now
                }
            },
            session=session
        )

        self.audit_repo.log_event(
            dossier_id=dossier["_id"],
            application_reference=dossier.get("application_reference", "UNKNOWN"),
            actor_id=officer_uid,
            actor_email=_get_user_attr(officer_user, "email"),
            actor_role=user_role,
            actor_department=off_prof.get("department_code"),
            actor_jurisdiction=off_prof.get("jurisdiction_code"),
            action="START_REVIEW",
            previous_state=prev_state,
            new_state="UNDER_REVIEW",
            remarks=remarks or "Internal administrative scrutiny commenced.",
            session=session
        )

        return self.find_by_id(dossier_id)

    def request_clarification(
        self,
        dossier_id: Union[str, ObjectId],
        officer_user,
        question: str,
        related_criterion_key: Optional[str] = None,
        deadline_days: int = 15,
        session=None
    ) -> Dict[str, Any]:
        """
        Officer requests specific missing information or evidence from the applicant.
        Transitions state to CLARIFICATION_REQUESTED.
        """
        dossier = self.find_by_id(dossier_id)
        if not dossier:
            raise ValueError("Scheme dossier not found.")

        self.check_officer_scoping(officer_user, dossier)

        assigned_id = dossier.get("assigned_officer_id")
        user_role = _get_user_attr(officer_user, "role", "")
        officer_uid = _get_user_attr(officer_user, "id")
        if user_role != "SUPER_ADMIN" and assigned_id and str(assigned_id) != str(officer_uid):
            raise PermissionError("Only the assigned officer may request clarifications.")

        prev_state = dossier.get("review_status", "PENDING_REVIEW")
        if prev_state != "UNDER_REVIEW":
            raise ValueError(f"Clarifications can only be raised when dossier is UNDER_REVIEW (current: '{prev_state}').")

        question_clean = question.strip()
        if not question_clean:
            raise ValueError("Clarification question/query text is mandatory.")

        now = datetime.now(timezone.utc)
        clarification_id = f"CLR-{uuid.uuid4().hex[:8].upper()}"
        off_prof = _get_user_attr(officer_user, "officer_profile", {}) or {}

        clarification_entry = {
            "clarification_id": clarification_id,
            "officer_id": self.to_object_id(officer_uid),
            "officer_email": _get_user_attr(officer_user, "email"),
            "officer_name": _get_user_attr(officer_user, "full_name", _get_user_attr(officer_user, "email")),
            "question": question_clean,
            "related_criterion_key": related_criterion_key,
            "deadline_days": deadline_days,
            "created_at": now,
            "status": "PENDING",
            "applicant_response": None,
            "applicant_vault_document_ids": [],
            "responded_at": None
        }

        self.collection.update_one(
            {"_id": dossier["_id"]},
            {
                "$set": {
                    "review_status": "CLARIFICATION_REQUESTED",
                    "updated_at": now
                },
                "$push": {"clarifications": clarification_entry}
            },
            session=session
        )

        # Log immutable audit event
        self.audit_repo.log_event(
            dossier_id=dossier["_id"],
            application_reference=dossier.get("application_reference", "UNKNOWN"),
            actor_id=officer_uid,
            actor_email=_get_user_attr(officer_user, "email"),
            actor_role=user_role,
            actor_department=off_prof.get("department_code"),
            actor_jurisdiction=off_prof.get("jurisdiction_code"),
            action="REQUEST_CLARIFICATION",
            previous_state=prev_state,
            new_state="CLARIFICATION_REQUESTED",
            remarks=question_clean,
            metadata={"clarification_id": clarification_id, "related_criterion_key": related_criterion_key},
            session=session
        )

        # Notify applicant
        applicant_uid = dossier.get("user_id")
        if applicant_uid:
            self.notification_repo.create_notification(
                recipient_user_id=applicant_uid,
                notification_type="SCHEME_CLARIFICATION_REQUESTED",
                title="Clarification Requested on Scheme Dossier",
                message=f"An officer has requested information on your application {dossier.get('application_reference')}: {question_clean[:100]}...",
                reference_id=str(dossier["_id"]),
                metadata={"clarification_id": clarification_id},
                session=session
            )

        return self.find_by_id(dossier_id)

    def respond_to_clarification(
        self,
        dossier_id: Union[str, ObjectId],
        applicant_user,
        clarification_id: str,
        response_text: str,
        vault_document_ids: Optional[List[Union[str, ObjectId]]] = None,
        session=None
    ) -> Dict[str, Any]:
        """
        Applicant responds to an officer's clarification query.
        Transitions state to APPLICANT_RESPONSE_RECEIVED.
        RULE B6: Applicant cannot alter the officer's question or clarification record.
        """
        dossier = self.find_by_id(dossier_id)
        if not dossier:
            raise ValueError("Scheme dossier not found.")

        # Multi-tenant ownership check: only the applicant who created the dossier may respond
        if str(dossier.get("user_id")) != str(applicant_user.id):
            raise PermissionError("Unauthorized: You do not own this application dossier.")

        prev_state = dossier.get("review_status")
        if prev_state != "CLARIFICATION_REQUESTED":
            raise ValueError(f"Cannot respond: Dossier is not in CLARIFICATION_REQUESTED state (current: '{prev_state}').")

        resp_clean = response_text.strip()
        if not resp_clean:
            raise ValueError("Clarification response text is mandatory.")

        now = datetime.now(timezone.utc)
        clarifications = dossier.get("clarifications", [])

        # Find specific pending clarification
        target_clr = None
        for c in clarifications:
            if c.get("clarification_id") == clarification_id and c.get("status") == "PENDING":
                target_clr = c
                break

        if not target_clr:
            raise ValueError(f"Pending clarification '{clarification_id}' not found on this dossier.")

        # Verify vault documents belong to user's business
        doc_repo = DocumentRepository()
        v_oids = []
        for vid in (vault_document_ids or []):
            v_doc = doc_repo.find_by_id_for_user(vid, applicant_user.id)
            if not v_doc:
                raise PermissionError(f"Vault document '{vid}' does not belong to your business.")
            v_oids.append(self.to_object_id(vid))

        # Update clarification item without modifying question or officer
        target_clr["applicant_response"] = resp_clean
        target_clr["applicant_vault_document_ids"] = v_oids
        target_clr["responded_at"] = now
        target_clr["status"] = "RESOLVED"

        self.collection.update_one(
            {"_id": dossier["_id"]},
            {
                "$set": {
                    "review_status": "APPLICANT_RESPONSE_RECEIVED",
                    "clarifications": clarifications,
                    "updated_at": now
                }
            },
            session=session
        )

        # Log immutable audit event
        self.audit_repo.log_event(
            dossier_id=dossier["_id"],
            application_reference=dossier.get("application_reference", "UNKNOWN"),
            actor_id=applicant_user.id,
            actor_email=applicant_user.email,
            actor_role=getattr(applicant_user, "role", "BUSINESS_OWNER"),
            actor_department=None,
            actor_jurisdiction=None,
            action="SUBMIT_CLARIFICATION_RESPONSE",
            previous_state=prev_state,
            new_state="APPLICANT_RESPONSE_RECEIVED",
            remarks=resp_clean,
            metadata={"clarification_id": clarification_id, "attached_vault_doc_ids": [str(v) for v in v_oids]},
            session=session
        )

        # Notify assigned officer
        assigned_officer_id = dossier.get("assigned_officer_id")
        if assigned_officer_id:
            self.notification_repo.create_notification(
                recipient_user_id=assigned_officer_id,
                notification_type="SCHEME_CLARIFICATION_RESOLVED",
                title="Applicant Clarification Response Received",
                message=f"Applicant has responded to clarification on dossier {dossier.get('application_reference')}.",
                reference_id=str(dossier["_id"]),
                metadata={"clarification_id": clarification_id},
                session=session
            )

        return self.find_by_id(dossier_id)

    def complete_review(
        self,
        dossier_id: Union[str, ObjectId],
        officer_user,
        decision: str,
        remarks: str,
        discrepancies: Optional[List[str]] = None,
        session=None
    ) -> Dict[str, Any]:
        """
        Officer records internal review decision.
        Decisions: INTERNAL_VERIFIED, INTERNAL_REJECTED, DISCREPANCIES_NOTED.
        MANDATORY: Explicit prototype disclaimer embedded on the decision record.
        """
        dossier = self.find_by_id(dossier_id)
        if not dossier:
            raise ValueError("Scheme dossier not found.")

        self.check_officer_scoping(officer_user, dossier)

        assigned_id = dossier.get("assigned_officer_id")
        user_role = _get_user_attr(officer_user, "role", "")
        officer_uid = _get_user_attr(officer_user, "id")
        if user_role != "SUPER_ADMIN" and assigned_id and str(assigned_id) != str(officer_uid):
            raise PermissionError("Only the assigned officer may complete this review.")

        prev_state = dossier.get("review_status", "PENDING_REVIEW")
        if prev_state != "UNDER_REVIEW":
            raise ValueError(f"Review can only be completed from UNDER_REVIEW state (current: '{prev_state}').")

        dec_clean = decision.strip().upper()
        allowed_decisions = ["INTERNAL_VERIFIED", "INTERNAL_REJECTED", "DISCREPANCIES_NOTED"]
        if dec_clean not in allowed_decisions:
            raise ValueError(f"Invalid decision '{dec_clean}'. Allowed: {', '.join(allowed_decisions)}")

        remarks_clean = remarks.strip()
        if not remarks_clean:
            raise ValueError("Review decision remarks are mandatory.")

        now = datetime.now(timezone.utc)
        off_prof = _get_user_attr(officer_user, "officer_profile", {}) or {}

        decision_doc = {
            "decision": dec_clean,
            "decision_label": f"Internal Platform Review: {dec_clean.replace('_', ' ').title()}",
            "remarks": remarks_clean,
            "discrepancies": discrepancies or [],
            "reviewed_by_id": self.to_object_id(officer_uid),
            "reviewed_by_email": _get_user_attr(officer_user, "email"),
            "reviewed_by_name": _get_user_attr(officer_user, "full_name", _get_user_attr(officer_user, "email")),
            "reviewed_at": now,
            "prototype_disclaimer": (
                "SIH26130 PROTOTYPE NOTICE: This decision represents an internal BizPermit administrative "
                "evaluation. It DOES NOT constitute a statutory government sanction, financial sanction order, "
                "or formal credit guarantee clearance from the nodal authority."
            )
        }

        self.collection.update_one(
            {"_id": dossier["_id"]},
            {
                "$set": {
                    "review_status": "REVIEW_COMPLETED",
                    "review_decision": decision_doc,
                    "completed_at": now,
                    "updated_at": now
                }
            },
            session=session
        )

        # Log immutable audit event
        self.audit_repo.log_event(
            dossier_id=dossier["_id"],
            application_reference=dossier.get("application_reference", "UNKNOWN"),
            actor_id=officer_uid,
            actor_email=_get_user_attr(officer_user, "email"),
            actor_role=user_role,
            actor_department=off_prof.get("department_code"),
            actor_jurisdiction=off_prof.get("jurisdiction_code"),
            action="COMPLETE_REVIEW",
            previous_state=prev_state,
            new_state="REVIEW_COMPLETED",
            remarks=remarks_clean,
            metadata={"decision": dec_clean, "discrepancies": discrepancies or []},
            session=session
        )

        # Notify applicant
        applicant_uid = dossier.get("user_id")
        if applicant_uid:
            self.notification_repo.create_notification(
                recipient_user_id=applicant_uid,
                notification_type="SCHEME_REVIEW_COMPLETED",
                title="Internal Scheme Review Completed",
                message=f"Review completed for dossier {dossier.get('application_reference')}: {dec_clean}. Remarks: {remarks_clean[:100]}",
                reference_id=str(dossier["_id"]),
                metadata={"decision": dec_clean},
                session=session
            )

        return self.find_by_id(dossier_id)

    def refer_for_manual_review(
        self,
        dossier_id: Union[str, ObjectId],
        officer_user,
        escalation_reason: str,
        referred_authority: str,
        remarks: str = "",
        session=None
    ) -> Dict[str, Any]:
        """Escalates dossier to senior nodal authority / manual review."""
        dossier = self.find_by_id(dossier_id)
        if not dossier:
            raise ValueError("Scheme dossier not found.")

        self.check_officer_scoping(officer_user, dossier)

        assigned_id = dossier.get("assigned_officer_id")
        user_role = _get_user_attr(officer_user, "role", "")
        officer_uid = _get_user_attr(officer_user, "id")
        if user_role != "SUPER_ADMIN" and assigned_id and str(assigned_id) != str(officer_uid):
            raise PermissionError("Only the assigned officer may refer this review.")

        prev_state = dossier.get("review_status", "PENDING_REVIEW")
        if prev_state != "UNDER_REVIEW":
            raise ValueError(f"Dossier can only be referred from UNDER_REVIEW state (current: '{prev_state}').")

        reason_clean = escalation_reason.strip()
        auth_clean = referred_authority.strip()
        if not reason_clean or not auth_clean:
            raise ValueError("Escalation reason and referred authority are mandatory.")

        now = datetime.now(timezone.utc)
        off_prof = _get_user_attr(officer_user, "officer_profile", {}) or {}

        referral_doc = {
            "escalation_reason": reason_clean,
            "referred_authority": auth_clean,
            "remarks": remarks.strip(),
            "referred_by_id": self.to_object_id(officer_uid),
            "referred_at": now
        }

        self.collection.update_one(
            {"_id": dossier["_id"]},
            {
                "$set": {
                    "review_status": "REFERRED_FOR_MANUAL_REVIEW",
                    "manual_referral": referral_doc,
                    "updated_at": now
                }
            },
            session=session
        )

        self.audit_repo.log_event(
            dossier_id=dossier["_id"],
            application_reference=dossier.get("application_reference", "UNKNOWN"),
            actor_id=officer_uid,
            actor_email=_get_user_attr(officer_user, "email"),
            actor_role=_get_user_attr(officer_user, "role", "OFFICER"),
            actor_department=off_prof.get("department_code"),
            actor_jurisdiction=off_prof.get("jurisdiction_code"),
            action="REFER_MANUAL_REVIEW",
            previous_state=prev_state,
            new_state="REFERRED_FOR_MANUAL_REVIEW",
            remarks=reason_clean,
            metadata=referral_doc,
            session=session
        )

        return self.find_by_id(dossier_id)

    def withdraw_review(
        self,
        dossier_id: Union[str, ObjectId],
        acting_user,
        reason: str,
        session=None
    ) -> Dict[str, Any]:
        """Transitions state to REVIEW_WITHDRAWN."""
        dossier = self.find_by_id(dossier_id)
        if not dossier:
            raise ValueError("Scheme dossier not found.")

        user_role = _get_user_attr(acting_user, "role", "")
        acting_uid = _get_user_attr(acting_user, "id")
        # Either the applicant user or Super Admin can withdraw
        if user_role != "SUPER_ADMIN" and str(dossier.get("user_id")) != str(acting_uid):
            raise PermissionError("Only the application owner or Super Admin may withdraw the review.")

        prev_state = dossier.get("review_status", "PENDING_REVIEW")
        if prev_state in ["REVIEW_COMPLETED", "REVIEW_WITHDRAWN"]:
            raise ValueError(f"Cannot withdraw review in terminal state '{prev_state}'.")

        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": dossier["_id"]},
            {
                "$set": {
                    "review_status": "REVIEW_WITHDRAWN",
                    "withdrawal_reason": reason.strip(),
                    "withdrawn_at": now,
                    "updated_at": now
                }
            },
            session=session
        )

        self.audit_repo.log_event(
            dossier_id=dossier["_id"],
            application_reference=dossier.get("application_reference", "UNKNOWN"),
            actor_id=acting_uid,
            actor_email=_get_user_attr(acting_user, "email"),
            actor_role=user_role,
            actor_department=None,
            actor_jurisdiction=None,
            action="WITHDRAW_REVIEW",
            previous_state=prev_state,
            new_state="REVIEW_WITHDRAWN",
            remarks=reason.strip(),
            session=session
        )

        return self.find_by_id(dossier_id)

    def get_super_admin_oversight(self) -> Dict[str, Any]:
        """
        National-level review analytics computed directly from MongoDB aggregations.
        No fabricated or mocked numbers.
        """
        # 1. Total review status distribution
        pipeline_status = [
            {"$group": {"_id": "$review_status", "count": {"$sum": 1}}}
        ]
        status_counts = {item["_id"] or "UNINITIALIZED": item["count"] for item in self.collection.aggregate(pipeline_status)}

        # 2. State distribution
        pipeline_state = [
            {"$group": {"_id": "$state_code", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        state_distribution = [
            {"state_code": item["_id"] or "UNKNOWN", "count": item["count"]}
            for item in self.collection.aggregate(pipeline_state)
        ]

        # 3. Department distribution
        pipeline_dept = [
            {"$group": {"_id": "$department_code", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        dept_distribution = [
            {"department_code": item["_id"] or "UNKNOWN", "count": item["count"]}
            for item in self.collection.aggregate(pipeline_dept)
        ]

        # 4. Officer workload breakdown
        pipeline_workload = [
            {"$match": {"assigned_officer_email": {"$ne": None}}},
            {"$group": {
                "_id": "$assigned_officer_email",
                "officer_name": {"$first": "$assigned_officer_name"},
                "active_reviews": {"$sum": {"$cond": [{"$in": ["$review_status", ["ASSIGNED", "UNDER_REVIEW", "CLARIFICATION_REQUESTED", "APPLICANT_RESPONSE_RECEIVED"]]}, 1, 0]}},
                "completed_reviews": {"$sum": {"$cond": [{"$eq": ["$review_status", "REVIEW_COMPLETED"]}, 1, 0]}},
                "total_assigned": {"$sum": 1}
            }},
            {"$sort": {"active_reviews": -1}}
        ]
        officer_workload = [
            {
                "officer_email": item["_id"],
                "officer_name": item.get("officer_name") or item["_id"],
                "active_reviews": item["active_reviews"],
                "completed_reviews": item["completed_reviews"],
                "total_assigned": item["total_assigned"]
            }
            for item in self.collection.aggregate(pipeline_workload)
        ]

        # 5. Ageing summary: pending reviews older than 7 and 14 days
        now = datetime.now(timezone.utc)
        from datetime import timedelta
        cutoff_7d = now - timedelta(days=7)
        cutoff_14d = now - timedelta(days=14)

        pending_over_7d = self.collection.count_documents({
            "review_status": {"$in": ["PENDING_REVIEW", "ASSIGNED", "UNDER_REVIEW"]},
            "created_at": {"$lte": cutoff_7d}
        })
        pending_over_14d = self.collection.count_documents({
            "review_status": {"$in": ["PENDING_REVIEW", "ASSIGNED", "UNDER_REVIEW"]},
            "created_at": {"$lte": cutoff_14d}
        })

        total_dossiers = self.collection.count_documents({})

        return {
            "total_dossiers": total_dossiers,
            "status_counts": status_counts,
            "state_distribution": state_distribution,
            "dept_distribution": dept_distribution,
            "officer_workload": officer_workload,
            "ageing_metrics": {
                "pending_over_7_days": pending_over_7d,
                "pending_over_14_days": pending_over_14d
            }
        }
