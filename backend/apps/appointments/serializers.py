from rest_framework import serializers

from apps.centers.models import DiagnosticCenter
from apps.diagnostics.models import AvailabilitySlot

from .models import Appointment, Status


class MiniCenter(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticCenter
        fields = ["id", "name", "city", "address", "phone"]


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ["id", "date", "start_time", "end_time"]


class AppointmentSerializer(serializers.ModelSerializer):
    center = MiniCenter(read_only=True)
    slot = SlotSerializer(read_only=True)
    test = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    patient = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = ["id", "reference", "status", "status_reason", "amount", "expires_at", "created_at",
                  "center", "slot", "test", "service_id", "payment_status", "can_cancel", "patient"]

    def get_test(self, obj):
        t = obj.service.test
        return {"id": t.id, "name": t.name, "category": t.category, "preparation": t.preparation,
                "turnaround_hours": t.turnaround_hours}

    def get_payment_status(self, obj):
        p = max(obj.payments.all(), key=lambda x: x.created_at, default=None)
        return p.status if p else "NONE"

    def get_can_cancel(self, obj):
        from .services import slot_start
        from django.conf import settings
        from django.utils import timezone
        from datetime import timedelta

        if obj.status == Status.PENDING_PAYMENT:
            return True
        if obj.status == Status.CONFIRMED:
            return slot_start(obj.slot) - timezone.now() >= timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)
        return False

    def get_patient(self, obj):
        # Patient contact details are only exposed to staff views.
        if self.context.get("include_patient"):
            u = obj.patient
            return {"id": u.id, "full_name": u.full_name, "email": u.email, "phone": u.phone}
        return None


class CreateAppointmentSerializer(serializers.Serializer):
    service_id = serializers.IntegerField()
    slot_id = serializers.IntegerField()


class StaffStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[Status.COMPLETED, Status.CANCELLED, Status.REJECTED])
