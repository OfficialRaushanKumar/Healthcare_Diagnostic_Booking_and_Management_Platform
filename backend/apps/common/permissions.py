from rest_framework.permissions import BasePermission


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role == "PATIENT")


class IsCenterStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role == "STAFF")


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u.is_authenticated and (u.role == "ADMIN" or u.is_superuser))
