# backend/fees/api_views.py
import io
import csv
from datetime import date
from decimal import Decimal

from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Q, F, Case, When, DecimalField
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from fees.models import FeeHead, MonthlyFee, PaymentProof, SecurityDeposit, Receipt
from fees.utils import compute_late_fee_for_record
from hostels.models import StudentProfile, Hostel
from communication.models import Ticket
from inventory.models import Purchase
from .whatsapp import send_whatsapp_text
from .tasks import send_pending_fee_reminders, generate_monthly_fees_task

def first_day_of_month(year: int, month: int) -> date:
    return date(year, month, 1)

def shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    total = year * 12 + (month - 1) + delta
    new_year = total // 12
    new_month = total % 12 + 1
    return new_year, new_month

def get_filtered_fees(user, range_start=None, range_end=None):
    qs = MonthlyFee.objects.all()
    if range_start:
        qs = qs.filter(month__gte=range_start)
    if range_end:
        qs = qs.filter(month__lte=range_end)
    
    if user.role in ["HOSTEL_MANAGER", "PARTNER"] and user.hostel:
        qs = qs.filter(student__hostel=user.hostel)
    elif user.role == "STUDENT":
        qs = qs.filter(student__user=user)
        
    return qs

class CurrentMonthFeeDashboard(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        mode = (request.query_params.get("mode") or "current").lower()

        if mode == "ytd":
            year = today.year
            range_start, range_end = date(year, 1, 1), date(year, today.month, 1)
            label = f"YTD {year}"
        elif mode == "range":
            months_back = int(request.query_params.get("months", 3))
            base_year, base_month = today.year, today.month
            start_year, start_month = shift_month(base_year, base_month, -(months_back - 1))
            range_start = first_day_of_month(start_year, start_month)
            range_end = first_day_of_month(base_year, base_month)
            label = f"Last {months_back} month(s)"
        else:
            month_start = today.replace(day=1)
            range_start = range_end = month_start
            label = month_start.strftime("%B %Y")
            mode = "current"

        qs = get_filtered_fees(request.user, range_start, range_end)
        
        stats = qs.aggregate(
            total_collected=Sum(Case(When(is_paid=True, then=F('amount')), default=0, output_field=DecimalField())),
            total_outstanding=Sum(Case(When(is_paid=False, then=F('amount')), default=0, output_field=DecimalField())),
            fine_collected=Sum(Case(When(is_paid=True, then=F('late_fee_applied')), default=0, output_field=DecimalField())),
        )

        fine_outstanding = Decimal("0")
        unpaid_qs = qs.filter(is_paid=False)
        for fee in unpaid_qs:
            fine_outstanding += compute_late_fee_for_record(fee, on_date=today)

        tc = stats['total_collected'] or Decimal("0")
        to = stats['total_outstanding'] or Decimal("0")
        fc = stats['fine_collected'] or Decimal("0")

        return Response({
            "mode": mode,
            "label": label,
            "total_billed": float(tc + to),
            "total_collected": float(tc),
            "total_outstanding": float(to),
            "fine_collected": float(fc),
            "fine_outstanding": float(fine_outstanding),
            "total_fine": float(fc + fine_outstanding),
        })

class LastThreeMonthsFeeKpi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        base_year, base_month = today.year, today.month
        results = []

        for delta in [0, -1, -2]:
            year, month = shift_month(base_year, base_month, delta)
            month_start = first_day_of_month(year, month)
            qs = get_filtered_fees(request.user, month_start, month_start)
            
            stats = qs.aggregate(
                tc=Sum(Case(When(is_paid=True, then=F('amount')), default=0, output_field=DecimalField())),
                to=Sum(Case(When(is_paid=False, then=F('amount')), default=0, output_field=DecimalField())),
                fc=Sum(Case(When(is_paid=True, then=F('late_fee_applied')), default=0, output_field=DecimalField())),
            )

            fine_out = Decimal("0")
            for fee in qs.filter(is_paid=False):
                fine_out += compute_late_fee_for_record(fee, on_date=today)

            tc, to, fc = stats['tc'] or 0, stats['to'] or 0, stats['fc'] or 0

            results.append({
                "label": month_start.strftime("%b %Y"),
                "total_billed": float(tc + to),
                "total_collected": float(tc),
                "total_outstanding": float(to),
                "fine_collected": float(fc),
                "fine_outstanding": float(fine_out),
            })
        return Response(results)

class HostelIncomeSummary(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        m0 = first_day_of_month(today.year, today.month)
        m1_y, m1_m = shift_month(today.year, today.month, -1)
        m1 = first_day_of_month(m1_y, m1_m)
        m2_y, m2_m = shift_month(today.year, today.month, -2)
        m2 = first_day_of_month(m2_y, m2_m)

        qs = get_filtered_fees(request.user).filter(month__in=[m0, m1, m2], is_paid=True)

        income_qs = qs.values(
            hostel_name=F('student__hostel__name')
        ).annotate(
            total_income=Sum(F('amount') + F('late_fee_applied'), output_field=DecimalField()),
            current_month_income=Sum(
                Case(When(month=m0, then=F('amount') + F('late_fee_applied')), default=0, output_field=DecimalField())
            )
        )

        return Response([{
            "hostel": row['hostel_name'] or "Unassigned",
            "current_month_income": float(row['current_month_income'] or 0),
            "last_three_month_income": float(row['total_income'] or 0)
        } for row in income_qs])

class GenerateMonthlyFeesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}
        year = int(data.get("year", date.today().year))
        month = int(data.get("month", date.today().month))
        
        student_ids = None
        if data.get("scope") == "STUDENT":
            student_ids = [data.get("student_id")]
        
        # Trigger ASYNC task
        generate_monthly_fees_task.delay(year, month, student_ids)

        return Response({"detail": "Fee generation started in the background."})


class MarkFeesPaidView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data or {}
        today = timezone.localdate()
        
        fee_id = data.get("fee_id")
        payment_amount = Decimal(str(data.get("amount", 0)))
        
        if fee_id:
            # New Partial Payment Logic
            fee = MonthlyFee.objects.get(id=fee_id)
            fee.amount_paid += payment_amount
            
            # Auto-calculate status
            total_due = fee.amount + compute_late_fee_for_record(fee, on_date=today)
            if fee.amount_paid >= total_due:
                fee.is_paid = True
                fee.is_partially_paid = False
            else:
                fee.is_paid = False
                fee.is_partially_paid = True
            
            fee.late_fee_applied = compute_late_fee_for_record(fee, on_date=today)
            fee.save()
            
            # Generate Receipt
            if payment_amount > 0:
                Receipt.objects.create(fee=fee, amount=payment_amount)
                
            return Response({"status": "Payment recorded", "is_paid": fee.is_paid})

        # Bulk mark paid (Original fallback)
        qs = get_filtered_fees(user).filter(is_paid=False)
        if not data.get("all_months"):
            qs = qs.filter(month=date(int(data.get("year", today.year)), int(data.get("month", today.month)), 1))
        if data.get("scope") == "STUDENT":
            qs = qs.filter(student_id=data.get("student_id"))

        updated = 0
        for fee in qs:
            fee.amount_paid = fee.amount + compute_late_fee_for_record(fee, on_date=today)
            fee.is_paid = True
            fee.is_partially_paid = False
            fee.late_fee_applied = compute_late_fee_for_record(fee, on_date=today)
            fee.save()
            updated += 1
        return Response({"updated": updated})

class WaiveFineView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data or {}
        qs = get_filtered_fees(user).filter(late_fee_applied__gt=0)
        
        updated = 0
        for fee in qs:
            fee.late_fee_applied = 0
            fee.save()
            updated += 1
        return Response({"updated": updated})

class SendWhatsappPendingFeesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data or {}
        today = timezone.localdate()
        
        qs = get_filtered_fees(user).filter(is_paid=False)
        if not data.get("all_months"):
            qs = qs.filter(month=date(int(data.get("year", today.year)), int(data.get("month", today.month)), 1))
        if data.get("scope") == "STUDENT":
            qs = qs.filter(student_id=data.get("student_id"))
            
        fee_ids = list(qs.values_list('id', flat=True))
        
        # Trigger ASYNC task
        send_pending_fee_reminders.delay(fee_ids, today.isoformat())

        return Response({"detail": f"Reminders for {len(fee_ids)} fees are being sent in the background."})

class StudentLedgerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if getattr(user, 'role', None) != "STUDENT":
            return Response({"detail": "Only students can access this view."}, status=403)
        try:
            student = user.student_profile
        except:
            return Response({"error": "Student profile not found."}, status=404)

        today = timezone.localdate()
        fees = MonthlyFee.objects.filter(student=student).order_by('-month')
        
        paid_fees = Decimal("0")
        outstanding_fees = Decimal("0")
        paid_fines = Decimal("0")
        outstanding_fines = Decimal("0")
        
        ledger_entries = []
        for fee in fees:
            base_amt = fee.amount
            applied_fine = fee.late_fee_applied if fee.is_paid else compute_late_fee_for_record(fee, on_date=today)
            remarks = f"Due on {fee.get_due_date():%d %b}"
            
            if fee.is_paid:
                paid_fees += base_amt; paid_fines += applied_fine; status = "PAID"; remarks = "Verified & Settled"
            else:
                outstanding_fees += base_amt; outstanding_fines += applied_fine
                latest_proof = PaymentProof.objects.filter(fee=fee).order_by('-uploaded_on').first()
                if latest_proof:
                    if latest_proof.status == 'PENDING': status = "PENDING_VERIFICATION"; remarks = "Management is reviewing your proof"
                    elif latest_proof.status == 'REJECTED': status = "REJECTED"; remarks = f"REJECTED: {latest_proof.remarks}"
                    else: status = "OUTSTANDING"
                else: status = "OUTSTANDING"

            ledger_entries.append({
                "id": fee.id, "date": fee.month.isoformat(), "type": "MONTHLY_FEE",
                "label": f"Hostel Fee - {fee.month:%B %Y}", "fee_head_name": fee.fee_head.name,
                "amount": float(base_amt), "fine": float(applied_fine), "total": float(base_amt + applied_fine),
                "status": status, "remarks": remarks,
                "receipts": [{"id": r.id, "no": r.receipt_no, "amount": float(r.amount), "date": r.date_issued.isoformat()} for r in fee.receipts.all()]
            })

        tickets = Ticket.objects.filter(student=student).order_by('-created_at')
        ticket_data = [{"id": t.id, "category": t.category, "subject": t.subject, "status": t.status, "created_at": t.created_at.isoformat(), "is_escalated": t.is_escalated} for t in tickets]

        r_num = "Unassigned"; b_label = "N/A"
        if student.bed:
            b_label = student.bed.label
            if student.bed.room: r_num = student.bed.room.number

        return Response({
            "summary": {
                "student_id": student.id, "hostel_name": student.hostel.name if student.hostel else "N/A",
                "room_number": r_num, "bed_number": b_label,
                "total_paid": float(paid_fees + paid_fines), "total_outstanding": float(outstanding_fees + outstanding_fines),
                "paid_fees": float(paid_fees), "outstanding_fees": float(outstanding_fees),
                "paid_fines": float(paid_fines), "outstanding_fines": float(outstanding_fines),
            },
            "ledger": ledger_entries,
            "tickets": ticket_data
        })

class UnitEconomicsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today(); month_start = date(today.year, today.month, 1)
        total_rev = MonthlyFee.objects.filter(month=month_start).aggregate(s=Sum('amount'))['s'] or 0
        student_count = StudentProfile.objects.filter(is_active=True).count()
        avg_rev = float(total_rev / student_count) if student_count > 0 else 0
        total_exp = Purchase.objects.filter(date__month=today.month, date__year=today.year, status='APPROVED').annotate(c=F('quantity')*F('price_per_unit')).aggregate(s=Sum('c'))['s'] or 0
        avg_cost = float(total_exp / student_count) if student_count > 0 else 0
        return Response({"student_count": student_count, "avg_revenue": avg_rev, "avg_cost": avg_cost, "net_margin": avg_rev - avg_cost})

class SecurityDepositView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = SecurityDeposit.objects.all()
        if request.user.role in ["HOSTEL_MANAGER", "PARTNER"] and request.user.hostel:
            qs = qs.filter(student__hostel=request.user.hostel)
        return Response([{"student": d.student.user.get_full_name(), "amount": float(d.amount), "status": d.status} for d in qs])

class GenerateReceiptPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, receipt_id):
        receipt = Receipt.objects.select_related('fee__student__user', 'fee__student__hostel').get(pk=receipt_id)
        if request.user.role == 'STUDENT' and receipt.fee.student.user != request.user:
            return Response({"detail": "Unauthorized"}, status=403)
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Receipt_{receipt.receipt_no}.pdf"'
        doc = SimpleDocTemplate(response, pagesize=A4); elements = []; styles = getSampleStyleSheet()
        elements.append(Paragraph(f"<b>MARYAM GIRLS HOSTEL</b>", styles['Title']))
        elements.append(Paragraph(f"Official Payment Receipt", styles['Heading2'])); elements.append(Spacer(1, 20))
        data = [
            ["Receipt No:", receipt.receipt_no, "Date:", receipt.date_issued.strftime("%d %b %Y")],
            ["Student Name:", receipt.fee.student.user.get_full_name(), "Hostel:", receipt.fee.student.hostel.name],
            ["Payment For:", f"Fee - {receipt.fee.month:%B %Y}", "Method:", receipt.payment_method],
            ["", "", "", ""],
            ["AMOUNT PAID:", f"Rs {receipt.amount:,.2f}", "Status:", "VERIFIED"]
        ]
        t = Table(data, colWidths=[100, 150, 100, 100]); t.setStyle(TableStyle([('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'), ('GRID', (0,0), (-1,-1), 0.5, colors.grey), ('BACKGROUND', (0,4), (1,4), colors.lightgrey), ('ALIGN', (0,0), (-1,-1), 'LEFT'), ('PADDING', (0,0), (-1,-1), 10)]))
        elements.append(t); elements.append(Spacer(1, 40)); elements.append(Paragraph("This is a computer-generated receipt.", styles['Normal']))
        doc.build(elements); return response


