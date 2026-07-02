from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WhatsAppWebhookView, TicketViewSet, SLASettingViewSet

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'sla-settings', SLASettingViewSet, basename='slasetting')

urlpatterns = [
    path('webhook/', WhatsAppWebhookView.as_view(), name='whatsapp-webhook'),
    path('', include(router.urls)),
]
