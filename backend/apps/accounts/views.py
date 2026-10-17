from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import EmailTokenSerializer, ProfileSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "auth"


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenSerializer
    throttle_scope = "auth"


class RefreshView(TokenRefreshView):
    throttle_scope = "auth"


class LogoutView(APIView):
    """Blacklists the supplied refresh token (server-side revocation).
    Needs no access token, so logout still works after the access token has expired."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "auth"

    @extend_schema(request={"application/json": {"type": "object", "properties": {"refresh": {"type": "string"}}}},
                   responses={204: None})
    def post(self, request):
        try:
            RefreshToken(request.data.get("refresh", "")).blacklist()
        except TokenError:
            pass  # already invalid: logout is idempotent
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer

    def get_object(self):
        return self.request.user
