from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import HttpResponse

from .models import EmployeeProfile, SalaryAdvance, PayrollRecord, SalarySlip
from .serializers import (
    EmployeeProfileSerializer, SalaryAdvanceSerializer, 
    PayrollRecordSerializer, SalarySlipSerializer
)
from .services import generate_monthly_payroll

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import io

class EmployeeProfileViewSet(viewsets.ModelViewSet):
    queryset = EmployeeProfile.objects.all()
    serializer_class = EmployeeProfileSerializer
    permission_classes = [IsAuthenticated]

class SalaryAdvanceViewSet(viewsets.ModelViewSet):
    queryset = SalaryAdvance.objects.all()
    serializer_class = SalaryAdvanceSerializer
    permission_classes = [IsAuthenticated]

class PayrollRecordViewSet(viewsets.ModelViewSet):
    """
    Main Payroll Management API - Full Audit Trail.
    """
    # We fetch ALL records, sorted by the date they were created (newest first)
    queryset = PayrollRecord.objects.all().order_by("-created_at")
    serializer_class = PayrollRecordSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def generate_draft(self, request):
        month = request.data.get("month")
        target_date = timezone.localdate()
        if month:
            from datetime import datetime
            target_date = datetime.strptime(month, "%Y-%m-%d").date()
            
        payroll, msg = generate_monthly_payroll(target_date)
        if not payroll: return Response({"detail": msg}, status=400)
        return Response(PayrollRecordSerializer(payroll).data)

    @action(detail=True, methods=['post'])
    def authorize(self, request, pk=None):
        payroll = self.get_object()
        payroll.status = 'APPROVED'
        payroll.authorized_by = request.user
        payroll.save()
        return Response({"status": "Authorized"})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        payroll = self.get_object()
        payroll.status = 'REJECTED'
        payroll.save()
        return Response({"status": "Cancelled"})

    @action(detail=True, methods=['post'])
    def disburse(self, request, pk=None):
        payroll = self.get_object()
        payroll.status = 'PAID'
        payroll.save()
        for slip in payroll.slips.all():
            SalaryAdvance.objects.filter(employee=slip.employee, is_deducted=False).update(is_deducted=True)
            slip.is_disbursed = True
            slip.disbursed_at = timezone.now()
            slip.save()
        return Response({"status": "Disbursed"})

class SalarySlipViewSet(viewsets.ModelViewSet):
    queryset = SalarySlip.objects.all()
    serializer_class = SalarySlipSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        slip = self.get_object()
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="PaySlip_{slip.id}.pdf"'
        doc = SimpleDocTemplate(response, pagesize=A4); elements = []; styles = getSampleStyleSheet()
        elements.append(Paragraph(f"<b>MARYAM GIRLS HOSTEL</b>", styles['Title']))
        elements.append(Paragraph(f"Official Pay-slip", styles['Heading2'])); elements.append(Spacer(1, 20))
        data = [
            ["Name:", slip.employee.user.get_full_name(), "Month:", slip.payroll_master.month.strftime("%B %Y")],
            ["Earnings:", f"Rs {slip.net_salary:,.0f}", "Status:", "VERIFIED"]
        ]
        t = Table(data); t.setStyle(TableStyle([('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'), ('GRID', (0,0), (-1,-1), 0.5, colors.grey)]))
        elements.append(t); doc.build(elements); return response
