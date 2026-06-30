from django.db import models

# Create your models here.

# backend/hostels/models.py
from django.db import models
from django.conf import settings

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

class Building(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="buildings")
    name = models.CharField(max_length=100)  # e.g. Block A, Main, etc.

    class Meta:
        unique_together = ("hostel", "name")

    def __str__(self):
        return f"{self.hostel.code} - {self.name}"

class Floor(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="floors")
    number = models.IntegerField()  # e.g. 0 = Ground, 1 = First, etc.

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

    class Meta:
        unique_together = ("floor", "number")

    def __str__(self):
        return f"{self.floor.building.hostel.code} - {self.number}"

class Bed(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="beds")
    label = models.CharField(max_length=10)  # e.g. A, B, C
    is_occupied = models.BooleanField(default=False)

    class Meta:
        unique_together = ("room", "label")

    def __str__(self):
        return f"{self.room} - Bed {self.label}"

class StudentProfile(models.Model):
    """
    Separate profile linked to User with role=STUDENT.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    hostel = models.ForeignKey(Hostel, on_delete=models.PROTECT, related_name="students")
    bed = models.OneToOneField(Bed, on_delete=models.PROTECT, related_name="student", null=True, blank=True)

    # Personal
    mobile = models.CharField(max_length=20)
    whatsapp = models.CharField(max_length=20, blank=True)
    guardian_name = models.CharField(max_length=100, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    college_name = models.CharField(max_length=150, blank=True)
    course = models.CharField(max_length=150, blank=True)
    year = models.CharField(max_length=20, blank=True)

    is_active = models.BooleanField(default=True)
    joined_on = models.DateField(null=True, blank=True)
    left_on = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.hostel.code}"

