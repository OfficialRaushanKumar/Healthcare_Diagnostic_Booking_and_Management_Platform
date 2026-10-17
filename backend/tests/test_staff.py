from datetime import timedelta

import pytest
from django.utils import timezone

from apps.appointments.models import Appointment, Status
from tests.conftest import auth

pytestmark = pytest.mark.django_db


@pytest.fixture
def appt(patient, service, slot):
    r = auth(patient).post("/api/v1/appointments/", {"service_id": service.id, "slot_id": slot.id}, format="json")
    return Appointment.objects.get(pk=r.data["id"])


def test_patient_cannot_use_staff_endpoints(patient, appt):
    c = auth(patient)
    assert c.get("/api/v1/staff/appointments/").status_code == 403
    assert c.get("/api/v1/dashboard/staff/").status_code == 403
    assert c.get("/api/v1/dashboard/admin/").status_code == 403


def test_staff_only_sees_own_center(staff, other_staff, appt):
    assert auth(staff).get("/api/v1/staff/appointments/").data["count"] == 1
    assert auth(other_staff).get("/api/v1/staff/appointments/").data["count"] == 0
    assert auth(other_staff).get(f"/api/v1/staff/appointments/{appt.id}/").status_code == 404
    assert auth(other_staff).post(f"/api/v1/staff/appointments/{appt.id}/status/", {"status": "REJECTED"}, format="json").status_code == 404


def test_staff_cannot_confirm_manually_or_make_invalid_transition(staff, appt):
    c = auth(staff)
    assert c.post(f"/api/v1/staff/appointments/{appt.id}/status/", {"status": "CONFIRMED"}, format="json").status_code == 400
    assert c.post(f"/api/v1/staff/appointments/{appt.id}/status/", {"status": "COMPLETED"}, format="json").status_code == 409


def test_staff_reject_pending_and_patient_contact_visible(staff, appt):
    c = auth(staff)
    r = c.post(f"/api/v1/staff/appointments/{appt.id}/status/", {"status": "REJECTED"}, format="json")
    assert r.status_code == 200 and r.data["status"] == "REJECTED" and r.data["patient"]["email"]
    assert auth(appt.patient).get(f"/api/v1/appointments/{appt.id}/").data["patient"] is None


def test_staff_cannot_complete_future_appointment(staff, appt):
    appt.status = Status.CONFIRMED
    appt.save()
    assert auth(staff).post(f"/api/v1/staff/appointments/{appt.id}/status/", {"status": "COMPLETED"}, format="json").status_code == 409


def test_staff_dashboard_numbers_come_from_db(staff, appt):
    d = auth(staff).get("/api/v1/dashboard/staff/").data
    assert d["pending_count"] == 1 and d["status_distribution"] == {"PENDING_PAYMENT": 1}


def test_staff_service_price_update_and_isolation(staff, other_staff, service):
    assert auth(staff).patch(f"/api/v1/staff/services/{service.id}/", {"price": "400.00"}, format="json").data["price"] == "400.00"
    assert auth(other_staff).patch(f"/api/v1/staff/services/{service.id}/", {"price": "1.00"}, format="json").status_code == 404
    assert auth(staff).patch(f"/api/v1/staff/services/{service.id}/", {"price": "-5"}, format="json").status_code == 400


def test_existing_booking_keeps_snapshot_price(staff, appt, service):
    auth(staff).patch(f"/api/v1/staff/services/{service.id}/", {"price": "999.00"}, format="json")
    appt.refresh_from_db()
    assert str(appt.amount) == "350.00"


def test_slot_capacity_cannot_drop_below_bookings(staff, appt, slot):
    c = auth(staff)
    assert c.patch(f"/api/v1/staff/slots/{slot.id}/", {"capacity": 0}, format="json").status_code == 400
    assert c.patch(f"/api/v1/staff/slots/{slot.id}/", {"is_active": False}, format="json").status_code == 400
    assert c.delete(f"/api/v1/staff/slots/{slot.id}/").status_code == 409
    assert c.patch(f"/api/v1/staff/slots/{slot.id}/", {"capacity": 4}, format="json").status_code == 200


def test_staff_create_slot_only_for_assigned_center(staff, center, center2):
    c = auth(staff)
    day = str(timezone.localdate() + timedelta(days=3))
    body = {"center": center.id, "date": day, "start_time": "09:00", "end_time": "10:00", "capacity": 2}
    assert c.post("/api/v1/staff/slots/", body, format="json").status_code == 201
    assert c.post("/api/v1/staff/slots/", {**body, "center": center2.id}, format="json").status_code == 400
    assert c.post("/api/v1/staff/slots/", {**body, "start_time": "11:00"}, format="json").status_code == 400


def test_admin_dashboard_and_swagger(db, anon):
    from tests.conftest import make_user
    from apps.accounts.models import Role
    a = make_user("a@example.com", Role.ADMIN)
    assert auth(a).get("/api/v1/dashboard/admin/").status_code == 200
    assert anon.get("/api/schema/").status_code == 200 and anon.get("/api/docs/").status_code == 200


def test_staff_centers_endpoint(staff, other_staff, center, patient):
    assert [c["id"] for c in auth(staff).get("/api/v1/staff/centers/").data] == [center.id]
    assert auth(patient).get("/api/v1/staff/centers/").status_code == 403
