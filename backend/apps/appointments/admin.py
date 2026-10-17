from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["reference", "patient", "center", "status", "amount", "created_at"]
    list_filter = ["status", "center"]
    search_fields = ["reference", "patient__email"]
    readonly_fields = ["reference", "amount"]
