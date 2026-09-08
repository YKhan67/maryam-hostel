# backend/inventory/serializers.py
from rest_framework import serializers
from .models import Category, Unit, Item, Vendor, Purchase, Consumption

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = "__all__"

class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    unit_name = serializers.CharField(source="unit.name", read_only=True)

    class Meta:
        model = Item
        fields = ["id", "code", "name", "category", "category_name", "unit", "unit_name", "reorder_level", "is_active"]

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"

class PurchaseSerializer(serializers.ModelSerializer):
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    item_name = serializers.CharField(source="item.name", read_only=True)
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)

    class Meta:
        model = Purchase
        fields = [
            "id", "hostel", "hostel_name", "property", "date", "vendor", "vendor_name", 
            "invoice_no", "invoice_photo", "items_photo", "item", "item_name", 
            "quantity", "price_per_unit", "total_cost", "status", 
            "approved_by", "rejection_remarks", "created_at",
        ]
        read_only_fields = ["id", "total_cost", "status", "approved_by", "created_at"]

    def validate(self, attrs):
        hostel = attrs.get("hostel", getattr(self.instance, "hostel", None))
        property_obj = attrs.get("property", getattr(self.instance, "property", None))
        if property_obj and hostel and property_obj.hostel_id != hostel.id:
            raise serializers.ValidationError({"property": "Property must belong to the selected hostel."})
        return attrs

class ConsumptionSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)

    class Meta:
        model = Consumption
        fields = ["id", "hostel", "hostel_name", "property", "date", "item", "item_name", "quantity", "photo", "remarks", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        hostel = attrs.get("hostel", getattr(self.instance, "hostel", None))
        property_obj = attrs.get("property", getattr(self.instance, "property", None))
        if property_obj and hostel and property_obj.hostel_id != hostel.id:
            raise serializers.ValidationError({"property": "Property must belong to the selected hostel."})
        return attrs
