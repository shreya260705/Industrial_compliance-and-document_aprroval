"""
MongoDB Connection Manager & Health Verification.
Provides high-performance connection pooling via PyMongo.
Strictly prohibits logging credentials or raw connection strings.
"""

import logging
import re
from typing import Tuple, Dict, Any, Optional
from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger('bizpermit.database')

_client: Optional[MongoClient] = None
_db = None
_is_replica_set: bool = False
_using_mock: bool = False

def mask_connection_uri(uri: str) -> str:
    """Masks password and user info in MongoDB connection string for safe logging."""
    if not uri:
        return "[EMPTY_URI]"
    return re.sub(r'://([^:]+):([^@]+)@', r'://\1:*****@', uri)

def get_client() -> MongoClient:
    """
    Returns the singleton PyMongo client instance.
    Initializes on first call.
    """
    global _client, _db, _is_replica_set, _using_mock

    if _client is not None:
        return _client

    uri = getattr(settings, 'MONGODB_URI', 'mongodb://localhost:27017/')
    db_name = getattr(settings, 'MONGODB_DB_NAME', 'bizpermit_db')
    use_mock_fallback = getattr(settings, 'USE_MOCK_DB_IF_UNAVAILABLE', True)

    masked_uri = mask_connection_uri(uri)
    logger.info(f"Connecting to MongoDB cluster: {masked_uri}")

    try:
        # Create PyMongo client with a resilient 5-second timeout
        client = MongoClient(
            uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            maxPoolSize=100,
            minPoolSize=10,
            retryWrites=True,
            uuidRepresentation='standard'
        )
        
        # Verify connectivity via ping command
        client.admin.command('ping')
        
        # Verify replica set status for multi-document ACID transactions
        try:
            hello_res = client.admin.command('hello')
            _is_replica_set = bool(hello_res.get('setName'))
        except Exception:
            try:
                ismaster_res = client.admin.command('isMaster')
                _is_replica_set = bool(ismaster_res.get('setName'))
            except Exception:
                _is_replica_set = False

        if not _is_replica_set:
            logger.warning(
                "MongoDB server is operating in STANDALONE mode (No replica set detected). "
                "Multi-document ACID transactions will not be available. Standalone operations will be utilized."
            )
        else:
            logger.info("MongoDB Replica Set detected. Multi-document ACID transactions are fully supported.")

        _client = client
        _db = client[db_name]
        _using_mock = False
        try:
            from apps.database.indexes import ensure_all_indexes
            ensure_all_indexes()
        except Exception:
            logger.warning("MongoDB indexes could not be finalized during connection startup.")
        return _client

    except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as exc:
        if use_mock_fallback:
            logger.warning(
                f"Live MongoDB unreachable at {masked_uri}. "
                f"Initializing in-memory MongoMock client as configured by USE_MOCK_DB_IF_UNAVAILABLE."
            )
            try:
                import mongomock
                mock_client = mongomock.MongoClient()
                _client = mock_client
                _db = mock_client[db_name]
                _using_mock = True
                _is_replica_set = False
                try:
                    from apps.database.indexes import ensure_all_indexes
                    ensure_all_indexes()
                except Exception:
                    logger.warning("MongoMock indexes could not be finalized during fallback initialization.")
                return _client
            except ImportError:
                raise ConnectionFailure(
                    f"Unable to connect to MongoDB at {masked_uri} and mongomock is not installed. {str(exc)}"
                )
        else:
            raise ConnectionFailure(
                f"Failed to connect to MongoDB cluster at {masked_uri}: {str(exc)}"
            )

def _reset_to_mock_db() -> None:
    """Recover from a transient live MongoDB failure by switching to the in-memory mock store."""
    global _client, _db, _is_replica_set, _using_mock

    try:
        import mongomock
        mock_client = mongomock.MongoClient()
        _client = mock_client
        _db = mock_client[getattr(settings, 'MONGODB_DB_NAME', 'bizpermit_db')]
        _using_mock = True
        _is_replica_set = False
        logger.warning("Live MongoDB connection lost; recovered to in-memory MongoMock fallback.")
    except ImportError:
        logger.error("MongoDB fallback unavailable because mongomock is not installed.")


def get_db():
    """Returns the active MongoDB database handle."""
    global _db, _client, _using_mock

    if _db is not None and not _using_mock:
        try:
            _client.admin.command('ping')
            return _db
        except Exception:
            logger.warning("Live MongoDB ping failed; attempting graceful fallback to mock DB.")
            _client = None
            _db = None
            _using_mock = False

    if _db is None:
        get_client()
    return _db

def check_connection_health() -> Dict[str, Any]:
    """
    Diagnostic tool to check current database status.
    Returns safe status metrics without leaking credentials.
    """
    global _client, _db, _is_replica_set, _using_mock
    client = get_client()

    try:
        if _using_mock:
            return {
                "status": "connected",
                "mode": "in_memory_mock",
                "database": getattr(settings, 'MONGODB_DB_NAME', 'bizpermit_db'),
                "replica_set_transactions_supported": False,
                "notes": "Running on in-memory mock storage for development/offline testing"
            }

        ping_result = client.admin.command('ping')
        return {
            "status": "connected" if ping_result.get('ok') == 1 else "unhealthy",
            "mode": "live_mongodb",
            "database": getattr(settings, 'MONGODB_DB_NAME', 'bizpermit_db'),
            "replica_set_transactions_supported": _is_replica_set,
            "notes": "Live MongoDB cluster active" if _is_replica_set else "Connected in standalone mode (no transactions)"
        }
    except Exception as exc:
        return {
            "status": "disconnected",
            "error": str(exc),
            "replica_set_transactions_supported": False
        }

def reset_mock_db_for_testing():
    """Helper for test suites to flush transactional data in in-memory mock db between tests while preserving seed catalogue."""
    global _client, _db, _using_mock
    if _using_mock and _client is not None:
        db_name = getattr(settings, 'MONGODB_DB_NAME', 'bizpermit_db')
        db = _client[db_name]
        keep_collections = {"jurisdictions", "departments", "approval_catalogue", "compliance_templates"}
        for col_name in db.list_collection_names():
            if col_name not in keep_collections:
                db.drop_collection(col_name)
