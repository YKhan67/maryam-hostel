# backend/fees/management/commands/generate_monthly_fees.py

from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from fees.models import FeeHead, MonthlyFee
from hostels.models import StudentProfile  # adjust import if your student model is elsewhere


def first_day_of_month(year: int, month: int) -> date:
  return date(year, month, 1)


class Command(BaseCommand):
  help = "Generate MonthlyFee records for all active students and recurring monthly fee heads."

  def add_arguments(self, parser):
    parser.add_argument(
      "--year",
      type=int,
      help="Year for which to generate fees (default: current year)",
    )
    parser.add_argument(
      "--month",
      type=int,
      help="Month (1-12) for which to generate fees (default: current month)",
    )
    parser.add_argument(
      "--dry-run",
      action="store_true",
      help="Do not write to DB, only show what would be created.",
    )

  def handle(self, *args, **options):
    today = date.today()
    year = options["year"] or today.year
    month = options["month"] or today.month
    dry_run = options["dry_run"]

    target_month = first_day_of_month(year, month)
    self.stdout.write(self.style.NOTICE(f"Generating MonthlyFee for {target_month:%B %Y}"))

    # 1) FeeHeads to consider – recurring MONTHLY fees
    fee_heads = FeeHead.objects.filter(is_recurring=True, frequency="MONTHLY")
    if not fee_heads.exists():
      self.stdout.write(self.style.WARNING("No recurring MONTHLY FeeHead found. Nothing to do."))
      return

    # 2) Students – you can filter further if you have a field like is_active=True
    students = StudentProfile.objects.all()
    total_created = 0
    skipped_existing = 0

    for student in students:
      for head in fee_heads:
        defaults = {
          "amount": head.default_amount,  # adapt if you have per-student fee amount
          "is_paid": False,
          "late_fee_applied": Decimal("0"),
        }

        if dry_run:
          exists = MonthlyFee.objects.filter(
            student=student,
            fee_head=head,
            month=target_month,
          ).exists()
          if exists:
            skipped_existing += 1
          else:
            total_created += 1
          continue

        with transaction.atomic():
          fee, created = MonthlyFee.objects.get_or_create(
            student=student,
            fee_head=head,
            month=target_month,
            defaults=defaults,
          )
          if created:
            total_created += 1
          else:
            skipped_existing += 1

    if dry_run:
      self.stdout.write(
        self.style.SUCCESS(
          f"[DRY RUN] Would create {total_created} MonthlyFee records; "
          f"skipped {skipped_existing} existing."
        )
      )
    else:
      self.stdout.write(
        self.style.SUCCESS(
          f"Created {total_created} MonthlyFee records; skipped {skipped_existing} existing."
        )
      )
