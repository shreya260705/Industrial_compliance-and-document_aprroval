"""
Approval Catalogue & Applicability Rules MongoDB Repositories.
"""

from typing import Any, Dict, List, Optional
from apps.common.base_repository import BaseRepository

class ApprovalCatalogueRepository(BaseRepository):
    collection_name = "approval_catalogue"

    def find_by_code(self, approval_code: str) -> Optional[Dict[str, Any]]:
        if not approval_code:
            return None
        return self.collection.find_one({"approval_code": approval_code.strip().upper()})

    def filter_catalogue(
        self,
        authority_level: Optional[str] = None,
        state_code: Optional[str] = None,
        stage: Optional[str] = None,
        pollution_category: Optional[str] = None,
        verification_status: Optional[str] = None,
        search_query: Optional[str] = None,
        is_active: bool = True,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"is_active": is_active}

        if authority_level:
            query["tier"] = authority_level.strip().upper()

        if state_code:
            query["$or"] = [
                {"state_code": state_code.strip().upper()},
                {"tier": "CENTRAL"}
            ]

        if stage:
            query["stage"] = stage.strip().upper()

        if pollution_category:
            query["$or"] = [
                {"applicability_rules.pollution_categories": pollution_category.strip().upper()},
                {"applicability_rules.pollution_categories": "ALL"},
                {"applicability_rules.pollution_categories": {"$exists": False}}
            ]

        if verification_status:
            query["verification_status"] = verification_status.strip().upper()

        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            search_cond = [
                {"title": regex},
                {"short_name": regex},
                {"approval_code": regex},
                {"statutory_act": regex},
                {"department_code": regex}
            ]
            if "$or" in query:
                query["$and"] = [{"$or": query.pop("$or")}, {"$or": search_cond}]
            else:
                query["$or"] = search_cond

        cursor = self.collection.find(query).sort("approval_code", 1).skip(skip).limit(limit)
        return list(cursor)

    def count_catalogue(
        self,
        authority_level: Optional[str] = None,
        state_code: Optional[str] = None,
        stage: Optional[str] = None,
        pollution_category: Optional[str] = None,
        verification_status: Optional[str] = None,
        search_query: Optional[str] = None,
        is_active: bool = True
    ) -> int:
        query: Dict[str, Any] = {"is_active": is_active}
        if authority_level:
            query["tier"] = authority_level.strip().upper()
        if state_code:
            query["$or"] = [
                {"state_code": state_code.strip().upper()},
                {"tier": "CENTRAL"}
            ]
        if stage:
            query["stage"] = stage.strip().upper()
        if pollution_category:
            query["$or"] = [
                {"applicability_rules.pollution_categories": pollution_category.strip().upper()},
                {"applicability_rules.pollution_categories": "ALL"},
                {"applicability_rules.pollution_categories": {"$exists": False}}
            ]
        if verification_status:
            query["verification_status"] = verification_status.strip().upper()
        if search_query:
            regex = {"$regex": search_query.strip(), "$options": "i"}
            search_cond = [
                {"title": regex},
                {"short_name": regex},
                {"approval_code": regex},
                {"statutory_act": regex},
                {"department_code": regex}
            ]
            if "$or" in query:
                query["$and"] = [{"$or": query.pop("$or")}, {"$or": search_cond}]
            else:
                query["$or"] = search_cond

        return self.collection.count_documents(query)

    def upsert_approval(self, data: Dict[str, Any], session=None) -> Dict[str, Any]:
        app_code = data["approval_code"].strip().upper()
        payload = dict(data)
        payload["approval_code"] = app_code
        payload["is_active"] = payload.get("is_active", True)
        if "tier" not in payload and "authority_level" in payload:
            payload["tier"] = payload["authority_level"]

        self.collection.update_one(
            {"approval_code": app_code},
            {"$set": payload},
            upsert=True,
            session=session
        )
        return self.find_by_code(app_code)


class ApplicabilityRuleRepository(BaseRepository):
    collection_name = "recommendation_rules"

    def list_active_rules(self) -> List[Dict[str, Any]]:
        return list(self.collection.find({"is_active": True}).sort("priority", 1))

    def find_by_rule_code(self, rule_code: str) -> Optional[Dict[str, Any]]:
        if not rule_code:
            return None
        return self.collection.find_one({"rule_code": rule_code.strip().upper()})

    def upsert_rule(self, data: Dict[str, Any], session=None) -> Dict[str, Any]:
        code = data["rule_code"].strip().upper()
        payload = dict(data)
        payload["rule_code"] = code
        payload["is_active"] = payload.get("is_active", True)

        self.collection.update_one(
            {"rule_code": code},
            {"$set": payload},
            upsert=True,
            session=session
        )
        return self.find_by_rule_code(code)
