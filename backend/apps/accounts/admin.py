from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import PatientProfile, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    ordering = ["email"]
    list_display = ["email", "full_name", "role", "is_active"]
    list_filter = ["role", "is_active"]
    search_fields = ["email", "full_name"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name", "phone", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "full_name", "role", "password1", "password2")}),
    )


admin.site.register(PatientProfile)
