"""
Jurisdiction MongoDB Repository.
Manages India-wide administrative boundaries: National, State/UT, District, and Local Bodies.
"""

from typing import Any, Dict, List, Optional
from apps.common.base_repository import BaseRepository

class JurisdictionRepository(BaseRepository):
    collection_name = "jurisdictions"

    def get_states_and_uts(self) -> List[Dict[str, Any]]:
        """Returns all 28 Indian States and 8 Union Territories sorted alphabetically."""
        return list(self.collection.find(
            {"tier": {"$in": ["STATE", "UT"]}, "is_active": True},
            {"_id": 1, "code": 1, "name": 1, "tier": 1, "iso_3166_2": 1, "zone": 1, "capital": 1}
        ).sort("name", 1))

    def get_children(self, parent_code: str) -> List[Dict[str, Any]]:
        """Returns immediate child jurisdictions (e.g., districts under a state, or industrial zones under a district)."""
        if not parent_code:
            return []
        return list(self.collection.find(
            {"parent_code": parent_code.strip().upper(), "is_active": True}
        ).sort("name", 1))

    def find_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Finds jurisdiction by unique code (e.g., IN-MH, IN-GJ-AHM, GIDC-SANAND)."""
        if not code:
            return None
        return self.collection.find_one({"code": code.strip().upper()})

    def get_hierarchy(self, code: str) -> Dict[str, Any]:
        """
        Resolves the full hierarchical ancestry for a given location code.
        Example: GIDC-SANAND -> IN-GJ-AHM -> IN-GJ -> IN (Central)
        """
        current = self.find_by_code(code)
        if not current:
            return {}

        chain = [current]
        visited = {current.get("code")}
        curr_parent = current.get("parent_code")

        while curr_parent and curr_parent not in visited:
            parent_doc = self.find_by_code(curr_parent)
            if not parent_doc:
                break
            chain.append(parent_doc)
            visited.add(parent_doc.get("code"))
            curr_parent = parent_doc.get("parent_code")

        # Reverse chain so it runs Root -> State -> District -> Local Body
        chain.reverse()
        return {
            "target": current,
            "lineage": chain,
            "depth": len(chain)
        }

    def upsert_jurisdiction(self, data: Dict[str, Any], session=None) -> Dict[str, Any]:
        """Idempotent insert or update by jurisdiction code."""
        code = data["code"].strip().upper()
        payload = dict(data)
        payload["code"] = code
        payload["is_active"] = payload.get("is_active", True)
        
        self.collection.update_one(
            {"code": code},
            {"$set": payload},
            upsert=True,
            session=session
        )
        return self.find_by_code(code)
