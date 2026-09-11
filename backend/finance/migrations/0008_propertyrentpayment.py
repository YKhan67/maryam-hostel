from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("finance", "0007_propertysharedcost"),
    ]

    operations = [
        migrations.CreateModel(
            name="PropertyRentPayment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=15)),
                ("paid_on", models.DateField()),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("accrual", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payments", to="finance.propertyrentaccrual")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="property_rent_payments", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-paid_on", "-created_at"]},
        ),
    ]
