from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("appointments", views.AppointmentViewSet, basename="appointment")
router.register("staff/appointments", views.StaffAppointmentViewSet, basename="staff-appointment")

urlpatterns = [
    path("availability/", views.AvailabilityView.as_view()),
    path("dashboard/patient/", views.PatientDashboardView.as_view()),
    path("dashboard/staff/", views.StaffDashboardView.as_view()),
    path("dashboard/admin/", views.AdminDashboardView.as_view()),
] + router.urls
