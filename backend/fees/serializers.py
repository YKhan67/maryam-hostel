# backend/fees/serializers.py

from rest_framework import serializers
from .models import FeeHead, FeeRule, MonthlyFee, PaymentProof, SecurityDeposit
from hostels.models import StudentProfile


class FeeHeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeHead
        fields = "__all__"


class FeeRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeRule
        fields = "__all__"


class MonthlyFeeSerializer(serializers.ModelSerializer):
    fee_head_name = serializers.CharField(source="fee_head.name", read_only=True)

    class Meta:
        model = MonthlyFee
        fields = "__all__"
        read_only_fields = ["is_paid", "late_fee_applied", "created_at"]


class PaymentProofSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="fee.student.user.get_full_name", read_only=True)
    fee_month = serializers.DateField(source="fee.month", read_only=True)
    fee_amount = serializers.DecimalField(source="fee.amount", max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = PaymentProof
        fields = [
            "id", "fee", "student_name", "fee_month", "fee_amount", 
            "uploaded_by", "uploaded_on", "file", "status", "remarks"
        ]
        read_only_fields = ["uploaded_on", "uploaded_by"]


class SecurityDepositSerializer(serializers.ModelSerializer):
    """
    Serializer for Security Deposit with student name.
    """
    # Read-only field for student name
    student_name = serializers.SerializerMethodField()
    # Write-only field for student ID
    student_id = serializers.PrimaryKeyRelatedField(
        source="student",
        queryset=StudentProfile.objects.all(),
        write_only=True,
        required=True
    )

    class Meta:
        model = SecurityDeposit
        fields = [
            "id", 
            "student",      # This is the student ID (read-only)
            "student_id",   # This is the student ID (write-only)
            "student_name", # This is the student name (read-only)
            "amount", 
            "date_paid", 
            "status", 
            "refund_date", 
            "remarks"
        ]
        read_only_fields = ["id", "student"]

    def get_student_name(self, obj):
        """Return the full name of the student"""
        if obj.student and obj.student.user:
            # Try to get full name
            full_name = obj.student.user.get_full_name()
            if full_name:
                return full_name
            # Fallback to username
            return obj.student.user.username
        return "Unknown Student"

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate(self, data):
        # If status is REFUNDED, refund_date should be set
        if data.get('status') == 'REFUNDED' and not data.get('refund_date'):
            raise serializers.ValidationError({
                "refund_date": "Refund date is required when status is REFUNDED."
            })
        return data