# backend/hostels/serializers.py
from rest_framework import serializers
from .models import City, Hostel, Building, Floor, Room, Bed, StudentProfile
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

class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=StudentProfile._meta.get_field("user").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = StudentProfile
        fields = [
            "id", "user", "user_id", "hostel", "bed",
            "mobile", "whatsapp", "guardian_name", "guardian_phone",
            "college_name", "course", "year",
            "is_active", "joined_on", "left_on",
        ]
