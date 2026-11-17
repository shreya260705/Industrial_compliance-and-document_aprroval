"""
Notifications Repository for MongoDB.
Stores in-app lifecycle notifications for business owners and department officers.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId
from apps.common.base_repository import BaseRepository

class NotificationRepository(BaseRepository):
    collection_name = "notifications"

    def create_notification(
        self,
        recipient_user_id: Union[str, ObjectId],
        notification_type: str,
        title: str,
        message: str,
        reference_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        session=None
    ) -> Dict[str, Any]:
        u_oid = self.to_object_id(recipient_user_id)
        doc = {
            "recipient_user_id": u_oid,
            "notification_type": notification_type.strip().upper(),
            "title": title.strip(),
            "message": message.strip(),
            "reference_id": str(reference_id) if reference_id else None,
            "metadata": metadata or {},
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
            "read_at": None
        }
        return self.create(doc, session=session)

    def find_by_user(
        self,
        user_id: Union[str, ObjectId],
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return []
        query: Dict[str, Any] = {"recipient_user_id": u_oid}
        if unread_only:
            query["is_read"] = False
        return list(self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit))

    def count_by_user(
        self,
        user_id: Union[str, ObjectId],
        unread_only: bool = False
    ) -> int:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return 0
        query: Dict[str, Any] = {"recipient_user_id": u_oid}
        if unread_only:
            query["is_read"] = False
        return self.collection.count_documents(query)

    def mark_as_read(
        self,
        notification_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        session=None
    ) -> bool:
        n_oid = self.to_object_id(notification_id)
        u_oid = self.to_object_id(user_id)
        if not n_oid or not u_oid:
            return False

        res = self.collection.update_one(
            {"_id": n_oid, "recipient_user_id": u_oid},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}},
            session=session
        )
        return res.modified_count > 0

    def mark_all_as_read(
        self,
        user_id: Union[str, ObjectId],
        session=None
    ) -> int:
        u_oid = self.to_object_id(user_id)
        if not u_oid:
            return 0
        res = self.collection.update_many(
            {"recipient_user_id": u_oid, "is_read": False},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}},
            session=session
        )
        return res.modified_count
