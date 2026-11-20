"""
Applications Repository for MongoDB.
Encapsulates application dossiers, status transitions, attachments, and officer scrutiny desk queries.
"""

import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId

from apps.common.base_repository import BaseRepository
from apps.businesses.repository import BusinessRepository, LocationRepository
from apps.approvals.repository import ApprovalCatalogueRepository
from apps.documents.repository import DocumentRepository

VALID_STATUSES = [
    'DRAFT', 'SUBMITTED', 'UNDER_SCRUTINY',
    'CLARIFICATION', 'RESUBMITTED', 'APPROVED', 'REJECTED'
]

TRANSITION_RULES = {
    'DRAFT': ['SUBMITTED'],
    'SUBMITTED': ['UNDER_SCRUTINY', 'CLARIFICATION', 'REJECTED'],
    'UNDER_SCRUTINY': ['CLARIFICATION', 'APPROVED', 'REJECTED'],
    'CLARIFICATION': ['RESUBMITTED'],
    'RESUBMITTED': ['UNDER_SCRUTINY', 'CLARIFICATION', 'APPROVED', 'REJECTED'],
    'APPROVED': [],
    'REJECTED': []
}


class ApplicationRepository(BaseRepository):
    collection_name = "applications"

    def generate_application_number(self, state_code: str, dept_code: str) -> str:
        """
        Generates a standardized BizPermit application reference.
        Format: BP-YYYY-STATE-DEPT-XXXXXX
        """
        year = datetime.now(timezone.utc).year
        clean_state = state_code.replace("IN-", "") if state_code else "IN"
        dept_prefix = dept_code.split("-")[0].upper() if dept_code else "REG"
        rand_hex = f"{random.randint(100000, 999999)}"
        return f"BP-{year}-{clean_state}-{dept_prefix}-{rand_hex}"

    def find_active_by_location_and_approval(
        self,
        location_id: Union[str, ObjectId],
        approval_code: str
    ) -> Optional[Dict[str, Any]]:
        l_oid = self.to_object_id(location_id)
        if not l_oid:
            return None
        active_statuses = ['DRAFT', 'SUBMITTED', 'UNDER_SCRUTINY', 'CLARIFICATION', 'RESUBMITTED']
        return self.collection.find_one({
            "location_id": l_oid,
            "approval_code": approval_code.strip().upper(),
            "status": {"$in": active_statuses},
            "is_active": True
        })

    def create_draft(
        self,
        owner_user_id: Union[str, ObjectId],
        business_id: Union[str, ObjectId],
        location_id: Union[str, ObjectId],
        approval_code: str,
        applicant_form_data: Optional[Dict[str, Any]] = None,
        session=None
    ) -> Dict[str, Any]:
        u_oid = self.to_object_id(owner_user_id)
        b_oid = self.to_object_id(business_id)
        l_oid = self.to_object_id(location_id)

        # Retrieve referenced entities
        biz_repo = BusinessRepository()
        business = biz_repo.find_by_id_for_owner(b_oid, u_oid)
        if not business:
            raise ValueError("Business entity not found or access unauthorized.")

        loc_repo = LocationRepository()
        location = loc_repo.find_by_id_for_user(l_oid, u_oid)
        if not location:
            raise ValueError("Plant location not found or access unauthorized.")

        approval_repo = ApprovalCatalogueRepository()
        approval = approval_repo.find_by_code(approval_code)
        if not approval:
            raise ValueError(f"Approval clearance '{approval_code}' not found in master catalogue.")

        state_code = location.get("jurisdiction_hierarchy", {}).get("state_code") or location.get("address", {}).get("state_code", "IN")
        dept_code = approval.get("department_code") or approval.get("issuing_department_code", "GEN-DEPT")
        app_number = self.generate_application_number(state_code, dept_code)

        # Pre-fill default dynamic form data from location & enterprise profile
        ind_prof = location.get("industrial_profile", {})
        default_form = {
            "enterprise_legal_name": business.get("legal_name"),
            "enterprise_pan": business.get("pan"),
            "enterprise_entity_type": business.get("entity_type"),
            "enterprise_gstin": business.get("gstin", ""),
            "plant_name": location.get("location_name"),
            "plant_address": location.get("address", {}),
            "nic_code": ind_prof.get("nic_code", ""),
            "industry_sector": ind_prof.get("sector_name", ""),
            "scale": ind_prof.get("scale", "MEDIUM"),
            "pollution_category": ind_prof.get("pollution_category", "ORANGE"),
            "total_power_load_hp": ind_prof.get("total_power_load_hp", 0),
            "water_requirement_kld": ind_prof.get("water_requirement_kld", 0.0),
            "workforce_capacity": ind_prof.get("workforce_capacity", 0),
            "has_boiler": ind_prof.get("has_boiler", False),
            "has_hazardous_chemicals": ind_prof.get("has_hazardous_chemicals", False),
            "has_groundwater_borewell": ind_prof.get("has_groundwater_borewell", False),
            "project_capital_cost_lakhs": 0.0,
            "proposed_commissioning_date": None,
            "effluent_treatment_details": "",
            "air_pollution_control_measures": ""
        }
        if applicant_form_data:
            default_form.update(applicant_form_data)

        now = datetime.now(timezone.utc)
        doc = {
            "application_number": app_number,
            "owner_user_id": u_oid,
            "business_id": b_oid,
            "location_id": l_oid,
            "approval_code": approval["approval_code"],
            "approval_title": approval.get("title", approval.get("approval_name")),
            "department_code": dept_code,
            "tier": approval.get("tier", "STATE"),
            "state_code": state_code,
            "stage": approval.get("stage", "PRE_ESTABLISHMENT"),
            "statutory_act": approval.get("statutory_act", ""),
            "standard_sla_days": approval.get("standard_sla_days", 30),
            "estimated_fee_inr": approval.get("fee_structure", {}).get("base_amount", 0),
            "status": "DRAFT",
            "applicant_form_data": default_form,
            "attached_documents": [],
            "required_document_checklist": approval.get("document_checklist", []),
            "clarification_query": None,
            "decision_details": None,
            "submitted_at": None,
            "sla_deadline": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }

        created = self.create(doc, session=session)

        # Log initial history
        history_repo = ApplicationStatusHistoryRepository()
        history_repo.create_entry(
            application_id=created["_id"],
            from_status="NONE",
            to_status="DRAFT",
            changed_by_user_id=u_oid,
            actor_role="BUSINESS_OWNER",
            remarks="Draft application dossier initialized.",
            session=session
        )

        return created

    def find_by_id_for_user(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        include_archived: bool = False
    ) -> Optional[Dict[str, Any]]:
        a_oid = self.to_object_id(application_id)
        u_oid = self.to_object_id(user_id)
        if not a_oid or not u_oid:
            return None
        query: Dict[str, Any] = {"_id": a_oid, "owner_user_id": u_oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}
        return self.collection.find_one(query)

    def find_by_number(self, application_number: str) -> Optional[Dict[str, Any]]:
        if not application_number:
            return None
        return self.collection.find_one({
            "application_number": application_number.strip().upper(),
            "is_active": True
        })

    def find_by_user(
        self,
        user_id: Union[str, ObjectId],
        business_id: Optional[Union[str, ObjectId]] = None,
        location_id: Optional[Union[str, ObjectId]] = None,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        include_archived: bool = False
    ) -> List[Dict[str, Any]]:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return []
        query: Dict[str, Any] = {"owner_user_id": u_oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}

        if business_id:
            b_oid = self.to_object_id(business_id)
            if b_oid:
                query["business_id"] = b_oid

        if location_id:
            l_oid = self.to_object_id(location_id)
            if l_oid:
                query["location_id"] = l_oid

        if status:
            query["status"] = status.strip().upper()

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"application_number": regex},
                {"approval_title": regex},
                {"approval_code": regex},
                {"department_code": regex}
            ]

        cursor = self.collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)
        return list(cursor)

    def count_by_user(
        self,
        user_id: Union[str, ObjectId],
        business_id: Optional[Union[str, ObjectId]] = None,
        location_id: Optional[Union[str, ObjectId]] = None,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        include_archived: bool = False
    ) -> int:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return 0
        query: Dict[str, Any] = {"owner_user_id": u_oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}

        if business_id:
            b_oid = self.to_object_id(business_id)
            if b_oid:
                query["business_id"] = b_oid

        if location_id:
            l_oid = self.to_object_id(location_id)
            if l_oid:
                query["location_id"] = l_oid

        if status:
            query["status"] = status.strip().upper()

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"application_number": regex},
                {"approval_title": regex},
                {"approval_code": regex},
                {"department_code": regex}
            ]

        return self.collection.count_documents(query)

    def get_metrics_for_user(
        self,
        user_id: Union[str, ObjectId],
        business_id: Optional[Union[str, ObjectId]] = None
    ) -> Dict[str, int]:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return {s.lower(): 0 for s in VALID_STATUSES} | {"total": 0}

        match_filter: Dict[str, Any] = {"owner_user_id": u_oid, "is_active": {"$ne": False}}
        if business_id:
            b_oid = self.to_object_id(business_id)
            if not b_oid:
                return {s.lower(): 0 for s in VALID_STATUSES} | {"total": 0}
            match_filter["business_id"] = b_oid

        pipeline = [
            {"$match": match_filter},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        results = list(self.collection.aggregate(pipeline))
        counts = {r["_id"]: r["count"] for r in results}
        total = sum(counts.values())

        return {
            "total": total,
            "draft": counts.get("DRAFT", 0),
            "submitted": counts.get("SUBMITTED", 0),
            "under_scrutiny": counts.get("UNDER_SCRUTINY", 0),
            "clarification": counts.get("CLARIFICATION", 0),
            "resubmitted": counts.get("RESUBMITTED", 0),
            "approved": counts.get("APPROVED", 0),
            "rejected": counts.get("REJECTED", 0)
        }

    def update_draft_data(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        form_data: Dict[str, Any],
        session=None
    ) -> Optional[Dict[str, Any]]:
        existing = self.find_by_id_for_user(application_id, user_id)
        if not existing:
            return None

        if existing["status"] not in ("DRAFT", "CLARIFICATION"):
            raise ValueError(f"Application cannot be edited while in status '{existing['status']}'.")

        merged_form = dict(existing.get("applicant_form_data", {}))
        merged_form.update(form_data)
        now = datetime.now(timezone.utc)

        self.collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"applicant_form_data": merged_form, "updated_at": now}},
            session=session
        )
        return self.find_by_id_for_user(application_id, user_id)

    def attach_vault_document(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        vault_document_id: Union[str, ObjectId],
        session=None
    ) -> Dict[str, Any]:
        existing = self.find_by_id_for_user(application_id, user_id)
        if not existing:
            raise ValueError("Application not found or access unauthorized.")

        if existing["status"] not in ("DRAFT", "CLARIFICATION"):
            raise ValueError(f"Documents cannot be attached while application is in '{existing['status']}'.")

        doc_repo = DocumentRepository()
        vault_doc = doc_repo.find_by_id_for_user(vault_document_id, user_id)
        if not vault_doc:
            raise ValueError("Document not found in user's secure vault or access unauthorized.")

        # Check if already attached
        current_attachments = existing.get("attached_documents", [])
        v_oid = vault_doc["_id"]
        for att in current_attachments:
            if att.get("vault_document_id") == v_oid:
                return existing

        new_att = {
            "vault_document_id": v_oid,
            "document_name": vault_doc.get("document_name") or vault_doc.get("title"),
            "document_category": vault_doc.get("document_category"),
            "original_filename": vault_doc.get("original_filename"),
            "sha256_checksum": vault_doc.get("sha256_checksum"),
            "mime_type": vault_doc.get("mime_type"),
            "file_size_bytes": vault_doc.get("file_size_bytes"),
            "attached_at": datetime.now(timezone.utc)
        }

        self.collection.update_one(
            {"_id": existing["_id"]},
            {
                "$push": {"attached_documents": new_att},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            },
            session=session
        )
        return self.find_by_id_for_user(application_id, user_id)

    def remove_attachment(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        vault_document_id: Union[str, ObjectId],
        session=None
    ) -> Dict[str, Any]:
        existing = self.find_by_id_for_user(application_id, user_id)
        if not existing:
            raise ValueError("Application not found or access unauthorized.")

        if existing["status"] not in ("DRAFT", "CLARIFICATION"):
            raise ValueError(f"Attachments cannot be modified while application is in '{existing['status']}'.")

        v_oid = self.to_object_id(vault_document_id)
        self.collection.update_one(
            {"_id": existing["_id"]},
            {
                "$pull": {"attached_documents": {"vault_document_id": v_oid}},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            },
            session=session
        )
        return self.find_by_id_for_user(application_id, user_id)

    def submit_application(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        session=None
    ) -> Dict[str, Any]:
        existing = self.find_by_id_for_user(application_id, user_id)
        if not existing:
            raise ValueError("Application not found or access unauthorized.")

        if existing["status"] != "DRAFT":
            raise ValueError(f"Application cannot be submitted from status '{existing['status']}'.")

        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "status": "SUBMITTED",
                    "submitted_at": now,
                    "updated_at": now
                }
            },
            session=session
        )

        history_repo = ApplicationStatusHistoryRepository()
        history_repo.create_entry(
            application_id=existing["_id"],
            from_status="DRAFT",
            to_status="SUBMITTED",
            changed_by_user_id=self.to_object_id(user_id),
            actor_role="BUSINESS_OWNER",
            remarks="Application dossier submitted for departmental scrutiny.",
            session=session
        )

        return self.find_by_id_for_user(application_id, user_id)

    def transition_status_officer(
        self,
        application_id: Union[str, ObjectId],
        officer_user_id: Union[str, ObjectId],
        officer_role: str,
        new_status: str,
        remarks: str,
        decision_details: Optional[Dict[str, Any]] = None,
        clarification_query: Optional[str] = None,
        session=None
    ) -> Dict[str, Any]:
        app = self.find_by_id(application_id)
        if not app:
            raise ValueError("Application record not found.")

        current_status = app.get("status", "DRAFT")
        allowed_next = TRANSITION_RULES.get(current_status, [])
        if new_status not in allowed_next:
            raise ValueError(
                f"Invalid workflow transition from '{current_status}' to '{new_status}'. Allowed: {allowed_next}"
            )

        now = datetime.now(timezone.utc)
        update_set: Dict[str, Any] = {
            "status": new_status,
            "updated_at": now
        }

        if new_status == "CLARIFICATION" and clarification_query:
            update_set["clarification_query"] = {
                "query_text": clarification_query.strip(),
                "raised_by_officer_id": self.to_object_id(officer_user_id),
                "raised_at": now,
                "response_text": None,
                "responded_at": None
            }

        if new_status in ("APPROVED", "REJECTED"):
            update_set["decision_details"] = {
                "decision": new_status,
                "remarks": remarks.strip(),
                "decided_by_officer_id": self.to_object_id(officer_user_id),
                "decided_at": now,
                "valid_until": decision_details.get("valid_until") if decision_details else None
            }

        self.collection.update_one(
            {"_id": app["_id"]},
            {"$set": update_set},
            session=session
        )

        history_repo = ApplicationStatusHistoryRepository()
        history_repo.create_entry(
            application_id=app["_id"],
            from_status=current_status,
            to_status=new_status,
            changed_by_user_id=self.to_object_id(officer_user_id),
            actor_role=officer_role,
            remarks=remarks.strip(),
            session=session
        )

        return self.find_by_id(application_id)

    def respond_to_clarification(
        self,
        application_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        response_text: str,
        session=None
    ) -> Dict[str, Any]:
        existing = self.find_by_id_for_user(application_id, user_id)
        if not existing:
            raise ValueError("Application not found or access unauthorized.")

        if existing["status"] != "CLARIFICATION":
            raise ValueError(f"Application is not in CLARIFICATION status (current: {existing['status']}).")

        now = datetime.now(timezone.utc)
        clarification = dict(existing.get("clarification_query") or {})
        clarification["response_text"] = response_text.strip()
        clarification["responded_at"] = now

        self.collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "status": "RESUBMITTED",
                    "clarification_query": clarification,
                    "updated_at": now
                }
            },
            session=session
        )

        history_repo = ApplicationStatusHistoryRepository()
        history_repo.create_entry(
            application_id=existing["_id"],
            from_status="CLARIFICATION",
            to_status="RESUBMITTED",
            changed_by_user_id=self.to_object_id(user_id),
            actor_role="BUSINESS_OWNER",
            remarks=f"Applicant submitted clarification response: {response_text.strip()[:100]}...",
            session=session
        )

        return self.find_by_id_for_user(application_id, user_id)

    def find_for_officer(
        self,
        department_code: Optional[str] = None,
        state_code: Optional[str] = None,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        officer_user_id: Optional[Union[str, ObjectId]] = None,
        assigned_filter: Optional[str] = None,
        user_role: str = "DEPARTMENT_OFFICER",
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {
            "status": {"$ne": "DRAFT"},
            "is_active": True
        }

        if department_code:
            query["department_code"] = department_code.strip()

        if state_code:
            query["state_code"] = state_code.strip().upper()

        if status:
            query["status"] = status.strip().upper()

        officer_oid = self.to_object_id(officer_user_id) if officer_user_id else None

        if assigned_filter == "ME" and officer_oid:
            query["assigned_officer_id"] = officer_oid
        elif assigned_filter == "UNASSIGNED":
            query["$or"] = [{"assigned_officer_id": None}, {"assigned_officer_id": {"$exists": False}}]
        elif user_role == "DEPARTMENT_OFFICER" and officer_oid:
            # Department officer sees tasks assigned to them or unassigned pool in their department
            query["$or"] = [
                {"assigned_officer_id": officer_oid},
                {"assigned_officer_id": None},
                {"assigned_officer_id": {"$exists": False}}
            ]

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            search_clause = [
                {"application_number": regex},
                {"approval_title": regex},
                {"approval_code": regex}
            ]
            if "$or" in query:
                query = {"$and": [{"$or": query.pop("$or")}, {"$or": search_clause}], **query}
            else:
                query["$or"] = search_clause

        cursor = self.collection.find(query).sort("submitted_at", -1).skip(skip).limit(limit)
        return list(cursor)

    def count_for_officer(
        self,
        department_code: Optional[str] = None,
        state_code: Optional[str] = None,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        officer_user_id: Optional[Union[str, ObjectId]] = None,
        assigned_filter: Optional[str] = None,
        user_role: str = "DEPARTMENT_OFFICER"
    ) -> int:
        query: Dict[str, Any] = {
            "status": {"$ne": "DRAFT"},
            "is_active": True
        }

        if department_code:
            query["department_code"] = department_code.strip()

        if state_code:
            query["state_code"] = state_code.strip().upper()

        if status:
            query["status"] = status.strip().upper()

        officer_oid = self.to_object_id(officer_user_id) if officer_user_id else None

        if assigned_filter == "ME" and officer_oid:
            query["assigned_officer_id"] = officer_oid
        elif assigned_filter == "UNASSIGNED":
            query["$or"] = [{"assigned_officer_id": None}, {"assigned_officer_id": {"$exists": False}}]
        elif user_role == "DEPARTMENT_OFFICER" and officer_oid:
            query["$or"] = [
                {"assigned_officer_id": officer_oid},
                {"assigned_officer_id": None},
                {"assigned_officer_id": {"$exists": False}}
            ]

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            search_clause = [
                {"application_number": regex},
                {"approval_title": regex},
                {"approval_code": regex}
            ]
            if "$or" in query:
                query = {"$and": [{"$or": query.pop("$or")}, {"$or": search_clause}], **query}
            else:
                query["$or"] = search_clause

        return self.collection.count_documents(query)


class ApplicationStatusHistoryRepository(BaseRepository):
    collection_name = "application_status_history"

    def create_entry(
        self,
        application_id: Union[str, ObjectId],
        from_status: str,
        to_status: str,
        changed_by_user_id: Union[str, ObjectId],
        actor_role: str,
        remarks: str,
        session=None
    ) -> Dict[str, Any]:
        doc = {
            "application_id": self.to_object_id(application_id),
            "from_status": from_status.strip().upper(),
            "to_status": to_status.strip().upper(),
            "changed_by_user_id": self.to_object_id(changed_by_user_id),
            "actor_role": actor_role.strip().upper(),
            "remarks": remarks.strip(),
            "created_at": datetime.now(timezone.utc)
        }
        return self.create(doc, session=session)

    def find_by_application(self, application_id: Union[str, ObjectId]) -> List[Dict[str, Any]]:
        a_oid = self.to_object_id(application_id)
        if not a_oid:
            return []
        return list(self.collection.find({"application_id": a_oid}).sort("created_at", 1))
