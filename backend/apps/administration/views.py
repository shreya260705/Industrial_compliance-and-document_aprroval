"""
Super Admin Platform Management & Officer Scoped Analytics Views.
Enforces strict Role-Based Access Control and provides real-time database-driven governance.
"""

from datetime import datetime, timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from bson import ObjectId

from apps.common.responses import api_success_response, api_error_response
from apps.common.base_repository import BaseRepository
from apps.common.audit import log_audit_event
from apps.common.exceptions import ResourceNotFoundException, ValidationException, PermissionDeniedException
from apps.authentication.permissions import IsSuperAdmin, IsDepartmentOfficer
from apps.authentication.password import hash_password
from apps.database.connection import get_db

from apps.administration.serializers import (
    OfficerCreateSerializer,
    OfficerUpdateSerializer,
    UserStatusUpdateSerializer,
    JurisdictionCreateSerializer,
    JurisdictionUpdateSerializer
)

class PlatformOverviewView(APIView):
    """
    Super Admin Platform Overview.
    Aggregates real-time platform statistics strictly from active database collections.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        db = get_db()

        # 1. User & Stakeholder Counts
        total_users = db.users.count_documents({})
        business_owners_count = db.users.count_documents({"role": "BUSINESS_OWNER"})
        officers_count = db.users.count_documents({"role": "DEPARTMENT_OFFICER"})
        super_admins_count = db.users.count_documents({"role": "SUPER_ADMIN"})
        active_users_count = db.users.count_documents({"is_active": True})

        # 2. Enterprise & Location Infrastructure
        total_enterprises = db.businesses.count_documents({})
        total_locations = db.locations.count_documents({})

        # 3. Regulatory Catalogue & Department Coverage
        total_departments = db.departments.count_documents({})
        total_approvals = db.approval_catalogue.count_documents({})
        total_states_uts = db.jurisdictions.count_documents({"type": {"$in": ["STATE", "UT"]}})

        # 4. Application Pipeline Breakdown
        total_applications = db.applications.count_documents({})
        app_status_counts = {
            "DRAFT": db.applications.count_documents({"status": "DRAFT"}),
            "SUBMITTED": db.applications.count_documents({"status": "SUBMITTED"}),
            "UNDER_SCRUTINY": db.applications.count_documents({"status": "UNDER_SCRUTINY"}),
            "CLARIFICATION_REQUESTED": db.applications.count_documents({"status": "CLARIFICATION_REQUESTED"}),
            "RECOMMENDED": db.applications.count_documents({"status": "RECOMMENDED"}),
            "REJECTED": db.applications.count_documents({"status": "REJECTED"})
        }

        # 5. Grievances Status Breakdown
        total_grievances = db.grievances.count_documents({})
        grievance_status_counts = {
            "SUBMITTED": db.grievances.count_documents({"status": "SUBMITTED"}),
            "UNDER_EXAMINATION": db.grievances.count_documents({"status": "UNDER_EXAMINATION"}),
            "CLARIFICATION_SOUGHT": db.grievances.count_documents({"status": "CLARIFICATION_SOUGHT"}),
            "RESOLVED": db.grievances.count_documents({"status": "RESOLVED"}),
            "ESCALATED": db.grievances.count_documents({"status": "ESCALATED"}),
            "REJECTED": db.grievances.count_documents({"status": "REJECTED"})
        }

        # 6. Schemes & Incentives Statistics
        total_schemes = db.schemes.count_documents({})
        active_schemes = db.schemes.count_documents({"is_active": True})
        scheme_applications_count = db.scheme_applications.count_documents({})

        # 7. Compliance Statistics
        total_obligations = db.compliance_obligations.count_documents({})
        completed_obligations = db.compliance_obligations.count_documents({"status": "COMPLETED"})
        pending_obligations = db.compliance_obligations.count_documents({"status": {"$in": ["PENDING", "UPCOMING"]}})
        overdue_obligations = db.compliance_obligations.count_documents({"status": "OVERDUE"})

        # 8. State-wise Application Aggregation (Top 10)
        state_pipeline = [
            {"$match": {"state_code": {"$ne": None}}},
            {"$group": {"_id": "$state_code", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        state_breakdown = list(db.applications.aggregate(state_pipeline))
        state_wise = [{"state_code": item["_id"], "application_count": item["count"]} for item in state_breakdown]

        # 9. Department-wise Application Aggregation (Top 10)
        dept_pipeline = [
            {"$match": {"department_code": {"$ne": None}}},
            {"$group": {"_id": "$department_code", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        dept_breakdown = list(db.applications.aggregate(dept_pipeline))
        dept_wise = [{"department_code": item["_id"], "application_count": item["count"]} for item in dept_breakdown]

        # 10. Recent Platform Audit Activity
        recent_audits = list(db.audit_logs.find({}).sort("timestamp", -1).limit(8))
        serialized_audits = [BaseRepository.serialize_doc(a) for a in recent_audits]

        overview_data = {
            "users": {
                "total": total_users,
                "business_owners": business_owners_count,
                "department_officers": officers_count,
                "super_admins": super_admins_count,
                "active": active_users_count
            },
            "enterprises": {
                "total_businesses": total_enterprises,
                "total_locations": total_locations
            },
            "governance": {
                "departments": total_departments,
                "approvals": total_approvals,
                "states_and_uts": total_states_uts
            },
            "applications": {
                "total": total_applications,
                "by_status": app_status_counts,
                "state_wise": state_wise,
                "department_wise": dept_wise
            },
            "grievances": {
                "total": total_grievances,
                "by_status": grievance_status_counts
            },
            "schemes": {
                "total": total_schemes,
                "active": active_schemes,
                "applications": scheme_applications_count
            },
            "compliance": {
                "total_obligations": total_obligations,
                "completed": completed_obligations,
                "pending": pending_obligations,
                "overdue": overdue_obligations
            },
            "recent_activities": serialized_audits
        }

        return api_success_response(
            data=overview_data,
            message="Platform-wide administrative overview retrieved successfully.",
            request=request
        )

class AdminUserListView(APIView):
    """
    Super Admin User Management.
    Lists and searches all platform users with associated enterprise statistics.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        db = get_db()
        role = request.query_params.get('role')
        status_param = request.query_params.get('is_active')
        search_query = request.query_params.get('search', '').strip()

        query = {}
        if role:
            query["role"] = role
        if status_param is not None:
            if status_param.lower() in ('true', '1'):
                query["is_active"] = True
            elif status_param.lower() in ('false', '0'):
                query["is_active"] = False

        if search_query:
            query["$or"] = [
                {"email": {"$regex": search_query, "$options": "i"}},
                {"full_name": {"$regex": search_query, "$options": "i"}},
                {"phone_number": {"$regex": search_query, "$options": "i"}}
            ]

        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        except ValueError:
            page = 1
            page_size = 20

        skip = (page - 1) * page_size
        total_count = db.users.count_documents(query)
        users = list(db.users.find(query, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(page_size))

        serialized = []
        for u in users:
            s_user = BaseRepository.serialize_doc(u)
            uid = u["_id"]
            # Count businesses & locations for this user
            biz_count = db.businesses.count_documents({
                "$or": [{"owner_user_id": uid}, {"owner_user_id": str(uid)}]
            })
            s_user["linked_enterprises_count"] = biz_count
            serialized.append(s_user)

        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

        return api_success_response(
            data=serialized,
            meta={
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total_count,
                    "total_pages": total_pages
                }
            },
            request=request
        )

