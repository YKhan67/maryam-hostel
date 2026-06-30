# backend/fees/management/commands/apply_late_fees.py
from datetime import datetime
from django.core.management.base import BaseCommand

from fees.services import apply_late_fees


class Command(BaseCommand):
    help = "Apply late fees to unpaid MonthlyFee records based on FeeRule."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            type=str,
            help="Date in YYYY-MM-DD format (default: today)",
        )

    def handle(self, *args, **options):
        date_str = options.get("date")

        if date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                self.stderr.write(self.style.ERROR("Invalid date format. Use YYYY-MM-DD"))
                return
        else:
            target_date = datetime.today().date()

        updated = apply_late_fees(for_date=target_date)

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated late fees for {updated} MonthlyFee records as of {target_date}."
            )
        )
