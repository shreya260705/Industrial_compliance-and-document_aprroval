"""
Custom exceptions and centralized DRF exception handler for BizPermit.
"""

from rest_framework import status
from apps.common.responses import api_error_response

class BizPermitException(Exception):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "INTERNAL_SERVER_ERROR"

    def __init__(self, message="An internal error occurred", error_code=None, status_code=None, field_errors=None):
        super().__init__(message)
        self.message = message
        if error_code:
            self.error_code = error_code
        if status_code:
            self.status_code = status_code
        self.field_errors = field_errors or []

class ResourceNotFoundException(BizPermitException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "RESOURCE_NOT_FOUND"

class ValidationException(BizPermitException):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "VALIDATION_ERROR"

class DuplicateResourceException(BizPermitException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "DUPLICATE_RESOURCE"

class AuthenticationFailedException(BizPermitException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "AUTHENTICATION_FAILED"

class PermissionDeniedException(BizPermitException):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "PERMISSION_DENIED"

class TenantIsolationViolation(BizPermitException):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "TENANT_ISOLATION_VIOLATION"


def custom_exception_handler(exc, context):
    """
    Ensures all errors return the standardized BizPermit error envelope.
    """
    from rest_framework.views import exception_handler
    request = context.get('request')

    # Handle internal custom exceptions
    if isinstance(exc, BizPermitException):
        return api_error_response(
            code=exc.error_code,
            message=exc.message,
            field_errors=exc.field_errors,
            status_code=exc.status_code,
            request=request
        )

    # Let DRF handle standard HTTP/serializer exceptions first
    response = exception_handler(exc, context)

    if response is not None:
        error_code = "API_ERROR"
        field_errors = []
        message = "Request failed validation or authentication"

        if response.status_code == 401:
            error_code = "UNAUTHORIZED"
            message = "Authentication credentials were not provided or are invalid."
        elif response.status_code == 403:
            error_code = "FORBIDDEN"
            message = "You do not have permission to perform this action."
        elif response.status_code == 404:
            error_code = "NOT_FOUND"
            message = "The requested resource does not exist."
        elif response.status_code == 429:
            error_code = "RATE_LIMIT_EXCEEDED"
            message = "Request throttled due to rate limiting. Please wait before retrying."
        elif response.status_code == 400:
            error_code = "VALIDATION_ERROR"
            if isinstance(response.data, dict):
                for field, detail in response.data.items():
                    if isinstance(detail, list):
                        for item in detail:
                            field_errors.append({"field": field, "message": str(item)})
                    else:
                        field_errors.append({"field": field, "message": str(detail)})
                if field_errors:
                    message = field_errors[0]["message"]
            elif isinstance(response.data, list):
                field_errors = [{"field": "non_field_errors", "message": str(item)} for item in response.data]
                if field_errors:
                    message = field_errors[0]["message"]

        return api_error_response(
            code=error_code,
            message=message,
            field_errors=field_errors,
            status_code=response.status_code,
            request=request
        )

    # Unhandled exceptions
    return api_error_response(
        code="UNEXPECTED_SERVER_ERROR",
        message="A server error occurred. Please contact system administrator.",
        status_code=500,
        request=request
    )
