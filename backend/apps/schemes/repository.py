"""
Government Schemes, Recommendations & Application Repositories.
Implements native PyMongo data access with strict tenant isolation,
append-only recommendation history, and immutable attestation tracking.
"""

import logging
from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId
from apps.common.base_repository import BaseRepository
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.documents.repository import DocumentRepository

logger = logging.getLogger('bizpermit.schemes')


class SchemeRepository(BaseRepository):
    collection_name = "schemes"

    def find_all(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        return list(self.collection.find().sort("scheme_code", 1).skip(skip).limit(limit))

    def find_by_code(self, scheme_code: str) -> Optional[Dict[str, Any]]:
        if not scheme_code:
            return None
        return self.collection.find_one({"scheme_code": scheme_code.strip().upper()})

    def filter_schemes(
        self,
        state_code: Optional[str] = None,
        authority_level: Optional[str] = None,
        financial_instrument_type: Optional[str] = None,
        scheme_lifecycle_status: Optional[str] = None,
        fresh_intake_status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}

        if state_code:
            # Allow schemes matching state_code or central schemes ("IN-ALL" or "CENTRAL")
            query["$or"] = [
                {"state_code": state_code.strip().upper()},
                {"state_code": "IN-ALL"},
                {"authority_level": "CENTRAL"}
            ]

        if authority_level:
            query["authority_level"] = authority_level.strip().upper()

        if financial_instrument_type:
            query["financial_instrument_type"] = financial_instrument_type.strip().upper()

        if scheme_lifecycle_status:
            query["scheme_lifecycle_status"] = scheme_lifecycle_status.strip().upper()

        if fresh_intake_status:
            query["fresh_intake_status"] = fresh_intake_status.strip().upper()

        if search:
            s = search.strip()
            search_clause = {
                "$or": [
                    {"name": {"$regex": s, "$options": "i"}},
                    {"short_name": {"$regex": s, "$options": "i"}},
                    {"scheme_code": {"$regex": s, "$options": "i"}},
                    {"description": {"$regex": s, "$options": "i"}},
                    {"department_code": {"$regex": s, "$options": "i"}}
                ]
            }
            if "$or" in query:
                query = {"$and": [query, search_clause]}
            else:
                query.update(search_clause)

        return list(self.collection.find(query).sort("scheme_code", 1).skip(skip).limit(limit))

    def count(self, query: Optional[Dict[str, Any]] = None) -> int:
        return self.collection.count_documents(query or {})

    def _log_admin_action(
        self,
        scheme_code: str,
        actor_id: Union[str, ObjectId],
        actor_email: str,
        actor_role: str,
        action: str,
        details: Dict[str, Any],
        session=None
    ) -> None:
        """Appends an immutable audit log entry for administrative scheme mutations."""
        audit_col = self.get_collection("scheme_admin_audit_logs")
        audit_entry = {
            "scheme_code": scheme_code.strip().upper(),
            "actor_id": self.to_object_id(actor_id),
            "actor_email": actor_email,
            "actor_role": actor_role,
            "action": action,
            "timestamp": datetime.now(timezone.utc),
            "details": details
        }
        audit_col.insert_one(audit_entry, session=session)

    def create_scheme(
        self,
        scheme_data: Dict[str, Any],
        actor_id: Union[str, ObjectId],
        actor_email: str,
        actor_role: str,
        session=None
    ) -> Dict[str, Any]:
        """Creates a new scheme master record in DRAFT / UNVERIFIED state."""
        now = datetime.now(timezone.utc)
        scheme_code = scheme_data["scheme_code"].strip().upper()

        if self.find_by_code(scheme_code):
            raise ValueError(f"Scheme with code '{scheme_code}' already exists.")

        scheme_doc = dict(scheme_data)
        scheme_doc["scheme_code"] = scheme_code
        scheme_doc["verification_status"] = "UNVERIFIED"
        scheme_doc["is_active"] = False
        scheme_doc["created_by"] = self.to_object_id(actor_id)
        scheme_doc["created_at"] = now
        scheme_doc["updated_at"] = now

        initial_rules = scheme_doc.get("declarative_rules") or scheme_doc.get("eligibility_rules") or []
        rule_version = scheme_doc.get("scheme_rule_version") or "1.0"
        scheme_doc["active_rule_version"] = rule_version
        scheme_doc["rule_versions"] = [
            {
                "version": rule_version,
                "rules": initial_rules,
                "created_by": self.to_object_id(actor_id),
                "created_at": now,
                "is_verified": False,
                "verification_notes": None
            }
        ]

        created = self.create(scheme_doc, session=session)
        self._log_admin_action(
            scheme_code=scheme_code,
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            action="SCHEME_CREATED",
            details={"scheme_name": scheme_doc.get("name"), "rule_version": rule_version},
            session=session
        )
        return created

    def update_scheme_metadata(
        self,
        scheme_code: str,
        update_data: Dict[str, Any],
        actor_id: Union[str, ObjectId],
        actor_email: str,
        actor_role: str,
        session=None
    ) -> Optional[Dict[str, Any]]:
        """Updates scheme descriptive and statutory metadata."""
        scheme = self.find_by_code(scheme_code)
        if not scheme:
            return None

        allowed_fields = [
            "name", "short_name", "description", "nodal_ministry", "department_code",
            "implementing_agency", "financial_instrument_type", "state_code", "authority_level",
            "statutory_reference", "benefits_structure", "facility_ceilings_by_lender",
            "guarantee_coverage_table", "implementation_period", "beneficiary_claim_period",
            "operating_or_ppa_period"
        ]

        payload = {k: v for k, v in update_data.items() if k in allowed_fields}
        payload["updated_at"] = datetime.now(timezone.utc)

        self.collection.update_one(
            {"_id": scheme["_id"]},
            {"$set": payload},
            session=session
        )

        self._log_admin_action(
            scheme_code=scheme_code,
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            action="METADATA_UPDATED",
            details={"updated_fields": list(payload.keys())},
            session=session
        )
        return self.find_by_code(scheme_code)

    def create_rule_version(
        self,
        scheme_code: str,
        version: str,
        rules: List[Dict[str, Any]],
        actor_id: Union[str, ObjectId],
        actor_email: str,
        actor_role: str,
        session=None
    ) -> Dict[str, Any]:
        """Creates a new version of declarative eligibility rules."""
        scheme = self.find_by_code(scheme_code)
        if not scheme:
            raise ValueError(f"Scheme '{scheme_code}' does not exist.")

        now = datetime.now(timezone.utc)
        version_entry = {
            "version": version.strip(),
            "rules": rules,
            "created_by": self.to_object_id(actor_id),
            "created_at": now,
            "is_verified": False,
            "verification_notes": None
        }

        self.collection.update_one(
            {"_id": scheme["_id"]},
            {
                "$push": {"rule_versions": version_entry},
                "$set": {"updated_at": now}
            },
            session=session
        )

        self._log_admin_action(
            scheme_code=scheme_code,
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            action="RULE_VERSION_CREATED",
            details={"version": version, "rule_count": len(rules)},
            session=session
        )
        return self.find_by_code(scheme_code)

    def submit_for_verification(
        self,
        scheme_code: str,
        actor_id: Union[str, ObjectId],
        actor_email: str,
        actor_role: str,
        session=None
    ) -> Dict[str, Any]:
        """Submits scheme statutory evidence for formal verification."""
        scheme = self.find_by_code(scheme_code)
        if not scheme:
            raise ValueError(f"Scheme '{scheme_code}' does not exist.")

        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": scheme["_id"]},
            {
                "$set": {
                    "verification_status": "UNDER_VERIFICATION",
                    "submitted_for_verification_at": now,
                    "submitted_by": self.to_object_id(actor_id),
                    "updated_at": now
                }
            },
            session=session
        )

        self._log_admin_action(
            scheme_code=scheme_code,
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            action="SUBMITTED_FOR_VERIFICATION",
            details={},
            session=session
        )
        return self.find_by_code(scheme_code)

    def verify_evidence(
        self,
        scheme_code: str,
        decision: str,
        notes: str,
        verified_source_url: Optional[str],
        actor_id: Union[str, ObjectId],
        actor_email: str,
        actor_role: str,
        session=None
    ) -> Dict[str, Any]:
        """Verifies or rejects statutory source evidence for a scheme."""
        scheme = self.find_by_code(scheme_code)
        if not scheme:
            raise ValueError(f"Scheme '{scheme_code}' does not exist.")

        decision_clean = decision.strip().upper()
        if decision_clean not in ["VERIFIED", "REJECTED"]:
            raise ValueError("Decision must be either 'VERIFIED' or 'REJECTED'.")

        now = datetime.now(timezone.utc)
        update_doc: Dict[str, Any] = {
            "verification_status": decision_clean,
            "last_verified_at": now,
            "verified_by_actor_id": self.to_object_id(actor_id),
            "verified_by_actor_email": actor_email,
            "verification_notes": notes.strip(),
            "updated_at": now
        }

        if verified_source_url:
            update_doc["statutory_reference.source_url"] = verified_source_url.strip()

        self.collection.update_one(
            {"_id": scheme["_id"]},
            {"$set": update_doc},
            session=session
        )

        self._log_admin_action(
            scheme_code=scheme_code,
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            action=f"EVIDENCE_{decision_clean}",
            details={"notes": notes, "decision": decision_clean},
            session=session
        )
        return self.find_by_code(scheme_code)

    def activate_rule_version(
        self,
        scheme_code: str,
        version: str,
        fresh_intake_status: str,
        actor_id: Union[str, ObjectId],
        actor_email: str,
        actor_role: str,
        session=None
    ) -> Dict[str, Any]:
        """
        Activates a verified rule version.
        Guards: Unverified schemes cannot be activated.
        """
        scheme = self.find_by_code(scheme_code)
        if not scheme:
            raise ValueError(f"Scheme '{scheme_code}' does not exist.")

        if scheme.get("verification_status") != "VERIFIED":
            raise ValueError("Cannot activate scheme: Statutory source evidence must be formally VERIFIED prior to activation.")

        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": scheme["_id"]},
            {
                "$set": {
                    "is_active": True,
                    "active_rule_version": version.strip(),
                    "scheme_rule_version": version.strip(),
                    "fresh_intake_status": fresh_intake_status.strip().upper(),
                    "activated_at": now,
                    "updated_at": now
                }
            },
            session=session
        )

        # Invalidate active recommendation pointers for this scheme to trigger fresh evaluation
        rec_repo = SchemeRecommendationRepository()
        rec_repo.invalidate_by_scheme_rule_version(
            scheme_code=scheme_code,
            reason=f"Scheme activated with rule version {version}"
        )

        self._log_admin_action(
            scheme_code=scheme_code,
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            action="RULE_VERSION_ACTIVATED",
            details={"version": version, "fresh_intake_status": fresh_intake_status},
            session=session
        )
        return self.find_by_code(scheme_code)

    def get_scheme_history(self, scheme_code: str) -> Dict[str, Any]:
        """Returns rule version history and administrative audit log."""
        scheme = self.find_by_code(scheme_code)
        if not scheme:
            return {"audit_logs": [], "rule_versions": []}

        scheme_serialized = BaseRepository.serialize_doc(scheme) or {}
        audit_col = self.get_collection("scheme_admin_audit_logs")
        logs = list(audit_col.find({"scheme_code": scheme_code.strip().upper()}).sort("timestamp", -1))

        return {
            "scheme_code": scheme_code,
            "rule_versions": scheme_serialized.get("rule_versions", []),
            "active_rule_version": scheme_serialized.get("active_rule_version") or scheme_serialized.get("scheme_rule_version"),
            "audit_logs": [BaseRepository.serialize_doc(l) for l in logs]
        }

    def upsert_scheme(self, scheme_code: str, scheme_doc: Dict[str, Any], session=None) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        scheme_code_norm = scheme_code.strip().upper()
        scheme_doc["scheme_code"] = scheme_code_norm
        scheme_doc["updated_at"] = now
        # Default verification status for seeded items
        if "verification_status" not in scheme_doc:
            scheme_doc["verification_status"] = "VERIFIED"

        existing = self.find_by_code(scheme_code_norm)
        if existing:
            self.collection.update_one(
                {"_id": existing["_id"]},
                {"$set": scheme_doc},
                session=session
            )
            return self.find_by_code(scheme_code_norm)
        else:
            scheme_doc["created_at"] = now
            return self.create(scheme_doc, session=session)


