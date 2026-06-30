# backend/accounts/serializers.py
from rest_framework import serializers
from .models import User
from hostels.models import StudentProfile, Hostel


class UserSerializer(serializers.ModelSerializer):
    """
    Read-only representation of users (used for MeView, lists, etc.).
    """
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role"]
        read_only_fields = ["id", "role"]


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer used when Super Admin creates/updates users via API.

    - Always uses set_password() so login works.
    - If role == STUDENT, it ensures a StudentProfile exists.
    - Optional: hostel_id to directly attach a student to a hostel.
    """
    password = serializers.CharField(write_only=True, required=True)
    hostel_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "password",
            "hostel_id",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        hostel_id = validated_data.pop("hostel_id", None)
        raw_password = validated_data.pop("password")

        # Create user and hash password properly
        user = User(**validated_data)
        user.set_password(raw_password)
        user.is_active = True
        user.save()

        # Auto-create StudentProfile when role is STUDENT
        if user.role == "STUDENT":
            hostel = None
            if hostel_id is not None:
                try:
                    hostel = Hostel.objects.get(id=hostel_id)
                except Hostel.DoesNotExist:
                    hostel = None

            profile_defaults = {}
            if hostel is not None:
                profile_defaults["hostel"] = hostel

            StudentProfile.objects.get_or_create(
                user=user,
                defaults=profile_defaults,
            )

        return user

    def update(self, instance, validated_data):
        hostel_id = validated_data.pop("hostel_id", None)
        raw_password = validated_data.pop("password", None)

        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Handle password change with hashing
        if raw_password:
            instance.set_password(raw_password)

        instance.save()

        # Keep StudentProfile in sync for students
        if instance.role == "STUDENT":
            profile, _ = StudentProfile.objects.get_or_create(user=instance)
            if hostel_id is not None:
                try:
                    hostel = Hostel.objects.get(id=hostel_id)
                    profile.hostel = hostel
                    profile.save()
                except Hostel.DoesNotExist:
                    pass

        return instance
