import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from tests.conftest import auth

pytestmark = pytest.mark.django_db
REG = {"email": "new@example.com", "full_name": "New User", "password": "Str0ng!Passw0rd", "confirm_password": "Str0ng!Passw0rd"}


def test_register_creates_patient_and_ignores_role(anon):
    r = anon.post("/api/v1/auth/register/", {**REG, "role": "ADMIN", "is_superuser": True}, format="json")
    assert r.status_code == 201
    u = User.objects.get(email="new@example.com")
    assert u.role == Role.PATIENT and not u.is_superuser and not u.is_staff
    assert u.check_password(REG["password"]) and u.password != REG["password"]  # hashed


def test_register_validation(anon):
    assert anon.post("/api/v1/auth/register/", {**REG, "confirm_password": "x"}, format="json").status_code == 400
    assert anon.post("/api/v1/auth/register/", {**REG, "password": "12345678", "confirm_password": "12345678"}, format="json").status_code == 400


def test_login_refresh_logout_blacklists(anon):
    anon.post("/api/v1/auth/register/", REG, format="json")
    r = anon.post("/api/v1/auth/login/", {"email": "NEW@example.com", "password": REG["password"]}, format="json")
    assert r.status_code == 200 and {"access", "refresh", "user"} <= set(r.data)
    refresh = r.data["refresh"]
    me = APIClient()
    me.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
    assert me.get("/api/v1/auth/me/").status_code == 200
    assert anon.post("/api/v1/auth/logout/", {"refresh": refresh}, format="json").status_code == 204
    assert anon.post("/api/v1/auth/token/refresh/", {"refresh": refresh}, format="json").status_code == 401


def test_login_wrong_password(anon, patient):
    assert anon.post("/api/v1/auth/login/", {"email": patient.email, "password": "nope"}, format="json").status_code == 401


def test_protected_endpoint_requires_auth(anon):
    assert anon.get("/api/v1/appointments/").status_code == 401


def test_profile_update_persists(patient):
    c = auth(patient)
    r = c.patch("/api/v1/auth/me/", {"full_name": "Renamed", "city": "Pune", "role": "ADMIN"}, format="json")
    assert r.status_code == 200 and r.data["full_name"] == "Renamed" and r.data["city"] == "Pune"
    patient.refresh_from_db()
    assert patient.role == Role.PATIENT


def test_center_listing_and_filters(anon, service, center2):
    r = anon.get("/api/v1/centers/")
    assert r.status_code == 200 and r.data["count"] == 2
    r = anon.get("/api/v1/centers/?city=chennai")
    assert [c["name"] for c in r.data["results"]] == ["Test Lab"]
    assert r.data["results"][0]["starting_price"] == "350.00"
    assert anon.get("/api/v1/centers/?category=PATHOLOGY").data["count"] == 1
    assert anon.get("/api/v1/centers/?category=RADIOLOGY").data["count"] == 0


def test_center_detail_hides_inactive_services(anon, center, service):
    service.is_active = False
    service.save()
    assert anon.get(f"/api/v1/centers/{center.id}/").data["services"] == []


def test_test_search_and_detail(anon, service, test_cbc):
    assert anon.get("/api/v1/tests/?search=cbc").data["count"] == 1
    assert anon.get("/api/v1/tests/?category=RADIOLOGY").data["count"] == 0
    d = anon.get(f"/api/v1/tests/{test_cbc.id}/").data
    assert str(d["centers"][0]["price"]) == "350.00"


def test_test_not_listed_for_center_when_service_inactive(anon, service, test_cbc):
    service.is_active = False
    service.save()
    assert anon.get(f"/api/v1/tests/{test_cbc.id}/").data["centers"] == []