class AdminUserDetailView(APIView):
    """
    Super Admin detailed inspection of an individual user profile.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request, pk):
        db = get_db()
        oid = BaseRepository.to_object_id(pk)
        if not oid:
            raise ResourceNotFoundException("Invalid user ID format.")

        user = db.users.find_one({"_id": oid}, {"password_hash": 0})
        if not user:
            raise ResourceNotFoundException(f"User with ID '{pk}' not found.")

        serialized = BaseRepository.serialize_doc(user)

        # Linked businesses and locations
        businesses = list(db.businesses.find({
            "$or": [{"owner_user_id": oid}, {"owner_user_id": str(oid)}]
        }))
        serialized["enterprises"] = [BaseRepository.serialize_doc(b) for b in businesses]

        biz_ids = [b["_id"] for b in businesses]
        biz_id_strs = [str(b["_id"]) for b in businesses]
        locations = list(db.locations.find({
            "$or": [
                {"business_id": {"$in": biz_ids}},
                {"business_id": {"$in": biz_id_strs}}
            ]
        }))
        serialized["locations"] = [BaseRepository.serialize_doc(l) for l in locations]

        # Recent user audit activities
        audits = list(db.audit_logs.find({
            "$or": [{"actor_user_id": oid}, {"actor_user_id": str(oid)}]
        }).sort("timestamp", -1).limit(10))
        serialized["recent_activity"] = [BaseRepository.serialize_doc(a) for a in audits]

        return api_success_response(data=serialized, request=request)

class AdminUserStatusView(APIView):
    """
    Super Admin account status governance (Activate / Suspend / Deactivate).
    """
    permission_classes = [IsSuperAdmin]

    def patch(self, request, pk):
        db = get_db()
        oid = BaseRepository.to_object_id(pk)
        if not oid:
            raise ResourceNotFoundException("Invalid user ID format.")

        user = db.users.find_one({"_id": oid})
        if not user:
            raise ResourceNotFoundException(f"User with ID '{pk}' not found.")

        # Prevent self-deactivation
        if str(request.user.id) == str(pk):
            raise ValidationException("Super Administrators cannot suspend or deactivate their own active administrative session.")

        serializer = UserStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")

        update_fields = {"updated_at": datetime.now(timezone.utc)}
        if "is_active" in serializer.validated_data:
            update_fields["is_active"] = serializer.validated_data["is_active"]
        if "is_verified" in serializer.validated_data:
            update_fields["is_verified"] = serializer.validated_data["is_verified"]
            update_fields["is_email_verified"] = serializer.validated_data["is_verified"]
            update_fields["is_phone_verified"] = serializer.validated_data["is_verified"]
        if reason:
            update_fields["status_reason"] = reason

        db.users.update_one(
            {"_id": oid},
            {"$set": update_fields}
        )

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            action="USER_STATUS_UPDATED",
            target_collection="users",
            target_id=str(oid),
            delta={"previous_status": user.get("is_active"), "updates": update_fields, "reason": reason},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="USER_STATUS_UPDATED",
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            target_collection="users",
            target_id=oid,
            title=f"Account Status: {'Active' if new_status else 'Suspended'}",
            message=f"Your BizPermit account status has been set to {'Active' if new_status else 'Suspended'}. Reason: {reason or 'Administrative update.'}",
            payload={"is_active": new_status, "reason": reason},
            recipient_user_ids=[oid],
            reference_id=str(oid)
        )

        action_name = "activated" if new_status else "suspended"
        return api_success_response(
            data={"user_id": str(oid), "is_active": new_status},
            message=f"User account successfully {action_name}.",
            request=request
        )

class AdminOfficerListCreateView(APIView):
    """
    Exclusive Super Admin function:
    List all Department Officers with live workloads and provision new Department Officers.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        db = get_db()
        dept_filter = request.query_params.get('department_code')
        state_filter = request.query_params.get('jurisdiction_code')
        search_query = request.query_params.get('search', '').strip()

        query = {"role": "DEPARTMENT_OFFICER"}
        if dept_filter:
            query["officer_profile.department_code"] = dept_filter
        if state_filter:
            query["officer_profile.jurisdiction_code"] = state_filter
        if search_query:
            query["$or"] = [
                {"email": {"$regex": search_query, "$options": "i"}},
                {"full_name": {"$regex": search_query, "$options": "i"}},
                {"officer_profile.badge_number": {"$regex": search_query, "$options": "i"}}
            ]

        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        except ValueError:
            page = 1
            page_size = 20

        skip = (page - 1) * page_size
        total_count = db.users.count_documents(query)
        officers = list(db.users.find(query, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(page_size))

        serialized = []
        for off in officers:
            s_off = BaseRepository.serialize_doc(off)
            prof = off.get("officer_profile", {})
            dept_code = prof.get("department_code")
            state_code = prof.get("jurisdiction_code")

            # Calculate real workload in officer scope
            assigned_apps = db.applications.count_documents({
                "department_code": dept_code,
                "state_code": state_code
            }) if dept_code and state_code else 0

            pending_reviews = db.applications.count_documents({
                "department_code": dept_code,
                "state_code": state_code,
                "status": {"$in": ["SUBMITTED", "UNDER_SCRUTINY", "CLARIFICATION_REQUESTED"]}
            }) if dept_code and state_code else 0

            completed_reviews = db.applications.count_documents({
                "department_code": dept_code,
                "state_code": state_code,
                "status": {"$in": ["RECOMMENDED", "REJECTED"]}
            }) if dept_code and state_code else 0

            assigned_grievances = db.grievances.count_documents({
                "$or": [
                    {"assigned_officer_id": str(off["_id"])},
                    {"department_code": dept_code}
                ]
            }) if dept_code else 0

            s_off["workload"] = {
                "assigned_applications": assigned_apps,
                "pending_reviews": pending_reviews,
                "completed_reviews": completed_reviews,
                "assigned_grievances": assigned_grievances
            }
            serialized.append(s_off)

        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

        return api_success_response(
            data=serialized,
            meta={
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total_count,
                    "total_pages": total_pages
                }
            },
            request=request
        )

    def post(self, request):
        """Provision a new Department Officer (Super Admin only)."""
        serializer = OfficerCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        db = get_db()
        normalized_email = data["email"].strip().lower()

        if db.users.find_one({"email": normalized_email}):
            raise ValidationException(f"An account with email '{normalized_email}' already exists.")

        hashed_pass = hash_password(data["password"])
        officer_profile = {
            "department_code": data["department_code"].strip().upper(),
            "jurisdiction_code": data["jurisdiction_code"].strip().upper(),
            "district_code": data.get("district_code", "").strip().upper() or None,
            "designation": data["designation"].strip(),
            "badge_number": data["badge_number"].strip(),
            "permitted_approval_categories": data.get("permitted_approval_categories", []),
            "permitted_workflow_actions": data.get("permitted_workflow_actions", [
                "RECOMMEND", "REQUEST_CLARIFICATION", "REJECT", "RECORD_OBSERVATION"
            ])
        }

        is_verified = data.get("is_verified", True)
        officer_doc = {
            "email": normalized_email,
            "password_hash": hashed_pass,
            "full_name": data["full_name"].strip(),
            "role": "DEPARTMENT_OFFICER",
            "officer_profile": officer_profile,
            "is_email_verified": is_verified,
            "is_phone_verified": is_verified,
            "is_verified": is_verified,
            "is_active": True,
            "last_login_at": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        if data.get("phone_number"):
            officer_doc["phone_number"] = data["phone_number"]

        result = db.users.insert_one(officer_doc)
        officer_doc["_id"] = result.inserted_id

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            action="OFFICER_ACCOUNT_PROVISIONED",
            target_collection="users",
            target_id=str(result.inserted_id),
            delta={
                "officer_email": normalized_email,
                "department_code": officer_profile["department_code"],
                "jurisdiction_code": officer_profile["jurisdiction_code"],
                "badge_number": officer_profile["badge_number"]
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="OFFICER_ACCOUNT_PROVISIONED",
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            target_collection="users",
            target_id=result.inserted_id,
            title="Official Scrutiny Credential Provisioned",
            message=f"Official credential provisioned for {data['full_name']} at {officer_profile['department_code']}.",
            payload={"email": normalized_email, "department": officer_profile["department_code"]},
            recipient_user_ids=[result.inserted_id],
            reference_id=str(result.inserted_id)
        )

        serialized = BaseRepository.serialize_doc(officer_doc)
        serialized.pop("password_hash", None)

        return api_success_response(
            data=serialized,
            message="Department Officer provisioned successfully.",
            status_code=201,
            request=request
        )

class AdminOfficerDetailView(APIView):
    """
    Super Admin: Inspect and update officer assignments / transfer jurisdiction.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request, pk):
        db = get_db()
        oid = BaseRepository.to_object_id(pk)
        if not oid:
            raise ResourceNotFoundException("Invalid officer ID format.")

        officer = db.users.find_one({"_id": oid, "role": "DEPARTMENT_OFFICER"}, {"password_hash": 0})
        if not officer:
            raise ResourceNotFoundException(f"Department Officer '{pk}' not found.")

        serialized = BaseRepository.serialize_doc(officer)
        return api_success_response(data=serialized, request=request)

    def put(self, request, pk):
        """Transfer officer to a different department, state, or change permissions."""
        db = get_db()
        oid = BaseRepository.to_object_id(pk)
        if not oid:
            raise ResourceNotFoundException("Invalid officer ID format.")

        officer = db.users.find_one({"_id": oid, "role": "DEPARTMENT_OFFICER"})
        if not officer:
            raise ResourceNotFoundException(f"Department Officer '{pk}' not found.")

        serializer = OfficerUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_fields = {"updated_at": datetime.now(timezone.utc)}
        if "full_name" in data:
            update_fields["full_name"] = data["full_name"].strip()
        if "phone_number" in data:
            update_fields["phone_number"] = data["phone_number"].strip()

        prof = officer.get("officer_profile", {})
        if "department_code" in data:
            prof["department_code"] = data["department_code"].strip().upper()
        if "jurisdiction_code" in data:
            prof["jurisdiction_code"] = data["jurisdiction_code"].strip().upper()
        if "district_code" in data:
            prof["district_code"] = data["district_code"].strip().upper() or None
        if "designation" in data:
            prof["designation"] = data["designation"].strip()
        if "badge_number" in data:
            prof["badge_number"] = data["badge_number"].strip()
        if "permitted_approval_categories" in data:
            prof["permitted_approval_categories"] = data["permitted_approval_categories"]
        if "permitted_workflow_actions" in data:
            prof["permitted_workflow_actions"] = data["permitted_workflow_actions"]

        update_fields["officer_profile"] = prof

        db.users.update_one({"_id": oid}, {"$set": update_fields})

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            action="OFFICER_ASSIGNMENT_TRANSFERRED",
            target_collection="users",
            target_id=str(oid),
            delta={"updated_profile": prof},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="OFFICER_ASSIGNMENT_TRANSFERRED",
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            target_collection="users",
            target_id=oid,
            title="Jurisdiction / Department Assignment Updated",
            message=f"Official assignment updated: Department '{prof.get('department_code')}', Territory '{prof.get('jurisdiction_code')}'.",
            payload={"officer_profile": prof},
            recipient_user_ids=[oid],
            reference_id=str(oid)
        )

        updated = db.users.find_one({"_id": oid}, {"password_hash": 0})
        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Officer assignment and permissions updated successfully.",
            request=request
        )

class AdminJurisdictionListCreateView(APIView):
    """
    Super Admin Jurisdiction Governance.
    List all jurisdictions or dynamically add a new State, UT, District, or Local Body.
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsSuperAdmin()]

    def get(self, request):
        db = get_db()
        jurisdiction_type = request.query_params.get('type')
        parent_code = request.query_params.get('parent_code')
        search_query = request.query_params.get('search', '').strip()

        query = {}
        if jurisdiction_type:
            query["type"] = jurisdiction_type.upper()
        if parent_code:
            query["parent_code"] = parent_code.upper()
        if search_query:
            query["$or"] = [
                {"name": {"$regex": search_query, "$options": "i"}},
                {"code": {"$regex": search_query, "$options": "i"}}
            ]

        jurisdictions = list(db.jurisdictions.find(query).sort("name", 1))
        serialized = [BaseRepository.serialize_doc(j) for j in jurisdictions]

        return api_success_response(
            data=serialized,
            meta={"count": len(serialized)},
            message="Jurisdiction records retrieved successfully.",
            request=request
        )

    def post(self, request):
        serializer = JurisdictionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        db = get_db()
        code = data["code"].strip().upper()

        if db.jurisdictions.find_one({"code": code}):
            raise ValidationException(f"Jurisdiction with code '{code}' already exists.")

        doc = {
            "code": code,
            "name": data["name"].strip(),
            "type": data["type"].upper(),
            "parent_code": data.get("parent_code", "").strip().upper() or None,
            "is_active": data.get("is_active", True),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }

        result = db.jurisdictions.insert_one(doc)
        doc["_id"] = result.inserted_id

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            action="JURISDICTION_CREATED",
            target_collection="jurisdictions",
            target_id=code,
            delta=doc,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="JURISDICTION_CREATED",
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            target_collection="jurisdictions",
            target_id=code,
            title=f"Jurisdiction Registered: {doc['name']} ({code})",
            message=f"Territorial jurisdiction {doc['name']} ({code}) registered in platform catalogue.",
            payload={"code": code, "type": doc["type"]}
        )

        return api_success_response(
            data=BaseRepository.serialize_doc(doc),
            message="Jurisdiction registered successfully.",
            status_code=201,
            request=request
        )

