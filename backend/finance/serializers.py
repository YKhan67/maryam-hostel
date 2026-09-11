from rest_framework import serializers
from .models import (
    AssetCategory, Asset, PartnerCapital, Liability, PropertyRentalContract,
    PropertyRentAccrual, InvestorPropertyAccess, InvestorPropertyOwnership,
    PropertySharedCost, PropertyRentPayment,
)

class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)

    class Meta:
        model = Asset
        fields = '__all__'

class PartnerCapitalSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source='partner.get_full_name', read_only=True)
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)

    class Meta:
        model = PartnerCapital
        fields = '__all__'

class LiabilitySerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)

    class Meta:
        model = Liability
        fields = '__all__'

class PropertyRentalContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyRentalContract
        fields = '__all__'

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "Contract end date must be on or after the start date."})
        return attrs

class PropertyRentAccrualSerializer(serializers.ModelSerializer):
    outstanding_amount = serializers.DecimalField(read_only=True, max_digits=15, decimal_places=2)

    class Meta:
        model = PropertyRentAccrual
        fields = '__all__'

    def validate(self, attrs):
        property_obj = attrs.get("property", getattr(self.instance, "property", None))
        contract = attrs.get("contract", getattr(self.instance, "contract", None))
        if property_obj and contract and contract.property_id != property_obj.id:
            raise serializers.ValidationError({"contract": "Contract must belong to the selected property."})
        return attrs


class PropertyRentPaymentSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source="accrual.property.name", read_only=True)
    month = serializers.DateField(source="accrual.month", read_only=True)
    outstanding_after = serializers.SerializerMethodField()

    class Meta:
        model = PropertyRentPayment
        fields = "__all__"
        read_only_fields = ["created_by", "created_at", "property_name", "month", "outstanding_after"]

    def get_outstanding_after(self, obj):
        return obj.accrual.amount - obj.accrual.paid_amount

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

class InvestorPropertyAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorPropertyAccess
        fields = '__all__'

    def validate_investor(self, investor):
        if investor.role != "PARTNER":
            raise serializers.ValidationError("Investor must have the PARTNER role.")
        return investor

class InvestorPropertyOwnershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorPropertyOwnership
        fields = '__all__'

    def validate(self, attrs):
        investor = attrs.get("investor", getattr(self.instance, "investor", None))
        percentage = attrs.get("ownership_percentage", getattr(self.instance, "ownership_percentage", None))
        if investor and investor.role != "PARTNER":
            raise serializers.ValidationError({"investor": "Investor must have the PARTNER role."})
        if percentage is not None and not 0 <= percentage <= 100:
            raise serializers.ValidationError({"ownership_percentage": "Ownership must be between 0 and 100."})
        return attrs

class PropertySharedCostSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertySharedCost
        fields = "__all__"

    def validate(self, attrs):
        hostel = attrs.get("hostel", getattr(self.instance, "hostel", None))
        property_obj = attrs.get("property", getattr(self.instance, "property", None))
        if property_obj and hostel and property_obj.hostel_id != hostel.id:
            raise serializers.ValidationError({"property": "Property must belong to the selected hostel."})
        return attrs
