"""Booking business logic. All capacity checks happen under a row lock on the slot."""
from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.common.exceptions import Conflict
from apps.diagnostics.models import AvailabilitySlot, CenterDiagnosticService
from apps.notifications.services import notify

from .models import STAFF_TRANSITIONS, TRANSITIONS, Appointment, Status


def slot_start(slot):
    return timezone.make_aware(datetime.combine(slot.date, slot.start_time))


def holding_q(now=None, prefix=""):
    """Q for appointments that currently consume slot capacity."""
    now = now or timezone.now()
    p = prefix
    return Q(**{f"{p}status__in": [Status.CONFIRMED, Status.COMPLETED]}) | Q(
        **{f"{p}status": Status.PENDING_PAYMENT, f"{p}expires_at__gt": now}
    )


def active_count(slot, now=None):
    return Appointment.objects.filter(slot=slot).filter(holding_q(now)).count()


def expire_stale(now=None):
    """Move unpaid bookings past their hold window to EXPIRED. Safe to call repeatedly."""
    now = now or timezone.now()
    return Appointment.objects.filter(status=Status.PENDING_PAYMENT, expires_at__lte=now).update(
        status=Status.EXPIRED, status_reason="Payment not completed in time", updated_at=now
    )


def available_slots_qs(center_id, now=None):
    now = now or timezone.now()
    local = timezone.localtime(now)
    qs = AvailabilitySlot.objects.filter(center_id=center_id, is_active=True, date__gte=local.date())
    qs = qs.exclude(date=local.date(), start_time__lte=local.time())
    return qs.annotate(held=Count("appointments", filter=holding_q(now, "appointments__")))


@transaction.atomic
def create_booking(patient, service_id, slot_id):
    expire_stale()
    # Lock the slot row: concurrent bookings for the same slot serialize here.
    try:
        slot = AvailabilitySlot.objects.select_for_update().select_related("center").get(pk=slot_id)
    except AvailabilitySlot.DoesNotExist:
        raise ValidationError({"slot_id": "Slot not found."})
    try:
        service = CenterDiagnosticService.objects.select_related("test", "center").get(pk=service_id)
    except CenterDiagnosticService.DoesNotExist:
        raise ValidationError({"service_id": "Service not found."})

    if not (service.is_active and service.test.is_active and service.center.is_active):
        raise ValidationError({"service_id": "This diagnostic service is not currently available."})
    if service.center_id != slot.center_id:
        raise ValidationError({"slot_id": "Slot does not belong to the selected center."})
    if not slot.is_active:
        raise ValidationError({"slot_id": "This slot is not available."})
    if slot_start(slot) <= timezone.now():
        raise ValidationError({"slot_id": "This slot is in the past."})
    if Appointment.objects.filter(
        patient=patient, slot=slot, status__in=[Status.PENDING_PAYMENT, Status.CONFIRMED, Status.COMPLETED]
    ).exists():
        raise Conflict("You already have a booking for this slot.")
    if active_count(slot) >= slot.capacity:
        raise Conflict("This slot is fully booked. Please choose another time.")

    appt = Appointment.objects.create(
        patient=patient,
        center=slot.center,
        service=service,
        slot=slot,
        amount=service.price,  # never taken from the client
        expires_at=timezone.now() + timedelta(minutes=settings.BOOKING_HOLD_MINUTES),
    )
    notify(patient, "Booking created", f"{appt.reference} is held for {settings.BOOKING_HOLD_MINUTES} minutes. Complete payment to confirm.")
    return appt


def _apply(appt, new_status, reason=""):
    if new_status not in TRANSITIONS[Status(appt.status)]:
        raise Conflict(f"Cannot change status from {appt.status} to {new_status}.")
    appt.status = new_status
    appt.status_reason = reason[:200]
    appt.save(update_fields=["status", "status_reason", "updated_at"])
    return appt


@transaction.atomic
def patient_cancel(appt_id, patient):
    appt = Appointment.objects.select_for_update().select_related("slot", "patient").get(pk=appt_id, patient=patient)
    if appt.status == Status.CONFIRMED:
        cutoff = timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)
        if slot_start(appt.slot) - timezone.now() < cutoff:
            raise Conflict(f"Confirmed appointments can only be cancelled {settings.CANCELLATION_CUTOFF_HOURS}+ hours before the slot.")
    _apply(appt, Status.CANCELLED, "Cancelled by patient")
    _flag_refund_if_paid(appt)
    notify(appt.patient, "Booking cancelled", f"{appt.reference} was cancelled.")
    return appt


@transaction.atomic
def staff_set_status(appt_id, staff_user, new_status, center_ids):
    appt = Appointment.objects.select_for_update().select_related("slot", "patient").get(pk=appt_id, center_id__in=center_ids)
    if (appt.status, new_status) not in STAFF_TRANSITIONS:
        raise Conflict(f"Staff cannot change status from {appt.status} to {new_status}.")
    if new_status == Status.COMPLETED and slot_start(appt.slot) > timezone.now():
        raise Conflict("An appointment cannot be completed before its scheduled time.")
    _apply(appt, new_status, f"Updated by staff ({staff_user.email})")
    if new_status in (Status.CANCELLED, Status.REJECTED):
        _flag_refund_if_paid(appt)
    notify(appt.patient, f"Appointment {new_status.lower()}", f"{appt.reference} is now {new_status}.")
    return appt


def _flag_refund_if_paid(appt):
    """Refund extension point: records that a captured payment needs a refund. Actual
    gateway refund call is intentionally left to an operator/Razorpay dashboard (see docs)."""
    from apps.payments.models import Payment, PaymentStatus

    Payment.objects.filter(appointment=appt, status=PaymentStatus.PAID).update(refund_required=True)


def confirm_after_payment(appt):
    """Called by payments service with the appointment row already locked."""
    if appt.status == Status.PENDING_PAYMENT:
        _apply(appt, Status.CONFIRMED, "Payment verified")
        notify(appt.patient, "Appointment confirmed", f"{appt.reference} is confirmed.")
        return True
    if appt.status == Status.EXPIRED:
        slot = AvailabilitySlot.objects.select_for_update().get(pk=appt.slot_id)
        if active_count(slot) < slot.capacity and slot_start(slot) > timezone.now():
            _apply(appt, Status.CONFIRMED, "Payment verified after hold expiry")
            notify(appt.patient, "Appointment confirmed", f"{appt.reference} is confirmed.")
            return True
    return appt.status == Status.CONFIRMED
