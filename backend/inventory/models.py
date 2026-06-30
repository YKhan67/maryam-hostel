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
    hostel = models.ForeignKey(Hostel, on_delete=models.PROTECT, related_name="purchases")
    date = models.DateField()
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="purchases")
    invoice_no = models.CharField(max_length=100, blank=True)

    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="purchases")
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    price_per_unit = models.DecimalField(max_digits=12, decimal_places=2)

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
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} {self.hostel.code} consumed {self.quantity} {self.item.unit.name} of {self.item.name}"
