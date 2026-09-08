# backend/fees/services.py

from datetime import date
from decimal import Decimal
from django.db import transaction
from hostels.models import StudentProfile
from .models import FeeHead, MonthlyFee, FeeRule, StudentUtilityBill


def get_month_start(target_date: date) -> date:
    """Return first day of the month for a given date."""
    return date(target_date.year, target_date.month, 1)


@transaction.atomic
def generate_monthly_fees(for_date: date | None = None, dry_run: bool = False) -> int:
    """
    Generate MonthlyFee entries for all active students for a given month,
    plus a matching StudentUtilityBill snapshot for that month's utility charge.

    - Uses FeeHead.default_amount by default.
    - For 'Rent': student.monthly_rent is the source of truth when set (kept
      consistent with GenerateMonthlyFeesView in api_views.py - room.base_rent
      is no longer used here).
    - Avoids duplicates (using get_or_create).
    - Returns count of created MonthlyFee entries.
    """
    if for_date is None:
        for_date = date.today()

    month_start = get_month_start(for_date)

    fee_heads = FeeHead.objects.filter(is_recurring=True, frequency="MONTHLY")
    students = StudentProfile.objects.filter(is_active=True)

    created_count = 0

    for student in students:
        for fee_head in fee_heads:
            amount = fee_head.default_amount

            # Rent uses the student's own monthly_rent as the default/source of truth.
            if fee_head.name.lower() == "rent" and student.monthly_rent:
                amount = student.monthly_rent

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

        # Snapshot this month's utility bill so it has real per-month history
        # instead of only ever reflecting whatever's "currently active".
        utility_amount = Decimal(str(student.calculate_active_utility_bill()))
        StudentUtilityBill.objects.get_or_create(
            student=student,
            month=month_start,
            defaults={"amount": utility_amount},
        )

    return created_count


def apply_late_fees(for_date: date | None = None) -> int:
    """
    Apply late fees to unpaid MonthlyFee records based on FeeRule.
    Returns number of updated entries.

    Automation/scheduling for this function is intentionally left as-is (not
    wired into Celery beat) - this only deduplicates the calculation itself
    to share it with fees/utils.py::compute_late_fee_for_record, since the two
    had already drifted slightly (this used date(...) directly, which raises
    on an invalid day-of-month instead of clamping to month-end). The
    "skip entirely if no rule exists" behavior below is preserved exactly.
    """
    from .utils import compute_late_fee_for_record

    if for_date is None:
        for_date = date.today()

    updated_count = 0
    unpaid_fees = MonthlyFee.objects.filter(is_paid=False).select_related("fee_head")

    for mf in unpaid_fees:
        rule = FeeRule.objects.filter(fee_head=mf.fee_head).first()
        if not rule:
            continue

        new_late_fee = compute_late_fee_for_record(mf, on_date=for_date)
        if mf.late_fee_applied != new_late_fee:
            mf.late_fee_applied = new_late_fee
            mf.save()
            updated_count += 1

    return updated_count
