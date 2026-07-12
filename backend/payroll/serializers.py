from rest_framework import serializers
from django.db.models import Sum
from .models import EmployeeProfile, SalaryAdvance, PayrollRecord, SalarySlip

class EmployeeProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    hostel_name = serializers.CharField(source="user.hostel.name", read_only=True)

    class Meta:
        model = EmployeeProfile
        fields = "__all__"

class SalaryAdvanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)

    class Meta:
        model = SalaryAdvance
        fields = "__all__"

class SalarySlipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    designation = serializers.CharField(source="employee.designation", read_only=True)

    class Meta:
        model = SalarySlip
        fields = "__all__"

class PayrollRecordSerializer(serializers.ModelSerializer):
    slips = SalarySlipSerializer(many=True, read_only=True)
    calculated_total = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRecord
        fields = [
            'id', 'month', 'status', 'total_net_payout', 
            'calculated_total', 'created_at', 'slips'
        ]

    def get_calculated_total(self, obj):
        # Dynamically calculate sum to ensure it's NEVER 0 if slips exist
        total = obj.slips.aggregate(s=Sum('net_salary'))['s'] or 0
        return float(total)
