from datetime import date
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from fees.models import FeeHead, FeeRule, MonthlyFee, StudentUtilityBill
from hostels.models import City, Hostel, StudentProfile, StudentUtilityCharge


class StudentAndParentLedgerSummaryTests(TestCase):
    def setUp(self):
        city = City.objects.create(name="Lahore", country="Pakistan")
        hostel = Hostel.objects.create(name="Maryam Girls Hostel", code="MGH", city=city)

        self.user = User.objects.create_user(
            username="student01",
            password="StrongPass123",
            first_name="Ayesha",
            last_name="Khan",
            role="STUDENT",
            hostel=hostel,
        )

        self.student = StudentProfile.objects.create(
            user=self.user,
            hostel=hostel,
            mobile="03001234567",
            whatsapp="03001234567",
            guardian_name="Zahid Khan",
            guardian_phone="03007654321",
            parent_phone="03007654321",
            parent_whatsapp="03007654321",
            college_name="Punjab College",
            nic_number="4210112345678",
            joined_on=date(2024, 1, 15),
            parent_link_token="secure-token-123",
        )

        StudentUtilityCharge.objects.create(student=self.student, name="Water", amount=Decimal("250.00"), is_active=True)

        self.fee_head = FeeHead.objects.create(name="Room Rent", default_amount=Decimal("5000.00"))
        FeeRule.objects.create(fee_head=self.fee_head, due_day=4, late_fee_type="FIXED", fixed_amount=Decimal("100.00"))
        MonthlyFee.objects.create(
            student=self.student,
            fee_head=self.fee_head,
            month=date(2025, 1, 1),
            amount=Decimal("5000.00"),
            is_paid=False,
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_student_ledger_summary_has_visible_fields(self):
        response = self.client.get(reverse("fees-student-ledger"))
        self.assertEqual(response.status_code, 200)

        summary = response.data["summary"]
        for key in [
            "student_picture",
            "nic_number",
            "month",
            "status",
            "security_deposit",
            "amount_due",
            "amount_paid",
            "utilities_bill",
            "fine",
            "total",
        ]:
            self.assertIn(key, summary)

    def test_parent_portal_summary_has_visible_fields(self):
        response = self.client.get(reverse("fees-parent-ledger", kwargs={"token": "secure-token-123"}))
        self.assertEqual(response.status_code, 200)

        summary = response.data["summary"]
        for key in [
            "student_picture",
            "nic_number",
            "month",
            "status",
            "security_deposit",
            "amount_due",
            "amount_paid",
            "utilities_bill",
            "fine",
            "total",
        ]:
            self.assertIn(key, summary)

    def test_generate_monthly_fees_also_creates_utility_snapshot(self):
        admin = User.objects.create_user(
            username="fees-admin",
            password="StrongPass123",
            role="SUPER_ADMIN",
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.post(
            reverse("fees-generate-fees"),
            {"year": 2026, "month": 9, "scope": "STUDENT", "student_id": self.student.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["created"], 1)
        self.assertEqual(response.data["utility_bills_created"], 1)
        utility_bill = StudentUtilityBill.objects.get(student=self.student, month=date(2026, 9, 1))
        self.assertEqual(utility_bill.amount, Decimal("250.00"))

        repeat_response = client.post(
            reverse("fees-generate-fees"),
            {"year": 2026, "month": 9, "scope": "STUDENT", "student_id": self.student.id},
            format="json",
        )
        self.assertEqual(repeat_response.status_code, 200)
        self.assertEqual(repeat_response.data["created"], 0)
        self.assertEqual(repeat_response.data["utility_bills_created"], 0)
