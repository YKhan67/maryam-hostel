from rest_framework import serializers
from .models import Ticket, SLASetting

class TicketSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'student', 'student_name', 'hostel', 'hostel_name',
            'asset', 'asset_name',
            'category', 'subject', 'description', 'status', 
            'assigned_to', 'assigned_to_name', 'created_at', 
            'updated_at', 'resolved_at', 'is_escalated'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_escalated']

class SLASettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLASetting
        fields = '__all__'
