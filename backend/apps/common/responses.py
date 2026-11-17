"""
Standardized API Response Envelopes.
Fulfills BizPermit RFC 7807-inspired contract from API_DOCUMENTATION.md.
"""

from datetime import datetime, timezone
import uuid
from rest_framework.response import Response

def get_base_meta(request=None, extra_meta=None):
    meta = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request_id": getattr(request, 'request_id', f"req_{uuid.uuid4().hex[:12]}") if request else f"req_{uuid.uuid4().hex[:12]}"
    }
    if extra_meta:
        meta.update(extra_meta)
    return meta

def api_success_response(data=None, message=None, meta=None, status_code=200, request=None):
    payload = {
        "success": True,
        "data": data,
        "error": None,
        "meta": get_base_meta(request, meta)
    }
    if message:
        payload["meta"]["message"] = message
    return Response(payload, status=status_code)

def api_error_response(code="ERROR", message="An unexpected error occurred", field_errors=None, status_code=400, meta=None, request=None):
    payload = {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "field_errors": field_errors or []
        },
        "meta": get_base_meta(request, meta)
    }
    return Response(payload, status=status_code)