class AdminJurisdictionDetailView(APIView):
    """
    Super Admin: Edit or toggle status of a jurisdiction.
    """
    permission_classes = [IsSuperAdmin]

    def put(self, request, code):
        db = get_db()
        clean_code = code.strip().upper()
        existing = db.jurisdictions.find_one({"code": clean_code})
        if not existing:
            raise ResourceNotFoundException(f"Jurisdiction '{clean_code}' not found.")

        serializer = JurisdictionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_fields = {"updated_at": datetime.now(timezone.utc)}
        if "name" in data:
            update_fields["name"] = data["name"].strip()
        if "type" in data:
            update_fields["type"] = data["type"].upper()
        if "parent_code" in data:
            update_fields["parent_code"] = data["parent_code"].strip().upper() or None
        if "is_active" in data:
            update_fields["is_active"] = data["is_active"]

        db.jurisdictions.update_one({"code": clean_code}, {"$set": update_fields})

        log_audit_event(
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            action="JURISDICTION_UPDATED",
            target_collection="jurisdictions",
            target_id=clean_code,
            delta=update_fields,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        from apps.common.workflow_engine import WorkflowEngine
        WorkflowEngine.publish_event(
            event_type="JURISDICTION_UPDATED",
            actor_user_id=request.user.id,
            actor_role="SUPER_ADMIN",
            target_collection="jurisdictions",
            target_id=clean_code,
            title=f"Jurisdiction Updated: {clean_code}",
            message=f"Territorial jurisdiction {clean_code} configuration updated by administration.",
            payload=update_fields
        )

        updated = db.jurisdictions.find_one({"code": clean_code})
        return api_success_response(
            data=BaseRepository.serialize_doc(updated),
            message="Jurisdiction updated successfully.",
            request=request
        )

class AdminApplicationMonitoringView(APIView):
    """
    Super Admin platform-wide application monitoring across all states, departments, and statuses.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        db = get_db()
        dept_code = request.query_params.get('department_code')
        state_code = request.query_params.get('state_code')
        status = request.query_params.get('status')
        search_query = request.query_params.get('search', '').strip()

        query = {}
        if dept_code:
            query["department_code"] = dept_code
        if state_code:
            query["state_code"] = state_code
        if status:
            query["status"] = status
        if search_query:
            query["$or"] = [
                {"application_number": {"$regex": search_query, "$options": "i"}},
                {"approval_name": {"$regex": search_query, "$options": "i"}},
                {"applicant_form_data.plant_name": {"$regex": search_query, "$options": "i"}},
                {"applicant_form_data.legal_name": {"$regex": search_query, "$options": "i"}}
            ]

        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        except ValueError:
            page = 1
            page_size = 20

        skip = (page - 1) * page_size
        total_count = db.applications.count_documents(query)
        apps = list(db.applications.find(query).sort("created_at", -1).skip(skip).limit(page_size))

        serialized = []
        for app in apps:
            s_app = BaseRepository.serialize_doc(app)
            # Attach business name
            biz = db.businesses.find_one({"_id": BaseRepository.to_object_id(app.get("business_id"))})
            if biz:
                s_app["business_name"] = biz.get("legal_name")
            # Attach location name
            loc = db.locations.find_one({"_id": BaseRepository.to_object_id(app.get("location_id"))})
            if loc:
                s_app["location_name"] = loc.get("location_name")
            serialized.append(s_app)

        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

        return api_success_response(
            data=serialized,
            meta={
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total_count,
                    "total_pages": total_pages
                }
            },
            message="Platform applications retrieved successfully.",
            request=request
        )

class AdminAuditLogListView(APIView):
    """
    Super Admin platform-wide append-only audit log inspection.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        db = get_db()
        actor_role = request.query_params.get('actor_role')
        action = request.query_params.get('action')
        search_query = request.query_params.get('search', '').strip()

        query = {}
        if actor_role:
            query["actor_role"] = actor_role
        if action:
            query["action"] = action
        if search_query:
            query["$or"] = [
                {"action": {"$regex": search_query, "$options": "i"}},
                {"target_collection": {"$regex": search_query, "$options": "i"}},
                {"target_id": {"$regex": search_query, "$options": "i"}}
            ]

        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 25))))
        except ValueError:
            page = 1
            page_size = 25

        skip = (page - 1) * page_size
        total_count = db.audit_logs.count_documents(query)
        logs = list(db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(page_size))

        serialized = [BaseRepository.serialize_doc(l) for l in logs]
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

        return api_success_response(
            data=serialized,
            meta={
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total_count,
                    "total_pages": total_pages
                }
            },
            message="Platform audit logs retrieved successfully.",
            request=request
        )