class ParentSecureLedgerView(APIView):
    """
    Public but secure view for parents using a unique token.
    No authentication required, but token must be valid.
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            student = StudentProfile.objects.get(parent_link_token=token)
        except StudentProfile.DoesNotExist:
            return Response({"detail": "Invalid or expired access link."}, status=404)

        today = timezone.localdate()
        fees = MonthlyFee.objects.filter(student=student).order_by('-month')
        
        paid_fees = Decimal("0")
        outstanding_fees = Decimal("0")
        
        ledger_entries = []
        for fee in fees:
            base_amt = fee.amount
            applied_fine = fee.late_fee_applied if fee.is_paid else compute_late_fee_for_record(fee, on_date=today)
            
            if fee.is_paid:
                paid_fees += base_amt
                status = "PAID"
            else:
                outstanding_fees += base_amt
                status = "OUTSTANDING"

            ledger_entries.append({
                "date": fee.month.isoformat(),
                "label": f"Fee - {fee.month:%B %Y}",
                "amount": float(base_amt),
                "fine": float(applied_fine),
                "total": float(base_amt + applied_fine),
                "status": status
            })

        return Response({
            "student_name": student.user.get_full_name() or student.user.username,
            "hostel_name": student.hostel.name if student.hostel else "N/A",
            "room_number": student.bed.room.number if (student.bed and student.bed.room) else "N/A",
            "summary": {
                "total_paid": float(paid_fees),
                "total_outstanding": float(outstanding_fees),
            },
            "ledger": ledger_entries
        })
