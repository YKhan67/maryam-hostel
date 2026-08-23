from django.db import migrations, models
import django.utils.timezone

class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0002_add_created_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="sale_price",
            field=models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="asset",
            name="sold_date",
            field=models.DateField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="asset",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]