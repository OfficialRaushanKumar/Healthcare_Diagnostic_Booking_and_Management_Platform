"""Thin Razorpay wrapper. Secrets stay server-side; signature checks are done with HMAC-SHA256."""
import hashlib
import hmac

from django.conf import settings

from apps.common.exceptions import ServiceUnavailable

NOT_CONFIGURED = (
    "Payment gateway is not configured. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and "
    "RAZORPAY_WEBHOOK_SECRET (Razorpay TEST mode) in backend/.env and restart the backend."
)


def is_configured():
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def _client():
    if not is_configured():
        raise ServiceUnavailable(NOT_CONFIGURED)
    import razorpay

    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(amount_paise: int, receipt: str) -> dict:
    return _client().order.create({"amount": amount_paise, "currency": "INR", "receipt": receipt, "payment_capture": 1})


def _hmac(secret: str, msg: bytes) -> str:
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()


def verify_checkout_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not settings.RAZORPAY_KEY_SECRET:
        raise ServiceUnavailable(NOT_CONFIGURED)
    expected = _hmac(settings.RAZORPAY_KEY_SECRET, f"{order_id}|{payment_id}".encode())
    return hmac.compare_digest(expected, signature or "")


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise ServiceUnavailable(NOT_CONFIGURED)
    return hmac.compare_digest(_hmac(settings.RAZORPAY_WEBHOOK_SECRET, body), signature or "")
