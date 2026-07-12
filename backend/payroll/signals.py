from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EmployeeProfile

User = settings.AUTH_USER_MODEL

@receiver(post_save, sender=User)
def create_employee_profile_on_user_save(sender, instance, created, **kwargs):
    """
    Auto-creates EmployeeProfile for non-student roles.
    """
    role = getattr(instance, "role", None)
    if role and role not in ["STUDENT", "PARTNER"]:
        EmployeeProfile.objects.get_or_create(user=instance)
