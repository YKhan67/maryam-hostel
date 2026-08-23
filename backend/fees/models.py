# backend/fees/models.py

from datetime import date, timedelta
from decimal import Decimal
import random

from django.db import models
from django.conf import settings
from hostels.models import StudentProfile

User = settings.AUTH_USER_MODEL

class FeeHead(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_recurring = models.BooleanField(default=True)
    frequency = models.CharField(max_length=20, default="MONTHLY")
    default_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    def __str__(self): return self.name

class FeeRule(models.Model):
    fee_head = models.ForeignKey(FeeHead, on_delete=models.CASCADE, related_name="rules")
    due_day = models.PositiveIntegerField(default=4)
    late_fee_type = models.CharField(max_length=20, choices=[("FIXED", "Fixed"), ("PER_DAY", "Per Day")], default="FIXED")
    fixed_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    per_day_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    def __str__(self): return f"Rule for {self.fee_head.name}"
    
    def compute_late_fee(self, base_amount: Decimal, due_date: date, on_date: date) -> Decimal:
        if on_date <= due_date: return Decimal("0")
        days_late = (on_date - due_date).days
        if days_late <= 0: return Decimal("0")
        if self.late_fee_type == "FIXED": return self.fixed_amount
        if self.late_fee_type == "PER_DAY": return self.per_day_amount * days_late
        return Decimal("0")

class MonthlyFee(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="fees")
    fee_head = models.ForeignKey(FeeHead, on_delete=models.PROTECT)
    month = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_paid = models.BooleanField(default=False)
    is_partially_paid = models.BooleanField(default=False)
    late_fee_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def balance_due(self): return (self.amount + self.late_fee_applied) - self.amount_paid

    class Meta:
        unique_together = ("student", "fee_head", "month")

    def __str__(self): return f"{self.student} - {self.fee_head} - {self.month:%b %Y}"

    def get_rule(self): return self.fee_head.rules.first()

    def get_due_date(self) -> date:
        rule = self.get_rule(); base = self.month; year, month = base.year, base.month; due_day = rule.due_day if rule else 4
        try: return date(year, month, due_day)
        except ValueError:
            next_m = date(year + (1 if month == 12 else 0), (1 if month == 12 else month + 1), 1)
            return next_m - timedelta(days=1)

    def refresh_late_fee(self, on_date: date | None = None, save: bool = True) -> Decimal:
        if not on_date: on_date = date.today()
        rule = self.get_rule()
        new_late_fee = rule.compute_late_fee(self.amount, self.get_due_date(), on_date) if rule else Decimal("0")
        self.late_fee_applied = new_late_fee
        if save: self.save(update_fields=["late_fee_applied"])
        return new_late_fee

class Receipt(models.Model):
    """
    Official digital receipt. 
    Unified source for Management Dashboard Revenue.
    """
    receipt_no = models.CharField(max_length=50, unique=True)
    fee = models.ForeignKey(MonthlyFee, on_delete=models.CASCADE, related_name="receipts")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_issued = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=50, default="Bank Transfer")

    def save(self, *args, **kwargs):
        if not self.receipt_no:
            year = date.today().year
            self.receipt_no = f"MH-{year}-{random.randint(10000, 99999)}"
        super().save(*args, **kwargs)

    def __str__(self): return self.receipt_no

class PaymentProof(models.Model):
    STATUS_CHOICES = [("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")]
    fee = models.ForeignKey(MonthlyFee, on_delete=models.CASCADE, related_name="payment_proofs")
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_on = models.DateTimeField(auto_now_add=True)
    file = models.FileField(upload_to="payment_proofs/")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    remarks = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        old_status = None
        if self.pk:
            old_status = PaymentProof.objects.filter(pk=self.pk).values_list("status", flat=True).first()

        super().save(*args, **kwargs)

        # TRIGGER: Create Receipt on Approval
        if self.status == "APPROVED" and (old_status != "APPROVED"):
            fee = self.fee
            total_payable = fee.amount + fee.refresh_late_fee(save=False)
            fee.amount_paid = total_payable
            fee.is_paid = True
            fee.is_partially_paid = False
            fee.save()
            
            # This closes the dashboard gap
            Receipt.objects.get_or_create(
                fee=fee,
                amount=total_payable,
                defaults={'payment_method': "Bank Transfer (Verified Proof)"}
            )
class SecurityDeposit(models.Model):
    STATUS_CHOICES = [("HELD", "Held by Hostel"), ("REFUNDED", "Refunded to Student"), ("FORFEITED", "Forfeited")]
    student = models.OneToOneField(StudentProfile, on_delete=models.CASCADE, related_name="security_deposit")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_paid = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="HELD")
    refund_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    def __str__(self): return f"Security: {self.student.user.username}"
