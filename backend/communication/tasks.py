from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Ticket, SLASetting
from fees.whatsapp import send_whatsapp_text

@shared_task
def check_ticket_slas():
    """
    Periodic task to check for tickets that have exceeded their SLA.
    """
    # 1. Get all open/in-progress tickets
    open_tickets = Ticket.objects.filter(status__in=['OPEN', 'IN_PROGRESS'])
    
    # 2. Get SLA settings as a dictionary for fast lookup
    sla_map = {s.category: s.response_time_hours for s in SLASetting.objects.all()}
    default_sla = 3
    
    now = timezone.now()
    escalated_count = 0
    
    for ticket in open_tickets:
        sla_hours = sla_map.get(ticket.category, default_sla)
        limit_time = ticket.created_at + timedelta(hours=sla_hours)
        
        if now > limit_time and not ticket.is_escalated:
            # Escalation Logic
            ticket.is_escalated = True
            ticket.save(update_fields=['is_escalated'])
            
            # Notify Warden/Manager
            notify_supervisor_of_escalation(ticket)
            escalated_count += 1
            
    return f"Checked {open_tickets.count()} tickets, escalated {escalated_count}."

def notify_supervisor_of_escalation(ticket):
    """
    Sends WhatsApp alert to the supervisor.
    """
    # Find a superuser or the specific hostel manager
    from accounts.models import User
    manager = User.objects.filter(role='SUPER_ADMIN').first()
    
    if manager and hasattr(manager, 'student_profile'):
        phone = manager.student_profile.whatsapp or manager.student_profile.mobile
    else:
        # Fallback if no profile is linked to admin (typical for staff users)
        # You should ensure your management users have their phones recorded somewhere
        phone = "923312754995" # Your management number as fallback
        
    msg = (
        f"🚨 *SLA ESCALATION ALERT*\n\n"
        f"Ticket #{ticket.id} ({ticket.category}) is OVERDUE.\n"
        f"Student: {ticket.student.user.get_full_name()}\n"
        f"Subject: {ticket.subject}\n"
        f"Time Elapsed: Over {SLASetting.objects.get(category=ticket.category).response_time_hours} hours."
    )
    
    send_whatsapp_text(phone, msg)
