# backend/bi/admin.py
from django.contrib import admin
from .models import ReportTemplate, SavedReport

@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'report_type', 'is_active', 'created_at']
    list_filter = ['report_type', 'is_active']
    search_fields = ['name', 'description']


@admin.register(SavedReport)
class SavedReportAdmin(admin.ModelAdmin):
    list_display = ['name', 'template', 'created_by', 'created_at', 'last_run']
    list_filter = ['created_at']
    search_fields = ['name', 'created_by__username']