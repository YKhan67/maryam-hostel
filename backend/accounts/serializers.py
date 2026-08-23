# backend/accounts/serializers.py

import random
import json
from datetime import date
from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from .models import User, ModulePermission
from fees.models import SecurityDeposit
from hostels.models import StudentProfile, StudentUtilityCharge


class ModulePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModulePermission
        fields = '__all__'


class StudentUtilityChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentUtilityCharge
        fields = ["id", "name", "amount", "is_active", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]
    
    def to_internal_value(self, data):
        result = super().to_internal_value(data)
        if isinstance(data, dict) and 'id' in data:
            result['id'] = data['id']
        return result


class StudentProfileShortSerializer(serializers.ModelSerializer):
    utilities = StudentUtilityChargeSerializer(many=True, required=False)
    hostel = serializers.PrimaryKeyRelatedField(read_only=True)
    bed = serializers.PrimaryKeyRelatedField(read_only=True)
    monthly_rent = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    
    security_deposit = serializers.SerializerMethodField()

    joined_on = serializers.DateField(required=False, allow_null=True)
    left_on = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id", "hostel", "bed",
            "mobile", "whatsapp", "guardian_name", "guardian_phone", "guardian_nic_number",
            "parent_name", "parent_phone", "parent_whatsapp", "parent_nic_number", "college_name",
            "nic_number", "nic_front_picture", "nic_back_picture", "profile_picture",
            "course", "year", "joined_on", "left_on", "is_active",
            "parent_link_token", "utilities", "monthly_rent", "security_deposit"
        ]
        read_only_fields = ["id", "hostel", "bed", "parent_link_token"]

    def get_security_deposit(self, obj):
        try:
            security_deposit = getattr(obj, 'security_deposit', None)
            if security_deposit:
                return security_deposit.amount
            return None
        except Exception:
            return None

    def validate(self, attrs):
        if not attrs:
            return attrs

        # Get user from context to check role
        user = self.context.get('user') if hasattr(self, 'context') else None
        
        # If user exists and is not STUDENT, skip student-specific validation
        if user and hasattr(user, 'role') and user.role != 'STUDENT':
            # For non-students, only validate nic_number and mobile
            nic_number = attrs.get("nic_number", getattr(self.instance, "nic_number", None) if self.instance else None)
            if nic_number is None or (isinstance(nic_number, str) and not nic_number.strip()):
                raise serializers.ValidationError({"nic_number": "NIC number is required."})
            
            mobile = attrs.get("mobile", getattr(self.instance, "mobile", None) if self.instance else None)
            if mobile is None or (isinstance(mobile, str) and not mobile.strip()):
                raise serializers.ValidationError({"mobile": "Mobile number is required."})
            
            return attrs

        # For STUDENTS, validate all required fields
        required_fields = [
            "mobile", "whatsapp", "guardian_name", "guardian_phone",
            "parent_phone", "parent_whatsapp", "college_name",
            "nic_number", "joined_on",
        ]

        for field_name in required_fields:
            value = attrs.get(field_name, getattr(self.instance, field_name, None) if self.instance else None)
            if value is None or (isinstance(value, str) and not value.strip()):
                raise serializers.ValidationError({field_name: f"{field_name.replace('_', ' ').title()} is required."})

        joined_on = attrs.get("joined_on", getattr(self.instance, "joined_on", None) if self.instance else None)
        left_on = attrs.get("left_on", getattr(self.instance, "left_on", None) if self.instance else None)
        if joined_on and left_on and left_on < joined_on:
            raise serializers.ValidationError({"left_on": "Left on must be on or after joined on."})

        return attrs


