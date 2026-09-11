from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hostels", "0008_backfill_bed_allocations"),
    ]

    operations = [
        migrations.AddField(
            model_name="building",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="floor",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="room",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="bed",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
    ]
