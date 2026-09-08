from django.db import migrations
from django.utils import timezone


def backfill_allocations(apps, schema_editor):
    StudentProfile = apps.get_model("hostels", "StudentProfile")
    BedAllocation = apps.get_model("hostels", "BedAllocation")

    for student in StudentProfile.objects.filter(bed__isnull=False):
        BedAllocation.objects.get_or_create(
            student_id=student.pk,
            bed_id=student.bed_id,
            is_active=True,
            defaults={
                "move_in_date": student.joined_on or timezone.localdate(),
                "reason": "Backfilled from existing student bed assignment",
            },
        )


def reverse_allocations(apps, schema_editor):
    BedAllocation = apps.get_model("hostels", "BedAllocation")
    BedAllocation.objects.filter(reason="Backfilled from existing student bed assignment").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("hostels", "0007_property_building_property_bedallocation_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_allocations, reverse_allocations),
    ]
