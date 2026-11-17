"""
PyMongo Base Repository Pattern.
Provides robust BSON mapping, timestamps, ObjectId conversion and session support.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId
from bson.errors import InvalidId
from apps.database.connection import get_db

class BaseRepository:
    collection_name: str = ""

    def __init__(self, collection_name: Optional[str] = None):
        if collection_name:
            self.collection_name = collection_name
        if not self.collection_name:
            raise ValueError("Repository must define a non-empty collection_name.")

    @property
    def db(self):
        return get_db()

    @property
    def collection(self):
        return get_db()[self.collection_name]

    def get_collection(self, collection_name: str):
        return get_db()[collection_name]

    @staticmethod
    def to_object_id(id_val: Union[str, ObjectId]) -> Optional[ObjectId]:
        if isinstance(id_val, ObjectId):
            return id_val
        try:
            return ObjectId(str(id_val))
        except (InvalidId, TypeError):
            return None

    @staticmethod
    def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Converts MongoDB BSON types like ObjectId and datetime to JSON-serializable primitives."""
        if not doc:
            return None
        res = {}
        for key, value in doc.items():
            if key == '_id':
                res['id'] = str(value)
                res['_id'] = str(value)
            elif isinstance(value, ObjectId):
                res[key] = str(value)
            elif isinstance(value, datetime):
                res[key] = value.isoformat()
            elif isinstance(value, dict):
                res[key] = BaseRepository.serialize_doc(value)
            elif isinstance(value, list):
                res[key] = [
                    str(v) if isinstance(v, ObjectId)
                    else (v.isoformat() if isinstance(v, datetime)
                          else (BaseRepository.serialize_doc(v) if isinstance(v, dict) else v))
                    for v in value
                ]
            else:
                res[key] = value
        return res

    def find_by_id(self, id_val: Union[str, ObjectId]) -> Optional[Dict[str, Any]]:
        oid = self.to_object_id(id_val)
        if not oid:
            return None
        doc = self.collection.find_one({"_id": oid})
        return doc

    def find_one(self, filter_query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return self.collection.find_one(filter_query)

    def find(self, filter_query: Dict[str, Any] = None, sort=None, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        query = filter_query or {}
        cursor = self.collection.find(query)
        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)
        return list(cursor)

    def count(self, filter_query: Dict[str, Any] = None) -> int:
        query = filter_query or {}
        return self.collection.count_documents(query)

    def create(self, doc_data: Dict[str, Any], session=None) -> Dict[str, Any]:
        data = dict(doc_data)
        now = datetime.now(timezone.utc)
        if 'created_at' not in data:
            data['created_at'] = now
        if 'updated_at' not in data:
            data['updated_at'] = now

        result = self.collection.insert_one(data, session=session)
        data['_id'] = result.inserted_id
        return data

    def update_by_id(self, id_val: Union[str, ObjectId], update_data: Dict[str, Any], session=None) -> Optional[Dict[str, Any]]:
        oid = self.to_object_id(id_val)
        if not oid:
            return None

        update_payload = dict(update_data)
        update_payload['updated_at'] = datetime.now(timezone.utc)

        self.collection.update_one(
            {"_id": oid},
            {"$set": update_payload},
            session=session
        )
        return self.find_by_id(oid)

    def delete_by_id(self, id_val: Union[str, ObjectId], session=None) -> bool:
        oid = self.to_object_id(id_val)
        if not oid:
            return False
        res = self.collection.delete_one({"_id": oid}, session=session)
        return res.deleted_count > 0
