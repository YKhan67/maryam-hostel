# backend/fees/services.py

from datetime import date
from django.db import transaction
from hostels.models import StudentProfile
from .models import FeeHead, MonthlyFee, FeeRule


def get_month_start(target_date: date) -> date:
    """Return first day of the month for a given date."""
    return date(target_date.year, target_date.month, 1)


@transaction.atomic
def generate_monthly_fees(for_date: date | None = None, dry_run: bool = False) -> int:
    """
    Generate MonthlyFee entries for all active students for a given month.

    - Uses FeeHead.default_amount by default.
    - For 'Rent': If student has a room with base_rent, that will override.
    - Avoids duplicates (using get_or_create).
    - Returns count of created entries.
    """
    if for_date is None:
        for_date = date.today()

    month_start = get_month_start(for_date)

    fee_heads = FeeHead.objects.filter(is_recurring=True, frequency="MONTHLY")
    students = StudentProfile.objects.filter(is_active=True).select_related("bed__room")

    created_count = 0

    for student in students:
        for fee_head in fee_heads:
            amount = fee_head.default_amount

            # If fee head is Rent → get base_rent from room
            if fee_head.name.lower() == "rent" and student.bed:
                room = student.bed.room
                if room and room.base_rent:
                    amount = room.base_rent

            obj, created = MonthlyFee.objects.get_or_create(
                student=student,
                fee_head=fee_head,
                month=month_start,
                defaults={"amount": amount},
            )

            # Optional: update amount if changed later
            if not created and obj.amount != amount:
                obj.amount = amount
                obj.save()

            if created:
                created_count += 1

    return created_count


def apply_late_fees(for_date: date | None = None) -> int:
    """
    Apply late fees to unpaid MonthlyFee records based on FeeRule.
    Returns number of updated entries.
    """
    if for_date is None:
        for_date = date.today()

    updated_count = 0
    unpaid_fees = MonthlyFee.objects.filter(is_paid=False).select_related("fee_head")

    for mf in unpaid_fees:
        rule = FeeRule.objects.filter(fee_head=mf.fee_head).first()
        if not rule:
            continue

        # Construct due date
        try:
            due_date = date(mf.month.year, mf.month.month, rule.due_day)
        except ValueError:
            continue  # Invalid due date (e.g., Feb 30)

        if for_date <= due_date:
            continue  # Not yet late

        days_late = (for_date - due_date).days
        if days_late <= 0:
            continue

        # Calculate late fee
        if rule.late_fee_type == "FIXED":
            new_late_fee = rule.fixed_amount
        else:  # PER_DAY
            new_late_fee = rule.per_day_amount * days_late

        if mf.late_fee_applied != new_late_fee:
            mf.late_fee_applied = new_late_fee
            mf.save()
            updated_count += 1

    return updated_count
