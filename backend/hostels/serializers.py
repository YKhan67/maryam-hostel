# backend/hostels/serializers.py
from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import City, Hostel, Building, Floor, Room, Bed, StudentProfile, StudentUtilityCharge
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

class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = "__all__"

class FloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        fields = "__all__"

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__"

class BedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bed
        fields = "__all__"

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
