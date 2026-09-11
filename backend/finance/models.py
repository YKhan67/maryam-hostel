import builtins

from django.db import models
from django.conf import settings
from hostels.models import Hostel, Property

class AssetCategory(models.Model):
    """
    Groups like Electronics, Furniture, etc.
    Stores the annual depreciation rate (e.g. 10.0 for 10% per year).
    """
    name = models.CharField(max_length=100, unique=True)
    depreciation_rate_annual = models.DecimalField(max_digits=5, decimal_places=2, default=10.0, help_text="Percentage value (0-100)")

    def __str__(self):
        return f"{self.name} ({self.depreciation_rate_annual}%)"

class Asset(models.Model):
    """
    Represents a Fixed Asset (AC, UPS, Washing Machine, etc.)
    Now supports quantity tracking.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active & In Use'),
        ('MAINTENANCE', 'Under Repair'),
        ('SOLD', 'Sold / Disposed'),
        ('SCRAPPED', 'Scrapped / Damaged'),
    ]

    name = models.CharField(max_length=200)
    category = models.ForeignKey(AssetCategory, on_delete=models.PROTECT, related_name="assets")
    hostel = models.ForeignKey(Hostel, on_delete=models.PROTECT, related_name="assets")
    property = models.ForeignKey(Property, on_delete=models.PROTECT, related_name="assets", null=True, blank=True)
    
    serial_number = models.CharField(max_length=100, blank=True)
    
    # NEW FIELD: Defaults to 1 for all current and future assets
    quantity = models.PositiveIntegerField(default=1)
    
    purchase_date = models.DateField()
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    current_value = models.DecimalField(max_digits=12, decimal_places=2, help_text="Book value after depreciation")
    
    warranty_expiry = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    # SALES TRACKING
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    sold_date = models.DateField(null=True, blank=True)
    
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (x{self.quantity}) - {self.hostel.code}"

class PartnerCapital(models.Model):
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, limit_choices_to={'role': 'PARTNER'})
    hostel = models.ForeignKey(Hostel, on_delete=models.PROTECT, related_name="capital_investments")
    property = models.ForeignKey(Property, on_delete=models.PROTECT, related_name="capital_investments", null=True, blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    date_invested = models.DateField()
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"{self.partner.username} - {self.hostel.code} - {self.amount}"

class Liability(models.Model):
    TYPE_CHOICES = [
        ('LOAN', 'Long-term Loan'),
        ('CREDIT', 'Vendor Credit / Payable'),
        ('OTHER', 'Other Liability'),
    ]
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='CREDIT')
    hostel = models.ForeignKey(Hostel, on_delete=models.PROTECT, related_name="liabilities")
    property = models.ForeignKey(Property, on_delete=models.PROTECT, related_name="liabilities", null=True, blank=True)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    remaining_amount = models.DecimalField(max_digits=15, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    is_settled = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} - {self.remaining_amount} due"


class PropertyRentalContract(models.Model):
    property = models.ForeignKey(Property, on_delete=models.PROTECT, related_name="rental_contracts")
    landlord_name = models.CharField(max_length=200)
    landlord_contact = models.CharField(max_length=100, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    monthly_rent = models.DecimalField(max_digits=15, decimal_places=2)
    landlord_deposit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-start_date"]

    def clean(self):
        from django.core.exceptions import ValidationError
        super().clean()
        if self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "Contract end date must be on or after the start date."})

    def __str__(self):
        return f"{self.property} - {self.monthly_rent}"


class PropertySharedCost(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.PROTECT, related_name="shared_costs")
    property = models.ForeignKey(Property, on_delete=models.PROTECT, related_name="shared_costs", null=True, blank=True)
    date = models.DateField()
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-id"]

    def clean(self):
        from django.core.exceptions import ValidationError
        super().clean()
        if self.property_id and self.property.hostel_id != self.hostel_id:
            raise ValidationError({"property": "Property must belong to the selected hostel."})


class PropertyRentAccrual(models.Model):
    property = models.ForeignKey(Property, on_delete=models.PROTECT, related_name="rent_accruals")
    contract = models.ForeignKey(PropertyRentalContract, on_delete=models.PROTECT, related_name="accruals")
    month = models.DateField(help_text="First day of the accrued month")
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    paid_on = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("property", "contract", "month"), name="unique_property_rent_accrual_month"),
        ]
        ordering = ["-month"]

    @builtins.property
    def outstanding_amount(self):
        return self.amount - self.paid_amount


class PropertyRentPayment(models.Model):
    accrual = models.ForeignKey(PropertyRentAccrual, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_on = models.DateField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="property_rent_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_on", "-created_at"]

    def __str__(self):
        return f"{self.accrual.property} - {self.amount} - {self.paid_on}"


class InvestorPropertyAccess(models.Model):
    investor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="property_access")
    property = models.ForeignKey(Property, on_delete=models.PROTECT, related_name="investor_access")
    can_view_financials = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("investor", "property"), name="unique_investor_property_access"),
        ]


class InvestorPropertyOwnership(models.Model):
    investor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="property_ownerships")
    property = models.ForeignKey(Property, on_delete=models.PROTECT, related_name="investor_ownerships")
    ownership_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["property", "-effective_from"]
        constraints = [
            models.UniqueConstraint(fields=("investor", "property", "effective_from"), name="unique_investor_property_ownership_period"),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        from django.db.models import Sum
        super().clean()
        if not 0 <= self.ownership_percentage <= 100:
            raise ValidationError({"ownership_percentage": "Ownership must be between 0 and 100."})
        if self.effective_to and self.effective_to < self.effective_from:
            raise ValidationError({"effective_to": "Effective end date must be on or after the start date."})
        total = InvestorPropertyOwnership.objects.filter(
            property=self.property,
            effective_from=self.effective_from,
        ).exclude(pk=self.pk).aggregate(total=Sum("ownership_percentage"))["total"] or 0
        if total + self.ownership_percentage > 100:
            raise ValidationError("Ownership percentages for a property cannot exceed 100%.")
