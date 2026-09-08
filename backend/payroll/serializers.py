from rest_framework import serializers
from django.db.models import Sum
from .models import EmployeeProfile, SalaryAdvance, PayrollRecord, SalarySlip

class EmployeeProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    hostel_name = serializers.CharField(source="user.hostel.name", read_only=True)

    class Meta:
        model = EmployeeProfile
        fields = [
            "id", "user", "username", "full_name", "designation", "pay_type",
            "nic_number", "nic_front_picture", "nic_back_picture", "profile_picture",
            "base_salary", "housing_allowance", "fuel_allowance", "other_allowance",
            "rate_per_task", "bank_name", "iban", "joined_on", "hostel_name", "is_active"
            , "property"
        ]

    def validate(self, attrs):
        nic_number = attrs.get("nic_number", getattr(self.instance, "nic_number", None))
        if nic_number is None or not str(nic_number).strip():
            raise serializers.ValidationError({"nic_number": "NIC number is required."})
        property_obj = attrs.get("property", getattr(self.instance, "property", None))
        user = attrs.get("user", getattr(self.instance, "user", None))
        if property_obj and user and user.hostel_id != property_obj.hostel_id:
            raise serializers.ValidationError({"property": "Property must belong to the employee's hostel."})
        return attrs

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
