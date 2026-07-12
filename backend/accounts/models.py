# backend/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.hashers import identify_hasher, make_password


class User(AbstractUser):
    class Roles(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        CITY_MANAGER = "CITY_MANAGER", "City Manager"
        HOSTEL_MANAGER = "HOSTEL_MANAGER", "Hostel Manager"
        PARTNER = "PARTNER", "Partner"
        STAFF = "STAFF", "Staff"
        STUDENT = "STUDENT", "Student"

    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.STUDENT,
    )
    
    # Link to a hostel (for managers/staff)
    hostel = models.ForeignKey(
        "hostels.Hostel",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staff_users"
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

    def __str__(self):
        return f"{self.username} ({self.role})"

class ModulePermission(models.Model):
    """
    Dynamic permission matrix. Can be role-based or user-specific.
    """
    role = models.CharField(max_length=20, choices=User.Roles.choices, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="custom_permissions")
    module_name = models.CharField(max_length=50) 
    
    can_view = models.BooleanField(default=False)
    can_add = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        # Allows one record per (Role + Module) OR (User + Module)
        constraints = [
            models.UniqueConstraint(fields=['role', 'module_name'], name='unique_role_module', condition=models.Q(user__isnull=True)),
            models.UniqueConstraint(fields=['user', 'module_name'], name='unique_user_module', condition=models.Q(role__isnull=True)),
        ]

    def __str__(self):
        target = self.user.username if self.user else self.role
        return f"{target} - {self.module_name}"
