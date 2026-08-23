from celery import shared_task
from django.db.models import Sum
from django.db.models.functions import Coalesce
from .models import Item, Purchase, Consumption
from fees.whatsapp import send_whatsapp_text

@shared_task
def check_low_stock_alerts():
    """
    Checks if any active items have fallen below their reorder levels.
    Sends WhatsApp reminders to management if they have.
    """
    items = Item.objects.filter(is_active=True, reorder_level__gt=0)
    low_stock_items = []

    for item in items:
        # Calculate current stock: total approved purchases - total consumptions
        total_purchased = Purchase.objects.filter(item=item, status='APPROVED').aggregate(total=Coalesce(Sum('quantity'), 0.0))['total']
        total_consumed = Consumption.objects.filter(item=item).aggregate(total=Coalesce(Sum('quantity'), 0.0))['total']
        current_stock = total_purchased - total_consumed

        if current_stock <= item.reorder_level:
            low_stock_items.append({
                'name': item.name,
                'unit': item.unit.name,
                'stock': current_stock,
                'reorder': item.reorder_level
            })

    if low_stock_items:
        notify_management_of_low_stock(low_stock_items)
        return f"Alerted for {len(low_stock_items)} items."
    
    return "All stock levels healthy."

def notify_management_of_low_stock(items_list):
    """
    Builds and sends the WhatsApp message.
    """
    msg = "⚠️ *LOW STOCK ALERT - Maryam Hostel*\n\n"
    msg += "The following items need re-ordering:\n\n"
    
    for item in items_list:
        msg += f"• *{item['name']}*: {float(item['stock']):.2f} left (Reorder at {float(item['reorder']):.2f} {item['unit']})\n"
    
    msg += "\n💡 Please check the Smart Re-order Sheet in your portal for best vendor prices."
    
    # Fallback management number
    notify_phone = "923312754995" 
    send_whatsapp_text(notify_phone, msg)
