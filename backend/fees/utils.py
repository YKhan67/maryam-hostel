# backend/fees/utils.py

from datetime import date
from decimal import Decimal

from fees.models import FeeRule, MonthlyFee


def compute_late_fee_for_record(fee: MonthlyFee, on_date: date | None = None) -> Decimal:
  """
  Compute late fee for this MonthlyFee as of 'on_date' based on FeeRule.
  This does NOT write anything to the DB.
  """
  if on_date is None:
    on_date = date.today()

  # Find rule for this fee head (we assume at most one)
  rule = FeeRule.objects.filter(fee_head=fee.fee_head).first()
  if rule is None:
    return Decimal("0")

  # month is first of month
  base_month = fee.month
  year, month = base_month.year, base_month.month
  due_day = rule.due_day or 4

  try:
    due_date = date(year, month, due_day)
  except ValueError:
    # If invalid (e.g. 31st Feb), fallback to last day of month
    if month == 12:
      next_month = date(year + 1, 1, 1)
    else:
      next_month = date(year, month + 1, 1)
    from datetime import timedelta
    due_date = next_month - timedelta(days=1)

  if on_date <= due_date:
    return Decimal("0")

  days_late = (on_date - due_date).days
  if days_late <= 0:
    return Decimal("0")

  if rule.late_fee_type == "FIXED":
    return rule.fixed_amount

  if rule.late_fee_type == "PER_DAY":
    return rule.per_day_amount * days_late

  return Decimal("0")
