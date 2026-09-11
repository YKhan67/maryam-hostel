from decimal import Decimal
from datetime import date

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

User = settings.AUTH_USER_MODEL

class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="Pakistan")

    def __str__(self):
        return f"{self.name}, {self.country}"

class Hostel(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="hostels")
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.city.name})"

class Property(models.Model):
    class PropertyType(models.TextChoices):
        HOUSE = "HOUSE", "House"
        APARTMENT = "APARTMENT", "Apartment"
        BUILDING = "BUILDING", "Standalone Building"

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="properties")
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=30)
    property_type = models.CharField(max_length=20, choices=PropertyType.choices, default=PropertyType.BUILDING)
    address = models.TextField(blank=True)
    acquisition_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("hostel", "code"), name="unique_property_code_per_hostel"),
        ]

    def __str__(self):
        return f"{self.hostel.code} - {self.name}"

class Building(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="buildings")
    property = models.ForeignKey(
        Property,
        on_delete=models.PROTECT,
        related_name="buildings",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100)  # e.g. Block A, Main, etc.
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("hostel", "name")

    def __str__(self):
        return f"{self.hostel.code} - {self.name}"

class Floor(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="floors")
    number = models.IntegerField()  # e.g. 0 = Ground, 1 = First, etc.
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("building", "number")

    def __str__(self):
        return f"{self.building} - Floor {self.number}"

class Room(models.Model):
    class RoomType(models.TextChoices):
        SINGLE = "SINGLE", "Single"
        DOUBLE = "DOUBLE", "Double"
        TRIPLE = "TRIPLE", "Triple"
        OTHER = "OTHER", "Other"

    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name="rooms")
    number = models.CharField(max_length=20)  # e.g. 301, 302B
    room_type = models.CharField(max_length=20, choices=RoomType.choices, default=RoomType.TRIPLE)
    is_ac = models.BooleanField(default=False)
    base_rent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("floor", "number")

    def __str__(self):
        return f"{self.floor.building.hostel.code} - {self.number}"

class Bed(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="beds")
    label = models.CharField(max_length=10)  # e.g. A, B, C
    is_occupied = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("room", "label")

    def __str__(self):
        return f"{self.room} - Bed {self.label}"

