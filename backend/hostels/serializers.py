# backend/hostels/serializers.py
from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import (
    City, Hostel, Property, Building, Floor, Room, Bed,
    BedAllocation, StudentProfile, StudentUtilityCharge,
)
from accounts.serializers import UserSerializer

class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = "__all__"

class HostelSerializer(serializers.ModelSerializer):
    city = CitySerializer(read_only=True)
    city_id = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(), source="city", write_only=True
    )

    class Meta:
        model = Hostel
        fields = ["id", "name", "code", "city", "city_id", "address", "phone", "is_active"]

class PropertySerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)

    class Meta:
        model = Property
        fields = "__all__"

class BuildingSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    property_name = serializers.CharField(source="property.name", read_only=True)

    class Meta:
        model = Building
        fields = ["id", "hostel", "hostel_name", "property", "property_name", "name", "is_active"]

    def validate(self, attrs):
        hostel = attrs.get("hostel", getattr(self.instance, "hostel", None))
        property_obj = attrs.get("property", getattr(self.instance, "property", None))
        if property_obj and hostel and property_obj.hostel_id != hostel.id:
            raise serializers.ValidationError({"property": "Property must belong to the selected hostel."})
        return attrs

class FloorSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source="building.name", read_only=True)
    property_name = serializers.CharField(source="building.property.name", read_only=True)

    class Meta:
        model = Floor
        fields = ["id", "building", "building_name", "property_name", "number", "is_active"]

    def validate(self, attrs):
        building = attrs.get("building", getattr(self.instance, "building", None))
        if building and not building.hostel_id:
            raise serializers.ValidationError({"building": "Building must belong to a hostel."})
        return attrs

class RoomSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source="floor.building.name", read_only=True)
    property_name = serializers.CharField(source="floor.building.property.name", read_only=True)

    class Meta:
        model = Room
        fields = ["id", "floor", "building_name", "property_name", "number", "room_type", "is_ac", "base_rent", "is_active"]

    def validate(self, attrs):
        floor = attrs.get("floor", getattr(self.instance, "floor", None))
        if floor and not floor.building_id:
            raise serializers.ValidationError({"floor": "Floor must belong to a building."})
        return attrs

class BedSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.number", read_only=True)
    floor_number = serializers.IntegerField(source="room.floor.number", read_only=True)
    building_name = serializers.CharField(source="room.floor.building.name", read_only=True)
    property_name = serializers.CharField(source="room.floor.building.property.name", read_only=True)
    student_id = serializers.IntegerField(source="student.id", read_only=True, allow_null=True)

    class Meta:
        model = Bed
        fields = [
            "id", "room", "room_number", "floor_number", "building_name", "property_name",
            "label", "is_occupied", "is_active", "student_id",
        ]

    def validate_room(self, value):
        return value
        read_only_fields = ["is_occupied"]

class BedAllocationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_username = serializers.CharField(source="student.user.username", read_only=True)
    bed_label = serializers.CharField(source="bed.label", read_only=True)
    room_number = serializers.CharField(source="bed.room.number", read_only=True)
    property_name = serializers.CharField(source="bed.room.floor.building.property.name", read_only=True)

    class Meta:
        model = BedAllocation
        fields = [
            "id", "student", "student_name", "student_username", "bed", "bed_label",
            "room_number", "property_name", "previous_bed", "move_in_date", "move_out_date",
            "reason", "notes", "is_active", "created_by", "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]

class BedAllocationActionSerializer(serializers.Serializer):
    bed_id = serializers.PrimaryKeyRelatedField(queryset=Bed.objects.all(), source="bed")
    move_in_date = serializers.DateField(required=False)
    move_out_date = serializers.DateField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

class BedReleaseActionSerializer(serializers.Serializer):
    move_out_date = serializers.DateField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

class BulkBedSerializer(serializers.Serializer):
    count = serializers.IntegerField(min_value=1, max_value=100)
    start_label = serializers.CharField(required=False, default="A", max_length=10)

class StudentUtilityChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentUtilityCharge
        fields = ["id", "name", "amount", "is_active", "created_at", "updated_at"]


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=StudentProfile._meta.get_field("user").remote_field.model.objects.all(),
        write_only=True,
    )
    utilities = StudentUtilityChargeSerializer(many=True, required=False)
    security_deposit = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            "id", "user", "user_id", "hostel", "bed",
            "mobile", "whatsapp", "guardian_name", "guardian_phone", "guardian_nic_number",
            "parent_name", "parent_phone", "parent_whatsapp", "parent_nic_number",
            "college_name", "nic_number", "nic_front_picture", "nic_back_picture", "profile_picture",
            "course", "year",
            "is_active", "joined_on", "left_on",
            "utilities", "monthly_rent", "security_deposit",
        ]
        read_only_fields = ["bed"]

    def get_security_deposit(self, obj):
        """Get security deposit amount if exists, or 0 if not set."""
        if hasattr(obj, 'security_deposit'):
            return float(obj.security_deposit.amount) if obj.security_deposit.amount else 0.0
        return 0.0

    def validate(self, attrs):
        hostel = attrs.get("hostel", getattr(self.instance, "hostel", None))
        if not hostel:
            raise ValidationError({"hostel": "Hostel is required."})

        required_fields = [
            "mobile", "whatsapp", "guardian_name", "guardian_phone",
            "parent_phone", "parent_whatsapp", "college_name",
            "joined_on", "nic_number",
        ]

        for field_name in required_fields:
            value = attrs.get(field_name, getattr(self.instance, field_name, None))
            if value is None or (isinstance(value, str) and not value.strip()):
                raise ValidationError({field_name: f"{field_name.replace('_', ' ').title()} is required."})

        joined_on = attrs.get("joined_on", getattr(self.instance, "joined_on", None))
        left_on = attrs.get("left_on", getattr(self.instance, "left_on", None))
        if joined_on and left_on and left_on < joined_on:
            raise ValidationError({"left_on": "Left on must be on or after joined on."})

        return attrs

    def _sync_student_utilities(self, student, utilities_data):
        if utilities_data is None:
            return
        existing = {u.id: u for u in student.utilities.all()}
        incoming_ids = []
        for utility_data in utilities_data:
            if not isinstance(utility_data, dict):
                continue
            payload = {k: v for k, v in utility_data.items() if k != "id"}
            if not payload and not utility_data.get("id"):
                continue
            utility_id = utility_data.get("id")
            if utility_id and utility_id in existing:
                utility = existing[utility_id]
                for field, value in payload.items():
                    setattr(utility, field, value)
                utility.save()
                incoming_ids.append(utility_id)
            else:
                utility = StudentUtilityCharge.objects.create(student=student, **payload)
                incoming_ids.append(utility.id)
        for utility in student.utilities.exclude(id__in=incoming_ids):
            utility.is_active = False
            utility.save()

    def create(self, validated_data):
        utilities_data = validated_data.pop("utilities", [])
        student = super().create(validated_data)
        self._sync_student_utilities(student, utilities_data)
        return student

    def update(self, instance, validated_data):
        utilities_data = validated_data.pop("utilities", None)
        student = super().update(instance, validated_data)
        if utilities_data is not None:
            self._sync_student_utilities(student, utilities_data)
        return student