class OfficerDashboardMetricsView(APIView):
    """
    Department Officer Scoped Analytics.
    Provides real metrics strictly scoped to the officer's assigned department and jurisdiction.
    """
    permission_classes = [IsDepartmentOfficer]

    def get(self, request):
        db = get_db()
        prof = getattr(request.user, "officer_profile", {})
        dept_code = prof.get("department_code")
        state_code = prof.get("jurisdiction_code")

        if not dept_code or not state_code:
            return api_error_response(
                code="UNASSIGNED_OFFICER_SCOPE",
                message="Your officer account has not been assigned to a department or jurisdiction.",
                status_code=403,
                request=request
            )

        # Scoped Application counts
        scoped_filter = {
            "department_code": dept_code,
            "state_code": state_code
        }

        total_assigned_apps = db.applications.count_documents(scoped_filter)
        pending_scrutiny = db.applications.count_documents({**scoped_filter, "status": "SUBMITTED"})
        under_scrutiny = db.applications.count_documents({**scoped_filter, "status": "UNDER_SCRUTINY"})
        clarifications_awaited = db.applications.count_documents({**scoped_filter, "status": "CLARIFICATION_REQUESTED"})
        recommended_count = db.applications.count_documents({**scoped_filter, "status": "RECOMMENDED"})
        rejected_count = db.applications.count_documents({**scoped_filter, "status": "REJECTED"})

        # Scoped Grievance counts
        scoped_grievances = db.grievances.count_documents({
            "$or": [
                {"department_code": dept_code},
                {"assigned_officer_id": str(request.user.id)}
            ]
        })
        pending_grievances = db.grievances.count_documents({
            "$or": [
                {"department_code": dept_code},
                {"assigned_officer_id": str(request.user.id)}
            ],
            "status": {"$in": ["SUBMITTED", "UNDER_EXAMINATION", "CLARIFICATION_SOUGHT"]}
        })

        # Recent scoped applications
        recent_scoped_apps = list(db.applications.find(scoped_filter).sort("updated_at", -1).limit(5))
        serialized_apps = []
        for app in recent_scoped_apps:
            s_app = BaseRepository.serialize_doc(app)
            biz = db.businesses.find_one({"_id": BaseRepository.to_object_id(app.get("business_id"))})
            if biz:
                s_app["business_name"] = biz.get("legal_name")
            serialized_apps.append(s_app)

        data = {
            "officer": {
                "full_name": request.user.full_name,
                "email": request.user.email,
                "department_code": dept_code,
                "jurisdiction_code": state_code,
                "district_code": prof.get("district_code"),
                "designation": prof.get("designation"),
                "badge_number": prof.get("badge_number")
            },
            "metrics": {
                "assigned_applications": total_assigned_apps,
                "pending_scrutiny": pending_scrutiny,
                "under_scrutiny": under_scrutiny,
                "clarifications_awaited": clarifications_awaited,
                "recommended": recommended_count,
                "rejected": rejected_count,
                "total_completed": recommended_count + rejected_count,
                "assigned_grievances": scoped_grievances,
                "pending_grievances": pending_grievances
            },
            "recent_applications": serialized_apps
        }

        return api_success_response(
            data=data,
            message="Officer-scoped dashboard metrics retrieved successfully.",
            request=request
        )


