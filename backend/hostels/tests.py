
from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from .models import Bed, Building, City, Floor, Hostel, Property, Room, StudentProfile
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
