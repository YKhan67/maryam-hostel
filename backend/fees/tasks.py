from celery import shared_task
from datetime import date
from decimal import Decimal
from django.utils import timezone
from .models import MonthlyFee, FeeHead
from hostels.models import StudentProfile
from .whatsapp import send_whatsapp_text

@shared_task
def send_pending_fee_reminders(fee_ids, on_date_str=None):
    """
    Asynchronous task to send WhatsApp reminders.
    """
    if on_date_str:
        on_date = date.fromisoformat(on_date_str)
    else:
        on_date = timezone.localdate()
        
    qs = MonthlyFee.objects.filter(id__in=fee_ids).select_related("student")
    sent_count = 0
    
    for fee in qs:
        phone = fee.student.whatsapp or fee.student.mobile
        if phone:
            msg = fee.build_whatsapp_text(on_date=on_date)
            if send_whatsapp_text(phone, msg):
                sent_count += 1
    
    return f"Sent {sent_count} reminders."

@shared_task
def generate_monthly_fees_task(year, month, student_ids=None):
    """
    Asynchronous task to generate monthly fees.
    """
    target_month = date(year, month, 1)
    fee_heads = FeeHead.objects.filter(is_recurring=True, frequency="MONTHLY")
    
    students = StudentProfile.objects.filter(is_active=True)
    if student_ids:
        students = students.filter(id__in=student_ids)
        
    created_count = 0
    for student in students:
        for head in fee_heads:
            _, created = MonthlyFee.objects.get_or_create(
                student=student,
                fee_head=head,
                month=target_month,
                defaults={"amount": head.default_amount, "is_paid": False}
            )
            if created:
                created_count += 1
                
    return f"Created {created_count} fee records for {target_month:%B %Y}."
