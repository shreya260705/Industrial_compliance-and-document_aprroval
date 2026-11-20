"""
MongoDB Domain Repositories for Phase 5:
Compliance Obligations, Recurring Cycles, Completion Records, Reminder Logs & Templates.
Adheres strictly to Native PyMongo BaseRepository pattern.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId
from apps.common.base_repository import BaseRepository


class ComplianceObligationRepository(BaseRepository):
    collection_name = "compliance_obligations"

    def create_obligation(
        self,
        owner_user_id: Union[str, ObjectId],
        business_id: Union[str, ObjectId],
        location_id: Union[str, ObjectId],
        title: str,
        description: str,
        authority_name: str,
        department_code: str,
        jurisdiction_code: str,
        compliance_category: str,
        frequency: str,
        due_date: datetime,
        source_reference: str,
        source_verification_status: str,
        approval_code: Optional[str] = None,
        reminder_schedule: Optional[List[int]] = None,
        renewal_applicability: bool = False,
        valid_until: Optional[datetime] = None,
        indicative_sla_days: Optional[int] = None,
        statutory_penalty_summary: Optional[str] = None,
        template_code: Optional[str] = None,
        session=None
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        u_oid = self.to_object_id(owner_user_id)
        b_oid = self.to_object_id(business_id)
        l_oid = self.to_object_id(location_id)

        # Generate human-readable reference: OB-{YYYY}-{STATE}-{RAND6}
        import uuid
        rand_str = uuid.uuid4().hex[:6].upper()
        state_clean = (jurisdiction_code.replace("IN-", "") if jurisdiction_code else "IND")[:3]
        obligation_number = f"OB-{now.year}-{state_clean}-{rand_str}"

        # Initial status calculation
        status = "NEEDS_CONFIRMATION" if source_verification_status == "NEEDS_CONFIRMATION" else "UPCOMING"
        if status != "NEEDS_CONFIRMATION":
            days_left = (due_date - now).total_seconds() / 86400.0
            if days_left < 0:
                status = "OVERDUE"
            elif days_left <= 0.5:
                status = "DUE_TODAY"
            elif days_left <= 7:
                status = "DUE_SOON"

        doc = {
            "obligation_number": obligation_number,
            "owner_user_id": u_oid,
            "business_id": b_oid,
            "location_id": l_oid,
            "title": title.strip(),
            "description": description.strip(),
            "authority_name": authority_name.strip(),
            "department_code": department_code.strip().upper(),
            "jurisdiction_code": jurisdiction_code.strip().upper(),
            "compliance_category": compliance_category.strip().upper(),
            "frequency": frequency.strip().upper(),
            "due_date": due_date,
            "source_reference": source_reference.strip(),
            "source_verification_status": source_verification_status.strip().upper(),
            "approval_code": approval_code.strip().upper() if approval_code else None,
            "reminder_schedule": reminder_schedule or [30, 15, 7, 1, 0, -1, -7],
            "renewal_applicability": bool(renewal_applicability),
            "valid_until": valid_until,
            "indicative_sla_days": indicative_sla_days,
            "statutory_penalty_summary": statutory_penalty_summary,
            "template_code": template_code,
            "current_cycle_number": 1,
            "status": status,
            "last_completed_at": None,
            "next_due_date": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        return self.create(doc, session=session)

    def find_by_id_for_user(
        self,
        obligation_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId]
    ) -> Optional[Dict[str, Any]]:
        o_oid = self.to_object_id(obligation_id)
        u_oid = self.to_object_id(user_id)
        if not o_oid or not u_oid:
            return None
        return self.collection.find_one({"_id": o_oid, "owner_user_id": u_oid, "is_active": {"$ne": False}})

    def find_by_id_for_officer(
        self,
        obligation_id: Union[str, ObjectId],
        department_code: Optional[str] = None,
        jurisdiction_code: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        o_oid = self.to_object_id(obligation_id)
        if not o_oid:
            return None
        query: Dict[str, Any] = {"_id": o_oid, "is_active": {"$ne": False}}
        if department_code:
            query["department_code"] = department_code.strip().upper()
        if jurisdiction_code:
            query["jurisdiction_code"] = jurisdiction_code.strip().upper()
        return self.collection.find_one(query)

    def find_by_user(
        self,
        user_id: Union[str, ObjectId],
        business_id: Optional[Union[str, ObjectId]] = None,
        location_id: Optional[Union[str, ObjectId]] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        frequency: Optional[str] = None,
        search_query: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return []
        query: Dict[str, Any] = {"owner_user_id": u_oid, "is_active": {"$ne": False}}

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

        if category:
            query["compliance_category"] = category.strip().upper()

        if frequency:
            query["frequency"] = frequency.strip().upper()

        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = start_date
            if end_date:
                date_query["$lte"] = end_date
            query["due_date"] = date_query

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"title": regex},
                {"obligation_number": regex},
                {"description": regex},
                {"department_code": regex},
                {"approval_code": regex}
            ]

        cursor = self.collection.find(query).sort("due_date", 1).skip(skip).limit(limit)
        return list(cursor)

    def count_by_user(
        self,
        user_id: Union[str, ObjectId],
        business_id: Optional[Union[str, ObjectId]] = None,
        location_id: Optional[Union[str, ObjectId]] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        frequency: Optional[str] = None,
        search_query: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> int:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return 0
        query: Dict[str, Any] = {"owner_user_id": u_oid, "is_active": {"$ne": False}}

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

        if category:
            query["compliance_category"] = category.strip().upper()

        if frequency:
            query["frequency"] = frequency.strip().upper()

        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = start_date
            if end_date:
                date_query["$lte"] = end_date
            query["due_date"] = date_query

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"title": regex},
                {"obligation_number": regex},
                {"description": regex},
                {"department_code": regex},
                {"approval_code": regex}
            ]

        return self.collection.count_documents(query)

    def get_metrics_for_user(
        self,
        user_id: Union[str, ObjectId],
        business_id: Optional[Union[str, ObjectId]] = None,
        location_id: Optional[Union[str, ObjectId]] = None
    ) -> Dict[str, Any]:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return {}

        match_stage: Dict[str, Any] = {"owner_user_id": u_oid, "is_active": {"$ne": False}}
        if business_id:
            b_oid = self.to_object_id(business_id)
            if b_oid:
                match_stage["business_id"] = b_oid
        if location_id:
            l_oid = self.to_object_id(location_id)
            if l_oid:
                match_stage["location_id"] = l_oid

        pipeline = [
            {"$match": match_stage},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        results = list(self.collection.aggregate(pipeline))
        status_counts = {r["_id"]: r["count"] for r in results}

        total = sum(status_counts.values())
        completed = status_counts.get("COMPLETED", 0)
        overdue = status_counts.get("OVERDUE", 0)
        due_today = status_counts.get("DUE_TODAY", 0)
        due_soon = status_counts.get("DUE_SOON", 0)
        upcoming = status_counts.get("UPCOMING", 0)
        in_progress = status_counts.get("IN_PROGRESS", 0)
        submitted_review = status_counts.get("SUBMITTED_FOR_REVIEW", 0)
        needs_confirmation = status_counts.get("NEEDS_CONFIRMATION", 0)

        # Renewals count
        renewal_match = dict(match_stage)
        renewal_match["renewal_applicability"] = True
        renewal_match["status"] = {"$nin": ["COMPLETED", "NOT_APPLICABLE"]}
        pending_renewals = self.collection.count_documents(renewal_match)

        # Compliance score: percentage of actionable obligations that are completed
        actionable_total = total - needs_confirmation - status_counts.get("NOT_APPLICABLE", 0)
        completion_percentage = round((completed / actionable_total * 100), 1) if actionable_total > 0 else 100.0

        # Real MongoDB-backed monthly trends
        trend_pipeline = [
            {"$match": match_stage},
            {"$project": {
                "year": {"$year": "$due_date"},
                "month": {"$month": "$due_date"},
                "status": 1
            }},
            {"$group": {
                "_id": {"year": "$year", "month": "$month"},
                "total": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "COMPLETED"]}, 1, 0]}},
                "overdue": {"$sum": {"$cond": [{"$eq": ["$status", "OVERDUE"]}, 1, 0]}}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]
        trend_results = list(self.collection.aggregate(trend_pipeline))
        monthly_trends = [
            {
                "year": r["_id"]["year"],
                "month": r["_id"]["month"],
                "month_label": f"{r['_id']['month']:02d}/{r['_id']['year']}",
                "total": r["total"],
                "completed": r["completed"],
                "overdue": r["overdue"]
            }
            for r in trend_results if r.get("_id") and r["_id"].get("year") and r["_id"].get("month")
        ]

        return {
            "total_obligations": total,
            "completed": completed,
            "overdue": overdue,
            "due_today": due_today,
            "due_soon": due_soon,
            "upcoming": upcoming,
            "in_progress": in_progress,
            "submitted_for_review": submitted_review,
            "needs_confirmation": needs_confirmation,
            "pending_renewals": pending_renewals,
            "completion_percentage": completion_percentage,
            "monthly_trends": monthly_trends
        }

    def get_facility_summary_for_user(
        self,
        user_id: Union[str, ObjectId],
        business_id: Optional[Union[str, ObjectId]] = None,
        location_id: Optional[Union[str, ObjectId]] = None
    ) -> List[Dict[str, Any]]:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return []

        match_stage: Dict[str, Any] = {"owner_user_id": u_oid, "is_active": {"$ne": False}}
        if business_id:
            b_oid = self.to_object_id(business_id)
            if b_oid:
                match_stage["business_id"] = b_oid
        if location_id:
            l_oid = self.to_object_id(location_id)
            if l_oid:
                match_stage["location_id"] = l_oid

        pipeline = [
            {"$match": match_stage},
            {"$group": {
                "_id": "$location_id",
                "total": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "COMPLETED"]}, 1, 0]}},
                "overdue": {"$sum": {"$cond": [{"$eq": ["$status", "OVERDUE"]}, 1, 0]}},
                "due_soon": {"$sum": {"$cond": [{"$in": ["$status", ["DUE_SOON", "DUE_TODAY"]]}, 1, 0]}},
                "pending_renewals": {"$sum": {"$cond": [{"$and": ["$renewal_applicability", {"$ne": ["$status", "COMPLETED"]}]}, 1, 0]}}
            }}
        ]
        return list(self.collection.aggregate(pipeline))

    def get_renewals_for_user(
        self,
        user_id: Union[str, ObjectId],
        business_id: Optional[Union[str, ObjectId]] = None,
        location_id: Optional[Union[str, ObjectId]] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return []
        query: Dict[str, Any] = {
            "owner_user_id": u_oid,
            "renewal_applicability": True,
            "is_active": {"$ne": False}
        }
        if business_id:
            b_oid = self.to_object_id(business_id)
            if b_oid:
                query["business_id"] = b_oid
        if location_id:
            l_oid = self.to_object_id(location_id)
            if l_oid:
                query["location_id"] = l_oid

        cursor = self.collection.find(query).sort("due_date", 1).skip(skip).limit(limit)
        return list(cursor)

    def find_all_for_admin(
        self,
        state_code: Optional[str] = None,
        department_code: Optional[str] = None,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"is_active": {"$ne": False}}
        if state_code:
            query["jurisdiction_code"] = state_code.strip().upper()
        if department_code:
            query["department_code"] = department_code.strip().upper()
        if status:
            query["status"] = status.strip().upper()
        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"title": regex},
                {"obligation_number": regex},
                {"description": regex},
                {"department_code": regex}
            ]
        cursor = self.collection.find(query).sort("due_date", 1).skip(skip).limit(limit)
        return list(cursor)

    def count_all_for_admin(
        self,
        state_code: Optional[str] = None,
        department_code: Optional[str] = None,
        status: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> int:
        query: Dict[str, Any] = {"is_active": {"$ne": False}}
        if state_code:
            query["jurisdiction_code"] = state_code.strip().upper()
        if department_code:
            query["department_code"] = department_code.strip().upper()
        if status:
            query["status"] = status.strip().upper()
        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"title": regex},
                {"obligation_number": regex},
                {"description": regex},
                {"department_code": regex}
            ]
        return self.collection.count_documents(query)


class ComplianceCycleRepository(BaseRepository):
    collection_name = "compliance_cycles"

    def create_cycle(
        self,
        obligation_id: Union[str, ObjectId],
        cycle_number: int,
        due_date: datetime,
        cycle_start_date: datetime,
        status: str = "UPCOMING",
        session=None
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "obligation_id": self.to_object_id(obligation_id),
            "cycle_number": int(cycle_number),
            "cycle_start_date": cycle_start_date,
            "due_date": due_date,
            "status": status,
            "completed_at": None,
            "completion_record_id": None,
            "created_at": now,
            "updated_at": now
        }
        return self.create(doc, session=session)

    def find_by_obligation(self, obligation_id: Union[str, ObjectId]) -> List[Dict[str, Any]]:
        o_oid = self.to_object_id(obligation_id)
        if not o_oid:
            return []
        return list(self.collection.find({"obligation_id": o_oid}).sort("cycle_number", -1))

    def find_latest_cycle(self, obligation_id: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        o_oid = self.to_object_id(obligation_id)
        if not o_oid:
            return None
        return self.collection.find_one({"obligation_id": o_oid}, sort=[("cycle_number", -1)])

    def find_specific_cycle(self, obligation_id: Union[str, ObjectId], cycle_number: int) -> Optional[Dict[str, Any]]:
        o_oid = self.to_object_id(obligation_id)
        if not o_oid:
            return None
        return self.collection.find_one({"obligation_id": o_oid, "cycle_number": int(cycle_number)})


class ComplianceCompletionRepository(BaseRepository):
    collection_name = "compliance_completion_records"

    def create_completion_record(
        self,
        obligation_id: Union[str, ObjectId],
        cycle_number: int,
        completed_by_user_id: Union[str, ObjectId],
        completed_by_role: str,
        completion_remarks: str,
        attached_documents: Optional[List[Dict[str, Any]]] = None,
        needs_officer_review: bool = False,
        session=None
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "obligation_id": self.to_object_id(obligation_id),
            "cycle_number": int(cycle_number),
            "completed_by_user_id": self.to_object_id(completed_by_user_id),
            "completed_by_role": completed_by_role,
            "completed_at": now,
            "completion_remarks": completion_remarks.strip(),
            "attached_documents": attached_documents or [],
            "needs_officer_review": bool(needs_officer_review),
            "review_status": "PENDING_REVIEW" if needs_officer_review else "SELF_VERIFIED",
            "reviewed_by_officer_id": None,
            "reviewed_at": None,
            "officer_remarks": None,
            "created_at": now
        }
        return self.create(doc, session=session)

    def find_by_obligation(self, obligation_id: Union[str, ObjectId]) -> List[Dict[str, Any]]:
        o_oid = self.to_object_id(obligation_id)
        if not o_oid:
            return []
        return list(self.collection.find({"obligation_id": o_oid}).sort("cycle_number", -1))


class ComplianceReminderLogRepository(BaseRepository):
    collection_name = "compliance_reminder_logs"

    def has_reminder_been_sent(
        self,
        obligation_id: Union[str, ObjectId],
        cycle_number: int,
        threshold_days: int
    ) -> bool:
        o_oid = self.to_object_id(obligation_id)
        if not o_oid:
            return False
        existing = self.collection.find_one({
            "obligation_id": o_oid,
            "cycle_number": int(cycle_number),
            "threshold_days": int(threshold_days)
        })
        return existing is not None

    def log_reminder(
        self,
        obligation_id: Union[str, ObjectId],
        cycle_number: int,
        threshold_days: int,
        recipient_user_id: Union[str, ObjectId],
        session=None
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "obligation_id": self.to_object_id(obligation_id),
            "cycle_number": int(cycle_number),
            "threshold_days": int(threshold_days),
            "recipient_user_id": self.to_object_id(recipient_user_id),
            "dispatched_at": now
        }
        return self.create(doc, session=session)


class ComplianceTemplateRepository(BaseRepository):
    collection_name = "compliance_templates"

    def upsert_template(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        code = template_data.get("template_code", "").strip().upper()
        now = datetime.now(timezone.utc)
        doc = dict(template_data)
        doc["template_code"] = code
        doc["updated_at"] = now

        existing = self.collection.find_one({"template_code": code})
        if existing:
            self.collection.update_one({"_id": existing["_id"]}, {"$set": doc})
            return self.collection.find_one({"_id": existing["_id"]})
        else:
            doc["created_at"] = now
            res = self.collection.insert_one(doc)
            doc["_id"] = res.inserted_id
            return doc

    def find_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        if not code:
            return None
        return self.collection.find_one({"template_code": code.strip().upper()})

    def list_all(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"is_active": {"$ne": False}}).sort("template_code", 1).skip(skip).limit(limit)
        return list(cursor)
