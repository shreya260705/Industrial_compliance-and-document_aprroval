"""
Business & Industrial Location MongoDB Repositories.
Implements strict tenant isolation queries to prevent Insecure Direct Object References (IDOR).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId
from apps.common.base_repository import BaseRepository

class BusinessRepository(BaseRepository):
    collection_name = "businesses"

    @staticmethod
    def calculate_completion(doc: Dict[str, Any]) -> int:
        """Calculates profile completion percentage based on presence of essential fields."""
        points = 0
        total = 100

        # Essential identity (40 points)
        if doc.get("legal_name"): points += 10
        if doc.get("pan"): points += 15
        if doc.get("entity_type"): points += 10
        if doc.get("trade_name"): points += 5

        # Tax / Registration Identifiers (15 points)
        if doc.get("gstin") or doc.get("cin") or doc.get("udyam_registration_number"):
            points += 15

        # Registered Address (25 points)
        addr = doc.get("registered_office_address", {})
        line = addr.get("line1") or addr.get("address_line1")
        if line and addr.get("city") and addr.get("state_code") and addr.get("pincode"):
            points += 25
        elif line or addr.get("city"):
            points += 10

        # Signatory / Contact (20 points)
        sig = doc.get("authorized_signatory", {})
        if (sig.get("name") and sig.get("email")) or doc.get("contact_email"):
            points += 20
        elif doc.get("contact_phone") or sig.get("phone"):
            points += 10

        return min(total, points)

    def find_by_pan(self, pan: str) -> Optional[Dict[str, Any]]:
        if not pan:
            return None
        return self.collection.find_one({"pan": pan.strip().upper(), "is_active": True})

    def find_by_owner(self, user_id: Union[str, ObjectId], include_archived: bool = False) -> List[Dict[str, Any]]:
        oid = self.to_object_id(user_id)
        if not oid:
            return []
        query: Dict[str, Any] = {"owner_user_id": oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}
        return list(self.collection.find(query).sort("created_at", -1))

    def find_by_id_for_owner(
        self,
        business_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        include_archived: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Critical Multi-Tenant Isolation Query:
        Guarantees that an applicant cannot view or mutate another enterprise's business.
        """
        b_oid = self.to_object_id(business_id)
        u_oid = self.to_object_id(user_id)
        if not b_oid or not u_oid:
            return None
        query: Dict[str, Any] = {"_id": b_oid, "owner_user_id": u_oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}
        return self.collection.find_one(query)

    def create_business(
        self,
        owner_user_id: Union[str, ObjectId],
        legal_name: str,
        trade_name: Optional[str] = None,
        entity_type: str = "PRIVATE_LIMITED",
        pan: str = "",
        gstin: Optional[str] = None,
        cin: Optional[str] = None,
        udyam_registration_number: Optional[str] = None,
        registered_office_address: Optional[Dict[str, Any]] = None,
        authorized_signatory: Optional[Dict[str, Any]] = None,
        industry_sector: Optional[str] = None,
        nic_code: Optional[str] = None,
        business_description: Optional[str] = None,
        contact_email: Optional[str] = None,
        contact_phone: Optional[str] = None,
        session=None
    ) -> Dict[str, Any]:
        u_oid = self.to_object_id(owner_user_id)
        doc = {
            "owner_user_id": u_oid,
            "legal_name": legal_name.strip(),
            "trade_name": trade_name.strip() if trade_name else legal_name.strip(),
            "entity_type": entity_type,
            "pan": pan.strip().upper(),
            "gstin": gstin.strip().upper() if gstin else None,
            "cin": cin.strip().upper() if cin else None,
            "udyam_registration_number": udyam_registration_number.strip().upper() if udyam_registration_number else None,
            "registered_office_address": registered_office_address or {},
            "authorized_signatory": authorized_signatory or {},
            "industry_sector": industry_sector.strip() if industry_sector else None,
            "nic_code": nic_code.strip() if nic_code else None,
            "business_description": business_description.strip() if business_description else None,
            "contact_email": contact_email.strip().lower() if contact_email else None,
            "contact_phone": contact_phone.strip() if contact_phone else None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        doc["completion_percentage"] = self.calculate_completion(doc)
        return self.create(doc, session=session)

    def update_business(
        self,
        business_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        update_data: Dict[str, Any],
        session=None
    ) -> Optional[Dict[str, Any]]:
        existing = self.find_by_id_for_owner(business_id, user_id)
        if not existing:
            return None

        allowed_fields = [
            "legal_name", "trade_name", "entity_type", "gstin", "cin",
            "udyam_registration_number", "registered_office_address",
            "authorized_signatory", "industry_sector", "nic_code",
            "business_description", "contact_email", "contact_phone"
        ]

        payload = {}
        for field in allowed_fields:
            if field in update_data:
                val = update_data[field]
                if isinstance(val, str):
                    val = val.strip()
                payload[field] = val

        merged = dict(existing)
        merged.update(payload)
        payload["completion_percentage"] = self.calculate_completion(merged)
        payload["updated_at"] = datetime.now(timezone.utc)

        self.collection.update_one(
            {"_id": existing["_id"]},
            {"$set": payload},
            session=session
        )
        return self.find_by_id_for_owner(business_id, user_id)

    def soft_delete_business(
        self,
        business_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        session=None
    ) -> bool:
        existing = self.find_by_id_for_owner(business_id, user_id)
        if not existing:
            return False

        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"is_active": False, "archived_at": now, "updated_at": now}},
            session=session
        )

        # Also soft-delete associated locations
        LocationRepository().collection.update_many(
            {"business_id": existing["_id"]},
            {"$set": {"is_active": False, "archived_at": now, "updated_at": now}},
            session=session
        )
        return True


