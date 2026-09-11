from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("fees", "0002_monthlyfee_fine_waived_amount_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="monthlyfee",
            name="fine_paid",
            field=models.BooleanField(default=True),
        ),
    ]