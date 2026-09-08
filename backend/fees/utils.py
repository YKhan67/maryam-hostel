# backend/fees/utils.py

from datetime import date, timedelta
from decimal import Decimal

from fees.models import FeeRule, MonthlyFee


def due_date_for_month(month: date, due_day: int) -> date:
  """
  Given a billing month (first-of-month date) and a configured due day,
  return the actual due date - clamped to the last day of the month if
  due_day doesn't exist in that month (e.g. the 31st in February).

  Shared by MonthlyFee.get_due_date() and compute_late_fee_for_record()
  so this math only lives in one place.
  """
  year, m = month.year, month.month
  try:
    return date(year, m, due_day)
  except ValueError:
    if m == 12:
      next_month = date(year + 1, 1, 1)
    else:
      next_month = date(year, m + 1, 1)
    return next_month - timedelta(days=1)


def late_fee_for_days(rule: FeeRule, days_late: int) -> Decimal:
  """
  Pure fine calculation given a rule and how many days late something is.
  Shared by FeeRule.compute_late_fee() and compute_late_fee_for_record()
  so the FIXED vs PER_DAY branching only lives in one place.
  """
  if days_late <= 0:
    return Decimal("0")
  if rule.late_fee_type == "FIXED":
    return rule.fixed_amount
  if rule.late_fee_type == "PER_DAY":
    return rule.per_day_amount * days_late
  return Decimal("0")


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

  # due_day=0 is a legitimate (if unusual) configured value - `rule.due_day or 4`
  # would previously treat it as falsy and silently override it with 4. Use an
  # explicit None check instead so a real 0 is respected.
  due_day = rule.due_day if rule.due_day is not None else 4
  due_date = due_date_for_month(fee.month, due_day)

  if on_date <= due_date:
    return Decimal("0")

  days_late = (on_date - due_date).days
  return late_fee_for_days(rule, days_late)
