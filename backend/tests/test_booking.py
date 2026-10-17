import threading
from datetime import timedelta

import pytest
from django.db import connection, connections
from django.utils import timezone

from apps.appointments import services as svc
from apps.appointments.models import Appointment, Status
from apps.diagnostics.models import AvailabilitySlot
from tests.conftest import auth, make_user

pytestmark = pytest.mark.django_db


def book(client, service, slot):
    return client.post("/api/v1/appointments/", {"service_id": service.id, "slot_id": slot.id}, format="json")


def test_availability_from_backend(patient, service, slot, center):
    c = auth(patient)
    r = c.get(f"/api/v1/availability/?center={center.id}&service={service.id}")
    assert r.status_code == 200 and r.data["dates"][0]["available_slots"] == 1
    r = c.get(f"/api/v1/availability/?center={center.id}&service={service.id}&date={slot.date}")
    assert r.data["slots"][0]["remaining"] == 1


def test_booking_uses_server_price_and_ignores_client_amount(patient, service, slot):
    r = auth(patient).post("/api/v1/appointments/", {"service_id": service.id, "slot_id": slot.id, "amount": "1.00"}, format="json")
    assert r.status_code == 201
    assert r.data["amount"] == "350.00" and r.data["status"] == "PENDING_PAYMENT" and r.data["payment_status"] == "NONE"


def test_capacity_enforced_sequentially(patient, patient2, service, slot):
    assert book(auth(patient), service, slot).status_code == 201
    assert book(auth(patient2), service, slot).status_code == 409


def test_duplicate_booking_same_slot_rejected(patient, service, slot):
    slot.capacity = 5
    slot.save()
    c = auth(patient)
    assert book(c, service, slot).status_code == 201
    assert book(c, service, slot).status_code == 409


def test_inactive_service_and_wrong_center_rejected(patient, service, slot, center2):
    service.is_active = False
    service.save()
    assert book(auth(patient), service, slot).status_code == 400
    service.is_active = True
    service.save()
    other = AvailabilitySlot.objects.create(center=center2, date=slot.date, start_time=slot.start_time, end_time=slot.end_time)
    assert book(auth(patient), service, other).status_code == 400


def test_past_and_inactive_slot_rejected(patient, service, slot):
    slot.is_active = False
    slot.save()
    assert book(auth(patient), service, slot).status_code == 400
    slot.is_active = True
    slot.date = timezone.localdate() - timedelta(days=1)
    slot.save()
    assert book(auth(patient), service, slot).status_code == 400


def test_expired_hold_frees_capacity(patient, patient2, service, slot):
    a = book(auth(patient), service, slot).data
    Appointment.objects.filter(pk=a["id"]).update(expires_at=timezone.now() - timedelta(minutes=1))
    assert book(auth(patient2), service, slot).status_code == 201
    assert Appointment.objects.get(pk=a["id"]).status == Status.EXPIRED


def test_patient_cannot_see_or_cancel_others(patient, patient2, service, slot):
    a = book(auth(patient), service, slot).data
    c2 = auth(patient2)
    assert c2.get(f"/api/v1/appointments/{a['id']}/").status_code == 404
    assert c2.post(f"/api/v1/appointments/{a['id']}/cancel/").status_code == 404
    assert c2.get("/api/v1/appointments/").data["count"] == 0


def test_cancel_pending_then_invalid_transition(patient, service, slot):
    c = auth(patient)
    a = book(c, service, slot).data
    assert c.post(f"/api/v1/appointments/{a['id']}/cancel/").data["status"] == "CANCELLED"
    assert c.post(f"/api/v1/appointments/{a['id']}/cancel/").status_code == 409  # CANCELLED -> CANCELLED invalid
    assert book(auth(make_user("x@example.com")), service, slot).status_code == 201  # capacity freed


def test_confirmed_cancellation_cutoff(patient, service, slot):
    c = auth(patient)
    a = book(c, service, slot).data
    appt = Appointment.objects.get(pk=a["id"])
    appt.status = Status.CONFIRMED
    appt.save()
    slot.date = timezone.localdate()
    slot.start_time = (timezone.localtime() + timedelta(hours=1)).time()
    slot.end_time = (timezone.localtime() + timedelta(hours=2)).time().replace(microsecond=0)
    slot.save()
    if slot.end_time > slot.start_time:  # skip if clock wraps past midnight
        assert c.post(f"/api/v1/appointments/{a['id']}/cancel/").status_code == 409


def test_state_machine_is_explicit():
    from apps.appointments.models import TRANSITIONS
    assert TRANSITIONS[Status.COMPLETED] == set() and Status.CONFIRMED not in TRANSITIONS[Status.CANCELLED]


@pytest.mark.django_db(transaction=True)
@pytest.mark.skipif(connection.vendor != "postgresql", reason="needs real row locking (PostgreSQL)")
def test_concurrent_bookings_never_exceed_capacity(service, slot):
    slot.capacity = 2
    slot.save()
    users = [make_user(f"c{i}@example.com") for i in range(8)]
    results, barrier = [], threading.Barrier(len(users))

    def worker(u):
        try:
            barrier.wait()
            svc.create_booking(u, service.id, slot.id)
            results.append("ok")
        except Exception as e:  # Conflict expected for the losers
            results.append(type(e).__name__)
        finally:
            connections.close_all()

    ts = [threading.Thread(target=worker, args=(u,)) for u in users]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert results.count("ok") == 2, results
    assert Appointment.objects.filter(slot=slot).count() == 2
