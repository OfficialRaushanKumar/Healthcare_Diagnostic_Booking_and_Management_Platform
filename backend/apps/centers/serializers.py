from rest_framework import serializers

from apps.diagnostics.models import CenterDiagnosticService

from .models import DiagnosticCenter


class ServiceInCenterSerializer(serializers.ModelSerializer):
    test_id = serializers.IntegerField(source="test.id")
    name = serializers.CharField(source="test.name")
    category = serializers.CharField(source="test.category")
    description = serializers.CharField(source="test.description")
    preparation = serializers.CharField(source="test.preparation")
    turnaround_hours = serializers.IntegerField(source="test.turnaround_hours")

    class Meta:
        model = CenterDiagnosticService
        fields = ["id", "test_id", "name", "category", "description", "preparation", "turnaround_hours", "price"]


class CenterSerializer(serializers.ModelSerializer):
    starting_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    services_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DiagnosticCenter
        fields = ["id", "name", "city", "address", "phone", "email", "opening_time", "closing_time",
                  "description", "is_demo", "starting_price", "services_count"]


class CenterDetailSerializer(CenterSerializer):
    services = serializers.SerializerMethodField()

    class Meta(CenterSerializer.Meta):
        fields = CenterSerializer.Meta.fields + ["services"]

    def get_services(self, obj):
        qs = obj.services.filter(is_active=True, test__is_active=True).select_related("test").order_by("test__name")
        return ServiceInCenterSerializer(qs, many=True).data
