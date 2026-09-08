# backend/bi/serializers.py
from rest_framework import serializers
from .models import ReportTemplate, SavedReport, CustomReport, CustomReportResult

class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = ['id', 'name', 'report_type', 'description', 'config', 'is_active', 'created_at']

class SavedReportSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = SavedReport
        fields = ['id', 'template', 'template_name', 'name', 'filters', 'data', 'created_by', 'created_by_name', 'created_at', 'last_run']

class CustomReportSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = CustomReport
        fields = [
            'id', 'name', 'description', 
            'tables', 'fields', 'filters', 
            'group_by', 'sort_by', 'date_range',
            'distinct',  # added
            'is_scheduled', 'schedule_frequency', 'schedule_time', 'schedule_recipients',
            'is_shared', 'shared_with_roles',
            'created_by', 'created_by_name', 
            'created_at', 'updated_at', 'last_run'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'last_run']
        extra_kwargs = {
            'schedule_frequency': {'required': False, 'allow_null': True, 'allow_blank': True},
            'schedule_time': {'required': False, 'allow_null': True},
            'schedule_recipients': {'required': False},
            'distinct': {'required': False},
        }

class CustomReportResultSerializer(serializers.ModelSerializer):
    report_name = serializers.CharField(source='report.name', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.username', read_only=True)

    class Meta:
        model = CustomReportResult
        fields = ['id', 'report', 'report_name', 'data', 'generated_at', 'generated_by', 'generated_by_name']