class LocationRepository(BaseRepository):
    collection_name = "locations"

    def find_by_business(
        self,
        business_id: Union[str, ObjectId],
        include_archived: bool = False
    ) -> List[Dict[str, Any]]:
        b_oid = self.to_object_id(business_id)
        if not b_oid:
            return []
        query: Dict[str, Any] = {"business_id": b_oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}
        return list(self.collection.find(query).sort("created_at", -1))

    def find_by_id(self, location_id: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        l_oid = self.to_object_id(location_id)
        if not l_oid:
            return None
        return self.collection.find_one({"_id": l_oid})

    def find_by_id_for_business(
        self,
        location_id: Union[str, ObjectId],
        business_id: Union[str, ObjectId],
        include_archived: bool = False
    ) -> Optional[Dict[str, Any]]:
        l_oid = self.to_object_id(location_id)
        b_oid = self.to_object_id(business_id)
        if not l_oid or not b_oid:
            return None
        query: Dict[str, Any] = {"_id": l_oid, "business_id": b_oid}
        if not include_archived:
            query["is_active"] = {"$ne": False}
        return self.collection.find_one(query)

    def find_by_id_for_user(
        self,
        location_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        include_archived: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Verifies that the location belongs to a business owned by the user."""
        loc = self.find_by_id(location_id)
        if not loc:
            return None
        if not include_archived and loc.get("is_active") is False:
            return None

        # Verify parent business ownership
        b_repo = BusinessRepository()
        business = b_repo.find_by_id_for_owner(loc["business_id"], user_id, include_archived=include_archived)
        if not business:
            return None
        return loc

    def create_location(
        self,
        business_id: Union[str, ObjectId],
        location_name: str,
        facility_type: str,
        address: Dict[str, Any],
        jurisdiction_hierarchy: Dict[str, Any],
        industrial_profile: Dict[str, Any],
        operational_status: str = "PROPOSED",
        geo_point: Optional[Dict[str, Any]] = None,
        session=None
    ) -> Dict[str, Any]:
        b_oid = self.to_object_id(business_id)
        doc = {
            "business_id": b_oid,
            "location_name": location_name.strip(),
            "facility_type": facility_type,
            "operational_status": operational_status,
            "address": address,
            "jurisdiction_hierarchy": jurisdiction_hierarchy,
            "geo_point": geo_point or {"type": "Point", "coordinates": [0.0, 0.0]},
            "industrial_profile": industrial_profile,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        return self.create(doc, session=session)

    def update_location(
        self,
        location_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        update_data: Dict[str, Any],
        session=None
    ) -> Optional[Dict[str, Any]]:
        existing = self.find_by_id_for_user(location_id, user_id)
        if not existing:
            return None

        allowed_fields = [
            "location_name", "facility_type", "operational_status", "address", "jurisdiction_hierarchy",
            "geo_point", "industrial_profile"
        ]

        payload = {}
        for field in allowed_fields:
            if field in update_data:
                payload[field] = update_data[field]

        payload["updated_at"] = datetime.now(timezone.utc)

        self.collection.update_one(
            {"_id": existing["_id"]},
            {"$set": payload},
            session=session
        )
        return self.find_by_id_for_user(location_id, user_id)

    def soft_delete_location(
        self,
        location_id: Union[str, ObjectId],
        user_id: Union[str, ObjectId],
        session=None
    ) -> bool:
        existing = self.find_by_id_for_user(location_id, user_id)
        if not existing:
            return False

        now = datetime.now(timezone.utc)
        self.collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"is_active": False, "archived_at": now, "updated_at": now}},
            session=session
        )
        return True

    def save_evaluation(
        self,
        location_id: Union[str, ObjectId],
        evaluation_result: Dict[str, Any],
        session=None
    ) -> None:
        l_oid = self.to_object_id(location_id)
        if not l_oid:
            return
        self.collection.update_one(
            {"_id": l_oid},
            {
                "$set": {
                    "kya_evaluation": evaluation_result,
                    "last_evaluated_at": datetime.now(timezone.utc),
                    "applicable_approvals_count": evaluation_result.get("total_approvals_required", 0),
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            session=session
        )
