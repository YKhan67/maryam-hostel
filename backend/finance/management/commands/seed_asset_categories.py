from django.core.management.base import BaseCommand
from finance.models import AssetCategory

class Command(BaseCommand):
    help = 'Seed initial asset categories'

    def handle(self, *args, **kwargs):
        categories = [
            # Tangible Fixed Assets
            {"name": "1.1 Land, Buildings and structures", "rate": 5.0},
            {"name": "1.2 Machinery and equipment", "rate": 15.0},
            {"name": "1.3 Vehicles", "rate": 20.0},
            {"name": "1.4 Office furniture and fixtures", "rate": 10.0},
            {"name": "1.5 Computer hardware", "rate": 33.33},
            
            # Intangible Fixed Assets
            {"name": "2.1 Intellectual property", "rate": 10.0},
            {"name": "2.2 Capitalized software", "rate": 20.0},
            {"name": "2.3 Goodwill", "rate": 5.0},
            
            # Other Categories
            {"name": "3.1 Leasehold improvements", "rate": 10.0},
            {"name": "3.2 Construction in progress", "rate": 0.0},
        ]

        for cat in categories:
            obj, created = AssetCategory.objects.get_or_create(
                name=cat["name"],
                defaults={"depreciation_rate_annual": cat["rate"]}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {obj.name}'))
            else:
                self.stdout.write(f'Category already exists: {obj.name}')
