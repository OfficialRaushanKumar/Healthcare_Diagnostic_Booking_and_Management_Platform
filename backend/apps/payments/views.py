import hashlib
import json
import logging

from django.conf import settings
from django.db import IntegrityError, transaction
from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsPatient

from . import gateway, services
from .models import Payment, PaymentStatus, PaymentWebhookEvent

log = logging.getLogger(__name__)


class CreateOrderSerializer(serializers.Serializer):
    appointment_id = serializers.IntegerField()


class VerifySerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()


class PaymentSerializer(serializers.ModelSerializer):
    appointment_reference = serializers.CharField(source="appointment.reference", read_only=True)
    appointment_status = serializers.CharField(source="appointment.status", read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "appointment_id", "appointment_reference", "appointment_status", "razorpay_order_id",
                  "razorpay_payment_id", "amount", "currency", "status", "failure_reason", "paid_at", "created_at"]


class CreateOrderView(APIView):
    permission_classes = [IsPatient]
    throttle_scope = "payments"

    @extend_schema(request=CreateOrderSerializer, responses={201: dict})
    def post(self, request):
        s = CreateOrderSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        p = services.create_or_reuse_order(request.user, s.validated_data["appointment_id"])
        return Response({
            "payment_id": p.id, "key_id": settings.RAZORPAY_KEY_ID,  # public key id only
            "razorpay_order_id": p.razorpay_order_id, "amount": services.to_paise(p.amount),
            "currency": p.currency, "appointment_reference": p.appointment.reference,
        }, status=status.HTTP_201_CREATED)


class VerifyView(APIView):
    """Client-reported checkout result is verified here; the signature, not the client, decides."""
    permission_classes = [IsPatient]
    throttle_scope = "payments"

    @extend_schema(request=VerifySerializer, responses={200: dict})
    def post(self, request):
        s = VerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        if not Payment.objects.filter(razorpay_order_id=d["razorpay_order_id"], appointment__patient=request.user).exists():
            return Response({"error": {"code": "not_found", "message": "Payment order not found.", "details": None}}, status=404)
        if not gateway.verify_checkout_signature(d["razorpay_order_id"], d["razorpay_payment_id"], d["razorpay_signature"]):
            return Response({"error": {"code": "invalid_signature", "message": "Payment signature verification failed.", "details": None}}, status=400)
        payment, _ = services.mark_paid(d["razorpay_order_id"], d["razorpay_payment_id"])
        return Response({"payment_status": payment.status, "appointment_status": payment.appointment.status,
                         "appointment_id": payment.appointment_id, "refund_required": payment.refund_required})


class PaymentListView(generics.ListAPIView):
    permission_classes = [IsPatient]
    serializer_class = PaymentSerializer
    filterset_fields = ["status"]

    def get_queryset(self):
        return Payment.objects.filter(appointment__patient=self.request.user).select_related("appointment")


class WebhookView(APIView):
    """Razorpay webhook: signature-verified, de-duplicated by event id, idempotent."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    @extend_schema(request=None, responses={200: dict})
    def post(self, request):
        body = request.body  # raw bytes: signature is computed over exact payload
        signature = request.headers.get("X-Razorpay-Signature", "")
        if not gateway.verify_webhook_signature(body, signature):
            return Response({"error": {"code": "invalid_signature", "message": "Invalid signature.", "details": None}}, status=400)
        try:
            payload = json.loads(body)
        except ValueError:
            return Response({"error": {"code": "invalid", "message": "Malformed JSON.", "details": None}}, status=400)
        event_id = request.headers.get("X-Razorpay-Event-Id") or hashlib.sha256(body).hexdigest()
        event_type = payload.get("event", "")

        try:
            with transaction.atomic():
                event = PaymentWebhookEvent.objects.create(event_id=event_id, event_type=event_type, payload=payload)
        except IntegrityError:
            return Response({"status": "duplicate"})  # already received; 200 so Razorpay stops retrying

        note = ""
        try:
            ent = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id, pay_id = ent.get("order_id"), ent.get("id", "")
            if event_type in ("payment.captured", "order.paid") and order_id:
                if not Payment.objects.filter(razorpay_order_id=order_id).exists():
                    note = "unknown order"
                else:
                    _, changed = services.mark_paid(order_id, pay_id, ent.get("amount"))
                    note = "paid" if changed else "already paid"
            elif event_type == "payment.failed" and order_id and Payment.objects.filter(razorpay_order_id=order_id).exists():
                services.mark_failed(order_id, ent.get("error_description") or "Payment failed")
                note = "failed recorded"
            else:
                note = "ignored"
            event.processed = True
        except Exception as exc:  # keep the event stored for inspection; ask gateway to retry
            log.exception("webhook processing error")
            event.processing_note = f"error: {exc}"[:255]
            event.save(update_fields=["processing_note", "updated_at"])
            return Response({"status": "error"}, status=500)
        event.processing_note = note
        event.save(update_fields=["processed", "processing_note", "updated_at"])
        return Response({"status": "ok", "result": note})
