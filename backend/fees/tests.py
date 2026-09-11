from datetime import date
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from fees.models import FeeHead, FeeRule, MonthlyFee, Receipt, StudentUtilityBill
from accounts.models import ModulePermission
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

    def test_mark_paid_can_exclude_fine_and_keep_it_pending(self):
        admin = User.objects.create_user(
            username="fees-admin-exclude-fine",
            password="StrongPass123",
            role="SUPER_ADMIN",
        )
        client = APIClient()
        client.force_authenticate(user=admin)
        utility_bill = StudentUtilityBill.objects.create(
            student=self.student,
            month=date(2025, 1, 1),
            amount=Decimal("250.00"),
        )

        response = client.post(
            reverse("fees-mark-paid"),
            {
                "scope": "STUDENT",
                "student_id": self.student.id,
                "year": 2025,
                "month": 1,
                "exclude_fine": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        fee = MonthlyFee.objects.get(student=self.student, month=date(2025, 1, 1))
        self.assertTrue(fee.is_paid)
        self.assertFalse(fee.fine_paid)
        self.assertEqual(fee.amount_paid, Decimal("5000.00"))
        self.assertGreater(fee.late_fee_applied, Decimal("0"))
        utility_bill.refresh_from_db()
        self.assertTrue(utility_bill.is_paid)
        self.assertEqual(Receipt.objects.get(fee=fee).amount, Decimal("5250.00"))

        self.client.force_authenticate(user=self.user)
        ledger_response = self.client.get(reverse("fees-student-ledger"))
        self.assertEqual(ledger_response.status_code, 200)
        self.assertEqual(ledger_response.data["ledger"][0]["status"], "FINE_PENDING")

    def test_student_breakdown_does_not_double_count_paid_utility(self):
        admin = User.objects.create_user(
            username="fees-admin-breakdown",
            password="StrongPass123",
            role="SUPER_ADMIN",
        )
        fee = MonthlyFee.objects.get(student=self.student, month=date(2025, 1, 1))
        fee.amount_paid = fee.amount
        fee.is_paid = True
        fee.late_fee_applied = Decimal("0")
        fee.save()
        StudentUtilityBill.objects.create(
            student=self.student,
            month=date(2025, 1, 1),
            amount=Decimal("250.00"),
            amount_paid=Decimal("250.00"),
            is_paid=True,
        )

        client = APIClient()
        client.force_authenticate(user=admin)
        response = client.get(
            reverse("fees-dashboard-student-breakdown"),
            {
                "year": 2025,
                "from_month": 1,
                "to_month": 1,
                "is_active": "all",
            },
        )

        self.assertEqual(response.status_code, 200)
        row = response.data["rows"][0]
        self.assertEqual(row["amount_due"], 0)
        self.assertEqual(row["amount_paid"], 5250.0)
        self.assertEqual(row["status"], "PAID")

    def test_last_three_months_kpi_returns_monthly_totals(self):
        admin = User.objects.create_user(
            username="fees-admin-kpi",
            password="StrongPass123",
            role="SUPER_ADMIN",
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        MonthlyFee.objects.create(
            student=self.student,
            fee_head=self.fee_head,
            month=date(2025, 2, 1),
            amount=Decimal("5000.00"),
            is_paid=True,
            amount_paid=Decimal("5000.00"),
            late_fee_applied=Decimal("100.00"),
            fine_paid=True,
        )

        response = client.get(reverse("fees-dashboard-last-three-months"))
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
        self.assertIn("total_billed", response.data[0])

    def test_delete_fee_records_removes_paid_unpaid_fees_and_period_utility_snapshots(self):
        admin = User.objects.create_user(
            username="fees-admin-delete",
            password="StrongPass123",
            role="SUPER_ADMIN",
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        MonthlyFee.objects.create(
            student=self.student,
            fee_head=self.fee_head,
            month=date(2025, 2, 1),
            amount=Decimal("5000.00"),
            is_paid=True,
            amount_paid=Decimal("5000.00"),
        )
        StudentUtilityBill.objects.create(
            student=self.student,
            month=date(2025, 2, 1),
            amount=Decimal("300.00"),
            is_paid=True,
            amount_paid=Decimal("300.00"),
        )
        StudentUtilityBill.objects.create(
            student=self.student,
            month=date(2025, 3, 1),
            amount=Decimal("350.00"),
        )

        response = client.post(
            reverse("fees-delete-fees"),
            {
                "scope": "STUDENT",
                "student_id": self.student.id,
                "from_year": 2025,
                "from_month": 1,
                "to_year": 2025,
                "to_month": 2,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["deleted"], 2)
        self.assertEqual(response.data["utility_bills_deleted"], 1)
        self.assertFalse(MonthlyFee.objects.filter(month=date(2025, 1, 1)).exists())
        self.assertFalse(MonthlyFee.objects.filter(month=date(2025, 2, 1)).exists())
        self.assertFalse(StudentUtilityBill.objects.filter(month=date(2025, 2, 1)).exists())
        self.assertTrue(StudentUtilityBill.objects.filter(month=date(2025, 3, 1)).exists())
        self.assertTrue(StudentUtilityCharge.objects.filter(student=self.student).exists())

    def test_delete_fee_records_requires_delete_permission_and_valid_range(self):
        manager = User.objects.create_user(
            username="fees-manager-no-delete",
            password="StrongPass123",
            role="HOSTEL_MANAGER",
            hostel=self.student.hostel,
        )
        ModulePermission.objects.create(
            role="HOSTEL_MANAGER",
            module_name="FEES",
            can_view=True,
            can_edit=True,
            can_delete=False,
        )
        client = APIClient()
        client.force_authenticate(user=manager)

        forbidden = client.post(
            reverse("fees-delete-fees"),
            {
                "scope": "ALL",
                "from_year": 2025,
                "from_month": 1,
                "to_year": 2025,
                "to_month": 2,
            },
            format="json",
        )
        self.assertEqual(forbidden.status_code, 403)

        admin = User.objects.create_user(
            username="fees-admin-range",
            password="StrongPass123",
            role="SUPER_ADMIN",
        )
        client.force_authenticate(user=admin)
        invalid_range = client.post(
            reverse("fees-delete-fees"),
            {
                "scope": "ALL",
                "from_year": 2025,
                "from_month": 3,
                "to_year": 2025,
                "to_month": 2,
            },
            format="json",
        )
        self.assertEqual(invalid_range.status_code, 400)
