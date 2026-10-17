import secrets

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.common.models import TimeStampedModel


class Status(models.TextChoices):
    PENDING_PAYMENT = "PENDING_PAYMENT", "Pending payment"
    CONFIRMED = "CONFIRMED", "Confirmed"
    CANCELLED = "CANCELLED", "Cancelled"
    COMPLETED = "COMPLETED", "Completed"
    REJECTED = "REJECTED", "Rejected"
    EXPIRED = "EXPIRED", "Expired"


# Explicit state machine: current -> allowed next states
TRANSITIONS = {
    Status.PENDING_PAYMENT: {Status.CONFIRMED, Status.CANCELLED, Status.EXPIRED, Status.REJECTED},
    Status.CONFIRMED: {Status.CANCELLED, Status.COMPLETED, Status.REJECTED},
    Status.CANCELLED: set(),
    Status.COMPLETED: set(),
    Status.REJECTED: set(),
    # A late (but genuine) payment may revive an expired hold if capacity remains.
    Status.EXPIRED: {Status.CONFIRMED},
}

# Transitions diagnostic-center staff may perform manually. Staff can never mark an
# appointment CONFIRMED: only verified payment does that.
STAFF_TRANSITIONS = {
    (Status.PENDING_PAYMENT, Status.REJECTED),
    (Status.CONFIRMED, Status.COMPLETED),
    (Status.CONFIRMED, Status.CANCELLED),
    (Status.CONFIRMED, Status.REJECTED),
}

_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_reference():
    return "MB-" + "".join(secrets.choice(_ALPHABET) for _ in range(8))


class Appointment(TimeStampedModel):
    reference = models.CharField(max_length=16, unique=True, default=new_reference, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="appointments")
    center = models.ForeignKey("centers.DiagnosticCenter", on_delete=models.PROTECT, related_name="appointments")
    service = models.ForeignKey("diagnostics.CenterDiagnosticService", on_delete=models.PROTECT, related_name="appointments")
    slot = models.ForeignKey("diagnostics.AvailabilitySlot", on_delete=models.PROTECT, related_name="appointments")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING_PAYMENT, db_index=True)
    status_reason = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # server-calculated snapshot of price
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "slot"],
                condition=Q(status__in=["PENDING_PAYMENT", "CONFIRMED", "COMPLETED"]),
                name="uniq_active_booking_per_patient_slot",
            ),
            models.CheckConstraint(condition=Q(amount__gte=0), name="appointment_amount_non_negative"),
        ]
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["center", "status"]),
            models.Index(fields=["status", "expires_at"]),
        ]

    def __str__(self):
        return self.reference
