"""Role-based permission classes for the Doctor model."""
from rest_framework.permissions import BasePermission


class IsDoctor(BasePermission):
    """Any authenticated doctor."""
    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, "is_authenticated", False))


class IsAdministrator(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and request.user.role == "administrator"
        )


class IsSurgeon(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and request.user.role in ("administrator", "surgeon")
        )


class IsHepOrSurgeon(BasePermission):
    """Hepatologist or Transplant Surgeon (and admins)."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and request.user.role in ("administrator", "surgeon", "hepatologist")
        )


class IsResearcher(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and request.user.role in ("administrator", "researcher")
        )
