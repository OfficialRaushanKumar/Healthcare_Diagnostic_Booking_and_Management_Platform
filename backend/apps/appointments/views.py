from datetime import timedelta

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminRole, IsCenterStaff, IsPatient
from apps.diagnostics.models import CenterDiagnosticService
from apps.payments.models import Payment, PaymentStatus

from . import services
from .models import Appointment, Status
from .serializers import (AppointmentSerializer, CreateAppointmentSerializer, StaffStatusSerializer)


def _base_qs():
    return Appointment.objects.select_related("center", "slot", "service__test", "patient").prefetch_related("payments")


class AvailabilityView(APIView):
    """Slots come only from the database; capacity = capacity - active holds."""

    @extend_schema(parameters=[
        OpenApiParameter("center", int, required=True), OpenApiParameter("service", int, required=True),
        OpenApiParameter("date", str, description="YYYY-MM-DD. Omit to get a date summary for the next 30 days.")])
    def get(self, request):
        center_id, service_id = request.query_params.get("center"), request.query_params.get("service")
        if not (center_id and service_id):
            return Response({"error": {"code": "invalid", "message": "center and service are required.", "details": None}}, status=400)
        svc = get_object_or_404(CenterDiagnosticService, pk=service_id, center_id=center_id,
                                is_active=True, test__is_active=True, center__is_active=True)
        services.expire_stale()
        qs = services.available_slots_qs(svc.center_id)
        date = request.query_params.get("date")
        if date:
            slots = [
                {"id": s.id, "date": s.date, "start_time": s.start_time, "end_time": s.end_time,
                 "capacity": s.capacity, "remaining": max(s.capacity - s.held, 0), "available": s.held < s.capacity}
                for s in qs.filter(date=date)
            ]
            return Response({"service_id": svc.id, "price": svc.price, "timezone": "Asia/Kolkata", "slots": slots})
        horizon = timezone.localdate() + timedelta(days=30)
        by_date = {}
        for s in qs.filter(date__lte=horizon):
            by_date[s.date] = by_date.get(s.date, 0) + (1 if s.held < s.capacity else 0)
        dates = [{"date": d, "available_slots": n} for d, n in sorted(by_date.items())]
        return Response({"service_id": svc.id, "timezone": "Asia/Kolkata", "dates": dates})


class AppointmentViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Patient-facing appointments. Queryset is always scoped to request.user."""
    permission_classes = [IsPatient]
    serializer_class = AppointmentSerializer
    filterset_fields = ["status"]
    ordering_fields = ["created_at", "slot__date"]

    def get_queryset(self):
        services.expire_stale()
        qs = _base_qs().filter(patient=self.request.user)
        when = self.request.query_params.get("when")
        today = timezone.localdate()
        if when == "upcoming":
            qs = qs.filter(status__in=[Status.PENDING_PAYMENT, Status.CONFIRMED], slot__date__gte=today)
        elif when == "past":
            qs = qs.filter(Q(status=Status.COMPLETED) | Q(status=Status.CONFIRMED, slot__date__lt=today))
        elif when == "cancelled":
            qs = qs.filter(status__in=[Status.CANCELLED, Status.REJECTED, Status.EXPIRED])
        return qs

    @extend_schema(request=CreateAppointmentSerializer, responses={201: AppointmentSerializer})
    def create(self, request):
        s = CreateAppointmentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        appt = services.create_booking(request.user, s.validated_data["service_id"], s.validated_data["slot_id"])
        appt = _base_qs().get(pk=appt.pk)
        return Response(AppointmentSerializer(appt).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        self.get_object()  # 404 if not owned
        services.patient_cancel(pk, request.user)
        return Response(AppointmentSerializer(_base_qs().get(pk=pk)).data)


class StaffAppointmentViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsCenterStaff]
    serializer_class = AppointmentSerializer
    filterset_fields = ["status", "center", "slot__date"]
    search_fields = ["reference", "patient__full_name", "patient__email", "service__test__name"]
    ordering_fields = ["slot__date", "created_at"]

    def center_ids(self):
        return list(self.request.user.center_assignments.values_list("center_id", flat=True))

    def get_queryset(self):
        services.expire_stale()
        return _base_qs().filter(center_id__in=self.center_ids())

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "include_patient": True}

    @extend_schema(request=StaffStatusSerializer, responses=AppointmentSerializer)
    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        self.get_object()
        s = StaffStatusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.staff_set_status(pk, request.user, s.validated_data["status"], self.center_ids())
        return Response(AppointmentSerializer(_base_qs().get(pk=pk), context={"include_patient": True}).data)


class PatientDashboardView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        services.expire_stale()
        qs = _base_qs().filter(patient=request.user)
        today = timezone.localdate()
        nxt = qs.filter(status__in=[Status.PENDING_PAYMENT, Status.CONFIRMED], slot__date__gte=today).order_by("slot__date", "slot__start_time").first()
        return Response({
            "upcoming_appointment": AppointmentSerializer(nxt).data if nxt else None,
            "counts": {r["status"]: r["n"] for r in qs.values("status").annotate(n=Count("id"))},
            "payments_total": Payment.objects.filter(appointment__patient=request.user, status=PaymentStatus.PAID).count(),
        })


class StaffDashboardView(APIView):
    permission_classes = [IsCenterStaff]

    def get(self, request):
        services.expire_stale()
        ids = list(request.user.center_assignments.values_list("center_id", flat=True))
        qs = _base_qs().filter(center_id__in=ids)
        today = timezone.localdate()
        ctx = {"include_patient": True}
        return Response({
            "centers": ids,
            "today": AppointmentSerializer(qs.filter(slot__date=today).exclude(status__in=[Status.EXPIRED]).order_by("slot__start_time"), many=True, context=ctx).data,
            "upcoming_count": qs.filter(slot__date__gt=today, status=Status.CONFIRMED).count(),
            "pending_count": qs.filter(status=Status.PENDING_PAYMENT).count(),
            "status_distribution": {r["status"]: r["n"] for r in qs.values("status").annotate(n=Count("id"))},
            "recent_activity": AppointmentSerializer(qs.order_by("-updated_at")[:5], many=True, context=ctx).data,
        })


class AdminDashboardView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        from apps.accounts.models import User
        from apps.centers.models import DiagnosticCenter
        from apps.payments.models import PaymentWebhookEvent

        return Response({
            "users_by_role": {r["role"]: r["n"] for r in User.objects.values("role").annotate(n=Count("id"))},
            "centers": DiagnosticCenter.objects.count(),
            "appointments_by_status": {r["status"]: r["n"] for r in Appointment.objects.values("status").annotate(n=Count("id"))},
            "payments_by_status": {r["status"]: r["n"] for r in Payment.objects.values("status").annotate(n=Count("id"))},
            "refunds_pending": Payment.objects.filter(refund_required=True).exclude(status=PaymentStatus.REFUNDED).count(),
            "webhook_events": PaymentWebhookEvent.objects.count(),
        })
