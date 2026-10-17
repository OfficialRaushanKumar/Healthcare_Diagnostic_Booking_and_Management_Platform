from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class DiagnosticCenter(TimeStampedModel):
    name = models.CharField(max_length=150)
    city = models.CharField(max_length=80, db_index=True)
    address = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_demo = models.BooleanField(default=True, help_text="Fictional demonstration record")

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["name", "city"], name="uniq_center_name_city")]

    def __str__(self):
        return f"{self.name} ({self.city})"


class CenterStaffAssignment(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="center_assignments")
    center = models.ForeignKey(DiagnosticCenter, on_delete=models.CASCADE, related_name="staff_assignments")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "center"], name="uniq_staff_center")]

    def __str__(self):
        return f"{self.user} -> {self.center}"
