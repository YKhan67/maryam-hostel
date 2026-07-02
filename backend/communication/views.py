import json
import logging
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Ticket, SLASetting
from .serializers import TicketSerializer, SLASettingSerializer
from hostels.models import StudentProfile
from fees.whatsapp import send_whatsapp_text
from accounts.models import User

logger = logging.getLogger(__name__)

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['SUPER_ADMIN', 'CITY_MANAGER']:
            return Ticket.objects.all()
        elif user.role == 'STUDENT':
            return Ticket.objects.filter(student__user=user)
        elif user.role in ['HOSTEL_MANAGER', 'PARTNER', 'STAFF'] and user.hostel:
            return Ticket.objects.filter(hostel=user.hostel)
        
        # Staff see tickets assigned to them or unassigned tickets in their category (fallback)
        return Ticket.objects.filter(Q(assigned_to=user) | Q(assigned_to__isnull=True))

    def perform_create(self, serializer):
        serializer.save()

class SLASettingViewSet(viewsets.ModelViewSet):
    queryset = SLASetting.objects.all()
    serializer_class = SLASettingSerializer
    permission_classes = [permissions.IsAdminUser]

class WhatsAppWebhookView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        mode = request.query_params.get('hub.mode')
        token = request.query_params.get('hub.verify_token')
        challenge = request.query_params.get('hub.challenge')
        if mode == 'subscribe' and token == 'maryam_hostel_secret_token':
            return HttpResponse(challenge)
        return HttpResponse('Verification failed', status=403)

    def post(self, request):
        data = request.data
        try:
            entries = data.get('entry', [])
            for entry in entries:
                for change in entry.get('changes', []):
                    value = change.get('value', {})
                    messages = value.get('messages', [])
                    for message in messages:
                        from_phone = message.get('from')
                        text_body = message.get('text', {}).get('body', '').strip()
                        
                        student = StudentProfile.objects.filter(
                            Q(mobile=from_phone) | Q(whatsapp=from_phone)
                        ).first()
                        
                        if student:
                            self.handle_student_message(student, text_body)
                        else:
                            logger.warning(f"Message from unknown number: {from_phone}")
        except Exception as e:
            logger.error(f"Error parsing WhatsApp message: {str(e)}")
        return Response({"status": "received"})

    def handle_student_message(self, student, text):
        text_lower = text.lower()
        category = 'MANAGEMENT'
        subject = "New Inquiry"
        
        if any(word in text_lower for word in ['repair', 'fix', 'broken', 'working', 'light', 'fan']):
            category = 'MAINTENANCE'
            subject = "Maintenance Request"
        elif any(word in text_lower for word in ['fee', 'pay', 'waiver', 'bill', 'receipt']):
            category = 'FEES'
            subject = "Fee/Payment Query"
        elif any(word in text_lower for word in ['emergency', 'urgent', 'help', 'danger']):
            category = 'EMERGENCY'
            subject = "Emergency Alert"

        ticket = Ticket.objects.create(
            student=student,
            hostel=student.hostel,
            category=category,
            subject=subject,
            description=text,
            status='OPEN'
        )
        
        # Notify Staff
        self.notify_staff(ticket)

    def notify_staff(self, ticket):
        """
        Notify relevant staff member about the new ticket.
        """
        # Find staff based on category
        staff_query = User.objects.filter(is_active=True)
        if ticket.category == 'MAINTENANCE':
            staff_query = staff_query.filter(role='STAFF') # Or specialized role if added
        elif ticket.category == 'FEES':
            staff_query = staff_query.filter(role='HOSTEL_MANAGER')
            
        staff_member = staff_query.first()
        
        # Fallback number if no staff found or for demo
        notify_phone = "923312754995" 
        
        # In a real professional setup, you'd have staff phone numbers in their profiles
        # For now, let's build the notification message
        msg = (
            f"📥 *NEW TICKET: {ticket.category}*\n\n"
            f"Student: {ticket.student.user.get_full_name()}\n"
            f"Room: {getattr(ticket.student.room, 'number', 'N/A')}\n"
            f"Issue: {ticket.description}\n\n"
            f"Please respond within {SLASetting.objects.filter(category=ticket.category).first().response_time_hours if SLASetting.objects.filter(category=ticket.category).exists() else 3} hours."
        )
        
        send_whatsapp_text(notify_phone, msg)
