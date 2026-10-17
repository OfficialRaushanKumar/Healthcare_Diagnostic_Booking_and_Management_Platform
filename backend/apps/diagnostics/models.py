from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q

from apps.centers.models import DiagnosticCenter
from apps.common.models import TimeStampedModel


class Category(models.TextChoices):
    PATHOLOGY = "PATHOLOGY", "Pathology"
    RADIOLOGY = "RADIOLOGY", "Radiology"
    PREVENTIVE = "PREVENTIVE", "Preventive health"
    GENERAL = "GENERAL", "General diagnostics"


class DiagnosticTest(TimeStampedModel):
    name = models.CharField(max_length=150, unique=True)
    category = models.CharField(max_length=12, choices=Category.choices, db_index=True)
    description = models.TextField(blank=True)
    preparation = models.TextField(blank=True, help_text="Configured by admin; shown as provided")
    turnaround_hours = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CenterDiagnosticService(TimeStampedModel):
    center = models.ForeignKey(DiagnosticCenter, on_delete=models.CASCADE, related_name="services")
    test = models.ForeignKey(DiagnosticTest, on_delete=models.CASCADE, related_name="center_services")
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["center", "test"], name="uniq_center_test"),
            models.CheckConstraint(condition=Q(price__gte=0), name="service_price_non_negative"),
        ]
        indexes = [models.Index(fields=["test", "is_active"])]

    def __str__(self):
        return f"{self.center.name}: {self.test.name} @ {self.price}"


class AvailabilitySlot(TimeStampedModel):
    center = models.ForeignKey(DiagnosticCenter, on_delete=models.CASCADE, related_name="slots")
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    capacity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["date", "start_time"]
        constraints = [
            models.UniqueConstraint(fields=["center", "date", "start_time"], name="uniq_slot_start"),
            models.CheckConstraint(condition=Q(end_time__gt=F("start_time")), name="slot_end_after_start"),
            models.CheckConstraint(condition=Q(capacity__gte=1), name="slot_capacity_positive"),
        ]
        indexes = [models.Index(fields=["center", "date"])]

    def __str__(self):
        return f"{self.center.name} {self.date} {self.start_time:%H:%M}"
