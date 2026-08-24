# backend/backend/admin.py

from django.contrib import admin
from django_celery_results.models import TaskResult, GroupResult

# Unregister default admin if registered
try:
    admin.site.unregister(TaskResult)
except:
    pass

try:
    admin.site.unregister(GroupResult)
except:
    pass

@admin.register(TaskResult)
class TaskResultAdmin(admin.ModelAdmin):
    list_display = ['task_name', 'task_id', 'status', 'date_done', 'date_created']
    list_filter = ['status', 'date_done']
    search_fields = ['task_name', 'task_id', 'result']
    readonly_fields = ['task_id', 'status', 'result', 'traceback', 'date_done', 'date_created', 'worker']
    fieldsets = (
        ('Task Info', {
            'fields': ('task_id', 'task_name', 'status', 'worker')
        }),
        ('Result', {
            'fields': ('result', 'traceback')
        }),
        ('Timestamps', {
            'fields': ('date_created', 'date_done')
        }),
    )

@admin.register(GroupResult)
class GroupResultAdmin(admin.ModelAdmin):
    list_display = ['group_id', 'date_created']
    search_fields = ['group_id']