class SchemeRecommendationRepository(BaseRepository):
    collection_name = "scheme_recommendations"
    pointers_collection_name = "scheme_recommendation_pointers"

    @property
    def pointers_collection(self):
        return self.get_collection(self.pointers_collection_name)

    def create_evaluation(self, doc: Dict[str, Any], session=None) -> Dict[str, Any]:
        """
        Pure immutable evaluation storage.
        1. Inserts the new evaluation snapshot into scheme_recommendations (never modified).
        2. Atomically updates the latest pointer in scheme_recommendation_pointers.
        """
        now = datetime.now(timezone.utc)
        loc_oid = self.to_object_id(doc["location_id"])
        bus_oid = self.to_object_id(doc["business_id"])
        usr_oid = self.to_object_id(doc["user_id"])
        scheme_code = doc["scheme_code"].strip().upper()

        # Step 1: Pure immutable snapshot record
        snapshot_record = {
            "location_id": loc_oid,
            "business_id": bus_oid,
            "user_id": usr_oid,
            "scheme_code": scheme_code,
            "scheme_rule_version": doc.get("scheme_rule_version", "1.0"),
            "profile_snapshot_hash": doc["profile_snapshot_hash"],
            "evaluated_at": now,
            "overall_eligibility": doc["overall_eligibility"],
            "criteria_results": doc.get("criteria_results", []),
            "financial_summary": doc.get("financial_summary", {}),
            "disclaimers": doc.get("disclaimers", []),
            "created_at": now
        }
        saved_snapshot = self.create(snapshot_record, session=session)

        # Step 2: Atomic concurrency-safe pointer update
        self.pointers_collection.update_one(
            {
                "location_id": loc_oid,
                "scheme_code": scheme_code
            },
            {
                "$set": {
                    "business_id": bus_oid,
                    "user_id": usr_oid,
                    "latest_recommendation_id": saved_snapshot["_id"],
                    "overall_eligibility": doc["overall_eligibility"],
                    "profile_snapshot_hash": doc["profile_snapshot_hash"],
                    "scheme_rule_version": doc.get("scheme_rule_version", "1.0"),
                    "is_valid": True,
                    "invalidation_reason": None,
                    "invalidation_timestamp": None,
                    "updated_at": now
                }
            },
            upsert=True,
            session=session
        )

        # For backwards compatibility with consumers expecting is_latest: True on active returns
        return_doc = dict(saved_snapshot)
        return_doc["is_latest"] = True
        return_doc["is_stale"] = False
        return return_doc

    def find_latest_by_location_and_scheme(
        self,
        location_id: Union[str, ObjectId],
        scheme_code: str,
        include_stale: bool = True
    ) -> Optional[Dict[str, Any]]:
        loc_oid = self.to_object_id(location_id)
        if not loc_oid or not scheme_code:
            return None

        query: Dict[str, Any] = {
            "location_id": loc_oid,
            "scheme_code": scheme_code.strip().upper()
        }
        if not include_stale:
            query["is_valid"] = True

        pointer = self.pointers_collection.find_one(query)
        if not pointer or not pointer.get("latest_recommendation_id"):
            return None

        rec = self.collection.find_one({"_id": pointer["latest_recommendation_id"]})
        if rec:
            rec_copy = dict(rec)
            rec_copy["is_latest"] = True
            rec_copy["is_stale"] = not pointer.get("is_valid", True)
            rec_copy["invalidation_reason"] = pointer.get("invalidation_reason")
            rec_copy["invalidation_timestamp"] = pointer.get("invalidation_timestamp")
            return rec_copy
        return None

    def find_latest_by_location(
        self,
        location_id: Union[str, ObjectId],
        include_stale: bool = True
    ) -> List[Dict[str, Any]]:
        loc_oid = self.to_object_id(location_id)
        if not loc_oid:
            return []

        pointer_query: Dict[str, Any] = {"location_id": loc_oid}
        if not include_stale:
            pointer_query["is_valid"] = True

        pointers = list(self.pointers_collection.find(pointer_query).sort("scheme_code", 1))
        results = []
        for p in pointers:
            rec = self.collection.find_one({"_id": p.get("latest_recommendation_id")})
            if rec:
                rec_copy = dict(rec)
                rec_copy["is_latest"] = True
                rec_copy["is_stale"] = not p.get("is_valid", True)
                rec_copy["invalidation_reason"] = p.get("invalidation_reason")
                results.append(rec_copy)
        return results

    def find_history_by_location(
        self,
        location_id: Union[str, ObjectId],
        scheme_code: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        loc_oid = self.to_object_id(location_id)
        if not loc_oid:
            return []
        query: Dict[str, Any] = {"location_id": loc_oid}
        if scheme_code:
            query["scheme_code"] = scheme_code.strip().upper()

        records = list(self.collection.find(query).sort("evaluated_at", -1).skip(skip).limit(limit))
        return records

    def invalidate_latest_by_location(
        self,
        location_id: Union[str, ObjectId],
        reason: str,
        session=None
    ) -> int:
        """
        Invalidates current pointer metadata without touching immutable evaluation snapshots.
        """
        loc_oid = self.to_object_id(location_id)
        if not loc_oid:
            return 0
        now = datetime.now(timezone.utc)
        result = self.pointers_collection.update_many(
            {"location_id": loc_oid, "is_valid": True},
            {
                "$set": {
                    "is_valid": False,
                    "invalidation_reason": reason,
                    "invalidation_timestamp": now,
                    "updated_at": now
                }
            },
            session=session
        )
        return result.modified_count

    def invalidate_by_scheme_rule_version(
        self,
        scheme_code: str,
        reason: str,
        session=None
    ) -> int:
        """
        Invalidates current pointers for a scheme without altering historical evaluations.
        """
        if not scheme_code:
            return 0
        now = datetime.now(timezone.utc)
        result = self.pointers_collection.update_many(
            {"scheme_code": scheme_code.strip().upper(), "is_valid": True},
            {
                "$set": {
                    "is_valid": False,
                    "invalidation_reason": reason,
                    "invalidation_timestamp": now,
                    "updated_at": now
                }
            },
            session=session
        )
        return result.modified_count

    def find_by_id(self, evaluation_id: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        oid = self.to_object_id(evaluation_id)
        if not oid:
            return None
        return self.collection.find_one({"_id": oid})


class SchemeApplicationRepository(BaseRepository):
    collection_name = "scheme_applications"

    def generate_reference(self, state_code: str = "IN-ALL") -> str:
        state_tag = state_code.replace("IN-", "").strip().upper() if state_code else "ALL"
        year = datetime.now(timezone.utc).year
        count = self.collection.count_documents({}) + 1
        return f"SCH-{state_tag}-{year}-{count:04d}"

    def create_dossier(
        self,
        business_id: Union[str, ObjectId],
        location_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        scheme_code: str,
        recommendation_id: Union[str, ObjectId],
        profile_snapshot_hash: str,
        scheme_rule_version: str,
        dossier_data: Optional[Dict[str, Any]] = None,
        is_legacy_claim: bool = False,
        legacy_approval_reference: Optional[str] = None,
        legacy_sanction_date: Optional[str] = None,
        session=None
    ) -> Dict[str, Any]:
        scheme_repo = SchemeRepository()
        scheme = scheme_repo.find_by_code(scheme_code)
        if not scheme:
            raise ValueError(f"Scheme '{scheme_code}' does not exist.")

        intake_status = scheme.get("fresh_intake_status", "OPEN").upper()
        if intake_status != "OPEN":
            if not is_legacy_claim or not legacy_approval_reference or not legacy_sanction_date:
                raise ValueError(
                    f"Cannot create application: Fresh proposal intake for scheme '{scheme_code}' is currently closed "
                    f"({intake_status}). Ordinary fresh intake is restricted to schemes with status OPEN."
                )

        now = datetime.now(timezone.utc)
        bus_oid = self.to_object_id(business_id)
        loc_oid = self.to_object_id(location_id)
        usr_oid = self.to_object_id(user_id)
        rec_oid = self.to_object_id(recommendation_id)

        # Resolve location state for reference prefix
        loc_repo = LocationRepository()
        loc = loc_repo.find_by_id(loc_oid)
        state_code = "IN-ALL"
        if loc:
            state_code = loc.get("address", {}).get("state_code") or loc.get("jurisdiction_hierarchy", {}).get("state_code") or "IN-ALL"

        doc = {
            "application_reference": self.generate_reference(state_code),
            "business_id": bus_oid,
            "location_id": loc_oid,
            "user_id": usr_oid,
            "scheme_code": scheme_code.strip().upper(),
            "department_code": scheme.get("department_code") or "IND",
            "state_code": state_code,
            "recommendation_id": rec_oid,
            "profile_snapshot_hash": profile_snapshot_hash,
            "scheme_rule_version": scheme_rule_version,
            "status": "DRAFT",  # DRAFT -> DOCUMENT_ASSEMBLY -> READY_FOR_FILING -> USER_REPORTED_EXTERNAL_SUBMISSION
            "review_status": "PENDING_REVIEW",
            "assigned_officer_id": None,
            "assigned_officer_email": None,
            "assigned_officer_name": None,
            "assigned_at": None,
            "clarifications": [],
            "review_decision": None,
            "is_legacy_claim": is_legacy_claim,
            "legacy_approval_reference": legacy_approval_reference,
            "legacy_sanction_date": legacy_sanction_date,
            "is_locked": False,
            "dossier_data": dossier_data or {
                "project_cost_inr": None,
                "claimed_eligible_investment_inr": None,
                "employment_generation": None,
                "commercial_production_date": None,
                "questionnaire_responses": {},
                "notes": ""
            },
            "attached_vault_documents": [],  # List of { vault_document_id, document_category, file_name, attached_at }
            "external_submission": None,
            "created_at": now,
            "updated_at": now
        }

        return self.create(doc, session=session)

    def find_by_id(self, application_id: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        oid = self.to_object_id(application_id)
        if not oid:
            return None
        return self.collection.find_one({"_id": oid})

    def find_by_id_for_user(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId]
    ) -> Optional[Dict[str, Any]]:
        """Multi-tenant security check: verifies user owns the application or the parent business."""
        app = self.find_by_id(application_id)
        if not app:
            return None
        u_oid = self.to_object_id(user_id)
        if app.get("user_id") == u_oid:
            return app

        # Alternatively verify business ownership
        b_repo = BusinessRepository()
        business = b_repo.find_by_id_for_owner(app["business_id"], u_oid)
        if business:
            return app

        return None

    def find_by_user(
        self,
        user_id: Union[str, ObjectId],
        status: Optional[str] = None,
        business_id: Optional[Union[str, ObjectId]] = None,
        location_id: Optional[Union[str, ObjectId]] = None,
        scheme_code: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return []

        # Find all businesses owned by user to enable comprehensive team visibility
        b_repo = BusinessRepository()
        user_businesses = b_repo.find_by_owner(u_oid)
        business_ids = [b["_id"] for b in user_businesses]

        query: Dict[str, Any] = {
            "$or": [
                {"user_id": u_oid},
                {"business_id": {"$in": business_ids}}
            ]
        }

        if status:
            query["status"] = status.strip().upper()

        if business_id:
            b_oid = self.to_object_id(business_id)
            if b_oid:
                query["business_id"] = b_oid

        if location_id:
            l_oid = self.to_object_id(location_id)
            if l_oid:
                query["location_id"] = l_oid

        if scheme_code:
            query["scheme_code"] = scheme_code.strip().upper()

        return list(self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit))

    def update_dossier(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        update_data: Dict[str, Any],
        session=None
    ) -> Optional[Dict[str, Any]]:
        app = self.find_by_id_for_user(application_id, user_id)
        if not app:
            return None

        # Immutability defense: Locked once submitted
        if app.get("status") == "USER_REPORTED_EXTERNAL_SUBMISSION":
            raise ValueError("Application is already locked and submitted externally. Further modifications are prohibited.")

        allowed_fields = ["dossier_data", "status"]
        payload: Dict[str, Any] = {}

        if "dossier_data" in update_data:
            merged = dict(app.get("dossier_data") or {})
            merged.update(update_data["dossier_data"])
            payload["dossier_data"] = merged

        if "status" in update_data:
            target_status = update_data["status"].strip().upper()
            if target_status in ["DRAFT", "DOCUMENT_ASSEMBLY", "READY_FOR_FILING"]:
                payload["status"] = target_status

        payload["updated_at"] = datetime.now(timezone.utc)

        self.collection.update_one(
            {"_id": app["_id"]},
            {"$set": payload},
            session=session
        )
        return self.find_by_id_for_user(application_id, user_id)

    def attach_vault_document(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        vault_document_id: Union[str, ObjectId],
        document_category: str,
        session=None
    ) -> Optional[Dict[str, Any]]:
        app = self.find_by_id_for_user(application_id, user_id)
        if not app:
            return None

        if app.get("status") == "USER_REPORTED_EXTERNAL_SUBMISSION":
            raise ValueError("Cannot attach documents to an already submitted application.")

        # Cross-tenant check: Vault document MUST belong to the user's business
        doc_repo = DocumentRepository()
        v_doc = doc_repo.find_by_id_for_user(vault_document_id, user_id)
        if not v_doc:
            raise PermissionError("Document not found or does not belong to your business.")

        v_oid = self.to_object_id(vault_document_id)
        # Avoid duplicate attachment of same document
        existing_attachments = app.get("attached_vault_documents", [])
        for att in existing_attachments:
            if att.get("vault_document_id") == v_oid:
                return app  # Already attached

        attachment_entry = {
            "vault_document_id": v_oid,
            "document_category": document_category.strip().upper(),
            "file_name": v_doc.get("file_name") or v_doc.get("original_filename") or "Document",
            "file_size": v_doc.get("file_size", 0),
            "mime_type": v_doc.get("mime_type", "application/pdf"),
            "attached_at": datetime.now(timezone.utc)
        }

        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": app["_id"]},
            {
                "$push": {"attached_vault_documents": attachment_entry},
                "$set": {
                    "updated_at": now,
                    "status": "DOCUMENT_ASSEMBLY" if app.get("status") == "DRAFT" else app.get("status")
                }
            },
            session=session
        )
        return self.find_by_id_for_user(application_id, user_id)

    def remove_vault_document(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        vault_document_id: Union[str, ObjectId],
        session=None
    ) -> Optional[Dict[str, Any]]:
        app = self.find_by_id_for_user(application_id, user_id)
        if not app:
            return None

        if app.get("status") == "USER_REPORTED_EXTERNAL_SUBMISSION":
            raise ValueError("Cannot remove documents from an already submitted application.")

        v_oid = self.to_object_id(vault_document_id)
        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": app["_id"]},
            {
                "$pull": {"attached_vault_documents": {"vault_document_id": v_oid}},
                "$set": {"updated_at": now}
            },
            session=session
        )
        return self.find_by_id_for_user(application_id, user_id)

    def attest_external_submission(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        user_email: str,
        user_role: str,
        attestation_payload: Dict[str, Any],
        session=None
    ) -> Dict[str, Any]:
        """
        Records the REV 4 USER-SELF-ATTESTATION and transitions status to
        USER_REPORTED_EXTERNAL_SUBMISSION. Locked immutably thereafter.
        """
        app = self.find_by_id_for_user(application_id, user_id)
        if not app:
            raise PermissionError("Application not found or unauthorized.")

        if app.get("status") == "USER_REPORTED_EXTERNAL_SUBMISSION":
            raise ValueError("Application has already been submitted and attested.")

        # Validation 1: Explicit user confirmation
        if not attestation_payload.get("attestation_confirmed"):
            raise ValueError("User must explicitly confirm the self-attestation declaration.")

        # Validation 2: Non-empty portal and acknowledgement
        portal_name = (attestation_payload.get("external_portal_name") or "").strip()
        ack_number = (attestation_payload.get("external_acknowledgement_number") or "").strip()
        if not portal_name:
            raise ValueError("External government portal name is mandatory.")
        if not ack_number:
            raise ValueError("Official acknowledgement / application reference number is mandatory.")

        # Validation 3: Submission date <= current date in IST
        sub_date_str = attestation_payload.get("external_submission_date")
        if not sub_date_str:
            raise ValueError("External submission date is mandatory.")

        try:
            if isinstance(sub_date_str, date):
                sub_date = sub_date_str
            else:
                sub_date = datetime.strptime(str(sub_date_str).split("T")[0], "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Invalid submission date format. Expected YYYY-MM-DD.")

        # Compute current date in Indian Standard Time (UTC+5:30)
        from datetime import timedelta
        ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        ist_today = ist_now.date()

        if sub_date > ist_today:
            raise ValueError(f"Submission date cannot be in the future (Date submitted: {sub_date}, Current IST date: {ist_today}).")

        # Validation 4: Linked vault document IDs snapshot
        linked_doc_ids = [
            att.get("vault_document_id") for att in app.get("attached_vault_documents", [])
            if att.get("vault_document_id")
        ]
        vault_ack_id = attestation_payload.get("acknowledgement_vault_id")
        vault_ack_oid = None
        if vault_ack_id:
            doc_repo = DocumentRepository()
            v_doc = doc_repo.find_by_id_for_user(vault_ack_id, user_id)
            if not v_doc:
                raise PermissionError("Linked acknowledgement document not found in your Document Vault.")
            vault_ack_oid = self.to_object_id(vault_ack_id)
            if vault_ack_oid not in linked_doc_ids:
                linked_doc_ids.append(vault_ack_oid)

        now = datetime.now(timezone.utc)
        record = {
            "declaration_text": (
                "I hereby solemnly declare and attest that this application dossier was formally submitted "
                "on the specified external government portal. All information, reference identifiers, "
                "submission dates, and linked statutory documents provided herein are authentic, accurate, "
                "and submitted under the penalty of statutory disqualification."
            ),
            "declaration_version": "v1.4-USER-SELF-ATTESTATION",
            "authenticated_actor_id": self.to_object_id(user_id),
            "actor_email": user_email,
            "actor_role_snapshot": user_role,
            "attestation_timestamp": now,
            "external_portal_name": portal_name,
            "external_acknowledgement_number": ack_number,
            "external_submission_date": sub_date.isoformat(),
            "linked_vault_document_ids": linked_doc_ids,
            "acknowledgement_vault_id": vault_ack_oid,
            "explicit_user_confirmation": True,
            "disclaimer": (
                "USER_REPORTED_EXTERNAL_SUBMISSION: BizPermit is an independent SIH26130 prototype and has not "
                "independently verified this external portal filing with the government department."
            )
        }

        self.collection.update_one(
            {"_id": app["_id"]},
            {
                "$set": {
                    "status": "USER_REPORTED_EXTERNAL_SUBMISSION",
                    "is_locked": True,
                    "external_submission": record,
                    "submitted_at": now,
                    "updated_at": now
                }
            },
            session=session
        )

        return self.find_by_id_for_user(application_id, user_id)
