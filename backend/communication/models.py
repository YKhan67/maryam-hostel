from django.db import models
from django.conf import settings
from hostels.models import Hostel, StudentProfile

User = settings.AUTH_USER_MODEL

class SLASetting(models.Model):
    """
    Configuration for response times per category.
    """
    CATEGORY_CHOICES = [
        ('MAINTENANCE', 'Maintenance'),
        ('FEES', 'Fee Approvals'),
        ('MANAGEMENT', 'Management Queries'),
        ('EMERGENCY', 'Emergency'),
    ]
    
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, unique=True)
    response_time_hours = models.PositiveIntegerField(default=3, help_text="Hours until escalation")
    
    def __str__(self):
        return f"{self.get_category_display()} - {self.response_time_hours}h"

class Ticket(models.Model):
    """
    Represents a student request or issue.
    """
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
    ]

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="tickets")
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="tickets")
    category = models.CharField(max_length=20, choices=SLASetting.CATEGORY_CHOICES)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tickets")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    is_escalated = models.BooleanField(default=False)
    last_reminded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"[{self.category}] {self.subject} - {self.student.user.username}"

    class Meta:
        ordering = ['-created_at']
