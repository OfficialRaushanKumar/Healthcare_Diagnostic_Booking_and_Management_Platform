from django.urls import path

from . import views

urlpatterns = [
    path("payments/create-order/", views.CreateOrderView.as_view()),
    path("payments/verify/", views.VerifyView.as_view()),
    path("payments/webhook/", views.WebhookView.as_view()),
    path("payments/", views.PaymentListView.as_view()),
]
