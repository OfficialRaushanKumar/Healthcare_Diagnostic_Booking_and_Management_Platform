from django.db.models import Count, Min, Q
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.common.exceptions import Conflict
from apps.common.permissions import IsCenterStaff

from .models import AvailabilitySlot, CenterDiagnosticService, DiagnosticTest
from .serializers import StaffServiceSerializer, StaffSlotSerializer, TestDetailSerializer, TestSerializer


class TestViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    filterset_fields = ["category"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "min_price"]

    def get_queryset(self):
        live = Q(center_services__is_active=True, center_services__center__is_active=True)
        return (DiagnosticTest.objects.filter(is_active=True)
                .annotate(min_price=Min("center_services__price", filter=live),
                          centers_count=Count("center_services", filter=live, distinct=True))
                .order_by("name"))

    def get_serializer_class(self):
        return TestDetailSerializer if self.action == "retrieve" else TestSerializer


class StaffServiceViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin,
                          mixins.UpdateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsCenterStaff]
    serializer_class = StaffServiceSerializer
    filterset_fields = ["center", "is_active"]
    http_method_names = ["get", "post", "patch", "head", "options"]  # no hard delete: deactivate instead

    def get_queryset(self):
        return CenterDiagnosticService.objects.filter(
            center__staff_assignments__user=self.request.user).select_related("test", "center")


class StaffSlotViewSet(viewsets.ModelViewSet):
    permission_classes = [IsCenterStaff]
    serializer_class = StaffSlotSerializer
    filterset_fields = ["center", "date", "is_active"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(center__staff_assignments__user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        from apps.appointments.models import Appointment

        slot = self.get_object()
        if Appointment.objects.filter(slot=slot).exists():
            raise Conflict("This slot has bookings on record and cannot be deleted. Deactivate it instead.")
        slot.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
