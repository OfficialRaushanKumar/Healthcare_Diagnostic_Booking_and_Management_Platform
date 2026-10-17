from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter

from .models import DiagnosticCenter
from .views import CenterViewSet

router = DefaultRouter()
router.register("centers", CenterViewSet, basename="center")


@api_view(["GET"])
@permission_classes([AllowAny])
def cities(_request):
    return Response(sorted(DiagnosticCenter.objects.filter(is_active=True).values_list("city", flat=True).distinct()))


urlpatterns = [path("cities/", cities)] + router.urls


from apps.common.permissions import IsCenterStaff  # noqa: E402


@api_view(["GET"])
@permission_classes([IsCenterStaff])
def staff_centers(request):
    qs = DiagnosticCenter.objects.filter(staff_assignments__user=request.user).order_by("name")
    return Response([{"id": c.id, "name": c.name, "city": c.city} for c in qs])


urlpatterns += [path("staff/centers/", staff_centers)]
