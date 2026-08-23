# backend/hostels/signals.py
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

User = settings.AUTH_USER_MODEL


@receiver(post_save, sender=User)
def create_student_profile_on_user_save(sender, instance, created, **kwargs):
    """
    Avoid creating a partial StudentProfile before the real profile payload is available.
    Student profiles are created explicitly in the user profile serializer when all required
    profile data has been supplied.
    """
    return
