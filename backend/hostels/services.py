from datetime import date

from django.core.exceptions import ValidationError
from django.db import transaction

from .models import Bed, BedAllocation, StudentProfile


def _bed_hostel_id(bed):
    return bed.room.floor.building.hostel_id


@transaction.atomic
def allocate_bed(student, bed, move_in_date=None, created_by=None, reason="", notes=""):
    move_in_date = move_in_date or date.today()
    locked_student = StudentProfile.objects.select_for_update().select_related("bed").get(pk=student.pk)
    locked_bed = Bed.objects.select_for_update().select_related("room__floor__building").get(pk=bed.pk)

    if not locked_student.hostel_id:
        raise ValidationError("Student must belong to a hostel before a bed can be assigned.")
    if _bed_hostel_id(locked_bed) != locked_student.hostel_id:
        raise ValidationError("Student and bed must belong to the same hostel.")
    if not locked_student.is_active:
        raise ValidationError("An inactive student cannot receive a bed.")

    current_allocation = BedAllocation.objects.select_for_update().filter(
        student=locked_student, is_active=True
    ).first()
    if current_allocation and current_allocation.bed_id != locked_bed.pk:
        raise ValidationError("Student already has another active bed. Use transfer instead.")

    current_bed = locked_student.bed
    if current_bed and current_bed.pk != locked_bed.pk:
        raise ValidationError("Student already has another bed. Use transfer instead.")

    other_student = StudentProfile.objects.select_for_update().filter(bed=locked_bed).exclude(pk=locked_student.pk).first()
    if other_student:
        raise ValidationError("This bed is already assigned to another student.")

    other_allocation = BedAllocation.objects.select_for_update().filter(
        bed=locked_bed, is_active=True
    ).exclude(student=locked_student).first()
    if other_allocation:
        raise ValidationError("This bed has another active allocation.")

    if not current_allocation:
        current_allocation = BedAllocation.objects.create(
            student=locked_student,
            bed=locked_bed,
            move_in_date=move_in_date,
            reason=reason,
            notes=notes,
            created_by=created_by,
        )

    locked_student.bed = locked_bed
    locked_student.save(update_fields=["bed"])
    Bed.objects.filter(pk=locked_bed.pk).update(is_occupied=True)
    return current_allocation


@transaction.atomic
def release_bed(student, move_out_date=None, created_by=None, reason="", notes=""):
    move_out_date = move_out_date or date.today()
    locked_student = StudentProfile.objects.select_for_update().select_related("bed").get(pk=student.pk)
    current_bed = locked_student.bed
    if not current_bed:
        return None

    allocation = BedAllocation.objects.select_for_update().filter(
        student=locked_student, is_active=True
    ).first()
    if allocation:
        if move_out_date < allocation.move_in_date:
            raise ValidationError("Move-out date must be on or after move-in date.")
        allocation.move_out_date = move_out_date
        allocation.is_active = False
        if reason:
            allocation.reason = reason
        if notes:
            allocation.notes = notes
        allocation.save(update_fields=["move_out_date", "is_active", "reason", "notes"])

    bed_id = current_bed.pk
    locked_student.bed = None
    locked_student.save(update_fields=["bed"])
    Bed.objects.filter(pk=bed_id).update(is_occupied=False)
    return allocation


@transaction.atomic
def transfer_bed(student, new_bed, move_in_date=None, created_by=None, reason="", notes=""):
    move_in_date = move_in_date or date.today()
    locked_student = StudentProfile.objects.select_for_update().select_related("bed").get(pk=student.pk)
    old_bed = locked_student.bed
    if old_bed and old_bed.pk == new_bed.pk:
        return allocate_bed(locked_student, new_bed, move_in_date, created_by, reason, notes)

    release_bed(locked_student, move_out_date=move_in_date, created_by=created_by, reason=reason, notes=notes)
    allocation = allocate_bed(
        locked_student,
        new_bed,
        move_in_date=move_in_date,
        created_by=created_by,
        reason=reason,
        notes=notes,
    )
    if old_bed:
        allocation.previous_bed = old_bed
        allocation.save(update_fields=["previous_bed"])
    return allocation


def synchronize_occupancy_flags():
    assigned_bed_ids = set(
        StudentProfile.objects.filter(bed__isnull=False).values_list("bed_id", flat=True)
    )
    occupied_count = Bed.objects.filter(pk__in=assigned_bed_ids).update(is_occupied=True)
    vacant_count = Bed.objects.exclude(pk__in=assigned_bed_ids).update(is_occupied=False)
    return {"occupied": occupied_count, "vacant": vacant_count}
