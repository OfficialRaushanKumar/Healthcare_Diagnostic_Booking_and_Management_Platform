from rest_framework import serializers

from .models import AvailabilitySlot, CenterDiagnosticService, DiagnosticTest


class TestSerializer(serializers.ModelSerializer):
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    centers_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DiagnosticTest
        fields = ["id", "name", "category", "description", "preparation", "turnaround_hours", "min_price", "centers_count"]


class TestDetailSerializer(TestSerializer):
    centers = serializers.SerializerMethodField()

    class Meta(TestSerializer.Meta):
        fields = TestSerializer.Meta.fields + ["centers"]

    def get_centers(self, obj):
        qs = obj.center_services.filter(is_active=True, center__is_active=True).select_related("center").order_by("price")
        return [{"service_id": s.id, "center_id": s.center_id, "center_name": s.center.name,
                 "city": s.center.city, "address": s.center.address, "price": s.price} for s in qs]


# ---- staff management ----
class StaffServiceSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source="test.name", read_only=True)
    center_name = serializers.CharField(source="center.name", read_only=True)

    class Meta:
        model = CenterDiagnosticService
        fields = ["id", "center", "center_name", "test", "test_name", "price", "is_active"]

    def validate(self, attrs):
        request = self.context["request"]
        center = attrs.get("center") or (self.instance.center if self.instance else None)
        if center and not request.user.center_assignments.filter(center=center).exists():
            raise serializers.ValidationError({"center": "You are not assigned to this center."})
        if self.instance and ("center" in attrs and attrs["center"] != self.instance.center or "test" in attrs and attrs["test"] != self.instance.test):
            raise serializers.ValidationError("Center and test cannot be changed; deactivate and create a new service.")
        return attrs

    def validate_price(self, v):
        if v < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return v


class StaffSlotSerializer(serializers.ModelSerializer):
    booked = serializers.SerializerMethodField()

    class Meta:
        model = AvailabilitySlot
        fields = ["id", "center", "date", "start_time", "end_time", "capacity", "is_active", "booked"]

    def get_booked(self, obj):
        from apps.appointments.services import active_count

        return active_count(obj)

    def validate(self, attrs):
        from apps.appointments.services import active_count

        request = self.context["request"]
        center = attrs.get("center") or (self.instance.center if self.instance else None)
        if not request.user.center_assignments.filter(center=center).exists():
            raise serializers.ValidationError({"center": "You are not assigned to this center."})
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        if self.instance:
            held = active_count(self.instance)
            if attrs.get("capacity", self.instance.capacity) < held:
                raise serializers.ValidationError({"capacity": f"Capacity cannot be below existing bookings ({held})."})
            if attrs.get("is_active") is False and held:
                raise serializers.ValidationError({"is_active": f"Cannot deactivate a slot with {held} active booking(s)."})
            if held and any(k in attrs for k in ("date", "start_time", "end_time", "center")):
                changed = [k for k in ("date", "start_time", "end_time", "center") if k in attrs and attrs[k] != getattr(self.instance, k)]
                if changed:
                    raise serializers.ValidationError("Cannot move a slot that already has bookings.")
        return attrs
