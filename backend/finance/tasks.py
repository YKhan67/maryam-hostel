from celery import shared_task
from .models import Asset
from decimal import Decimal

@shared_task
def run_monthly_depreciation():
    """
    Background task to reduce the book value of all active assets.
    Runs on the 1st of every month.
    """
    assets = Asset.objects.filter(status__in=['ACTIVE', 'MAINTENANCE'])
    updated_count = 0

    for asset in assets:
        rate = asset.category.depreciation_rate_annual
        if rate <= 0:
            continue
            
        # Monthly depreciation amount based on purchase price (Straight Line)
        monthly_drop = (asset.purchase_price * (rate / Decimal('100.0'))) / Decimal('12.0')
        
        # New value cannot be less than 0
        new_value = max(Decimal('0.0'), asset.current_value - monthly_drop)
        
        asset.current_value = new_value
        asset.save(update_fields=['current_value', 'updated_at'])
        updated_count += 1

    return f"Depreciation applied to {updated_count} assets."
