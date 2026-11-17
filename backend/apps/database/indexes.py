"""
MongoDB Collection Indexes Initialization.
Implements the indexing strategy specified in DATABASE_DESIGN.md.
"""

import logging
from pymongo import ASCENDING, DESCENDING, TEXT
from pymongo.errors import OperationFailure
from apps.database.connection import get_db

logger = logging.getLogger('bizpermit.database')


def _repair_non_sparse_unique_index(collection, key_field: str):
    """MongoDB unique indexes on nullable fields must be sparse to permit placeholder rows used during workflow setup."""
    try:
        for idx in list(collection.list_indexes()):
            name = idx.get('name')
            key = idx.get('key', {})
            if name and key.get(key_field) == 1 and idx.get('unique') is True and idx.get('sparse') is not True:
                collection.drop_index(name)
                break
    except Exception:
        pass


def ensure_all_indexes():
    """
    Creates all necessary indexes across core collections.
    Safe to call repeatedly; MongoDB ignores already existing identical indexes.
    """
    try:
        db = get_db()
        logger.info("Initializing MongoDB indexes across collections...")

        # 1. users
        db.users.create_index([("email", ASCENDING)], unique=True)
        try:
            db.users.create_index(
                [("phone_number", ASCENDING)],
                unique=True,
                partialFilterExpression={"phone_number": {"$type": "string"}}
            )
        except Exception:
            db.users.create_index([("phone_number", ASCENDING)], sparse=True, unique=True)
        db.users.create_index([("role", ASCENDING), ("officer_profile.department_code", ASCENDING)])

        # 2. businesses
        db.businesses.create_index([("pan", ASCENDING)], unique=True)
        db.businesses.create_index([("owner_user_id", ASCENDING)])
        try:
            db.businesses.create_index(
                [("gstin", ASCENDING)],
                unique=False,
                partialFilterExpression={"gstin": {"$type": "string"}}
            )
        except Exception:
            db.businesses.create_index([("gstin", ASCENDING)], sparse=True)

        # 3. locations
        db.locations.create_index([("business_id", ASCENDING)])
        db.locations.create_index([("jurisdiction_hierarchy.state_code", ASCENDING), ("jurisdiction_hierarchy.district_code", ASCENDING)])
        db.locations.create_index([("industrial_profile.pollution_category", ASCENDING)])

        # 4. jurisdictions
        db.jurisdictions.create_index([("code", ASCENDING)], unique=True)
        db.jurisdictions.create_index([("tier", ASCENDING), ("state_code", ASCENDING)])
        db.jurisdictions.create_index([("parent_code", ASCENDING)])

        # 5. departments
        db.departments.create_index([("department_code", ASCENDING)], unique=True)
        db.departments.create_index([("state_code", ASCENDING), ("tier", ASCENDING)])

        # 6. approval_catalogue
        db.approval_catalogue.create_index([("approval_code", ASCENDING)], unique=True)
        db.approval_catalogue.create_index([("state_code", ASCENDING), ("tier", ASCENDING), ("stage", ASCENDING)])
        db.approval_catalogue.create_index([("applicability_rules.pollution_categories", ASCENDING)])

        # 7. applications & status history
        db.applications.create_index([("application_number", ASCENDING)], unique=True)
        db.applications.create_index([("owner_user_id", ASCENDING), ("status", ASCENDING)])
        db.applications.create_index([("business_id", ASCENDING), ("location_id", ASCENDING)])
        db.applications.create_index([("department_code", ASCENDING), ("state_code", ASCENDING), ("status", ASCENDING)])
        db.applications.create_index([("approval_code", ASCENDING), ("location_id", ASCENDING)])
        db.applications.create_index([("submitted_at", DESCENDING)])

        db.application_status_history.create_index([("application_id", ASCENDING), ("created_at", ASCENDING)])

        # 8. notifications
        db.notifications.create_index([("recipient_user_id", ASCENDING), ("is_read", ASCENDING)])
        db.notifications.create_index([("created_at", DESCENDING)])

        # 9. document_vault & business_documents
        db.document_vault.create_index([("business_id", ASCENDING), ("location_id", ASCENDING)])
        db.document_vault.create_index([("sha256_checksum", ASCENDING)])
        db.document_vault.create_index([("document_type", ASCENDING)])

        db.business_documents.create_index([("business_id", ASCENDING), ("location_id", ASCENDING)])
        db.business_documents.create_index([("owner_user_id", ASCENDING)])
        db.business_documents.create_index([("sha256_checksum", ASCENDING)])
        db.business_documents.create_index([("document_category", ASCENDING)])
        db.business_documents.create_index([("is_active", ASCENDING)])

        # 9. audit_logs
        db.audit_logs.create_index([("target_collection", ASCENDING), ("target_id", ASCENDING)])
        db.audit_logs.create_index([("actor_user_id", ASCENDING), ("timestamp", DESCENDING)])
        db.audit_logs.create_index([("timestamp", DESCENDING)])

        # 10. revoked_tokens (TTL Index for automatic garbage collection of expired tokens)
        try:
            db.revoked_tokens.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
            db.revoked_tokens.create_index([("jti", ASCENDING)], unique=True)
        except Exception:
            # mongomock might not support TTL index parameters
            pass

        # 11. compliance collections (Phase 5)
        _repair_non_sparse_unique_index(db.compliance_obligations, "obligation_number")
        db.compliance_obligations.create_index([("obligation_number", ASCENDING)], unique=True, sparse=True)
        db.compliance_obligations.create_index([("owner_user_id", ASCENDING), ("due_date", ASCENDING)])
        db.compliance_obligations.create_index([("location_id", ASCENDING), ("status", ASCENDING)])
        db.compliance_obligations.create_index([("business_id", ASCENDING), ("status", ASCENDING)])
        db.compliance_obligations.create_index([("department_code", ASCENDING), ("jurisdiction_code", ASCENDING)])
        db.compliance_obligations.create_index([("location_id", ASCENDING), ("template_code", ASCENDING)])
        db.compliance_obligations.create_index([("renewal_applicability", ASCENDING), ("status", ASCENDING)])

        try:
            db.compliance_cycles.create_index([("obligation_id", ASCENDING), ("cycle_number", ASCENDING)], unique=True)
        except Exception:
            db.compliance_cycles.create_index([("obligation_id", ASCENDING), ("cycle_number", ASCENDING)])
        db.compliance_cycles.create_index([("due_date", ASCENDING)])

        db.compliance_completion_records.create_index([("obligation_id", ASCENDING), ("cycle_number", ASCENDING)])
        db.compliance_completion_records.create_index([("completed_by_user_id", ASCENDING)])

        try:
            db.compliance_reminder_logs.create_index(
                [("obligation_id", ASCENDING), ("cycle_number", ASCENDING), ("threshold_days", ASCENDING)],
                unique=True
            )
        except Exception:
            db.compliance_reminder_logs.create_index(
                [("obligation_id", ASCENDING), ("cycle_number", ASCENDING), ("threshold_days", ASCENDING)]
            )

        db.compliance_templates.create_index([("template_code", ASCENDING)], unique=True)

        # 12. schemes & incentives collections (Phase 6 Module 1)
        db.schemes.create_index([("scheme_code", ASCENDING)], unique=True)
        db.schemes.create_index([("authority_level", ASCENDING), ("state_code", ASCENDING)])
        db.schemes.create_index([("scheme_lifecycle_status", ASCENDING), ("fresh_intake_status", ASCENDING)])
        db.schemes.create_index([("financial_instrument_type", ASCENDING)])
        db.schemes.create_index([("verification_status", ASCENDING)])

        # Immutable evaluation snapshots
        db.scheme_recommendations.create_index([("location_id", ASCENDING), ("scheme_code", ASCENDING), ("evaluated_at", DESCENDING)])
        db.scheme_recommendations.create_index([("business_id", ASCENDING)])
        db.scheme_recommendations.create_index([("user_id", ASCENDING)])
        db.scheme_recommendations.create_index([("evaluated_at", DESCENDING)])

        # Concurrency-safe latest recommendation pointers
        db.scheme_recommendation_pointers.create_index([("location_id", ASCENDING), ("scheme_code", ASCENDING)], unique=True)
        db.scheme_recommendation_pointers.create_index([("business_id", ASCENDING), ("is_valid", ASCENDING)])
        db.scheme_recommendation_pointers.create_index([("is_valid", ASCENDING)])

        # Admin scheme audit logs
        db.scheme_admin_audit_logs.create_index([("scheme_code", ASCENDING), ("timestamp", DESCENDING)])
        db.scheme_admin_audit_logs.create_index([("actor_id", ASCENDING)])

        db.scheme_applications.create_index([("application_reference", ASCENDING)], unique=True)
        db.scheme_applications.create_index([("business_id", ASCENDING), ("status", ASCENDING)])
        db.scheme_applications.create_index([("location_id", ASCENDING)])
        db.scheme_applications.create_index([("recommendation_id", ASCENDING)])
        db.scheme_applications.create_index([("user_id", ASCENDING)])
        db.scheme_applications.create_index([("review_status", ASCENDING), ("department_code", ASCENDING), ("state_code", ASCENDING)])
        db.scheme_applications.create_index([("assigned_officer_id", ASCENDING), ("review_status", ASCENDING)])
        db.scheme_applications.create_index([("department_code", ASCENDING), ("state_code", ASCENDING)])

        # Phase 6 Module 2: Immutable Review Audit Logs
        db.scheme_review_audit_logs.create_index([("dossier_id", ASCENDING), ("timestamp", DESCENDING)])
        db.scheme_review_audit_logs.create_index([("actor_id", ASCENDING), ("timestamp", DESCENDING)])
        db.scheme_review_audit_logs.create_index([("action", ASCENDING)])
        db.scheme_review_audit_logs.create_index([("department_code", ASCENDING), ("state_code", ASCENDING)])

        # Phase 6 Module 3: Grievance Redressal and Escalation Engine
        db.grievances.create_index([("grievance_reference", ASCENDING)], unique=True)
        db.grievances.create_index([("business_id", ASCENDING), ("status", ASCENDING)])
        db.grievances.create_index([("owner_user_id", ASCENDING), ("status", ASCENDING)])
        db.grievances.create_index([("department_code", ASCENDING), ("state_code", ASCENDING), ("status", ASCENDING)])
        db.grievances.create_index([("assigned_officer_id", ASCENDING), ("status", ASCENDING)])
        db.grievances.create_index([("track", ASCENDING), ("created_at", DESCENDING)])
        db.grievances.create_index([("priority", ASCENDING), ("internal_target_date", ASCENDING)])
        db.grievances.create_index([("escalation_level", ASCENDING)])

        db.grievance_categories.create_index([("category_code", ASCENDING)], unique=True)
        db.grievance_categories.create_index([("is_active", ASCENDING)])

        db.grievance_escalation_rules.create_index([("rule_code", ASCENDING)], unique=True)

        db.grievance_audit_logs.create_index([("grievance_id", ASCENDING), ("timestamp", DESCENDING)])
        db.grievance_audit_logs.create_index([("actor_id", ASCENDING), ("timestamp", DESCENDING)])
        db.grievance_audit_logs.create_index([("action", ASCENDING)])

        logger.info("Successfully initialized all MongoDB indexes.")
        return True
    except Exception as exc:
        logger.warning(f"Could not initialize all MongoDB indexes: {str(exc)}")
        return False
