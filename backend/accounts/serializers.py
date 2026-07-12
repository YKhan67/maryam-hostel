# backend/accounts/serializers.py
import random
from rest_framework import serializers
from .models import User, ModulePermission
from hostels.models import StudentProfile

class ModulePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModulePermission
        fields = '__all__'

class StudentProfileShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = [
            "mobile", "whatsapp", "guardian_name", "guardian_phone",
            "parent_phone", "parent_whatsapp", "college_name", 
            "course", "year", "joined_on", "left_on", "is_active",
            "parent_link_token"
        ]
        read_only_fields = ["parent_link_token"]

class UserSerializer(serializers.ModelSerializer):
    profile = StudentProfileShortSerializer(source="student_profile", read_only=True)
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    parent_link_token = serializers.CharField(source="student_profile.parent_link_token", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email", 
            "role", "hostel", "hostel_name", "is_active", "profile", "parent_link_token"
        ]

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile = StudentProfileShortSerializer(required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email", 
            "role", "hostel", "password", "is_active", "profile"
        ]
        # Allow username to be optional during creation for auto-gen
        extra_kwargs = {'username': {'required': False, 'allow_blank': True}}

    def generate_unique_username(self, validated_data):
        hostel_obj = validated_data.get('hostel')
        first_name = validated_data.get('first_name', 'U').upper()
        name_char = first_name[0] if first_name else 'U'
        
        # Prefix: First 3 chars of hostel code, or 'MH'
        prefix = hostel_obj.code[:3].upper() if hostel_obj else "MH"
        
        # Combined base (e.g., MAR + S = MARS)
        base = f"{prefix}{name_char}"
        
        # Ensure we don't exceed 4 chars for the base to leave room for 4 digits
        if len(base) > 4:
            base = base[:4]
            
        # Target is exactly 8 characters
        digits_needed = 8 - len(base)
        
        def get_candidate():
            low = 10**(digits_needed - 1)
            high = (10**digits_needed) - 1
            return f"{base}{random.randint(low, high)}"

        unique = get_candidate()
        attempts = 0
        while User.objects.filter(username=unique).exists() and attempts < 100:
            unique = get_candidate()
            attempts += 1
        return unique

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", None)
        raw_password = validated_data.pop("password", None)
        
        if not validated_data.get('username'):
            validated_data['username'] = self.generate_unique_username(validated_data)
        
        user = User.objects.create(**validated_data)
        if raw_password:
            user.set_password(raw_password)
            user.save()
        
        if profile_data:
            if hasattr(user, 'student_profile'):
                for attr, value in profile_data.items():
                    setattr(user.student_profile, attr, value)
                user.student_profile.save()
            elif hasattr(user, 'employee_profile'):
                for attr, value in profile_data.items():
                    setattr(user.employee_profile, attr, value)
                user.employee_profile.save()
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        raw_password = validated_data.pop("password", None)

        # Update core user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if raw_password:
            instance.set_password(raw_password)

        instance.save()

        # Update profile fields
        if profile_data:
            if hasattr(instance, 'student_profile'):
                for attr, value in profile_data.items():
                    setattr(instance.student_profile, attr, value)
                instance.student_profile.save()
            elif hasattr(instance, 'employee_profile'):
                for attr, value in profile_data.items():
                    setattr(instance.employee_profile, attr, value)
                instance.employee_profile.save()
        return instance

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect current password")
        return value
