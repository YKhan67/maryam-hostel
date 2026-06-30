# backend/accounts/serializers.py
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Read-only user serializer (for listing, MeView, etc.).
    """
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role"]
        read_only_fields = ["id", "role"]


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer used when creating/updating users via API.

    - Uses set_password(), so login works.
    - is_active is always True by default.
    - password is required for creation, optional for update.
    - StudentProfile auto-creation is handled by the hostels signals.
    """
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "hostel",
            "password",
        ]
        read_only_fields = ["id"]

    def validate_password(self, value):
        if self.instance is None and not value:
            raise serializers.ValidationError("Password is required for new users.")
        return value

    def create(self, validated_data):
        raw_password = validated_data.pop("password", None)
        user = User(**validated_data)
        if raw_password:
            user.set_password(raw_password)
        user.is_active = True
        user.save()
        return user

    def update(self, instance, validated_data):
        raw_password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if raw_password:
            instance.set_password(raw_password)  # ✅ hashed

        instance.save()
        return instance
