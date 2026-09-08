# backend/bi/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReportViewSet, 
    ReportTemplateViewSet, 
    SavedReportViewSet,
    CustomReportViewSet
)

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='bi-reports')
router.register(r'templates', ReportTemplateViewSet, basename='bi-templates')
router.register(r'saved', SavedReportViewSet, basename='bi-saved')
router.register(r'custom-reports', CustomReportViewSet, basename='bi-custom-reports')

urlpatterns = [
    path('', include(router.urls)),
]