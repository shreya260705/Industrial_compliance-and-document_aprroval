"""
Business Document Vault MongoDB Repository.
Implements strict tenant-isolated document management for industrial enterprises.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId
from apps.common.base_repository import BaseRepository
from apps.businesses.repository import BusinessRepository

VALID_DOCUMENT_CATEGORIES = [
    "BUSINESS_REGISTRATION",
    "PAN",
    "GST_CERTIFICATE",
    "CIN_CERTIFICATE",
    "UDYAM_CERTIFICATE",
    "LAND_OWNERSHIP",
    "LEASE_AGREEMENT",
    "FACTORY_LAYOUT",
    "ENVIRONMENTAL_DOCUMENT",
    "FIRE_SAFETY",
    "ELECTRICITY_DOCUMENT",
    "WATER_DOCUMENT",
    "BOILER_DOCUMENT",
    "IDENTITY_DOCUMENT",
    "OTHER"
]

class DocumentRepository(BaseRepository):
    collection_name = "business_documents"

    def find_by_id_for_user(
        self,
        document_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        include_archived: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Guarantees that a user can only access documents belonging to
        businesses that they legally own.
        """
        d_oid = self.to_object_id(document_id)
        u_oid = self.to_object_id(user_id)
        if not d_oid or not u_oid:
            return None

        query: Dict[str, Any] = {"_id": d_oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}

        doc = self.collection.find_one(query)
        if not doc:
            return None

        # Verify parent business ownership
        b_repo = BusinessRepository()
        business = b_repo.find_by_id_for_owner(doc["business_id"], u_oid, include_archived=include_archived)
        if not business:
            return None

        return doc

    def find_by_business(
        self,
        business_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        category: Optional[str] = None,
        location_id: Optional[Union[str, ObjectId]] = None,
        search_query: Optional[str] = None,
        include_archived: bool = False,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Lists documents for a business after verifying tenant ownership."""
        b_oid = self.to_object_id(business_id)
        u_oid = self.to_object_id(user_id)
        if not b_oid or not u_oid:
            return []

        # Verify business ownership
        b_repo = BusinessRepository()
        if not b_repo.find_by_id_for_owner(b_oid, u_oid, include_archived=include_archived):
            return []

        query: Dict[str, Any] = {"business_id": b_oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}

        if category:
            query["document_category"] = category.strip().upper()

        if location_id:
            l_oid = self.to_object_id(location_id)
            if l_oid:
                query["location_id"] = l_oid

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"document_name": regex},
                {"original_filename": regex}
            ]

        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        return list(cursor)

    def count_by_business(
        self,
        business_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        category: Optional[str] = None,
        location_id: Optional[Union[str, ObjectId]] = None,
        search_query: Optional[str] = None,
        include_archived: bool = False
    ) -> int:
        b_oid = self.to_object_id(business_id)
        u_oid = self.to_object_id(user_id)
        if not b_oid or not u_oid:
            return 0

        b_repo = BusinessRepository()
        if not b_repo.find_by_id_for_owner(b_oid, u_oid, include_archived=include_archived):
            return 0

        query: Dict[str, Any] = {"business_id": b_oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}

        if category:
            query["document_category"] = category.strip().upper()

        if location_id:
            l_oid = self.to_object_id(location_id)
            if l_oid:
                query["location_id"] = l_oid

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"document_name": regex},
                {"original_filename": regex}
            ]

        return self.collection.count_documents(query)

    def find_by_checksum(
        self,
        business_id: Union[str, ObjectId],
        sha256_checksum: str
    ) -> Optional[Dict[str, Any]]:
        """Checks for existing duplicate documents in the enterprise vault."""
        b_oid = self.to_object_id(business_id)
        if not b_oid or not sha256_checksum:
            return None
        return self.collection.find_one({
            "business_id": b_oid,
            "sha256_checksum": sha256_checksum.lower(),
            "is_active": True
        })

    def create_document(
        self,
        owner_user_id: Union[str, ObjectId],
        business_id: Union[str, ObjectId],
        document_name: str,
        document_category: str,
        original_filename: str,
        storage_object_path: str,
        mime_type: str,
        file_size_bytes: int,
        sha256_checksum: str,
        location_id: Optional[Union[str, ObjectId]] = None,
        expiry_date: Optional[str] = None,
        verification_status: str = "UPLOADED",
        version_number: int = 1,
        session=None
    ) -> Dict[str, Any]:
        u_oid = self.to_object_id(owner_user_id)
        b_oid = self.to_object_id(business_id)
        l_oid = self.to_object_id(location_id) if location_id else None

        doc = {
            "owner_user_id": u_oid,
            "business_id": b_oid,
            "location_id": l_oid,
            "document_name": document_name.strip(),
            "title": document_name.strip(),
            "document_category": document_category.strip().upper(),
            "original_filename": original_filename.strip(),
            "storage_object_path": storage_object_path.strip(),
            "mime_type": mime_type.strip(),
            "file_size": file_size_bytes,
            "sha256_checksum": sha256_checksum.lower(),
            "upload_timestamp": datetime.now(timezone.utc),
            "expiry_date": expiry_date,
            "verification_status": verification_status,
            "version_number": version_number,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        return self.create(doc, session=session)

    def update_document(
        self,
        document_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        update_data: Dict[str, Any],
        session=None
    ) -> Optional[Dict[str, Any]]:
        existing = self.find_by_id_for_user(document_id, user_id)
        if not existing:
            return None

        allowed_fields = [
            "document_name", "title", "document_category", "location_id", "expiry_date"
        ]

        payload = {}
        for field in allowed_fields:
            if field in update_data:
                val = update_data[field]
                if field == "location_id" and val:
                    val = self.to_object_id(val)
                payload[field] = val
                if field in ("document_name", "title"):
                    payload["document_name"] = val
                    payload["title"] = val

        payload["updated_at"] = datetime.now(timezone.utc)

        self.collection.update_one(
            {"_id": existing["_id"]},
            {"$set": payload},
            session=session
        )
        return self.find_by_id_for_user(document_id, user_id)

    def soft_delete_document(
        self,
        document_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        session=None
    ) -> bool:
        existing = self.find_by_id_for_user(document_id, user_id)
        if not existing:
            return False

        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"is_active": False, "archived_at": now, "updated_at": now}},
            session=session
        )
        return True

    def find_by_id_raw(self, document_id: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        d_oid = self.to_object_id(document_id)
        if not d_oid:
            return None
        return self.collection.find_one({"_id": d_oid, "is_active": {"$ne": False}})

    def record_verification_decision(
        self,
        document_id: Union[str, ObjectId],
        officer_user_id: Union[str, ObjectId],
        officer_name: str,
        officer_email: str,
        officer_role: str,
        decision: str,
        remarks: str,
        session=None
    ) -> Dict[str, Any]:
        doc = self.find_by_id_raw(document_id)
        if not doc:
            raise ValueError("Document not found.")

        decision = decision.strip().upper()
        if decision not in ("VERIFIED", "CORRECTION_REQUESTED", "REJECTED"):
            raise ValueError(f"Invalid verification decision: {decision}")

        if decision in ("CORRECTION_REQUESTED", "REJECTED") and not remarks.strip():
            raise ValueError(f"Mandatory remarks required for decision '{decision}'.")

        now = datetime.now(timezone.utc)
        current_ver = doc.get("version_number", 1)

        history_entry = {
            "version_number": current_ver,
            "decision": decision,
            "officer_user_id": self.to_object_id(officer_user_id),
            "officer_name": officer_name,
            "officer_email": officer_email,
            "officer_role": officer_role,
            "remarks": remarks.strip(),
            "decided_at": now
        }

        update_payload = {
            "verification_status": decision,
            "verified_by_officer_id": self.to_object_id(officer_user_id),
            "verified_by_officer_name": officer_name,
            "verification_remarks": remarks.strip(),
            "verified_at": now,
            "updated_at": now
        }

        self.collection.update_one(
            {"_id": doc["_id"]},
            {
                "$set": update_payload,
                "$push": {"verification_history": history_entry}
            },
            session=session
        )

        from apps.common.workflow_engine import WorkflowEngine
        owner_id = doc.get("owner_user_id")
        WorkflowEngine.publish_event(
            event_type=f"DOCUMENT_{decision}",
            actor_user_id=officer_user_id,
            actor_role=officer_role,
            target_collection="business_documents",
            target_id=doc["_id"],
            title=f"Document {decision}: {doc.get('document_name')}",
            message=f"Officer {officer_name} determined: {decision}. Remarks: {remarks.strip()}",
            payload={
                "document_name": doc.get("document_name"),
                "version_number": current_ver,
                "decision": decision,
                "remarks": remarks.strip()
            },
            recipient_user_ids=[owner_id] if owner_id else [],
            reference_id=str(doc["_id"]),
            session=session
        )

        return self.find_by_id_raw(document_id)

    def resubmit_version(
        self,
        document_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        original_filename: str,
        storage_object_path: str,
        mime_type: str,
        file_size_bytes: int,
        sha256_checksum: str,
        session=None
    ) -> Dict[str, Any]:
        existing = self.find_by_id_for_user(document_id, user_id)
        if not existing:
            raise ValueError("Document not found or access unauthorized.")

        old_ver = existing.get("version_number", 1)
        new_ver = old_ver + 1
        now = datetime.now(timezone.utc)

        archived_entry = {
            "version_number": old_ver,
            "original_filename": existing.get("original_filename"),
            "storage_object_path": existing.get("storage_object_path"),
            "mime_type": existing.get("mime_type"),
            "file_size": existing.get("file_size"),
            "sha256_checksum": existing.get("sha256_checksum"),
            "uploaded_at": existing.get("upload_timestamp") or existing.get("created_at"),
            "verification_status": existing.get("verification_status"),
            "verification_remarks": existing.get("verification_remarks")
        }

        update_payload = {
            "version_number": new_ver,
            "original_filename": original_filename.strip(),
            "storage_object_path": storage_object_path.strip(),
            "mime_type": mime_type.strip(),
            "file_size": file_size_bytes,
            "sha256_checksum": sha256_checksum.lower(),
            "verification_status": "RESUBMITTED",
            "verification_remarks": None,
            "upload_timestamp": now,
            "updated_at": now
        }

        self.collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": update_payload,
                "$push": {"version_history": archived_entry}
            },
            session=session
        )

        from apps.common.workflow_engine import WorkflowEngine
        recipients = []
        if existing.get("assigned_officer_id"):
            recipients.append(existing["assigned_officer_id"])
        if existing.get("verified_by_officer_id"):
            recipients.append(existing["verified_by_officer_id"])

        WorkflowEngine.publish_event(
            event_type="DOCUMENT_RESUBMITTED",
            actor_user_id=user_id,
            actor_role="BUSINESS_OWNER",
            target_collection="business_documents",
            target_id=existing["_id"],
            title=f"Document Resubmitted (v{new_ver}): {existing.get('document_name')}",
            message=f"New version v{new_ver} was resubmitted by the business owner.",
            payload={
                "document_name": existing.get("document_name"),
                "version_number": new_ver,
                "sha256": sha256_checksum.lower()
            },
            recipient_user_ids=recipients,
            reference_id=str(existing["_id"]),
            session=session
        )

        return self.find_by_id_for_user(document_id, user_id)
