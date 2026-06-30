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
    class Meta:
        model = PaymentProof
        fields = "__all__"
        read_only_fields = ["uploaded_on", "uploaded_by"]
