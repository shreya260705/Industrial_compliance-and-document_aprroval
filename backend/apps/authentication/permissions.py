"""
Role-Based Access Control (RBAC) Permission Classes.
Enforces role boundaries on the backend.
"""

from rest_framework.permissions import BasePermission
from rest_framework.request import Request

class IsBusinessOwner(BasePermission):
    """Allows access only to authenticated Business Owners."""
    message = "Access restricted to Business Owners."

    def has_permission(self, request: Request, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'role', None) == 'BUSINESS_OWNER'
        )

class IsDepartmentOfficer(BasePermission):
    """Allows access only to authenticated Department Scrutiny Officers."""
    message = "Access restricted to Department Scrutiny Officers."

    def has_permission(self, request: Request, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'role', None) == 'DEPARTMENT_OFFICER'
        )

class IsSuperAdmin(BasePermission):
    """Allows access only to authenticated Super Administrators."""
    message = "Access restricted to Super Administrators."

    def has_permission(self, request: Request, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'role', None) == 'SUPER_ADMIN'
        )

class IsOwnerOrOfficer(BasePermission):
    """Allows access to either the business owner or an authorized officer."""
    def has_permission(self, request: Request, view) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False
        role = getattr(request.user, 'role', None)
        return role in ('BUSINESS_OWNER', 'DEPARTMENT_OFFICER', 'SUPER_ADMIN')