class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    parent_link_token = serializers.CharField(source="student_profile.parent_link_token", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email", 
            "role", "hostel", "hostel_name", "is_active", "profile", "parent_link_token"
        ]

    def get_profile(self, obj):
        """Return profile data based on user role"""
        if obj.role == "STUDENT":
            profile = getattr(obj, 'student_profile', None)
            if profile:
                return StudentProfileShortSerializer(profile).data
            return None
        else:
            try:
                from payroll.models import EmployeeProfile
                employee_profile = getattr(obj, 'employee_profile', None)
                if employee_profile:
                    return {
                        "id": employee_profile.id,
                        "nic_number": employee_profile.nic_number or "",
                        "nic_front_picture": employee_profile.nic_front_picture.url if employee_profile.nic_front_picture else None,
                        "nic_back_picture": employee_profile.nic_back_picture.url if employee_profile.nic_back_picture else None,
                        "profile_picture": employee_profile.profile_picture.url if employee_profile.profile_picture else None,
                        "mobile": employee_profile.mobile or "",
                        "whatsapp": employee_profile.whatsapp or "",
                        "joined_on": employee_profile.joined_on,
                        "designation": employee_profile.designation,
                        "pay_type": employee_profile.pay_type,
                        "base_salary": float(employee_profile.base_salary) if employee_profile.base_salary else 0,
                        "housing_allowance": float(employee_profile.housing_allowance) if employee_profile.housing_allowance else 0,
                        "fuel_allowance": float(employee_profile.fuel_allowance) if employee_profile.fuel_allowance else 0,
                        "other_allowance": float(employee_profile.other_allowance) if employee_profile.other_allowance else 0,
                        "rate_per_task": float(employee_profile.rate_per_task) if employee_profile.rate_per_task else 0,
                        "bank_name": employee_profile.bank_name or "",
                        "iban": employee_profile.iban or "",
                        "is_active": employee_profile.is_active,
                    }
                return None
            except Exception as e:
                print(f"Error getting employee profile: {e}")
                return None


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile = serializers.DictField(required=False, allow_null=True)
    profile_nic_front_picture = serializers.ImageField(write_only=True, required=False)
    profile_nic_back_picture = serializers.ImageField(write_only=True, required=False)
    profile_profile_picture = serializers.ImageField(write_only=True, required=False)
    
    security_deposit = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        required=False, 
        allow_null=True,
        write_only=True
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email", 
            "role", "hostel", "password", "is_active", "profile",
            "profile_nic_front_picture", "profile_nic_back_picture", "profile_profile_picture",
            "security_deposit"
        ]
        extra_kwargs = {'username': {'required': False, 'allow_blank': True}}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Pass user context to nested serializer for validation
        if hasattr(self, 'context') and 'request' in self.context:
            user = self.context['request'].user
            if hasattr(self.fields, 'profile') and self.fields['profile']:
                self.fields['profile'].context['user'] = user

    def generate_unique_username(self, validated_data):
        hostel_obj = validated_data.get('hostel')
        first_name = validated_data.get('first_name', 'U').upper()
        name_char = first_name[0] if first_name else 'U'
        prefix = hostel_obj.code[:3].upper() if hostel_obj else "MH"
        while True:
            candidate = f"{prefix}{name_char}{random.randint(1000, 9999)}"
            if not User.objects.filter(username=candidate).exists():
                return candidate

    def to_internal_value(self, data):
        """
        Safely normalize multipart/FormData values before DRF validation.
        """
        from decimal import Decimal as DecimalType

        # Make a copy to avoid modifying the original
        data = dict(data)

        # Normalize all values - convert lists to single values
        normalized = {}
        for key, value in data.items():
            if isinstance(value, list):
                normalized[key] = value[0] if value else ''
            else:
                normalized[key] = value
        
        data = normalized

        # Normalize scalar fields
        scalar_fields = (
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "hostel",
            "password",
            "security_deposit",
        )

        for key in scalar_fields:
            value = data.get(key)
            if isinstance(value, list):
                data[key] = value[0] if value else ""
            elif value is not None:
                data[key] = str(value)

        # Normalize boolean.
        if "is_active" in data:
            value = data["is_active"]
            if isinstance(value, list):
                value = value[0] if value else ""
            if isinstance(value, str):
                lowered = value.strip().lower()
                if lowered == "true":
                    data["is_active"] = True
                elif lowered == "false":
                    data["is_active"] = False
            elif isinstance(value, bool):
                data["is_active"] = value
            else:
                data["is_active"] = bool(value)

        # Handle image file fields - keep them as UploadedFile objects
        image_fields = ['profile_nic_front_picture', 'profile_nic_back_picture', 'profile_profile_picture']
        for field in image_fields:
            if field in data and hasattr(data[field], 'read'):
                pass

        # Parse profile - convert string to dict if needed
        if "profile" in data:
            profile = data["profile"]
            
            # If profile is a list, take the first element
            if isinstance(profile, list):
                profile = profile[0] if profile else {}

            # If profile is a string, try to parse it as JSON
            if isinstance(profile, str):
                try:
                    profile = json.loads(profile)
                except (json.JSONDecodeError, TypeError):
                    try:
                        profile = eval(profile)
                    except:
                        profile = {}
            elif isinstance(profile, (list, tuple)):
                profile = profile[0] if profile else {}
            elif not isinstance(profile, dict):
                profile = {}

            if not isinstance(profile, dict):
                profile = {}

            # Decimal normalization for numeric fields
            numeric_fields = ['monthly_rent', 'base_salary', 'housing_allowance', 'fuel_allowance', 'other_allowance', 'rate_per_task']
            for field in numeric_fields:
                if field in profile:
                    if profile.get(field) in ("", None):
                        profile[field] = None
                    else:
                        try:
                            profile[field] = DecimalType(str(profile[field]))
                        except (TypeError, ValueError):
                            profile[field] = None

            # Remove security_deposit from profile since we handle it at top level
            if "security_deposit" in profile:
                security_deposit_value = profile.pop("security_deposit", None)
                if security_deposit_value is not None and security_deposit_value != "":
                    data["security_deposit"] = security_deposit_value

            # Utilities must remain a list.
            utilities = profile.get("utilities", [])
            if utilities is None:
                utilities = []
            elif isinstance(utilities, dict):
                utilities = [utilities]
            elif not isinstance(utilities, list):
                utilities = []
            profile["utilities"] = utilities
            data["profile"] = profile

        return super().to_internal_value(data)

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, "role", None))
        hostel = attrs.get("hostel", getattr(self.instance, "hostel", None))
        
        if role == "STUDENT" and hostel is None:
            raise serializers.ValidationError({"hostel": "Hostel is required for students."})

        profile_data = attrs.get("profile")
        
        if profile_data and isinstance(profile_data, dict):
            if role == "STUDENT":
                profile_serializer = StudentProfileShortSerializer(
                    data=profile_data,
                    context={'user': self.instance if self.instance else None}
                )
                profile_serializer.is_valid(raise_exception=True)
            else:
                nic_number = profile_data.get("nic_number")
                if nic_number is None or (isinstance(nic_number, str) and not nic_number.strip()):
                    raise serializers.ValidationError({"profile": {"nic_number": "NIC number is required."}})

        return attrs

    def _sync_student_utilities(self, profile, utilities_data):
        if utilities_data is None:
            return

        existing = {u.id: u for u in profile.utilities.all()}
        incoming_ids = []
        for utility_data in utilities_data:
            if not isinstance(utility_data, dict):
                continue
            payload = {key: value for key, value in utility_data.items() if key not in {"id"}}
            if not payload.get("name") and payload.get("amount") is None:
                continue

            utility_id = utility_data.get("id")
            utility = None
            if utility_id and utility_id in existing:
                utility = existing[utility_id]

            if utility is not None:
                for field, value in payload.items():
                    setattr(utility, field, value)
                utility.save()
                incoming_ids.append(utility.id)
            else:
                utility = StudentUtilityCharge.objects.create(student=profile, **payload)
                incoming_ids.append(utility.id)

        utilities_to_delete = profile.utilities.exclude(id__in=incoming_ids)
        utilities_to_delete.delete()

    def _create_or_update_employee_profile(self, user, profile_data, nic_front=None, nic_back=None, profile_pic=None):
        """Create or update EmployeeProfile for non-student users"""
        from payroll.models import EmployeeProfile
        
        if not profile_data:
            return None
        
        # Get or create the employee profile
        employee_profile, created = EmployeeProfile.objects.get_or_create(
            user=user,
            defaults={
                'designation': profile_data.get('designation', ''),
                'pay_type': profile_data.get('pay_type', 'MONTHLY'),
                'base_salary': Decimal(str(profile_data.get('base_salary', 0))),
                'housing_allowance': Decimal(str(profile_data.get('housing_allowance', 0))),
                'fuel_allowance': Decimal(str(profile_data.get('fuel_allowance', 0))),
                'other_allowance': Decimal(str(profile_data.get('other_allowance', 0))),
                'rate_per_task': Decimal(str(profile_data.get('rate_per_task', 0))),
                'bank_name': profile_data.get('bank_name', ''),
                'iban': profile_data.get('iban', ''),
                'joined_on': profile_data.get('joined_on') or date.today(),
                'is_active': True,
                'nic_number': profile_data.get('nic_number', ''),
                'mobile': profile_data.get('mobile', ''),
                'whatsapp': profile_data.get('whatsapp', ''),
            }
        )
        
        if not created:
            update_fields = [
                'designation', 'pay_type', 'base_salary', 'housing_allowance',
                'fuel_allowance', 'other_allowance', 'rate_per_task',
                'bank_name', 'iban', 'joined_on', 'nic_number',
                'mobile', 'whatsapp'
            ]
            for field in update_fields:
                if field in profile_data and profile_data[field] is not None:
                    if field in ['base_salary', 'housing_allowance', 'fuel_allowance', 'other_allowance', 'rate_per_task']:
                        try:
                            setattr(employee_profile, field, Decimal(str(profile_data[field])))
                        except:
                            pass
                    else:
                        setattr(employee_profile, field, profile_data[field])
            
            employee_profile.save()
        
        if nic_front:
            employee_profile.nic_front_picture = nic_front
            employee_profile.save()
        if nic_back:
            employee_profile.nic_back_picture = nic_back
            employee_profile.save()
        if profile_pic:
            employee_profile.profile_picture = profile_pic
            employee_profile.save()
        
        return employee_profile

    def create(self, validated_data):
        security_deposit_value = validated_data.pop("security_deposit", None)
        profile_data = validated_data.pop("profile", None)
        raw_password = validated_data.pop("password", None)
        nic_front = validated_data.pop("profile_nic_front_picture", None)
        nic_back = validated_data.pop("profile_nic_back_picture", None)
        profile_pic = validated_data.pop("profile_profile_picture", None)

        if not validated_data.get('username'):
            validated_data['username'] = self.generate_unique_username(validated_data)

        with transaction.atomic():
            user = User.objects.create(**validated_data)
            if raw_password:
                user.set_password(raw_password)
                user.save()

            if profile_data and isinstance(profile_data, dict):
                if user.role == "STUDENT":
                    profile_model_fields = {field.name for field in StudentProfile._meta.get_fields()}
                    student_defaults = {
                        key: value for key, value in profile_data.items()
                        if key in profile_model_fields and key != "utilities"
                    }
                    if nic_front:
                        student_defaults["nic_front_picture"] = nic_front
                    if nic_back:
                        student_defaults["nic_back_picture"] = nic_back
                    if profile_pic:
                        student_defaults["profile_picture"] = profile_pic
                    if getattr(user, "hostel", None):
                        student_defaults.setdefault("hostel", user.hostel)
                    
                    profile = getattr(user, "student_profile", None)
                    if profile is None:
                        profile = StudentProfile.objects.create(user=user, **student_defaults)
                    else:
                        for attr, value in student_defaults.items():
                            setattr(profile, attr, value)
                    
                    self._sync_student_utilities(profile, profile_data.get("utilities"))
                    profile.save()

                    if security_deposit_value is not None and security_deposit_value != "":
                        try:
                            deposit_amount = Decimal(str(security_deposit_value))
                            deposit_obj, _ = SecurityDeposit.objects.get_or_create(
                                student=profile,
                                defaults={
                                    "amount": deposit_amount,
                                    "date_paid": date.today(),
                                },
                            )
                            deposit_obj.amount = deposit_amount
                            if not deposit_obj.date_paid:
                                deposit_obj.date_paid = date.today()
                            deposit_obj.save()
                        except Exception as e:
                            print(f"Error saving security deposit: {e}")
                else:
                    self._create_or_update_employee_profile(
                        user, profile_data, nic_front, nic_back, profile_pic
                    )

        return user

    def update(self, instance, validated_data):
        security_deposit_value = validated_data.pop("security_deposit", None)
        profile_data = validated_data.pop("profile", None)
        raw_password = validated_data.pop("password", None)
        nic_front = validated_data.pop("profile_nic_front_picture", None)
        nic_back = validated_data.pop("profile_nic_back_picture", None)
        profile_pic = validated_data.pop("profile_profile_picture", None)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            if raw_password:
                instance.set_password(raw_password)

            instance.save()

            if profile_data and isinstance(profile_data, dict):
                if instance.role == "STUDENT":
                    profile = getattr(instance, "student_profile", None)
                    if profile is None:
                        profile = StudentProfile.objects.get(user=instance)

                    if nic_front:
                        profile.nic_front_picture = nic_front
                    if nic_back:
                        profile.nic_back_picture = nic_back
                    if profile_pic:
                        profile.profile_picture = profile_pic

                    security_deposit_value = profile_data.pop("security_deposit", None)

                    for attr, value in profile_data.items():
                        if attr == "utilities":
                            continue
                        if value is not None:
                            setattr(profile, attr, value)

                    self._sync_student_utilities(profile, profile_data.get("utilities"))
                    profile.save()

                    if security_deposit_value is not None and security_deposit_value != "":
                        try:
                            deposit_amount = Decimal(str(security_deposit_value))
                            deposit_obj, created = SecurityDeposit.objects.get_or_create(
                                student=profile,
                                defaults={
                                    "amount": deposit_amount,
                                    "date_paid": date.today(),
                                },
                            )
                            deposit_obj.amount = deposit_amount
                            if not deposit_obj.date_paid:
                                deposit_obj.date_paid = date.today()
                            deposit_obj.save()
                        except Exception as e:
                            print(f"Error saving security deposit: {e}")
                else:
                    self._create_or_update_employee_profile(
                        instance, profile_data, nic_front, nic_back, profile_pic
                    )

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect current password")
        return value