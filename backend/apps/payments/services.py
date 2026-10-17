from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.appointments.models import Appointment, Status
from apps.appointments.services import confirm_after_payment, expire_stale
from apps.common.exceptions import Conflict

from . import gateway
from .models import Payment, PaymentStatus


def to_paise(amount: Decimal) -> int:
    return int((amount * 100).quantize(Decimal("1")))


@transaction.atomic
def create_or_reuse_order(patient, appointment_id):
    expire_stale()
    try:
        appt = Appointment.objects.select_for_update().get(pk=appointment_id, patient=patient)
    except Appointment.DoesNotExist:
        raise ValidationError({"appointment_id": "Appointment not found."})
    if appt.status != Status.PENDING_PAYMENT:
        raise Conflict(f"Appointment is {appt.status}; payment is not required or no longer possible.")
    existing = Payment.objects.filter(appointment=appt, status=PaymentStatus.CREATED).first()
    if existing:
        return existing  # idempotent: reuse the open order
    amount = appt.amount  # authoritative server-side amount
    order = gateway.create_order(to_paise(amount), receipt=appt.reference)
    return Payment.objects.create(appointment=appt, razorpay_order_id=order["id"], amount=amount, currency=order.get("currency", "INR"))


@transaction.atomic
def mark_paid(order_id, razorpay_payment_id, amount_paise=None):
    """Idempotent. Returns (payment, changed)."""
    payment = Payment.objects.select_for_update().get(razorpay_order_id=order_id)
    if payment.status == PaymentStatus.PAID:
        return payment, False
    if amount_paise is not None and int(amount_paise) != to_paise(payment.amount):
        payment.failure_reason = "Amount mismatch reported by gateway"
        payment.save(update_fields=["failure_reason", "updated_at"])
        raise ValidationError("Payment amount does not match the order.")
    appt = Appointment.objects.select_for_update().select_related("slot", "patient").get(pk=payment.appointment_id)
    payment.status = PaymentStatus.PAID
    payment.razorpay_payment_id = razorpay_payment_id
    payment.paid_at = timezone.now()
    payment.failure_reason = ""
    confirmed = confirm_after_payment(appt)
    # Money was captured but we could not confirm (cancelled/rejected/slot full): flag for refund.
    payment.refund_required = not confirmed
    payment.save()
    return payment, True


@transaction.atomic
def mark_failed(order_id, reason=""):
    payment = Payment.objects.select_for_update().get(razorpay_order_id=order_id)
    if payment.status == PaymentStatus.CREATED:
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = reason[:255]
        payment.save(update_fields=["status", "failure_reason", "updated_at"])
        return True
    return False
