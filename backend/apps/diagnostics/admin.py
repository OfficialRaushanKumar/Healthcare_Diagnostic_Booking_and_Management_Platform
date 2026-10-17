from django.contrib import admin

from .models import AvailabilitySlot, CenterDiagnosticService, DiagnosticTest

admin.site.register(DiagnosticTest)
admin.site.register(CenterDiagnosticService)
admin.site.register(AvailabilitySlot)
