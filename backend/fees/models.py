# backend/fees/models.py

from datetime import date
from decimal import Decimal

from django.db import models
from django.conf import settings

from hostels.models import StudentProfile, Hostel  # Hostel optional, StudentProfile is used

User = settings.AUTH_USER_MODEL


class FeeHead(models.Model):
    """
    Type of fee, e.g.:
      - "Monthly Hostel Fee"
      - "Security Deposit"
      - "Mess Fee"

    is_recurring + frequency allow you later to add non-monthly fees
    (e.g. yearly admission fee). For now we mostly care about MONTHLY.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_recurring = models.BooleanField(default=True)
    frequency = models.CharField(max_length=20, default="MONTHLY")
    default_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return self.name


class FeeRule(models.Model):
    """
    Business rules for a given FeeHead:
      - due_day: last day without fine (e.g. 4 = pay by 4th)
      - late_fee_type:
            FIXED   → one fixed fine once overdue
            PER_DAY → per-day fine after due date
      - fixed_amount  → fine if type=FIXED
      - per_day_amount→ per-day fine if type=PER_DAY
    """
    fee_head = models.ForeignKey(
        FeeHead,
        on_delete=models.CASCADE,
        related_name="rules",
    )

    # e.g. 4 = due on 4th of month, fine starts 5th
    due_day = models.PositiveIntegerField(default=4)

    late_fee_type = models.CharField(
        max_length=20,
        choices=[("FIXED", "Fixed"), ("PER_DAY", "Per Day")],
        default="FIXED",
    )
    fixed_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    per_day_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"Rule for {self.fee_head.name}"

    class Meta:
        verbose_name = "Fee Rule"
        verbose_name_plural = "Fee Rules"

    def compute_late_fee(self, base_amount: Decimal, due_date: date, on_date: date) -> Decimal:
        """
        Compute late fee for a given base_amount between due_date and on_date
        according to this rule.

        on_date <= due_date → 0
        late_fee_type == FIXED   → fixed_amount (one time)
        late_fee_type == PER_DAY → per_day_amount * days_late
        """
        if on_date <= due_date:
            return Decimal("0")

        days_late = (on_date - due_date).days
        if days_late <= 0:
            return Decimal("0")

        if self.late_fee_type == "FIXED":
            return self.fixed_amount

        if self.late_fee_type == "PER_DAY":
            return self.per_day_amount * days_late

        return Decimal("0")


class MonthlyFee(models.Model):
    """
    This is the actual monthly record per student per fee head.
    Example:
      student      = Abdullah
      fee_head     = "Monthly Hostel Fee"
      month        = 2025-03-01  (always store 1st of month)
      amount       = 12000.00
      is_paid      = True/False
      late_fee_applied = the current late fee snapshot

    This is what WhatsApp reminders will use.
    """
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="fees",
    )
    fee_head = models.ForeignKey(FeeHead, on_delete=models.PROTECT)

    # Convention: first day of the month (e.g. 2025-03-01 for March 2025)
    month = models.DateField()

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)

    # Snapshot of current late fee (we can recompute + update over time)
    late_fee_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "fee_head", "month")

    def __str__(self):
        return f"{self.student} - {self.fee_head} - {self.month:%b %Y}"

    # ─────────────────────────────────────────────
    # Rule / due date helpers
    # ─────────────────────────────────────────────

    def get_rule(self) -> "FeeRule | None":
        """
        Returns the fee rule associated with this fee head.
        System currently assumes one rule per FeeHead.
        If you have multiple rules for same head, it will use the first one.
        """
        return self.fee_head.rules.first()

    def get_due_date(self) -> date:
        """
        Returns the actual due date for this month.

        Example:
          month = 2025-03-01  (March)
          rule.due_day = 4    → due date = 2025-03-04
        """
        rule = self.get_rule()
        base = self.month  # should already be first day of month
        year, month = base.year, base.month
        due_day = rule.due_day if rule else 4
        # guard for weird values like 31 in Feb – let Python adjust
        try:
            return date(year, month, due_day)
        except ValueError:
            # fallback: if invalid (e.g. 31 Feb), use last day of month hack
            # by rolling into next month and subtracting one day
            if month == 12:
                next_month = date(year + 1, 1, 1)
            else:
                next_month = date(year, month + 1, 1)
            return next_month - timedelta(days=1)

    def is_overdue_on(self, on_date: date | None = None) -> bool:
        """
        True if fee is not paid and today > due date.
        """
        if self.is_paid:
            return False
        if on_date is None:
            on_date = date.today()
        return on_date > self.get_due_date()

    # ─────────────────────────────────────────────
    # Late fee calculation
    # ─────────────────────────────────────────────

    def compute_late_fee(self, on_date: date | None = None) -> Decimal:
        """
        Compute late fee as of 'on_date' (default: today),
        using FeeRule for this fee head.
        """
        if on_date is None:
            on_date = date.today()

        rule = self.get_rule()
        if rule is None:
            return Decimal("0")

        due_date = self.get_due_date()
        return rule.compute_late_fee(
            base_amount=self.amount,
            due_date=due_date,
            on_date=on_date,
        )

    def refresh_late_fee(self, on_date: date | None = None, save: bool = True) -> Decimal:
        """
        Recalculate late_fee_applied for this record and optionally save.
        Returns the new late fee value.
        """
        new_late_fee = self.compute_late_fee(on_date=on_date)
        self.late_fee_applied = new_late_fee
        if save:
            self.save(update_fields=["late_fee_applied"])
        return new_late_fee

    def total_due(self, on_date: date | None = None) -> Decimal:
        """
        amount + late fee as of 'on_date'.
        Uses current logic but does NOT modify the DB.
        """
        fee = self.compute_late_fee(on_date=on_date)
        return self.amount + fee

    # ─────────────────────────────────────────────
    # WhatsApp message builder (no actual sending here)
    # ─────────────────────────────────────────────

    def build_whatsapp_text(self, on_date: date | None = None) -> str:
        """
        Build a human-friendly WhatsApp message string for this fee as of 'on_date'.

        Actual sending will be handled in a separate module/service that
        calls this method and then uses WhatsApp Cloud API.
        """
        if on_date is None:
            on_date = date.today()

        month_label = self.month.strftime("%B %Y")
        due_date = self.get_due_date()
        late_fee = self.compute_late_fee(on_date=on_date)
        total = self.amount + late_fee

        # Student name and phone number come from StudentProfile
        student_name = getattr(self.student, "full_name", str(self.student))

        # If not overdue yet (on or before 4th)
        if on_date <= due_date:
            return (
                f"Assalamualaikum {student_name},\n\n"
                f"Your hostel fee for {month_label} is Rs {self.amount:,.0f}.\n"
                f"Please pay by {due_date.day} {due_date.strftime('%B')}.\n\n"
                f"JazakAllah khair."
            )

        # Overdue message (from 5th onwards)
        return (
            f"Assalamualaikum {student_name},\n\n"
            f"Your hostel fee for {month_label} is overdue.\n\n"
            f"Base fee: Rs {self.amount:,.0f}\n"
            f"Fine up to today: Rs {late_fee:,.0f}\n"
            f"Total outstanding: Rs {total:,.0f}\n\n"
            f"Kindly clear your dues at the earliest.\n"
            f"JazakAllah khair."
        )


class PaymentProof(models.Model):
    """
    Students (or management) can upload proof of payment (bank slip, screenshot, etc.)
    When status changes to APPROVED → the related MonthlyFee is marked as paid.
    """
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    fee = models.ForeignKey(
        MonthlyFee,
        on_delete=models.CASCADE,
        related_name="payment_proofs",
    )
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_on = models.DateTimeField(auto_now_add=True)

    file = models.FileField(upload_to="payment_proofs/")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"{self.fee} - {self.status}"

    def save(self, *args, **kwargs):
        # track old status
        old_status = None
        if self.pk:
            old_status = (
                PaymentProof.objects.filter(pk=self.pk)
                .values_list("status", flat=True)
                .first()
            )

        super().save(*args, **kwargs)

        # if status changed to APPROVED → mark related fee as paid
        if self.status == "APPROVED" and (old_status != "APPROVED"):
            fee = self.fee
            fee.is_paid = True
            # When approved, we can also lock in the final late fee snapshot
            fee.refresh_late_fee(on_date=date.today(), save=True)
