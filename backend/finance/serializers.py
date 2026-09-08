from rest_framework import serializers
from .models import (
    AssetCategory, Asset, PartnerCapital, Liability, PropertyRentalContract,
    PropertyRentAccrual, InvestorPropertyAccess, InvestorPropertyOwnership,
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

class PropertyRentAccrualSerializer(serializers.ModelSerializer):
    outstanding_amount = serializers.DecimalField(read_only=True, max_digits=15, decimal_places=2)

    class Meta:
        model = PropertyRentAccrual
        fields = '__all__'

class InvestorPropertyAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorPropertyAccess
        fields = '__all__'

class InvestorPropertyOwnershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorPropertyOwnership
        fields = '__all__'
