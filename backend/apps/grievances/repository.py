"""
Grievance Redressal and Escalation Engine Repository.
Phase 6 Module 3.
Implements dual-track architecture (Track A: Internal BizPermit Grievance; Track B: External Statutory Grievance Tracking),
strict officer scoping, two-way clarification loops, escalation triggers, and application-level append-only audit logging.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from bson import ObjectId

from apps.common.base_repository import BaseRepository
from apps.schemes.review_repository import (
    AUTHORITATIVE_DEPARTMENT_ALIASES,
    is_department_match,
    _get_user_attr
)
from apps.notifications.repository import NotificationRepository


# =============================================================================
# Prototype Legal Disclaimer
# =============================================================================
GRIEVANCE_PROTOTYPE_DISCLAIMER = (
    "BizPermit Prototype - SIH26130: Grievance Redressal Workspace. "
    "Internal administrative resolution records do not constitute a statutory quasi-judicial decree "
    "or judicial remedy under Indian law. External statutory filings represent applicant self-attestation "
    "unless officially confirmed by the competent authority."
)

AUDIT_PROTOTYPE_DISCLAIMER = (
    "BizPermit Prototype - SIH26130: Internal administrative grievance audit record. "
    "Application-level append-only ledger. Does not represent statutory government department record."
)


# =============================================================================
# Track A State Machine Transitions
# =============================================================================
TRACK_A_VALID_TRANSITIONS: Dict[str, Set[str]] = {
    "SUBMITTED": {"TRIAGED", "ASSIGNED", "REFERRED_FOR_ESCALATION", "WITHDRAWN"},
    "TRIAGED": {"ASSIGNED", "UNDER_REVIEW", "REFERRED_FOR_ESCALATION", "WITHDRAWN"},
    "ASSIGNED": {"UNDER_REVIEW", "REFERRED_FOR_ESCALATION", "WITHDRAWN"},
    "UNDER_REVIEW": {"CLARIFICATION_REQUESTED", "RESOLUTION_PROPOSED", "REFERRED_FOR_ESCALATION", "WITHDRAWN"},
    "CLARIFICATION_REQUESTED": {"RESPONSE_RECEIVED", "REFERRED_FOR_ESCALATION", "WITHDRAWN"},
    "RESPONSE_RECEIVED": {"UNDER_REVIEW", "CLARIFICATION_REQUESTED", "RESOLUTION_PROPOSED", "REFERRED_FOR_ESCALATION", "WITHDRAWN"},
    "RESOLUTION_PROPOSED": {"RESOLVED", "UNDER_REVIEW", "REFERRED_FOR_ESCALATION", "WITHDRAWN"},
    "RESOLVED": {"CLOSED", "REOPENED"},
    "CLOSED": {"REOPENED"},  # Permitted only under explicit administrative rule
    "REFERRED_FOR_ESCALATION": {"ASSIGNED", "UNDER_REVIEW", "REFERRED_FOR_ESCALATION", "WITHDRAWN"},
    "REOPENED": {"ASSIGNED", "UNDER_REVIEW", "WITHDRAWN"},
    "WITHDRAWN": set()  # Terminal state
}

# Track B State Machine
TRACK_B_VALID_TRANSITIONS: Dict[str, Set[str]] = {
    "LOGGED": {"ACTIVE_MONITORING", "RESOLVED_EXTERNALLY", "CLOSED"},
    "ACTIVE_MONITORING": {"RESOLVED_EXTERNALLY", "CLOSED"},
    "RESOLVED_EXTERNALLY": {"CLOSED"},
    "CLOSED": set()
}


# =============================================================================
# Default Categories & Escalation Rules
# =============================================================================
DEFAULT_GRIEVANCE_CATEGORIES = [
    {
        "category_code": "APP_PROCESSING",
        "name": "Application Processing Issue",
        "description": "Delays, roadblocks, or status discrepancies in statutory clearance filings.",
        "applicable_tracks": ["INTERNAL", "EXTERNAL"],
        "default_priority": "NORMAL",
        "default_internal_target_days": 15,
        "is_active": True
    },
    {
        "category_code": "DEPT_REVIEW",
        "name": "Department Review Issue",
        "description": "Concerns regarding scrutiny queries, inspection reports, or departmental feedback.",
        "applicable_tracks": ["INTERNAL", "EXTERNAL"],
        "default_priority": "NORMAL",
        "default_internal_target_days": 15,
        "is_active": True
    },
    {
        "category_code": "DOC_VERIFICATION",
        "name": "Document Verification Issue",
        "description": "Questions regarding vault document authenticity, OCR mismatch, or rejection.",
        "applicable_tracks": ["INTERNAL"],
        "default_priority": "NORMAL",
        "default_internal_target_days": 10,
        "is_active": True
    },
    {
        "category_code": "SCHEME_INCENTIVE",
        "name": "Scheme or Incentive Information Issue",
        "description": "Discrepancies in eligibility recommendations, subsidy ceilings, or scheme rules.",
        "applicable_tracks": ["INTERNAL", "EXTERNAL"],
        "default_priority": "NORMAL",
        "default_internal_target_days": 20,
        "is_active": True
    },
    {
        "category_code": "COMPLIANCE_OBLIGATION",
        "name": "Compliance Obligation Issue",
        "description": "Discrepancies in periodic renewal obligations, statutory calendar, or cycle tracking.",
        "applicable_tracks": ["INTERNAL"],
        "default_priority": "NORMAL",
        "default_internal_target_days": 15,
        "is_active": True
    },
    {
        "category_code": "PLATFORM_TECH",
        "name": "Technical / Platform Issue",
        "description": "Platform bugs, document upload errors, or access permission difficulties.",
        "applicable_tracks": ["INTERNAL"],
        "default_priority": "HIGH",
        "default_internal_target_days": 5,
        "is_active": True
    },
    {
        "category_code": "OFFICER_SERVICE",
        "name": "Officer Conduct or Service Concern",
        "description": "Procedural delays or communication breakdowns regarding assigned scrutiny officers.",
        "applicable_tracks": ["INTERNAL"],
        "default_priority": "HIGH",
        "default_internal_target_days": 10,
        "is_active": True
    },
    {
        "category_code": "DELAY_COMMUNICATION",
        "name": "Delay or Communication Issue",
        "description": "Unresponsiveness beyond published internal service target timelines.",
        "applicable_tracks": ["INTERNAL", "EXTERNAL"],
        "default_priority": "HIGH",
        "default_internal_target_days": 7,
        "is_active": True
    },
    {
        "category_code": "OTHER",
        "name": "Other Grievances",
        "description": "General grievances not covered by existing predefined categories.",
        "applicable_tracks": ["INTERNAL", "EXTERNAL"],
        "default_priority": "NORMAL",
        "default_internal_target_days": 15,
        "is_active": True
    }
]

DEFAULT_ESCALATION_RULES = [
    {
        "rule_code": "ESC_UNASSIGNED_TIMEOUT",
        "name": "Unassigned Grievance Timeout",
        "trigger_type": "UNASSIGNED_TIMEOUT",
        "threshold_days": 3,
        "from_level": "LEVEL_1",
        "to_level": "LEVEL_2",
        "auto_escalate": True,
        "is_active": True
    },
    {
        "rule_code": "ESC_HIGH_PRIORITY_AGEING",
        "name": "High Priority Ageing Escalation",
        "trigger_type": "AGEING_TIMEOUT",
        "threshold_days": 7,
        "from_level": "LEVEL_1",
        "to_level": "LEVEL_2",
        "auto_escalate": True,
        "is_active": True
    },
    {
        "rule_code": "ESC_SLA_BREACH",
        "name": "Internal Target SLA Breach Escalation",
        "trigger_type": "TARGET_BREACHED",
        "threshold_days": 0,  # Fired when internal_target_date < now
        "from_level": "LEVEL_2",
        "to_level": "LEVEL_3",
        "auto_escalate": True,
        "is_active": True
    },
    {
        "rule_code": "ESC_REPEATED_CLARIFICATION",
        "name": "Repeated Clarification Loop Escalation",
        "trigger_type": "REPEATED_CLARIFICATION",
        "threshold_days": 2,  # > 2 clarifications without resolution
        "from_level": "LEVEL_1",
        "to_level": "LEVEL_2",
        "auto_escalate": False,
        "is_active": True
    }
]


# =============================================================================
# Grievance Audit Repository (Collection 23)
# =============================================================================
class GrievanceAuditRepository(BaseRepository):
    """
    Application-level append-only audit ledger for all grievance events.
    Zero HTTP update/delete routes exist in the system.
    """
    collection_name = "grievance_audit_logs"

    def record_event(
        self,
        grievance_id: Union[str, ObjectId],
        grievance_reference: str,
        actor_user: Any,
        action: str,
        previous_status: Optional[str] = None,
        new_status: Optional[str] = None,
        previous_level: Optional[str] = None,
        new_level: Optional[str] = None,
        remarks: str = "",
        visibility: str = "PUBLIC",  # "PUBLIC" or "INTERNAL_CONFIDENTIAL"
        metadata: Optional[Dict[str, Any]] = None,
        session=None
    ) -> Dict[str, Any]:
        grv_oid = self.to_object_id(grievance_id)
        actor_id = _get_user_attr(actor_user, "id")
        actor_oid = self.to_object_id(actor_id) if actor_id else None
        actor_role = _get_user_attr(actor_user, "role", "SYSTEM")
        actor_email = _get_user_attr(actor_user, "email", "system@bizpermit.in")

        actor_dept = None
        actor_jurisdiction = None
        off_prof = _get_user_attr(actor_user, "officer_profile", None)
        if isinstance(off_prof, dict):
            actor_dept = off_prof.get("department_code")
            actor_jurisdiction = off_prof.get("jurisdiction_code")

        audit_entry = {
            "event_id": str(uuid.uuid4()),
            "grievance_id": grv_oid,
            "grievance_reference": grievance_reference,
            "actor_id": actor_oid,
            "actor_email": actor_email,
            "actor_role": actor_role,
            "actor_department": actor_dept,
            "actor_jurisdiction": actor_jurisdiction,
            "action": action.strip().upper(),
            "previous_status": previous_status,
            "new_status": new_status,
            "previous_level": previous_level,
            "new_level": new_level,
            "timestamp": datetime.now(timezone.utc),
            "remarks": remarks.strip(),
            "visibility": visibility.strip().upper(),
            "metadata": metadata or {},
            "prototype_disclaimer": AUDIT_PROTOTYPE_DISCLAIMER
        }

        result = self.collection.insert_one(audit_entry, session=session)
        audit_entry["_id"] = result.inserted_id
        return audit_entry

    def get_audit_history(
        self,
        grievance_id: Union[str, ObjectId],
        include_internal: bool = True
    ) -> List[Dict[str, Any]]:
        grv_oid = self.to_object_id(grievance_id)
        if not grv_oid:
            return []
        query: Dict[str, Any] = {"grievance_id": grv_oid}
        if not include_internal:
            query["visibility"] = "PUBLIC"
        cursor = self.collection.find(query).sort("timestamp", -1)
        return [BaseRepository.serialize_doc(doc) for doc in cursor]


# =============================================================================
# Grievance Category Repository
# =============================================================================
class GrievanceCategoryRepository(BaseRepository):
    collection_name = "grievance_categories"

    def seed_defaults(self):
        for cat in DEFAULT_GRIEVANCE_CATEGORIES:
            self.collection.update_one(
                {"category_code": cat["category_code"]},
                {"$setOnInsert": cat},
                upsert=True
            )

    def list_active(self, track: Optional[str] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"is_active": True}
        if track:
            query["applicable_tracks"] = track.strip().upper()
        cursor = self.collection.find(query).sort("name", 1)
        return [BaseRepository.serialize_doc(doc) for doc in cursor]

    def get_by_code(self, category_code: str) -> Optional[Dict[str, Any]]:
        doc = self.collection.find_one({"category_code": category_code.strip().upper()})
        return BaseRepository.serialize_doc(doc) if doc else None


# =============================================================================
# Grievance Escalation Rule Repository
# =============================================================================
class GrievanceEscalationRuleRepository(BaseRepository):
    collection_name = "grievance_escalation_rules"

    def seed_defaults(self):
        for rule in DEFAULT_ESCALATION_RULES:
            self.collection.update_one(
                {"rule_code": rule["rule_code"]},
                {"$setOnInsert": rule},
                upsert=True
            )

    def list_all(self) -> List[Dict[str, Any]]:
        cursor = self.collection.find().sort("threshold_days", 1)
        return [BaseRepository.serialize_doc(doc) for doc in cursor]

    def update_rule(self, rule_code: str, data: Dict[str, Any]) -> bool:
        res = self.collection.update_one(
            {"rule_code": rule_code.strip().upper()},
            {"$set": data}
        )
        return res.matched_count > 0


# =============================================================================
# Main Grievance Repository (Collection 22: grievances)
# =============================================================================
class GrievanceRepository(BaseRepository):
    collection_name = "grievances"

    def __init__(self):
        super().__init__()
        self.audit_repo = GrievanceAuditRepository()
        self.category_repo = GrievanceCategoryRepository()
        self.rule_repo = GrievanceEscalationRuleRepository()
        self.notification_repo = NotificationRepository()

    # -------------------------------------------------------------------------
    # Reference Generation
    # -------------------------------------------------------------------------
    def generate_reference(self) -> str:
        year = datetime.now(timezone.utc).year
        unique_token = uuid.uuid4().hex[:6].upper()
        return f"GRV-{year}-{unique_token}"

    # -------------------------------------------------------------------------
    # Server-Side Officer Scoping & Authorization Check
    # -------------------------------------------------------------------------
    def check_officer_scoping(self, officer_user: Any, grievance: Dict[str, Any]) -> None:
        """
        Enforces server-side department and geographical scoping barriers.
        Super Admin retains national oversight across all departments and states.
        Department officers must be active, have valid profile, and match department and state.
        Missing or invalid attributes fail closed.
        """
        if not officer_user:
            raise PermissionError("Access forbidden: Authentication required.")

        user_role = _get_user_attr(officer_user, "role", "")
        if user_role == "SUPER_ADMIN":
            return  # Super Admin national oversight

        if user_role != "DEPARTMENT_OFFICER":
            raise PermissionError("Access forbidden: Only Department Officers and Super Administrators can access officer grievance functions.")

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

        # 4. Grievance department and state presence check
        grv_dept = grievance.get("department_code")
        grv_state = grievance.get("state_code")

        if not grv_dept or not str(grv_dept).strip():
            raise PermissionError("Access forbidden: Grievance has no designated department.")
        grv_dept = str(grv_dept).strip()

        if not grv_state or not str(grv_state).strip():
            raise PermissionError("Access forbidden: Grievance has no designated jurisdiction.")
        grv_state = str(grv_state).strip()

        # 5. Department scoping defense (exact match or validated alias, NO suffix matching)
        if not is_department_match(off_dept, grv_dept, off_state):
            raise PermissionError(
                f"Department Scoping Violation: You are assigned to department '{off_dept}', "
                f"which cannot review grievances for department '{grv_dept}'."
            )

        # 6. State jurisdiction scoping defense
        if off_state != "IN-ALL":
            if grv_state != "IN-ALL" and off_state != grv_state:
                raise PermissionError(
                    f"Geographical Jurisdiction Violation: You are assigned to jurisdiction '{off_state}', "
                    f"which cannot review grievances from '{grv_state}'."
                )

        # 7. Assignment locking defense
        assigned_id = grievance.get("assigned_officer_id")
        officer_uid = _get_user_attr(officer_user, "id")
        if assigned_id and str(assigned_id) != str(officer_uid):
            raise PermissionError("Access forbidden: You are not authorized to access this grievance as it is assigned to another officer.")

    # -------------------------------------------------------------------------
    # Submission: Track A (Internal) & Track B (External Statutory)
    # -------------------------------------------------------------------------
    def submit_grievance(
        self,
        owner_user: Any,
        data: Dict[str, Any],
        session=None
    ) -> Dict[str, Any]:
        """
        Submits either a Track A (Internal BizPermit) or Track B (External Statutory Tracking) grievance.
        Validates business ownership, computes internal targets, and initializes audit entry.
        """
        user_id = _get_user_attr(owner_user, "id")
        user_oid = self.to_object_id(user_id)
        if not user_oid:
            raise ValueError("Invalid user identification.")

        track = str(data.get("track", "INTERNAL")).strip().upper()
        if track not in ("INTERNAL", "EXTERNAL"):
            raise ValueError("Invalid track: Must be 'INTERNAL' or 'EXTERNAL'.")

        business_oid = self.to_object_id(data.get("business_id"))
        location_oid = self.to_object_id(data.get("location_id"))
        if not business_oid:
            raise ValueError("Business ID is mandatory for grievance submission.")

        # Reference and timestamps
        ref = self.generate_reference()
        now = datetime.now(timezone.utc)

        category_code = str(data.get("category_code", "OTHER")).strip().upper()
        priority = str(data.get("priority", "NORMAL")).strip().upper()
        if priority not in ("LOW", "NORMAL", "HIGH", "URGENT"):
            priority = "NORMAL"

        severity = str(data.get("severity", "MODERATE")).strip().upper()
        if severity not in ("MINOR", "MODERATE", "MAJOR", "CRITICAL"):
            severity = "MODERATE"

        # Calculate internal service target days
        cat_info = self.category_repo.get_by_code(category_code)
        target_days = cat_info.get("default_internal_target_days", 15) if cat_info else 15
        if priority == "URGENT":
            target_days = max(3, target_days // 3)
        elif priority == "HIGH":
            target_days = max(5, target_days // 2)
        target_date = now + timedelta(days=target_days)

        # Department & State defaults
        department_code = str(data.get("department_code", "IN-GJ-IND")).strip().upper()
        state_code = str(data.get("state_code", "IN-GJ")).strip().upper()

        # Vault document validation (ensuring list of ObjectIds)
        raw_vault_ids = data.get("vault_document_ids", [])
        vault_oids = [self.to_object_id(v) for v in raw_vault_ids if self.to_object_id(v)]

        # Statutory Deadline and Source Safety (CRITICAL)
        # Never invent statutory deadlines. If unverified, mark as NEEDS_CONFIRMATION.
        statutory_source_ref = data.get("statutory_source_reference") or {}
        statutory_deadline = None
        statutory_deadline_status = "NOT_APPLICABLE"

        # Strict Gujarat check: Section 16(2) of Gujarat Single Window Clearances Act, 2017
        # MUST NEVER be claimed as a 30-day statutory resolution deadline!
        act_name = str(statutory_source_ref.get("act_or_rule", "")).strip().lower()
        section_clause = str(statutory_source_ref.get("section_clause", "")).strip().lower()
        if "gujarat" in act_name and "16" in section_clause:
            # Force rejection of false statutory claim
            statutory_deadline_status = "NEEDS_CONFIRMATION"
            statutory_source_ref["verification_status"] = "NEEDS_CONFIRMATION"
            statutory_source_ref["statutory_warning"] = (
                "Section 16(2) of Gujarat Single Window Clearances Act, 2017 does NOT establish "
                "a 30-day statutory resolution deadline. 30-day timeline is an internal service target only."
            )
        elif statutory_source_ref.get("source_url") and statutory_source_ref.get("verification_status") == "VERIFIED":
            statutory_deadline_status = "VERIFIED"
            if statutory_source_ref.get("statutory_deadline_days"):
                statutory_deadline = now + timedelta(days=int(statutory_source_ref["statutory_deadline_days"]))
        elif statutory_source_ref:
            statutory_deadline_status = "NEEDS_CONFIRMATION"

        # Track-specific initial status
        if track == "INTERNAL":
            initial_status = "SUBMITTED"
            external_tracking_data = None
        else:
            initial_status = "LOGGED"
            raw_ext = data.get("external_tracking") or {}
            external_tracking_data = {
                "authority_name": str(raw_ext.get("authority_name", "")).strip(),
                "portal_url": str(raw_ext.get("portal_url", "")).strip(),
                "external_reference_number": str(raw_ext.get("external_reference_number", "")).strip(),
                "external_submission_date": raw_ext.get("external_submission_date") or now.isoformat(),
                "applicant_reported_status": str(raw_ext.get("applicant_reported_status", "SUBMITTED")).strip(),
                "evidence_vault_document_ids": vault_oids,
                "evidence_status": "EVIDENCE_ATTACHED" if vault_oids else "USER_REPORTED",
                "latest_applicant_update": str(raw_ext.get("latest_applicant_update", "External grievance logged for monitoring.")).strip(),
                "last_confirmed_date": now
            }

        grievance_doc = {
            "grievance_reference": ref,
            "track": track,
            "owner_user_id": user_oid,
            "business_id": business_oid,
            "location_id": location_oid,
            "department_code": department_code,
            "state_code": state_code,
            "district_code": data.get("district_code"),
            "category_code": category_code,
            "subcategory": data.get("subcategory"),
            "priority": priority,
            "severity": severity,
            "subject": str(data.get("subject", "")).strip(),
            "description": str(data.get("description", "")).strip(),
            "status": initial_status,
            "escalation_level": "LEVEL_1",
            "assigned_officer_id": None,
            "assigned_officer_email": None,
            "assigned_officer_name": None,
            "assigned_at": None,
            "related_application_id": self.to_object_id(data.get("related_application_id")),
            "related_scheme_application_id": self.to_object_id(data.get("related_scheme_application_id")),
            "related_compliance_obligation_id": self.to_object_id(data.get("related_compliance_obligation_id")),
            "vault_document_ids": vault_oids,
            "internal_target_days": target_days,
            "internal_target_date": target_date,
            "statutory_deadline": statutory_deadline,
            "statutory_deadline_status": statutory_deadline_status,
            "statutory_source_reference": statutory_source_ref,
            "external_tracking": external_tracking_data,
            "clarifications": [],
            "internal_notes": [],
            "resolution_details": None,
            "closure_details": None,
            "feedback": None,
            "reopen_history": [],
            "withdrawal_details": None,
            "created_at": now,
            "updated_at": now,
            "prototype_disclaimer": GRIEVANCE_PROTOTYPE_DISCLAIMER
        }

        result = self.collection.insert_one(grievance_doc, session=session)
        grievance_doc["_id"] = result.inserted_id

        # Record initial audit event
        self.audit_repo.record_event(
            grievance_id=result.inserted_id,
            grievance_reference=ref,
            actor_user=owner_user,
            action="SUBMISSION",
            new_status=initial_status,
            new_level="LEVEL_1",
            remarks=f"Grievance submitted under Track {track} for category {category_code}.",
            visibility="PUBLIC",
            session=session
        )

        # Notify applicant
        self.notification_repo.create_notification(
            recipient_user_id=user_oid,
            notification_type="GRIEVANCE_SUBMISSION",
            title=f"Grievance Lodged: {ref}",
            message=f"Your grievance '{data.get('subject')}' has been registered under reference {ref}. Target resolution date: {target_date.strftime('%d-%b-%Y')}.",
            reference_id=ref,
            session=session
        )

        return BaseRepository.serialize_doc(grievance_doc)

    # -------------------------------------------------------------------------
    # Retrieval & Detail Views
    # -------------------------------------------------------------------------
    def get_by_id(self, grievance_id: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        oid = self.to_object_id(grievance_id)
        if not oid:
            return None
        doc = self.collection.find_one({"_id": oid})
        return BaseRepository.serialize_doc(doc) if doc else None

    def get_by_reference(self, reference: str) -> Optional[Dict[str, Any]]:
        doc = self.collection.find_one({"grievance_reference": reference.strip()})
        return BaseRepository.serialize_doc(doc) if doc else None

    def list_by_applicant(
        self,
        owner_user: Any,
        track: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        user_oid = self.to_object_id(_get_user_attr(owner_user, "id"))
        if not user_oid:
            return {"total_count": 0, "items": []}

        query: Dict[str, Any] = {"owner_user_id": user_oid}
        if track:
            query["track"] = track.strip().upper()
        if status:
            query["status"] = status.strip().upper()

        total = self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)

        items = []
        for doc in cursor:
            # Redact internal confidential notes from applicant view
            doc.pop("internal_notes", None)
            items.append(BaseRepository.serialize_doc(doc))

        return {"total_count": total, "items": items, "skip": skip, "limit": limit}

    # -------------------------------------------------------------------------
    # Scoped Officer Queue
    # -------------------------------------------------------------------------
    def get_officer_queue(
        self,
        officer_user: Any,
        status_filter: Optional[str] = None,
        assigned_filter: Optional[str] = None,  # "ME", "UNASSIGNED", "ALL"
        priority_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        user_role = _get_user_attr(officer_user, "role", "")
        query: Dict[str, Any] = {}

        if user_role == "DEPARTMENT_OFFICER":
            is_active = _get_user_attr(officer_user, "is_active", True)
            off_prof = _get_user_attr(officer_user, "officer_profile", None)
            if is_active is False or not isinstance(off_prof, dict) or not off_prof:
                return {"total_count": 0, "items": [], "skip": skip, "limit": limit}

            off_dept = str(off_prof.get("department_code") or "").strip().upper()
            off_state = str(off_prof.get("jurisdiction_code") or "").strip().upper()
            if not off_dept or not off_state:
                return {"total_count": 0, "items": [], "skip": skip, "limit": limit}

            # Map department and aliases
            matching_depts = {off_dept}
            for canonical, aliases in AUTHORITATIVE_DEPARTMENT_ALIASES.items():
                aliases_upper = {a.upper() for a in aliases}
                if off_dept == canonical.upper() or off_dept in aliases_upper:
                    matching_depts.add(canonical.upper())
                    matching_depts.update(aliases_upper)

            query["department_code"] = {"$in": list(matching_depts)}
            if off_state != "IN-ALL":
                query["state_code"] = {"$in": [off_state, "IN-ALL"]}

            officer_oid = self.to_object_id(_get_user_attr(officer_user, "id"))
            if assigned_filter == "ME":
                query["assigned_officer_id"] = officer_oid
            elif assigned_filter == "UNASSIGNED":
                query["assigned_officer_id"] = None
            else:
                query["$or"] = [
                    {"assigned_officer_id": officer_oid},
                    {"assigned_officer_id": None},
                    {"assigned_officer_id": {"$exists": False}}
                ]
        elif user_role == "SUPER_ADMIN":
            if assigned_filter == "UNASSIGNED":
                query["assigned_officer_id"] = None
        else:
            return {"total_count": 0, "items": [], "skip": skip, "limit": limit}

        if status_filter:
            query["status"] = status_filter.strip().upper()
        if priority_filter:
            query["priority"] = priority_filter.strip().upper()
        if search_query:
            sq = search_query.strip()
            query["$or"] = [
                {"grievance_reference": {"$regex": sq, "$options": "i"}},
                {"subject": {"$regex": sq, "$options": "i"}},
                {"category_code": {"$regex": sq, "$options": "i"}}
            ]

        total = self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)

        now = datetime.now(timezone.utc)
        items = []
        for doc in cursor:
            # Compute dynamic ageing and priority tags
            created = doc.get("created_at") or now
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            ageing_days = max(0, (now - created).days)
            doc["ageing_days"] = ageing_days

            target = doc.get("internal_target_date")
            if target:
                if target.tzinfo is None:
                    target = target.replace(tzinfo=timezone.utc)
                doc["is_overdue"] = now > target
                doc["days_remaining"] = max(0, (target - now).days) if now <= target else 0
            else:
                doc["is_overdue"] = False
                doc["days_remaining"] = None

            items.append(BaseRepository.serialize_doc(doc))

        return {"total_count": total, "items": items, "skip": skip, "limit": limit}

    # -------------------------------------------------------------------------
    # State Machine & Status Updates
    # -------------------------------------------------------------------------
    def transition_status(
        self,
        grievance_id: Union[str, ObjectId],
        new_status: str,
        actor_user: Any,
        action_name: str,
        remarks: str = "",
        extra_updates: Optional[Dict[str, Any]] = None,
        visibility: str = "PUBLIC",
        session=None
    ) -> Dict[str, Any]:
        """
        Validates state machine transitions, re-validates officer scoping,
        applies atomic status update, and records an audit log entry.
        """
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        # Re-verify officer scoping for officer actions
        user_role = _get_user_attr(actor_user, "role", "")
        if user_role == "DEPARTMENT_OFFICER":
            self.check_officer_scoping(actor_user, doc)

        current_status = doc.get("status", "SUBMITTED")
        track = doc.get("track", "INTERNAL")

        # Validate allowable transition
        valid_transitions = TRACK_A_VALID_TRANSITIONS if track == "INTERNAL" else TRACK_B_VALID_TRANSITIONS
        allowed = valid_transitions.get(current_status, set())
        if new_status not in allowed:
            raise ValueError(
                f"Invalid transition jump from '{current_status}' to '{new_status}' for {track} track. "
                f"Allowed next states: {list(allowed)}."
            )

        now = datetime.now(timezone.utc)
        set_fields = {
            "status": new_status,
            "updated_at": now
        }
        mongo_update = {"$set": set_fields}
        if extra_updates:
            for k, v in extra_updates.items():
                if k.startswith("$"):
                    mongo_update[k] = v
                else:
                    set_fields[k] = v

        self.collection.update_one({"_id": grv_oid}, mongo_update, session=session)

        # Audit Event
        self.audit_repo.record_event(
            grievance_id=grv_oid,
            grievance_reference=doc.get("grievance_reference", ""),
            actor_user=actor_user,
            action=action_name,
            previous_status=current_status,
            new_status=new_status,
            previous_level=doc.get("escalation_level"),
            new_level=set_fields.get("escalation_level", doc.get("escalation_level")),
            remarks=remarks,
            visibility=visibility,
            session=session
        )

        doc.update(set_fields)
        return BaseRepository.serialize_doc(doc)

    # -------------------------------------------------------------------------
    # Officer Assignment & Administrative Reassignment
    # -------------------------------------------------------------------------
    def assign_officer(
        self,
        grievance_id: Union[str, ObjectId],
        officer_user: Any,
        target_officer_id: Optional[Union[str, ObjectId]] = None,
        remarks: str = "",
        session=None
    ) -> Dict[str, Any]:
        """
        Assigns or self-assigns an officer to a grievance.
        Re-validates scoping for target officer.
        """
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        actor_role = _get_user_attr(officer_user, "role", "")
        if actor_role == "DEPARTMENT_OFFICER":
            self.check_officer_scoping(officer_user, doc)
            target_oid = self.to_object_id(_get_user_attr(officer_user, "id"))
            target_email = _get_user_attr(officer_user, "email")
            target_name = _get_user_attr(officer_user, "full_name", target_email)
        elif actor_role == "SUPER_ADMIN":
            if not target_officer_id:
                target_oid = self.to_object_id(_get_user_attr(officer_user, "id"))
                target_email = _get_user_attr(officer_user, "email")
                target_name = _get_user_attr(officer_user, "full_name", target_email)
            else:
                from apps.authentication.repository import UserRepository
                u_repo = UserRepository()
                target_user = u_repo.find_by_id(target_officer_id)
                if not target_user:
                    raise ValueError("Target officer not found.")
                self.check_officer_scoping(target_user, doc)
                target_oid = self.to_object_id(target_officer_id)
                target_email = target_user.get("email")
                target_name = target_user.get("full_name", target_email)
        else:
            raise PermissionError("Access forbidden: Unauthorized assignment.")

        now = datetime.now(timezone.utc)
        extra = {
            "assigned_officer_id": target_oid,
            "assigned_officer_email": target_email,
            "assigned_officer_name": target_name,
            "assigned_at": now
        }

        # Transition to ASSIGNED if currently SUBMITTED or TRIAGED
        curr = doc.get("status", "SUBMITTED")
        next_status = "ASSIGNED" if curr in ("SUBMITTED", "TRIAGED") else curr

        if next_status != curr:
            updated = self.transition_status(
                grievance_id=grv_oid,
                new_status=next_status,
                actor_user=officer_user,
                action_name="ASSIGNMENT",
                remarks=f"Assigned to {target_name} ({target_email}). {remarks}".strip(),
                extra_updates=extra,
                session=session
            )
        else:
            self.collection.update_one({"_id": grv_oid}, {"$set": extra}, session=session)
            self.audit_repo.record_event(
                grievance_id=grv_oid,
                grievance_reference=doc.get("grievance_reference", ""),
                actor_user=officer_user,
                action="ASSIGNMENT_CHANGE",
                previous_status=curr,
                new_status=curr,
                remarks=f"Reassigned to {target_name}. {remarks}".strip(),
                session=session
            )
            doc.update(extra)
            updated = BaseRepository.serialize_doc(doc)

        return updated

    def reassign_officer_admin(
        self,
        grievance_id: Union[str, ObjectId],
        admin_user: Any,
        new_officer_id: Union[str, ObjectId],
        justification: str,
        session=None
    ) -> Dict[str, Any]:
        """
        Super Admin reassignment requiring mandatory non-empty justification.
        Validates target officer's department and state scoping.
        """
        if _get_user_attr(admin_user, "role") != "SUPER_ADMIN":
            raise PermissionError("Access forbidden: Super Admin role required for administrative reassignment.")

        if not justification or not str(justification).strip():
            raise ValueError("Reassignment justification is mandatory.")

        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        from apps.authentication.repository import UserRepository
        u_repo = UserRepository()
        target_officer = u_repo.find_by_id(new_officer_id)
        if not target_officer:
            raise ValueError("Target officer not found.")

        # Validate target officer scoping against grievance
        self.check_officer_scoping(target_officer, doc)

        target_oid = self.to_object_id(new_officer_id)
        target_email = target_officer.get("email")
        target_name = target_officer.get("full_name", target_email)
        now = datetime.now(timezone.utc)

        update_fields = {
            "assigned_officer_id": target_oid,
            "assigned_officer_email": target_email,
            "assigned_officer_name": target_name,
            "assigned_at": now,
            "updated_at": now
        }
        self.collection.update_one({"_id": grv_oid}, {"$set": update_fields}, session=session)

        # Record Audit Event
        self.audit_repo.record_event(
            grievance_id=grv_oid,
            grievance_reference=doc.get("grievance_reference", ""),
            actor_user=admin_user,
            action="REASSIGNMENT",
            previous_status=doc.get("status"),
            new_status=doc.get("status"),
            remarks=f"Administrative reassignment to {target_name} ({target_email}). Justification: {justification.strip()}",
            metadata={"justification": justification.strip(), "new_officer_id": str(target_oid)},
            session=session
        )

        doc.update(update_fields)
        return BaseRepository.serialize_doc(doc)

    # -------------------------------------------------------------------------
    # Clarification Engine (Two-Way with Anti-Tamper Protection)
    # -------------------------------------------------------------------------
    def request_clarification(
        self,
        grievance_id: Union[str, ObjectId],
        officer_user: Any,
        question: str,
        issue_link: Optional[str] = None,
        internal_target_days: int = 5,
        session=None
    ) -> Dict[str, Any]:
        """
        Officer requests clarification.
        Transitions grievance to CLARIFICATION_REQUESTED.
        Preserves original question immutability.
        """
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        self.check_officer_scoping(officer_user, doc)

        if not question or not str(question).strip():
            raise ValueError("Clarification question cannot be blank.")

        now = datetime.now(timezone.utc)
        c_id = str(uuid.uuid4())
        clarification_item = {
            "clarification_id": c_id,
            "question": question.strip(),
            "officer_id": self.to_object_id(_get_user_attr(officer_user, "id")),
            "officer_email": _get_user_attr(officer_user, "email"),
            "officer_name": _get_user_attr(officer_user, "full_name"),
            "issue_link": issue_link.strip() if issue_link else None,
            "requested_at": now,
            "internal_target_date": now + timedelta(days=internal_target_days),
            "status": "PENDING_APPLICANT",
            "applicant_response": None,
            "responded_at": None,
            "response_vault_document_ids": []
        }

        # Transition status
        self.transition_status(
            grievance_id=grv_oid,
            new_status="CLARIFICATION_REQUESTED",
            actor_user=officer_user,
            action_name="CLARIFICATION_REQUESTED",
            remarks=f"Clarification requested: {question[:80]}...",
            extra_updates={"$push": {"clarifications": clarification_item}},
            session=session
        )

        # Notify applicant
        self.notification_repo.create_notification(
            recipient_user_id=doc.get("owner_user_id"),
            notification_type="GRIEVANCE_CLARIFICATION",
            title=f"Clarification Requested: {doc.get('grievance_reference')}",
            message=f"The scrutiny officer has requested additional clarification: '{question[:120]}'.",
            reference_id=doc.get("grievance_reference"),
            session=session
        )

        return BaseRepository.serialize_doc(clarification_item)

    def respond_clarification(
        self,
        grievance_id: Union[str, ObjectId],
        applicant_user: Any,
        clarification_id: str,
        response_text: str,
        vault_document_ids: Optional[List[Union[str, ObjectId]]] = None,
        session=None
    ) -> Dict[str, Any]:
        """
        Applicant responds to an officer's clarification query.
        Guarantees that the officer's original question is strictly immutable.
        Transitions grievance to RESPONSE_RECEIVED.
        """
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        # Verify applicant owns this grievance
        user_oid = self.to_object_id(_get_user_attr(applicant_user, "id"))
        if doc.get("owner_user_id") != user_oid:
            raise PermissionError("Access forbidden: You can only respond to your own grievances.")

        if not response_text or not str(response_text).strip():
            raise ValueError("Clarification response cannot be blank.")

        clarifications = doc.get("clarifications", [])
        matched = False
        now = datetime.now(timezone.utc)
        resp_vault_oids = [self.to_object_id(v) for v in (vault_document_ids or []) if self.to_object_id(v)]

        for c in clarifications:
            if c.get("clarification_id") == clarification_id:
                # Anti-tamper guarantee: original question is untouched
                c["applicant_response"] = response_text.strip()
                c["responded_at"] = now
                c["status"] = "RESPONDED"
                c["response_vault_document_ids"] = resp_vault_oids
                matched = True
                break

        if not matched:
            raise ValueError(f"Clarification ID '{clarification_id}' not found.")

        self.collection.update_one(
            {"_id": grv_oid},
            {"$set": {"clarifications": clarifications, "updated_at": now}},
            session=session
        )

        self.transition_status(
            grievance_id=grv_oid,
            new_status="RESPONSE_RECEIVED",
            actor_user=applicant_user,
            action_name="CLARIFICATION_RESPONDED",
            remarks=f"Applicant submitted response to clarification {clarification_id}.",
            session=session
        )

        # Notify assigned officer if assigned
        assigned_officer_id = doc.get("assigned_officer_id")
        if assigned_officer_id:
            self.notification_repo.create_notification(
                recipient_user_id=assigned_officer_id,
                notification_type="GRIEVANCE_RESPONSE_RECEIVED",
                title=f"Response Received: {doc.get('grievance_reference')}",
                message=f"Applicant Rajiv Mehta submitted clarification response for {doc.get('grievance_reference')}.",
                reference_id=doc.get("grievance_reference"),
                session=session
            )

        return {"clarification_id": clarification_id, "status": "RESPONDED"}

    # -------------------------------------------------------------------------
    # Internal Confidential Officer Notes
    # -------------------------------------------------------------------------
    def add_internal_note(
        self,
        grievance_id: Union[str, ObjectId],
        officer_user: Any,
        note_text: str,
        session=None
    ) -> Dict[str, Any]:
        """
        Adds an internal officer note.
        STRICTLY CONFIDENTIAL: Never returned to business owners or applicants.
        """
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        self.check_officer_scoping(officer_user, doc)

        if not note_text or not str(note_text).strip():
            raise ValueError("Note text cannot be blank.")

        now = datetime.now(timezone.utc)
        note_id = str(uuid.uuid4())
        note_entry = {
            "note_id": note_id,
            "officer_id": self.to_object_id(_get_user_attr(officer_user, "id")),
            "officer_email": _get_user_attr(officer_user, "email"),
            "note_text": note_text.strip(),
            "created_at": now,
            "is_confidential": True
        }

        self.collection.update_one(
            {"_id": grv_oid},
            {"$push": {"internal_notes": note_entry}, "$set": {"updated_at": now}},
            session=session
        )

        self.audit_repo.record_event(
            grievance_id=grv_oid,
            grievance_reference=doc.get("grievance_reference", ""),
            actor_user=officer_user,
            action="INTERNAL_NOTE_ADDED",
            previous_status=doc.get("status"),
            new_status=doc.get("status"),
            remarks="Internal confidential note added.",
            visibility="INTERNAL_CONFIDENTIAL",
            session=session
        )

        return BaseRepository.serialize_doc(note_entry)

    # -------------------------------------------------------------------------
    # Escalation Engine
    # -------------------------------------------------------------------------
    def escalate_grievance(
        self,
        grievance_id: Union[str, ObjectId],
        actor_user: Any,
        new_level: str,  # "LEVEL_2" or "LEVEL_3"
        trigger: str,
        reason: str,
        session=None
    ) -> Dict[str, Any]:
        """
        Escalates grievance to a higher tier (LEVEL_2 Senior Officer or LEVEL_3 Super Admin).
        Validates actor permissions and records escalation audit event.
        """
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        actor_role = _get_user_attr(actor_user, "role", "")
        if actor_role not in ("DEPARTMENT_OFFICER", "SUPER_ADMIN"):
            # Business owners can only request escalation if configured
            if actor_role == "BUSINESS_OWNER":
                user_oid = self.to_object_id(_get_user_attr(actor_user, "id"))
                if doc.get("owner_user_id") != user_oid:
                    raise PermissionError("Access forbidden: You cannot escalate another user's grievance.")
                trigger = "APPLICANT_REQUEST"
            else:
                raise PermissionError("Access forbidden: Unauthorized to trigger grievance escalation.")

        if actor_role == "DEPARTMENT_OFFICER":
            self.check_officer_scoping(actor_user, doc)

        new_level = new_level.strip().upper()
        if new_level not in ("LEVEL_2", "LEVEL_3"):
            raise ValueError("Invalid escalation level: Must be 'LEVEL_2' or 'LEVEL_3'.")

        current_level = doc.get("escalation_level", "LEVEL_1")
        now = datetime.now(timezone.utc)

        extra = {
            "escalation_level": new_level,
            "escalated_at": now,
            "escalation_details": {
                "previous_level": current_level,
                "new_level": new_level,
                "trigger": trigger.strip().upper(),
                "reason": reason.strip(),
                "escalated_by": _get_user_attr(actor_user, "email"),
                "timestamp": now
            }
        }

        # Transition status to REFERRED_FOR_ESCALATION if not already resolved
        curr_status = doc.get("status")
        if curr_status not in ("RESOLVED", "CLOSED", "WITHDRAWN"):
            updated = self.transition_status(
                grievance_id=grv_oid,
                new_status="REFERRED_FOR_ESCALATION",
                actor_user=actor_user,
                action_name="ESCALATION",
                remarks=f"Escalated from {current_level} to {new_level}. Trigger: {trigger}. Reason: {reason}".strip(),
                extra_updates=extra,
                session=session
            )
        else:
            self.collection.update_one({"_id": grv_oid}, {"$set": extra}, session=session)
            self.audit_repo.record_event(
                grievance_id=grv_oid,
                grievance_reference=doc.get("grievance_reference", ""),
                actor_user=actor_user,
                action="ESCALATION",
                previous_level=current_level,
                new_level=new_level,
                remarks=f"Escalated to {new_level}: {reason}".strip(),
                session=session
            )
            doc.update(extra)
            updated = BaseRepository.serialize_doc(doc)

        return updated

    # -------------------------------------------------------------------------
    # Resolution, Feedback, Reopening & Closure
    # -------------------------------------------------------------------------
    def propose_resolution(
        self,
        grievance_id: Union[str, ObjectId],
        officer_user: Any,
        remarks: str,
        corrective_actions: Optional[List[str]] = None,
        session=None
    ) -> Dict[str, Any]:
        """Officer proposes formal grievance resolution."""
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        self.check_officer_scoping(officer_user, doc)

        if not remarks or not str(remarks).strip():
            raise ValueError("Proposed resolution remarks cannot be blank.")

        now = datetime.now(timezone.utc)
        res_data = {
            "proposed_by_officer_id": self.to_object_id(_get_user_attr(officer_user, "id")),
            "proposed_by_officer_email": _get_user_attr(officer_user, "email"),
            "proposed_at": now,
            "proposed_remarks": remarks.strip(),
            "corrective_actions": corrective_actions or []
        }

        return self.transition_status(
            grievance_id=grv_oid,
            new_status="RESOLUTION_PROPOSED",
            actor_user=officer_user,
            action_name="RESOLUTION_PROPOSED",
            remarks=remarks.strip(),
            extra_updates={"resolution_details": res_data},
            session=session
        )

    def resolve_grievance(
        self,
        grievance_id: Union[str, ObjectId],
        officer_user: Any,
        resolution_summary: str,
        corrective_actions: Optional[List[str]] = None,
        session=None
    ) -> Dict[str, Any]:
        """
        Formally marks grievance as RESOLVED.
        Injects mandatory non-statutory prototype disclaimer.
        """
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        self.check_officer_scoping(officer_user, doc)

        if not resolution_summary or not str(resolution_summary).strip():
            raise ValueError("Resolution summary cannot be blank.")

        now = datetime.now(timezone.utc)
        res_details = doc.get("resolution_details") or {}
        res_details.update({
            "resolved_by_officer_id": self.to_object_id(_get_user_attr(officer_user, "id")),
            "resolved_by_officer_email": _get_user_attr(officer_user, "email"),
            "resolved_at": now,
            "resolution_summary": resolution_summary.strip(),
            "corrective_actions": corrective_actions or res_details.get("corrective_actions", []),
            "prototype_disclaimer": GRIEVANCE_PROTOTYPE_DISCLAIMER
        })

        updated = self.transition_status(
            grievance_id=grv_oid,
            new_status="RESOLVED",
            actor_user=officer_user,
            action_name="RESOLVED",
            remarks=resolution_summary.strip(),
            extra_updates={"resolution_details": res_details},
            session=session
        )

        # Notify applicant
        self.notification_repo.create_notification(
            recipient_user_id=doc.get("owner_user_id"),
            notification_type="GRIEVANCE_RESOLVED",
            title=f"Grievance Resolved: {doc.get('grievance_reference')}",
            message=f"Your grievance '{doc.get('subject')}' has been marked RESOLVED. Summary: {resolution_summary[:120]}.",
            reference_id=doc.get("grievance_reference"),
            session=session
        )

        return updated

    def close_grievance(
        self,
        grievance_id: Union[str, ObjectId],
        actor_user: Any,
        closure_remarks: str = "",
        session=None
    ) -> Dict[str, Any]:
        """Marks grievance as CLOSED."""
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        now = datetime.now(timezone.utc)
        closure_data = {
            "closed_by_user_id": self.to_object_id(_get_user_attr(actor_user, "id")),
            "closed_by_email": _get_user_attr(actor_user, "email"),
            "closed_at": now,
            "closure_remarks": closure_remarks.strip()
        }

        return self.transition_status(
            grievance_id=grv_oid,
            new_status="CLOSED",
            actor_user=actor_user,
            action_name="CLOSED",
            remarks=f"Grievance closed. {closure_remarks}".strip(),
            extra_updates={"closure_details": closure_data},
            session=session
        )

    def reopen_grievance(
        self,
        grievance_id: Union[str, ObjectId],
        applicant_user: Any,
        reason: str,
        session=None
    ) -> Dict[str, Any]:
        """
        Applicant reopens a RESOLVED grievance if dissatisfaction remains.
        """
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        user_oid = self.to_object_id(_get_user_attr(applicant_user, "id"))
        if doc.get("owner_user_id") != user_oid and _get_user_attr(applicant_user, "role") != "SUPER_ADMIN":
            raise PermissionError("Access forbidden: You can only reopen your own grievances.")

        if not reason or not str(reason).strip():
            raise ValueError("Reopen reason cannot be blank.")

        now = datetime.now(timezone.utc)
        reopen_entry = {
            "reopened_by": _get_user_attr(applicant_user, "email"),
            "reopened_at": now,
            "reason": reason.strip()
        }

        return self.transition_status(
            grievance_id=grv_oid,
            new_status="REOPENED",
            actor_user=applicant_user,
            action_name="REOPENED",
            remarks=f"Grievance reopened by applicant. Reason: {reason.strip()}",
            extra_updates={"$push": {"reopen_history": reopen_entry}},
            session=session
        )

    def submit_feedback(
        self,
        grievance_id: Union[str, ObjectId],
        applicant_user: Any,
        rating: int,
        feedback_text: str = "",
        session=None
    ) -> Dict[str, Any]:
        """Applicant submits post-resolution satisfaction rating and feedback."""
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        user_oid = self.to_object_id(_get_user_attr(applicant_user, "id"))
        if doc.get("owner_user_id") != user_oid:
            raise PermissionError("Access forbidden: You can only submit feedback for your own grievances.")

        if rating < 1 or rating > 5:
            raise ValueError("Rating must be an integer between 1 and 5.")

        now = datetime.now(timezone.utc)
        fb_data = {
            "rating": rating,
            "feedback_text": feedback_text.strip(),
            "submitted_at": now
        }

        self.collection.update_one(
            {"_id": grv_oid},
            {"$set": {"feedback": fb_data, "updated_at": now}},
            session=session
        )

        self.audit_repo.record_event(
            grievance_id=grv_oid,
            grievance_reference=doc.get("grievance_reference", ""),
            actor_user=applicant_user,
            action="FEEDBACK_SUBMITTED",
            previous_status=doc.get("status"),
            new_status=doc.get("status"),
            remarks=f"Applicant submitted satisfaction rating: {rating}/5.",
            session=session
        )

        return fb_data

    def withdraw_grievance(
        self,
        grievance_id: Union[str, ObjectId],
        applicant_user: Any,
        reason: str,
        session=None
    ) -> Dict[str, Any]:
        """Applicant withdraws their grievance."""
        grv_oid = self.to_object_id(grievance_id)
        doc = self.collection.find_one({"_id": grv_oid})
        if not doc:
            raise ValueError("Grievance not found.")

        user_oid = self.to_object_id(_get_user_attr(applicant_user, "id"))
        if doc.get("owner_user_id") != user_oid and _get_user_attr(applicant_user, "role") != "SUPER_ADMIN":
            raise PermissionError("Access forbidden: You can only withdraw your own grievances.")

        now = datetime.now(timezone.utc)
        wd_data = {
            "withdrawn_at": now,
            "reason": reason.strip(),
            "withdrawn_by": _get_user_attr(applicant_user, "email")
        }

        return self.transition_status(
            grievance_id=grv_oid,
            new_status="WITHDRAWN",
            actor_user=applicant_user,
            action_name="WITHDRAWN",
            remarks=f"Grievance withdrawn. Reason: {reason.strip()}",
            extra_updates={"withdrawal_details": wd_data},
            session=session
        )

    # -------------------------------------------------------------------------
    # Super Admin National Analytics & Oversight
    # -------------------------------------------------------------------------
    def get_national_oversight(self) -> Dict[str, Any]:
        """
        Computes real-time grievance oversight metrics via MongoDB aggregation.
        Never returns hardcoded statistics.
        """
        now = datetime.now(timezone.utc)

        # 1. Status distribution
        status_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        status_counts = {item["_id"]: item["count"] for item in self.collection.aggregate(status_pipeline)}

        # 2. State distribution
        state_pipeline = [
            {"$group": {"_id": "$state_code", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        state_distribution = [
            {"state_code": item["_id"], "count": item["count"]}
            for item in self.collection.aggregate(state_pipeline)
        ]

        # 3. Department distribution
        dept_pipeline = [
            {"$group": {"_id": "$department_code", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        department_distribution = [
            {"department_code": item["_id"], "count": item["count"]}
            for item in self.collection.aggregate(dept_pipeline)
        ]

        # 4. Officer Workload (Open grievances per assigned officer)
        officer_pipeline = [
            {"$match": {
                "assigned_officer_id": {"$ne": None},
                "status": {"$nin": ["RESOLVED", "CLOSED", "WITHDRAWN"]}
            }},
            {"$group": {
                "_id": "$assigned_officer_id",
                "officer_email": {"$first": "$assigned_officer_email"},
                "officer_name": {"$first": "$assigned_officer_name"},
                "active_count": {"$sum": 1}
            }},
            {"$sort": {"active_count": -1}}
        ]
        officer_workload = [
            {
                "officer_id": str(item["_id"]),
                "officer_email": item.get("officer_email"),
                "officer_name": item.get("officer_name"),
                "active_count": item["count"] if "count" in item else item.get("active_count", 0)
            }
            for item in self.collection.aggregate(officer_pipeline)
        ]

        # 5. Overdue / SLA Breaches
        overdue_count = self.collection.count_documents({
            "status": {"$nin": ["RESOLVED", "CLOSED", "WITHDRAWN"]},
            "internal_target_date": {"$lt": now}
        })

        # 6. Escalated Grievances Count
        escalated_count = self.collection.count_documents({
            "escalation_level": {"$in": ["LEVEL_2", "LEVEL_3"]},
            "status": {"$nin": ["RESOLVED", "CLOSED", "WITHDRAWN"]}
        })

        total = self.collection.count_documents({})
        resolved_count = (status_counts.get("RESOLVED", 0) + status_counts.get("CLOSED", 0))

        return {
            "total_grievances": total,
            "open_grievances": max(0, total - resolved_count - status_counts.get("WITHDRAWN", 0)),
            "resolved_grievances": resolved_count,
            "escalated_count": escalated_count,
            "overdue_count": overdue_count,
            "status_distribution": status_counts,
            "state_distribution": state_distribution,
            "department_distribution": department_distribution,
            "officer_workload": officer_workload,
            "prototype_disclaimer": GRIEVANCE_PROTOTYPE_DISCLAIMER
        }

    # -------------------------------------------------------------------------
    # Automatic Escalation Execution Engine (Scheduled / Daemon Command)
    # -------------------------------------------------------------------------
    def process_automatic_escalations(self, session=None) -> Dict[str, Any]:
        """
        Evaluates active, unresolved grievances against configured escalation rules.
        Idempotent execution:
        - Evaluates Level 1 -> Level 2 inactivity / unassigned timeout (default 3 / 7 days).
        - Evaluates Level 2 -> Level 3 SLA breach / supervisory timeout (default 15 days).
        - Generates append-only audit events in Collection 23.
        - Dispatches deduplicated in-app notifications.
        - Respects officer jurisdiction and Super Admin national oversight.
        """
        now = datetime.now(timezone.utc)

        def _to_utc(val: Any) -> Optional[datetime]:
            if not val:
                return None
            if isinstance(val, str):
                try:
                    val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                except Exception:
                    return None
            if isinstance(val, datetime):
                if val.tzinfo is None:
                    val = val.replace(tzinfo=timezone.utc)
                return val
            return None

        # 1. Fetch active escalation rules or use defaults
        rule_repo = GrievanceEscalationRuleRepository()
        active_rules_list = list(rule_repo.collection.find({"is_active": True}))

        unassigned_threshold_days = 3
        ageing_threshold_days = 7
        l3_threshold_days = 15

        for r in active_rules_list:
            ttype = r.get("trigger_type") or r.get("rule_name", "")
            tdays = r.get("threshold_days") or r.get("trigger_days")
            if tdays is not None:
                try:
                    tdays = int(tdays)
                    if "UNASSIGNED" in str(ttype).upper():
                        unassigned_threshold_days = tdays
                    elif "AGEING" in str(ttype).upper() or r.get("level") == "LEVEL_2":
                        ageing_threshold_days = tdays
                    elif r.get("level") == "LEVEL_3" or "SLA" in str(ttype).upper():
                        l3_threshold_days = tdays
                except (ValueError, TypeError):
                    pass

        # 2. Query active grievances eligible for automated escalation
        candidates = list(self.collection.find({
            "status": {"$nin": ["RESOLVED", "CLOSED", "WITHDRAWN"]},
            "escalation_level": {"$ne": "LEVEL_3"}
        }))

        stats = {
            "processed": len(candidates),
            "escalated_to_l2": 0,
            "escalated_to_l3": 0,
            "skipped_idempotent": 0,
            "notifications_dispatched": 0,
            "timestamp": now.isoformat()
        }

        system_actor = {"id": None, "email": "scheduler@bizpermit.in", "role": "SYSTEM"}

        for doc in candidates:
            grv_oid = doc["_id"]
            curr_level = doc.get("escalation_level", "LEVEL_1")
            curr_status = doc.get("status", "SUBMITTED")
            created_at = _to_utc(doc.get("submitted_at") or doc.get("created_at")) or now
            last_activity = _to_utc(doc.get("updated_at") or doc.get("assigned_at")) or created_at
            target_date = _to_utc(doc.get("internal_target_date"))
            assigned_officer = doc.get("assigned_officer_id")

            target_level = None
            trigger_tag = None
            reason_text = None

            age_since_creation = (now - created_at).total_seconds() / 86400.0
            age_since_activity = (now - last_activity).total_seconds() / 86400.0

            if curr_level == "LEVEL_1":
                # Check Unassigned Timeout
                if not assigned_officer and age_since_creation >= unassigned_threshold_days:
                    target_level = "LEVEL_2"
                    trigger_tag = "UNASSIGNED_TIMEOUT"
                    reason_text = f"Unassigned for {age_since_creation:.1f} days (threshold: {unassigned_threshold_days} days). Auto-escalated to State Supervisory pool."
                # Check Inactivity Ageing Timeout
                elif age_since_activity >= ageing_threshold_days:
                    target_level = "LEVEL_2"
                    trigger_tag = "AGEING_TIMEOUT"
                    reason_text = f"Inactive for {age_since_activity:.1f} days without progress (threshold: {ageing_threshold_days} days). Auto-escalated to State Supervisory pool."
                # Check SLA Target Date
                elif target_date and now >= target_date:
                    target_level = "LEVEL_2"
                    trigger_tag = "TARGET_BREACHED"
                    reason_text = "Internal resolution target date breached. Auto-escalated to State Supervisory pool."

            elif curr_level == "LEVEL_2":
                escalated_at = _to_utc(doc.get("escalated_at")) or last_activity
                age_since_escalation = (now - escalated_at).total_seconds() / 86400.0
                if age_since_escalation >= (l3_threshold_days - ageing_threshold_days) or age_since_creation >= l3_threshold_days:
                    target_level = "LEVEL_3"
                    trigger_tag = "TARGET_BREACHED"
                    reason_text = f"Unresolved at State Supervisory tier (Level 2) for {age_since_escalation:.1f} days. Auto-escalated to Super Admin National Oversight."

            if not target_level:
                stats["skipped_idempotent"] += 1
                continue

            # Idempotency check: don't re-escalate if already at or above target level
            if curr_level == target_level:
                stats["skipped_idempotent"] += 1
                continue

            # Execute escalation transition
            extra = {
                "escalation_level": target_level,
                "escalated_at": now,
                "updated_at": now,
                "status": "REFERRED_FOR_ESCALATION",
                "escalation_details": {
                    "previous_level": curr_level,
                    "new_level": target_level,
                    "trigger": trigger_tag,
                    "reason": reason_text,
                    "escalated_by": "SYSTEM_DAEMON",
                    "timestamp": now
                }
            }

            self.collection.update_one({"_id": grv_oid}, {"$set": extra}, session=session)

            # Record immutable audit event in Collection 23
            self.audit_repo.record_event(
                grievance_id=grv_oid,
                grievance_reference=doc.get("grievance_reference", doc.get("grievance_id", str(grv_oid))),
                actor_user=system_actor,
                action="AUTOMATIC_ESCALATION",
                previous_status=curr_status,
                new_status="REFERRED_FOR_ESCALATION",
                previous_level=curr_level,
                new_level=target_level,
                remarks=f"Automatic grievance escalation to {target_level}. {reason_text}",
                metadata={
                    "trigger": trigger_tag,
                    "target_level": target_level,
                    "automated": True,
                    "unassigned_days": unassigned_threshold_days,
                    "ageing_days": ageing_threshold_days,
                    "l3_days": l3_threshold_days
                },
                session=session
            )

            # Dispatch deduplicated notification
            notif_type = f"GRIEVANCE_ESCALATED_{target_level}"
            existing_notif = self.notification_repo.collection.find_one({
                "reference_id": str(grv_oid),
                "notification_type": notif_type
            })
            if not existing_notif and doc.get("owner_user_id"):
                self.notification_repo.create_notification(
                    recipient_user_id=doc["owner_user_id"],
                    notification_type=notif_type,
                    title=f"Grievance Auto-Escalated to {target_level}",
                    message=f"Grievance #{doc.get('grievance_reference', doc.get('grievance_id', str(grv_oid)))} has been escalated to {target_level} due to SLA threshold breach.",
                    reference_id=str(grv_oid),
                    metadata={"grievance_id": str(grv_oid), "target_level": target_level, "trigger": trigger_tag},
                    session=session
                )
                stats["notifications_dispatched"] += 1

            if target_level == "LEVEL_2":
                stats["escalated_to_l2"] += 1
            elif target_level == "LEVEL_3":
                stats["escalated_to_l3"] += 1

        return stats