class AdminPlatformEventListView(APIView):
    """
    Super Admin Platform Workflow Events Inspection.
    Streams immutable platform-wide workflow events across all modules and portals.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        db = get_db()
        event_type = request.query_params.get('event_type')
        target_coll = request.query_params.get('target_collection')
        actor_role = request.query_params.get('actor_role')
        search_query = request.query_params.get('search', '').strip()

        query = {}
        if event_type:
            query["event_type"] = event_type.strip().upper()
        if target_coll:
            query["target_collection"] = target_coll.strip().lower()
        if actor_role:
            query["actor_role"] = actor_role.strip().upper()

        if search_query:
            query["$or"] = [
                {"event_type": {"$regex": search_query, "$options": "i"}},
                {"title": {"$regex": search_query, "$options": "i"}},
                {"message": {"$regex": search_query, "$options": "i"}},
                {"target_collection": {"$regex": search_query, "$options": "i"}}
            ]

        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 25))))
        except ValueError:
            page = 1
            page_size = 25

        skip = (page - 1) * page_size
        total_count = db.platform_events.count_documents(query)
        events = list(db.platform_events.find(query).sort("created_at", -1).skip(skip).limit(page_size))

        serialized = [BaseRepository.serialize_doc(e) for e in events]
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

        return api_success_response(
            data=serialized,
            meta={
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_records": total_count,
                    "total_pages": total_pages
                }
            },
            message="Platform workflow events retrieved successfully.",
            request=request
        )