class StudentProfile(models.Model):
    """
    Separate profile linked to User with role=STUDENT.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    hostel = models.ForeignKey(Hostel, on_delete=models.PROTECT, related_name="students", null=True, blank=True)
    bed = models.OneToOneField(Bed, on_delete=models.PROTECT, related_name="student", null=True, blank=True)

    # Personal
    mobile = models.CharField(max_length=20)
    whatsapp = models.CharField(max_length=20)
    guardian_name = models.CharField(max_length=100)
    guardian_phone = models.CharField(max_length=20)
    guardian_nic_number = models.CharField(max_length=30, blank=True)

    # Parent/Guardian for Notifications
    parent_name = models.CharField(max_length=100, blank=True)
    parent_phone = models.CharField(max_length=20, help_text="For automated fee alerts")
    parent_whatsapp = models.CharField(max_length=20, help_text="For automated receipts")
    parent_nic_number = models.CharField(max_length=30, blank=True)

    college_name = models.CharField(max_length=150)
    nic_number = models.CharField(max_length=30)
    nic_front_picture = models.ImageField(upload_to="student/nic_front/", blank=True, null=True)
    nic_back_picture = models.ImageField(upload_to="student/nic_back/", blank=True, null=True)
    profile_picture = models.ImageField(upload_to="student/profile/", blank=True, null=True)

    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True)


    course = models.CharField(max_length=150, blank=True)
    year = models.CharField(max_length=20, blank=True)

    is_active = models.BooleanField(default=True)
    joined_on = models.DateField()
    left_on = models.DateField(null=True, blank=True)

    # Secure Parent Access
    parent_link_token = models.CharField(max_length=100, unique=True, null=True, blank=True)

    @property
    def active_utilities(self):
        return self.utilities.filter(is_active=True)

    def calculate_active_utility_bill(self):
        total = 0
        for utility in self.active_utilities.all():
            total += float(utility.amount or 0)
        return total

    def clean(self):
        super().clean()
        if self.joined_on and self.left_on and self.left_on < self.joined_on:
            raise ValidationError({"left_on": "Left on must be on or after joined on."})
    def save(self, *args, **kwargs):
        """
        Saves the profile, with enhanced logic to preserve fields like monthly_rent 
        and security_deposit when updating from an API/Serializer payload,
        preventing accidental overwrites.
        """
        # Local import to avoid a circular import (fees.models imports from hostels.models)
        from fees.models import SecurityDeposit

        # Get the update_data payload from kwargs
        update_data = kwargs.get('update_data', {})
        
        # --- Monthly Rent Update Logic (Preservation) ---
        if 'monthly_rent' in update_data:
            rent_value = update_data['monthly_rent']
            try:
                if isinstance(rent_value, str):
                    # Clean string input from frontend (removes commas/currency symbols)
                    clean_value = float(rent_value.replace(',', '').replace('$', ''))
                    new_rent = float(clean_value)
                else:
                    new_rent = float(rent_value)
                
                # Only update if the new value is different OR if the current value is None/default 0 and a non-zero value is provided
                if abs(new_rent - self.monthly_rent) > 0.001 or self.monthly_rent is None:
                    self.monthly_rent = new_rent
                    print(f"INFO: [Model Hook] Monthly rent successfully updated from {self.monthly_rent} to {new_rent}.")
                else:
                    print("INFO: [Model Hook] Monthly rent value matched existing value; no update needed.")
            except (ValueError, TypeError):
                print("WARNING: [Model Hook] Could not process monthly_rent from payload, preserving existing value.")

        # --- Security Deposit Update Logic (Preservation) ---
        if 'security_deposit' in update_data:
            deposit_value = update_data['security_deposit']
            try:
                clean_deposit = Decimal(str(deposit_value))
                
                # If security_deposit already exists (via ForeignKey), update it
                if self.security_deposit:
                    self.security_deposit.amount = clean_deposit
                    print(f"INFO: [Model Hook] Security deposit updated from {self.security_deposit.amount} to {clean_deposit}.")
                else:
                    # No existing deposit, create a new one
                    self.security_deposit = SecurityDeposit(
                        student=self,
                        amount=clean_deposit,
                        date_paid=date.today(),
                        status="HELD"
                    )
                    print(f"INFO: [Model Hook] New SecurityDeposit created with amount {clean_deposit}.")
            except (ValueError, TypeError):
                print("WARNING: [Model Hook] Could not process security_deposit from payload, preserving existing value.")

        self.full_clean()
        if not self.parent_link_token:
            import uuid
            self.parent_link_token = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.hostel.code if self.hostel else 'No Hostel'}"


class StudentUtilityCharge(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="utilities")
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.student.user.username} - {self.name} ({self.amount})"


class BedAllocation(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.PROTECT, related_name="bed_allocations")
    bed = models.ForeignKey(Bed, on_delete=models.PROTECT, related_name="allocations")
    move_in_date = models.DateField()
    move_out_date = models.DateField(null=True, blank=True)
    previous_bed = models.ForeignKey(
        Bed,
        on_delete=models.PROTECT,
        related_name="transfers_from",
        null=True,
        blank=True,
    )
    reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_bed_allocations",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-move_in_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=("student",),
                condition=models.Q(is_active=True),
                name="one_active_bed_allocation_per_student",
            ),
            models.UniqueConstraint(
                fields=("bed",),
                condition=models.Q(is_active=True),
                name="one_active_bed_allocation_per_bed",
            ),
        ]

    def clean(self):
        super().clean()
        if self.move_out_date and self.move_out_date < self.move_in_date:
            raise ValidationError({"move_out_date": "Move-out date must be on or after move-in date."})
        if self.student_id and self.bed_id:
            student_hostel_id = StudentProfile.objects.filter(pk=self.student_id).values_list("hostel_id", flat=True).first()
            bed_hostel_id = Bed.objects.filter(pk=self.bed_id).values_list("room__floor__building__hostel_id", flat=True).first()
            if student_hostel_id != bed_hostel_id:
                raise ValidationError("Student and bed must belong to the same hostel.")

