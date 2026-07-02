from django.db import models
from hostels.models import Hostel

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Unit(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

class Item(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="items")
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name="items")
    reorder_level = models.DecimalField(max_digits=12, decimal_places=3, default=0, help_text="Alert when stock falls below this")
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("name", "category", "unit")

    def __str__(self):
        return f"{self.name} ({self.unit.name})"

class Vendor(models.Model):
    name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    whatsapp = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Purchase(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    hostel = models.ForeignKey(Hostel, on_delete=models.PROTECT, related_name="purchases")
    date = models.DateField()
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="purchases")
    invoice_no = models.CharField(max_length=100, blank=True)
    
    # Visual Proof
    invoice_photo = models.ImageField(upload_to='inventory/purchases/invoices/', null=True, blank=True)
    items_photo = models.ImageField(upload_to='inventory/purchases/items/', null=True, blank=True)

    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="purchases")
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    price_per_unit = models.DecimalField(max_digits=12, decimal_places=2)

    # Approval Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    approved_by = models.ForeignKey(
        "accounts.User", 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name="approved_purchases"
    )
    rejection_remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_cost(self):
        return self.quantity * self.price_per_unit

    def __str__(self):
        return f"{self.date} {self.hostel.code} {self.item.name} x {self.quantity}"

class Consumption(models.Model):
    """
    Tracks daily usage of items from the inventory.
    """
    hostel = models.ForeignKey(Hostel, on_delete=models.PROTECT, related_name="consumptions")
    date = models.DateField()
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="consumptions")
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    
    # Visual Proof
    photo = models.ImageField(upload_to='inventory/consumptions/', null=True, blank=True)

    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} {self.hostel.code} consumed {self.quantity} {self.item.unit.name} of {self.item.name}"
