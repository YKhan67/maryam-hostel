from django.contrib import admin
from .models import SLASetting, Ticket

@admin.register(SLASetting)
class SLASettingAdmin(admin.ModelAdmin):
    list_display = ('category', 'response_time_hours')

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('subject', 'student', 'category', 'status', 'assigned_to', 'created_at', 'is_escalated')
    list_filter = ('status', 'category', 'is_escalated', 'hostel')
    search_fields = ('subject', 'description', 'student__user__username')
    readonly_fields = ('created_at', 'updated_at')
    
    def save_model(self, request, obj, form, change):
        if not obj.hostel and hasattr(obj.student, 'hostel'):
            obj.hostel = obj.student.hostel
        super().save_model(request, obj, form, change)
