from rest_framework.routers import DefaultRouter

from .views import StaffServiceViewSet, StaffSlotViewSet, TestViewSet

router = DefaultRouter()
router.register("tests", TestViewSet, basename="test")
router.register("staff/services", StaffServiceViewSet, basename="staff-service")
router.register("staff/slots", StaffSlotViewSet, basename="staff-slot")
urlpatterns = router.urls
