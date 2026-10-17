from datetime import time, timedelta
from decimal import Decimal

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import PatientProfile, Role, User
from apps.centers.models import CenterStaffAssignment, DiagnosticCenter
from apps.diagnostics.models import AvailabilitySlot, CenterDiagnosticService, DiagnosticTest


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield


@pytest.fixture(autouse=True)
def razorpay_settings(settings):
    settings.RAZORPAY_KEY_ID = "rzp_test_key"
    settings.RAZORPAY_KEY_SECRET = "key_secret"
    settings.RAZORPAY_WEBHOOK_SECRET = "hook_secret"


def make_user(email, role=Role.PATIENT, password="Str0ng!Passw0rd"):
    u = User.objects.create_user(email=email, password=password, full_name=email.split("@")[0], role=role)
    if role == Role.PATIENT:
        PatientProfile.objects.create(user=u)
    return u


@pytest.fixture
def patient(db):
    return make_user("p1@example.com")


@pytest.fixture
def patient2(db):
    return make_user("p2@example.com")


@pytest.fixture
def staff(db, center):
    u = make_user("s1@example.com", Role.STAFF)
    CenterStaffAssignment.objects.create(user=u, center=center)
    return u


@pytest.fixture
def other_staff(db, center2):
    u = make_user("s2@example.com", Role.STAFF)
    CenterStaffAssignment.objects.create(user=u, center=center2)
    return u


@pytest.fixture
def center(db):
    return DiagnosticCenter.objects.create(name="Test Lab", city="Chennai", address="1 Test St",
                                           opening_time=time(8), closing_time=time(18))


@pytest.fixture
def center2(db):
    return DiagnosticCenter.objects.create(name="Other Lab", city="Mumbai", address="2 Test St",
                                           opening_time=time(8), closing_time=time(18))


@pytest.fixture
def test_cbc(db):
    return DiagnosticTest.objects.create(name="CBC", category="PATHOLOGY", preparation="None", turnaround_hours=6)


@pytest.fixture
def service(center, test_cbc):
    return CenterDiagnosticService.objects.create(center=center, test=test_cbc, price=Decimal("350.00"))


@pytest.fixture
def slot(center):
    return AvailabilitySlot.objects.create(center=center, date=timezone.localdate() + timedelta(days=2),
                                           start_time=time(10), end_time=time(11), capacity=1)


def auth(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def anon():
    return APIClient()
