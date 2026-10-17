import hashlib
import hmac
import json

import pytest

from apps.appointments.models import Appointment, Status
from apps.payments import gateway
from apps.payments.models import Payment, PaymentStatus, PaymentWebhookEvent
from tests.conftest import auth

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def fake_razorpay(monkeypatch):
    import itertools
    n = itertools.count(1)  # Razorpay returns a fresh order id on every call
    monkeypatch.setattr(gateway, "create_order", lambda amount, receipt: {"id": f"order_{receipt}_{next(n)}", "currency": "INR", "amount": amount})


@pytest.fixture
def appt(patient, service, slot):
    r = auth(patient).post("/api/v1/appointments/", {"service_id": service.id, "slot_id": slot.id}, format="json")
    return Appointment.objects.get(pk=r.data["id"])


def sign(order, pay):
    return hmac.new(b"key_secret", f"{order}|{pay}".encode(), hashlib.sha256).hexdigest()


def hook(client, payload, secret=b"hook_secret", event_id="evt_1", bad=False):
    body = json.dumps(payload).encode()
    sig = "bad" if bad else hmac.new(secret, body, hashlib.sha256).hexdigest()
    return client.post("/api/v1/payments/webhook/", data=body, content_type="application/json",
                       HTTP_X_RAZORPAY_SIGNATURE=sig, HTTP_X_RAZORPAY_EVENT_ID=event_id)


def captured(order, pay="pay_1", amount=35000):
    return {"event": "payment.captured", "payload": {"payment": {"entity": {"id": pay, "order_id": order, "amount": amount}}}}


def test_create_order_uses_server_amount_and_is_idempotent(patient, appt):
    c = auth(patient)
    r1 = c.post("/api/v1/payments/create-order/", {"appointment_id": appt.id, "amount": 1}, format="json")
    r2 = c.post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json")
    assert r1.status_code == 201 and r1.data["amount"] == 35000 and "key_secret" not in json.dumps(r1.data)
    assert r1.data["razorpay_order_id"] == r2.data["razorpay_order_id"]
    assert Payment.objects.count() == 1


def test_cannot_pay_for_someone_elses_appointment(patient2, appt):
    assert auth(patient2).post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json").status_code == 400


def test_missing_credentials_gives_clear_503(patient, appt, settings, monkeypatch):
    monkeypatch.undo()
    settings.RAZORPAY_KEY_ID = ""
    settings.RAZORPAY_KEY_SECRET = ""
    r = auth(patient).post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json")
    assert r.status_code == 503 and "RAZORPAY_KEY_ID" in r.data["error"]["message"]


def test_verify_bad_signature_does_not_confirm(patient, appt):
    c = auth(patient)
    o = c.post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json").data["razorpay_order_id"]
    r = c.post("/api/v1/payments/verify/", {"razorpay_order_id": o, "razorpay_payment_id": "pay_1", "razorpay_signature": "forged"}, format="json")
    assert r.status_code == 400
    appt.refresh_from_db()
    assert appt.status == Status.PENDING_PAYMENT and Payment.objects.get().status == PaymentStatus.CREATED


def test_verify_good_signature_confirms_and_is_idempotent(patient, appt):
    c = auth(patient)
    o = c.post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json").data["razorpay_order_id"]
    body = {"razorpay_order_id": o, "razorpay_payment_id": "pay_1", "razorpay_signature": sign(o, "pay_1")}
    for _ in range(2):
        r = c.post("/api/v1/payments/verify/", body, format="json")
        assert r.status_code == 200 and r.data["appointment_status"] == "CONFIRMED"
    assert Payment.objects.filter(status=PaymentStatus.PAID).count() == 1


def test_webhook_invalid_signature_rejected(anon, patient, appt):
    o = auth(patient).post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json").data["razorpay_order_id"]
    assert hook(anon, captured(o), bad=True).status_code == 400
    assert hook(anon, captured(o), secret=b"wrong").status_code == 400
    appt.refresh_from_db()
    assert appt.status == Status.PENDING_PAYMENT and PaymentWebhookEvent.objects.count() == 0


def test_webhook_confirms_and_duplicate_event_is_noop(anon, patient, appt):
    o = auth(patient).post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json").data["razorpay_order_id"]
    assert hook(anon, captured(o)).data["result"] == "paid"
    assert hook(anon, captured(o)).data["status"] == "duplicate"  # same event id
    assert hook(anon, captured(o), event_id="evt_2").data["result"] == "already paid"  # new event, same payment
    appt.refresh_from_db()
    assert appt.status == Status.CONFIRMED
    assert Payment.objects.get().status == PaymentStatus.PAID and PaymentWebhookEvent.objects.count() == 2


def test_webhook_amount_mismatch_not_marked_paid(anon, patient, appt):
    o = auth(patient).post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json").data["razorpay_order_id"]
    assert hook(anon, captured(o, amount=100)).status_code == 500
    appt.refresh_from_db()
    assert appt.status == Status.PENDING_PAYMENT and Payment.objects.get().status == PaymentStatus.CREATED


def test_webhook_failure_allows_retry_with_new_order(anon, patient, appt):
    c = auth(patient)
    o1 = c.post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json").data["razorpay_order_id"]
    fail = {"event": "payment.failed", "payload": {"payment": {"entity": {"id": "pay_x", "order_id": o1, "error_description": "declined"}}}}
    hook(anon, fail, event_id="evt_f")
    assert Payment.objects.get().status == PaymentStatus.FAILED
    appt.refresh_from_db()
    assert appt.status == Status.PENDING_PAYMENT
    r = c.post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json")
    assert r.status_code == 201 and Payment.objects.count() == 2


def test_late_payment_after_cancel_flags_refund(anon, patient, appt):
    c = auth(patient)
    o = c.post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json").data["razorpay_order_id"]
    c.post(f"/api/v1/appointments/{appt.id}/cancel/")
    hook(anon, captured(o))
    p = Payment.objects.get()
    appt.refresh_from_db()
    assert appt.status == Status.CANCELLED and p.status == PaymentStatus.PAID and p.refund_required


def test_payment_history_is_isolated(patient, patient2, appt):
    auth(patient).post("/api/v1/payments/create-order/", {"appointment_id": appt.id}, format="json")
    assert auth(patient).get("/api/v1/payments/").data["count"] == 1
    assert auth(patient2).get("/api/v1/payments/").data["count"] == 0
