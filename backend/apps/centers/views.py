import django_filters
from django.db.models import Count, Exists, Min, OuterRef, Q
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.diagnostics.models import CenterDiagnosticService

from .models import DiagnosticCenter
from .serializers import CenterDetailSerializer, CenterSerializer


class CenterFilter(django_filters.FilterSet):
    city = django_filters.CharFilter(field_name="city", lookup_expr="iexact")
    category = django_filters.CharFilter(method="by_category")
    test = django_filters.NumberFilter(method="by_test")

    class Meta:
        model = DiagnosticCenter
        fields = ["city"]

    def _svc(self, **kw):
        return CenterDiagnosticService.objects.filter(center=OuterRef("pk"), is_active=True, test__is_active=True, **kw)

    def by_category(self, qs, name, value):
        return qs.filter(Exists(self._svc(test__category=value.upper())))

    def by_test(self, qs, name, value):
        return qs.filter(Exists(self._svc(test_id=value)))


class CenterViewSet(viewsets.ReadOnlyModelViewSet):
    """Public, read-only. Management happens through staff endpoints / Django admin."""
    permission_classes = [AllowAny]
    authentication_classes = []
    filterset_class = CenterFilter
    search_fields = ["name", "address", "city", "services__test__name"]
    ordering_fields = ["name", "starting_price"]

    def get_queryset(self):
        live = Q(services__is_active=True, services__test__is_active=True)
        return (DiagnosticCenter.objects.filter(is_active=True)
                .annotate(starting_price=Min("services__price", filter=live),
                          services_count=Count("services", filter=live, distinct=True))
                .distinct().order_by("name"))

    def get_serializer_class(self):
        return CenterDetailSerializer if self.action == "retrieve" else CenterSerializer
