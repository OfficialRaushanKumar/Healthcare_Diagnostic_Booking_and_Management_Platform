from django.contrib import admin

from .models import CenterStaffAssignment, DiagnosticCenter


@admin.register(DiagnosticCenter)
class CenterAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "is_active", "is_demo"]
    list_filter = ["city", "is_active"]
    search_fields = ["name", "address"]


admin.site.register(CenterStaffAssignment)
