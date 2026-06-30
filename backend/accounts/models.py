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
        Ensure password is always hashed before saving, and
        keep Django's is_staff and is_superuser in sync with the Role.
        """
        # 1. Handle initial superuser created via CLI
        if self.is_superuser and self.role != self.Roles.SUPER_ADMIN:
            self.role = self.Roles.SUPER_ADMIN

        # 2. Sync Role with Django flags
        if self.role == self.Roles.SUPER_ADMIN:
            self.is_staff = True
            self.is_superuser = True
        elif self.role in [self.Roles.CITY_MANAGER, self.Roles.HOSTEL_MANAGER, self.Roles.STAFF]:
            self.is_staff = True
            # We don't automatically unset is_superuser here if it was set via CLI
            # but we ensure they are at least staff.
        else:
            # Students are not staff
            self.is_staff = False
            self.is_superuser = False

        # 3. Hash password if it's plain text
        if self.password:
            try:
                # If this succeeds, password is already hashed
                identify_hasher(self.password)
            except ValueError:
                # Not a recognized hash → treat it as plain text
                self.password = make_password(self.password)

        super().save(*args, **kwargs)

    # Link to a hostel (for managers/staff)
    hostel = models.ForeignKey(
        "hostels.Hostel",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staff_users"
    )

    def __str__(self):
        return f"{self.username} ({self.role})"
