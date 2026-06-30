# backend/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.hashers import identify_hasher, make_password


class User(AbstractUser):
    class Roles(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        CITY_MANAGER = "CITY_MANAGER", "City Manager"
        HOSTEL_MANAGER = "HOSTEL_MANAGER", "Hostel Manager"
        STAFF = "STAFF", "Staff"
        STUDENT = "STUDENT", "Student"

    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.STUDENT,
    )
    
    def save(self, *args, **kwargs):
        """
        Ensure password is always hashed before saving:
        - If it's already a valid hash, do nothing
        - If it's plain text, convert to a hash
        """
        if self.password:
            try:
                # If this succeeds, password is already hashed
                identify_hasher(self.password)
            except ValueError:
                # Not a recognized hash → treat it as plain text
                self.password = make_password(self.password)

        super().save(*args, **kwargs)

    # Optional link to a hostel (for managers/staff)
    # We define Hostel later and can add a ForeignKey if needed
    # hostel = models.ForeignKey("hostels.Hostel", null=True, blank=True,
    #                            on_delete=models.SET_NULL, related_name="users")

    def __str__(self):
        return f"{self.username} ({self.role})"
