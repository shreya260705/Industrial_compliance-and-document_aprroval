"""
Department MongoDB Repository.
Manages line ministries, regulatory boards, and municipal authorities.
"""

from typing import Any, Dict, List, Optional
from apps.common.base_repository import BaseRepository

class DepartmentRepository(BaseRepository):
    collection_name = "departments"

    def find_by_code(self, department_code: str) -> Optional[Dict[str, Any]]:
        if not department_code:
            return None
        return self.collection.find_one({"department_code": department_code.strip().upper()})

    def list_departments(
        self,
        tier: Optional[str] = None,
        state_code: Optional[str] = None,
        search_query: Optional[str] = None,
        is_active: bool = True,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"is_active": is_active}

        if tier:
            query["tier"] = tier.strip().upper()

        if state_code:
            # Matches state_code or central bodies that apply nationally
            query["$or"] = [
                {"state_code": state_code.strip().upper()},
                {"tier": "CENTRAL"}
            ]

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"name": regex},
                {"short_name": regex},
                {"department_code": regex}
            ]

        cursor = self.collection.find(query).sort("name", 1).skip(skip).limit(limit)
        return list(cursor)

    def count_departments(
        self,
        tier: Optional[str] = None,
        state_code: Optional[str] = None,
        search_query: Optional[str] = None,
        is_active: bool = True
    ) -> int:
        query: Dict[str, Any] = {"is_active": is_active}
        if tier:
            query["tier"] = tier.strip().upper()
        if state_code:
            query["$or"] = [
                {"state_code": state_code.strip().upper()},
                {"tier": "CENTRAL"}
            ]
        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            query["$or"] = [
                {"name": regex},
                {"short_name": regex},
                {"department_code": regex}
            ]
        return self.collection.count_documents(query)

    def upsert_department(self, data: Dict[str, Any], session=None) -> Dict[str, Any]:
        dept_code = data["department_code"].strip().upper()
        payload = dict(data)
        payload["department_code"] = dept_code
        payload["is_active"] = payload.get("is_active", True)

        self.collection.update_one(
            {"department_code": dept_code},
            {"$set": payload},
            upsert=True,
            session=session
        )
        return self.find_by_code(dept_code)
