
from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Bed, BedAllocation, Building, City, Floor, Hostel, Property, Room, StudentProfile
from .serializers import BuildingSerializer
from .services import allocate_bed, release_bed, transfer_bed


class BedAllocationServiceTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(username="student-1", role="STUDENT")
		city = City.objects.create(name="Test City")
		hostel = Hostel.objects.create(name="Test Hostel", code="TEST-1", city=city)
		property_obj = Property.objects.create(hostel=hostel, name="House A", code="HOUSE-A", property_type="HOUSE")
		building = Building.objects.create(hostel=hostel, property=property_obj, name="Main")
		floor = Floor.objects.create(building=building, number=1)
		room = Room.objects.create(floor=floor, number="101")
		self.bed_a = Bed.objects.create(room=room, label="A")
		self.bed_b = Bed.objects.create(room=room, label="B")
		self.student = StudentProfile.objects.create(
			user=self.user,
			hostel=hostel,
			mobile="03000000000",
			whatsapp="03000000000",
			guardian_name="Guardian",
			guardian_phone="03000000001",
			parent_phone="03000000002",
			parent_whatsapp="03000000002",
			college_name="College",
			nic_number="00000-0000000-0",
			joined_on=date(2026, 1, 1),
		)

	def test_allocate_and_release_syncs_legacy_flag(self):
		allocation = allocate_bed(self.student, self.bed_a, move_in_date=date(2026, 1, 2))

		self.student.refresh_from_db()
		self.bed_a.refresh_from_db()
		self.assertEqual(self.student.bed_id, self.bed_a.id)
		self.assertTrue(self.bed_a.is_occupied)
		self.assertTrue(allocation.is_active)

		release_bed(self.student, move_out_date=date(2026, 2, 1))
		self.student.refresh_from_db()
		self.bed_a.refresh_from_db()
		self.assertIsNone(self.student.bed_id)
		self.assertFalse(self.bed_a.is_occupied)

	def test_transfer_closes_old_allocation(self):
		allocate_bed(self.student, self.bed_a, move_in_date=date(2026, 1, 2))
		allocation = transfer_bed(self.student, self.bed_b, move_in_date=date(2026, 2, 1), reason="Room change")

		self.student.refresh_from_db()
		self.bed_a.refresh_from_db()
		self.bed_b.refresh_from_db()
		self.assertEqual(self.student.bed_id, self.bed_b.id)
		self.assertFalse(self.bed_a.is_occupied)
		self.assertTrue(self.bed_b.is_occupied)
		self.assertEqual(allocation.previous_bed_id, self.bed_a.id)

	def test_cross_hostel_allocation_is_rejected(self):
		other_hostel = Hostel.objects.create(name="Other Hostel", code="TEST-2", city=City.objects.get(name="Test City"))
		other_building = Building.objects.create(hostel=other_hostel, name="Other")
		other_floor = Floor.objects.create(building=other_building, number=1)
		other_room = Room.objects.create(floor=other_floor, number="201")
		other_bed = Bed.objects.create(room=other_room, label="A")

		with self.assertRaises(ValidationError):
			allocate_bed(self.student, other_bed)

	def test_building_cannot_use_property_from_another_hostel(self):
		other_hostel = Hostel.objects.create(name="Other Hostel", code="TEST-2", city=City.objects.get(name="Test City"))
		other_property = Property.objects.create(
			hostel=other_hostel,
			name="Other House",
			code="OTHER-HOUSE",
			property_type="HOUSE",
		)
		serializer = BuildingSerializer(data={
			"hostel": self.student.hostel_id,
			"property": other_property.id,
			"name": "Invalid Building",
		})
		self.assertFalse(serializer.is_valid())
		self.assertIn("property", serializer.errors)

	def test_bulk_bed_creation_generates_labels(self):
		admin = get_user_model().objects.create_user(username="setup-admin", role="SUPER_ADMIN")
		client = APIClient()
		client.force_authenticate(user=admin)
		room = self.bed_a.room
		response = client.post(f"/api/rooms/{room.id}/bulk-beds/", {"count": 3, "start_label": "C"}, format="json")
		self.assertEqual(response.status_code, 201)
		self.assertEqual(list(room.beds.order_by("label").values_list("label", flat=True)), ["A", "B", "C", "D", "E"])

	def test_assigned_bed_cannot_be_deactivated(self):
		admin = get_user_model().objects.create_user(username="maintenance-admin", role="SUPER_ADMIN")
		client = APIClient()
		client.force_authenticate(user=admin)
		allocate_bed(self.student, self.bed_a, move_in_date=date(2026, 1, 2))

		response = client.post(f"/api/beds/{self.bed_a.id}/toggle-active/")

		self.assertEqual(response.status_code, 400)
		self.bed_a.refresh_from_db()
		self.assertTrue(self.bed_a.is_active)

	def test_empty_bed_can_toggle_inactive_and_active(self):
		admin = get_user_model().objects.create_user(username="maintenance-admin-2", role="SUPER_ADMIN")
		client = APIClient()
		client.force_authenticate(user=admin)

		deactivate = client.post(f"/api/beds/{self.bed_b.id}/toggle-active/")
		self.assertEqual(deactivate.status_code, 200)
		self.bed_b.refresh_from_db()
		self.assertFalse(self.bed_b.is_active)

		activate = client.post(f"/api/beds/{self.bed_b.id}/toggle-active/")
		self.assertEqual(activate.status_code, 200)
		self.bed_b.refresh_from_db()
		self.assertTrue(self.bed_b.is_active)
