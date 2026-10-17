"""Uniform error envelope: {"error": {"code", "message", "details"}}."""
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "The request conflicts with the current state."
    default_code = "conflict"


class ServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Service temporarily unavailable."
    default_code = "service_unavailable"


def api_exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        from rest_framework.exceptions import ValidationError

        exc = ValidationError(exc.messages)
    response = exception_handler(exc, context)
    if response is None:
        return None
    data = response.data
    if isinstance(data, dict) and "detail" in data and len(data) == 1:
        message, details = str(data["detail"]), None
    else:
        message, details = "Request could not be processed.", data
    code = getattr(exc, "default_code", "error")
    response.data = {"error": {"code": code, "message": message, "details": details}}
    return response
