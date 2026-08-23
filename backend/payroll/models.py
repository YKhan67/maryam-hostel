# backend/payroll/models.py

from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class EmployeeProfile(models.Model):
    """
    Extends User with HR and Payroll specific data.
    """
    PAY_TYPE_CHOICES = [
        ('MONTHLY', 'Fixed Monthly'),
        ('PER_TASK', 'Paid Per Task/Ticket'),
    ]   

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employee_profile")
    designation = models.CharField(max_length=100)
    pay_type = models.CharField(max_length=20, choices=PAY_TYPE_CHOICES, default='MONTHLY')

    # National identity and documentation
    nic_number = models.CharField(max_length=30, null=True, blank=True)
    nic_front_picture = models.ImageField(upload_to="employee/nic_front/", blank=True, null=True)
    nic_back_picture = models.ImageField(upload_to="employee/nic_back/", blank=True, null=True)
    profile_picture = models.ImageField(upload_to="employee/profile/", blank=True, null=True)

    # Contact Information
    mobile = models.CharField(max_length=20, blank=True, null=True)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)

    # Salary Details
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    housing_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fuel_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Task Rates (for PER_TASK employees)
    rate_per_task = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Amount per resolved ticket")

    # Banking
    bank_name = models.CharField(max_length=100, blank=True)
    iban = models.CharField(max_length=34, blank=True)

    joined_on = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.designation})"

class SalaryAdvance(models.Model):
    """
    Tracks mid-month advances to be deducted from payroll.
    """
    employee = models.ForeignKey(EmployeeProfile, on_delete=models.CASCADE, related_name="advances")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_given = models.DateField(auto_now_add=True)
    is_deducted = models.BooleanField(default=False, help_text="True if already subtracted from a pay-slip")
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"Advance: {self.employee.user.username} - {self.amount}"

class PayrollRecord(models.Model):
    """
    Master record for a month's payroll.
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING_APPROVAL', 'Awaiting Admin Approval'),
        ('APPROVED', 'Approved (Authorized)'),
        ('PAID', 'Disbursed'),
        ('REJECTED', 'Rejected'),
    ]
    
    month = models.DateField(help_text="First day of the month")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    total_net_payout = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    authorized_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Payroll {self.month:%B %Y} - {self.status}"

class SalarySlip(models.Model):
    """
    Individual salary calculation for one employee for one month.
    """
    payroll_master = models.ForeignKey(PayrollRecord, on_delete=models.CASCADE, related_name="slips")
    employee = models.ForeignKey(EmployeeProfile, on_delete=models.PROTECT)
    
    base_pay = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    task_count = models.IntegerField(default=0, help_text="Count of tickets resolved this month")
    task_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total absences/fines")
    advance_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)
    
    receipt_no = models.CharField(max_length=50, unique=True, null=True, blank=True)
    is_disbursed = models.BooleanField(default=False)
    disbursed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Auto-calculate net if not provided
        self.net_salary = (self.base_pay + self.allowances + self.task_pay + self.bonus) - (self.deductions + self.advance_deduction)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Slip: {self.employee.user.username} - {self.payroll_master.month:%b %Y}"