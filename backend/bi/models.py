# backend/bi/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class ReportTemplate(models.Model):
    REPORT_TYPES = [
        ('REVENUE', 'Revenue Report'),
        ('FEE_COLLECTION', 'Fee Collection Report'),
        ('OCCUPANCY', 'Occupancy Report'),
        ('INVENTORY', 'Inventory Report'),
        ('PAYROLL', 'Payroll Summary'),
        ('MEAL_FEEDBACK', 'Meal Feedback Report'),
        ('SECURITY_DEPOSIT', 'Security Deposit Report'),
        ('HOSTEL_PERFORMANCE', 'Hostel Performance'),
        ('VENDOR_ANALYSIS', 'Vendor Analysis'),
        ('STOCK_LEVEL', 'Stock Level Report'),
    ]
    
    name = models.CharField(max_length=200)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    description = models.TextField(blank=True)
    config = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class SavedReport(models.Model):
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, related_name='saved_reports')
    name = models.CharField(max_length=200)
    filters = models.JSONField(default=dict)
    data = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    last_run = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

class CustomReport(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    tables = models.JSONField(default=list)
    fields = models.JSONField(default=list)
    filters = models.JSONField(default=list)
    group_by = models.JSONField(default=list)
    sort_by = models.JSONField(default=list)
    date_range = models.JSONField(default=dict)
    
    # Added distinct field for frontend
    distinct = models.BooleanField(default=False)
    
    is_scheduled = models.BooleanField(default=False)
    schedule_frequency = models.CharField(max_length=20, blank=True, null=True)
    schedule_time = models.TimeField(blank=True, null=True)
    schedule_recipients = models.JSONField(default=list, blank=True)
    
    is_shared = models.BooleanField(default=False)
    shared_with_roles = models.JSONField(default=list)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='custom_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_run = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

class CustomReportResult(models.Model):
    report = models.ForeignKey(CustomReport, on_delete=models.CASCADE, related_name='results')
    data = models.JSONField(default=dict)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.report.name} - {self.generated_at}"