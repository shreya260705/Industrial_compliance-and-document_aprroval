"""
Immutable Audit Logging Service.
Logs all sensitive actions to the MongoDB audit_logs collection.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union
from bson import ObjectId
from apps.database.connection import get_db

def log_audit_event(
    actor_user_id: Optional[Union[str, ObjectId]],
    actor_role: str,
    action: str,
    target_collection: str,
    target_id: Optional[Union[str, ObjectId]],
    delta: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    session=None
) -> Dict[str, Any]:
    """
    Appends an immutable audit log document.
    """
    db = get_db()
    
    actor_oid = None
    if actor_user_id:
        try:
            actor_oid = ObjectId(str(actor_user_id))
        except Exception:
            actor_oid = None

    target_oid = None
    if target_id:
        try:
            target_oid = ObjectId(str(target_id))
        except Exception:
            target_oid = str(target_id)

    record = {
        "actor_user_id": actor_oid,
        "actor_role": actor_role,
        "action": action,
        "target_collection": target_collection,
        "target_id": target_oid,
        "delta": delta or {},
        "ip_address": ip_address or "127.0.0.1",
        "user_agent": user_agent or "Unknown",
        "timestamp": datetime.now(timezone.utc)
    }

    db.audit_logs.insert_one(record, session=session)
    return record
