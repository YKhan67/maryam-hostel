from decimal import Decimal

from django.db import migrations


def normalize_combined_utility_payments(apps, schema_editor):
    MonthlyFee = apps.get_model("fees", "MonthlyFee")
    StudentUtilityBill = apps.get_model("fees", "StudentUtilityBill")

    paid_bills = StudentUtilityBill.objects.filter(is_paid=True).only(
        "student_id", "month", "amount"
    )
    for bill in paid_bills.iterator():
        fees = MonthlyFee.objects.filter(
            student_id=bill.student_id,
            month=bill.month,
            is_paid=True,
        )
        for fee in fees.iterator():
            utility_included = min(fee.amount_paid, bill.amount)
            if utility_included <= Decimal("0"):
                continue
            fee.amount_paid -= utility_included
            fee.save(update_fields=["amount_paid"])


def reverse_normalize_combined_utility_payments(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("fees", "0003_monthlyfee_fine_paid"),
    ]

    operations = [
        migrations.RunPython(
            normalize_combined_utility_payments,
            reverse_code=reverse_normalize_combined_utility_payments,
        ),
    ]
