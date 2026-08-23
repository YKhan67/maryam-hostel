# Generated migration for new student profile fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hostels', '0004_studentprofile_parent_link_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='guardian_nic_number',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='parent_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='parent_nic_number',
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
