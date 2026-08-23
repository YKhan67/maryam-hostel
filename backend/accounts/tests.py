from django.test import TestCase

from accounts.serializers import UserCreateUpdateSerializer
from hostels.models import City, Hostel


class UserProfileSerializerTests(TestCase):
    def setUp(self):
        city = City.objects.create(name="Lahore", country="Pakistan")
        self.hostel = Hostel.objects.create(name="Maryam Girls Hostel", code="MGH", city=city)

    def test_student_profile_serializer_persists_required_profile_and_utilities(self):
        payload = {
            "username": "student01",
            "first_name": "Ayesha",
            "last_name": "Khan",
            "email": "ayesha@example.com",
            "role": "STUDENT",
            "hostel": self.hostel.id,
            "password": "StrongPass123",
            "profile": {
                "mobile": "03001234567",
                "whatsapp": "03001234567",
                "guardian_name": "Zahid Khan",
                "guardian_phone": "03007654321",
                "parent_phone": "03007654321",
                "parent_whatsapp": "03007654321",
                "college_name": "Punjab College",
                "nic_number": "4210112345678",
                "joined_on": "2024-01-15",
                "utilities": [
                    {"name": "Heater", "amount": "500.00"},
                    {"name": "AC", "amount": "1500.00"},
                ],
            },
        }

        serializer = UserCreateUpdateSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        user = serializer.save()
        self.assertTrue(hasattr(user, "student_profile"))
        self.assertEqual(user.student_profile.nic_number, "4210112345678")
        self.assertEqual(user.student_profile.utilities.count(), 2)
        self.assertEqual(user.student_profile.utilities.filter(name="Heater").count(), 1)
        self.assertEqual(float(user.student_profile.utilities.get(name="AC").amount), 1500.00)
        self.assertEqual(float(user.student_profile.calculate_active_utility_bill()), 2000)

    def test_student_profile_serializer_update_preserves_required_fields_and_removes_utility(self):
        payload = {
            "username": "student02",
            "first_name": "Mahnoor",
            "last_name": "Ali",
            "email": "mahnoor@example.com",
            "role": "STUDENT",
            "hostel": self.hostel.id,
            "password": "StrongPass123",
            "profile": {
                "mobile": "03001234567",
                "whatsapp": "03001234567",
                "guardian_name": "Ali Khan",
                "guardian_phone": "03007654321",
                "parent_phone": "03007654321",
                "parent_whatsapp": "03007654321",
                "college_name": "Lahore City College",
                "nic_number": "4210112345678",
                "joined_on": "2024-03-01",
                "utilities": [
                    {"name": "Heater", "amount": "500.00"},
                    {"name": "AC", "amount": "1500.00"},
                ],
            },
        }
        serializer = UserCreateUpdateSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        heater = user.student_profile.utilities.get(name="Heater")
        update_payload = {
            "profile": {
                "mobile": "03009999999",
                "whatsapp": "03009999999",
                "guardian_name": "Ali Khan",
                "guardian_phone": "03007654321",
                "parent_phone": "03007654321",
                "parent_whatsapp": "03007654321",
                "college_name": "Lahore City College",
                "nic_number": "4210112345678",
                "joined_on": "2024-03-01",
                "utilities": [
                    {"id": heater.id, "name": "Heater", "amount": "700.00", "is_active": True},
                    {"name": "Water", "amount": "200.00", "is_active": True},
                ],
            }
        }

        serializer = UserCreateUpdateSerializer(instance=user, data=update_payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()

        profile = updated.student_profile
        self.assertEqual(profile.mobile, "03009999999")
        self.assertEqual(float(profile.calculate_active_utility_bill()), 900.00)
        self.assertTrue(profile.utilities.filter(name="Heater", amount="700.00").exists())
        self.assertTrue(profile.utilities.filter(name="Water").exists())
        self.assertFalse(profile.utilities.filter(name="AC").filter(is_active=True).exists())
