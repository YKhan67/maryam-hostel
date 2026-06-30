# backend/inventory/serializers.py
from rest_framework import serializers
from .models import Category, Unit, Item, Vendor, Purchase

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = "__all__"

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = "__all__"

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"

class PurchaseSerializer(serializers.ModelSerializer):
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Purchase
        fields = [
            "id", "hostel", "date", "vendor", "invoice_no",
            "item", "quantity", "price_per_unit", "total_cost", "created_at",
        ]
        read_only_fields = ["id", "total_cost", "created_at"]
