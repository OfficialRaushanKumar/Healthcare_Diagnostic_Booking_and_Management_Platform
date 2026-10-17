from django.db import models
from django.db.models import Q

from apps.common.models import TimeStampedModel


class PaymentStatus(models.TextChoices):
    CREATED = "CREATED", "Created"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"


class Payment(TimeStampedModel):
    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.PROTECT, related_name="payments")
    razorpay_order_id = models.CharField(max_length=64, unique=True)
    razorpay_payment_id = models.CharField(max_length=64, blank=True, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.CREATED, db_index=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    refund_required = models.BooleanField(default=False, help_text="Captured payment whose appointment is not confirmed/cancelled; operator must refund")

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # at most one open order and one successful payment per appointment
            models.UniqueConstraint(fields=["appointment"], condition=Q(status="CREATED"), name="one_open_payment_per_appointment"),
            models.UniqueConstraint(fields=["appointment"], condition=Q(status="PAID"), name="one_paid_payment_per_appointment"),
        ]


class PaymentWebhookEvent(TimeStampedModel):
    event_id = models.CharField(max_length=128, unique=True)
    event_type = models.CharField(max_length=64)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    processing_note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
