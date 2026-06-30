# backend/hostels/signals.py
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import StudentProfile, Hostel

User = settings.AUTH_USER_MODEL


@receiver(post_save, sender=User)
def create_student_profile_on_user_save(sender, instance, created, **kwargs):
    """
    Whenever a User with role 'STUDENT' is created via admin or code,
    ensure a StudentProfile exists so fees/hostel modules can see them.
    """
    # only for newly created users
    if not created:
        return

    role = getattr(instance, "role", None)
    if role != "STUDENT":
        return

    # Try to pick a default hostel (if any). You can remove this if you
    # prefer to set hostel manually later.
    default_hostel = Hostel.objects.first()

    defaults = {}
    if default_hostel is not None:
        defaults["hostel"] = default_hostel

    StudentProfile.objects.get_or_create(user=instance, defaults=defaults)
