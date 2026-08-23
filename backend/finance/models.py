from django.db import models
from django.conf import settings
from hostels.models import Hostel

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
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    remaining_amount = models.DecimalField(max_digits=15, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    is_settled = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} - {self.remaining_amount} due"
