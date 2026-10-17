from django.contrib import admin

from .models import Payment, PaymentWebhookEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["razorpay_order_id", "appointment", "amount", "status", "refund_required", "created_at"]
    list_filter = ["status", "refund_required"]
    search_fields = ["razorpay_order_id", "razorpay_payment_id", "appointment__reference"]


@admin.register(PaymentWebhookEvent)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ["event_id", "event_type", "processed", "processing_note", "created_at"]
    list_filter = ["event_type", "processed"]
    readonly_fields = ["event_id", "event_type", "payload"]
