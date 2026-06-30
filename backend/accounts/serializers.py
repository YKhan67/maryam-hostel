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

    - Always uses set_password(), so login works.
    - is_active is always True by default.
    - StudentProfile auto-creation is handled by the hostels signals you already added.
    """
    password = serializers.CharField(write_only=True, required=True)

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
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        raw_password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(raw_password)   # ✅ hashed
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
