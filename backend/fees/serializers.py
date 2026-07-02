from rest_framework import serializers
from .models import FeeHead, FeeRule, MonthlyFee, PaymentProof


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
