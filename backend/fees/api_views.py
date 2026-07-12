# backend/fees/api_views.py
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.utils import timezone
from django.db.models import Sum, Q, F
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from fees.models import MonthlyFee, PaymentProof, SecurityDeposit, Receipt
from fees.utils import compute_late_fee_for_record
from hostels.models import StudentProfile

class CurrentMonthFeeDashboard(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        today = timezone.localdate(); p = request.query_params.get("period", "CURRENT_MONTH"); y = request.query_params.get("year"); m = request.query_params.get("month")
        if p == "YTD": f_date, t_date = date(int(y) if y else today.year, 1, 1), today
        elif p == "SPECIFIC" and y and m: 
            f_date = date(int(y), int(m), 1)
            next_m = (int(m) % 12) + 1
            next_y = int(y) + (1 if int(m) == 12 else 0)
            t_date = date(next_y, next_m, 1) - timedelta(days=1)
        else: f_date, t_date = today.replace(day=1), today
        
        r_qs = Receipt.objects.filter(date_issued__date__gte=f_date, date_issued__date__lte=t_date)
        if request.user.role in ["HOSTEL_MANAGER", "PARTNER"] and request.user.hostel:
            r_qs = r_qs.filter(fee__student__hostel=request.user.hostel)
        tc = float(r_qs.aggregate(s=Sum('amount'))['s'] or 0)
        
        unpaid = MonthlyFee.objects.filter(is_paid=False, month__gte=f_date, month__lte=t_date)
        if request.user.role in ["HOSTEL_MANAGER", "PARTNER"] and request.user.hostel:
            unpaid = unpaid.filter(student__hostel=request.user.hostel)
        to = float(unpaid.aggregate(s=Sum('amount'))['s'] or 0)
        
        return Response({"label": f"{f_date} to {t_date}", "total_billed": tc + to, "total_collected": tc, "total_outstanding": to})

class HostelIncomeSummary(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        f, t = request.query_params.get("from_date"), request.query_params.get("to_date")
        qs = Receipt.objects.all()
        if f: qs = qs.filter(date_issued__date__gte=f)
        if t: qs = qs.filter(date_issued__date__lte=t)
        income_qs = qs.values(h=F('fee__student__hostel__name')).annotate(total=Sum('amount'))
        return Response([{"hostel": row['h'] or "Unassigned", "total_period_income": float(row['total'] or 0)} for row in income_qs])

class StudentLedgerView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        try: student = request.user.student_profile
        except: return Response({"error": "Profile not found."}, status=404)
        today = timezone.localdate(); fees = MonthlyFee.objects.filter(student=student).order_by('-month')
        total_paid_acc = 0
        total_out_acc = 0
        ledger = []
        for f in fees:
            fine = f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today)
            if f.is_paid:
                status = "PAID"
                total_paid_acc += float(f.amount + f.late_fee_applied)
            else: 
                status = "OUTSTANDING"
                total_out_acc += float(f.amount + fine)
                if f.payment_proofs.filter(status='PENDING').exists(): status = "PENDING_VERIFICATION"
            
            ledger.append({
                "id": f.id, "label": f.month.strftime("%B %Y"), "amount": float(f.amount), 
                "fine": float(fine), "status": status,
                "receipts": [{"id": r.id, "no": r.receipt_no} for r in f.receipts.all()]
            })
            
        return Response({
            "summary": {
                "student_id": student.id, "hostel_id": student.hostel_id, "hostel_name": student.hostel.name if student.hostel else "N/A",
                "room_number": getattr(student.bed.room, 'number', 'N/A') if (student.bed and student.bed.room) else 'N/A',
                "bed_number": getattr(student.bed, 'label', 'N/A') if student.bed else 'N/A',
                "total_paid": total_paid_acc, "total_outstanding": total_out_acc
            },
            "ledger": ledger,
            "tickets": [{"id": t.id, "category": t.category, "subject": t.subject, "status": t.status, "created_at": t.created_at.isoformat()} for t in student.tickets.all()]
        })

class SecurityDepositView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        qs = SecurityDeposit.objects.all()
        if request.user.role in ["HOSTEL_MANAGER", "PARTNER"] and request.user.hostel: qs = qs.filter(student__hostel=request.user.hostel)
        return Response([{"student": d.student.user.get_full_name(), "amount": float(d.amount), "status": d.status} for d in qs])

class LastThreeMonthsFeeKpi(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request): return Response([])

class GenerateMonthlyFeesView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        from .tasks import generate_monthly_fees_task
        data = request.data or {}
        generate_monthly_fees_task.delay(int(data.get("year")), int(data.get("month")), [data.get("student_id")] if data.get("scope")=="STUDENT" else None)
        return Response({"status": "Started"})

class MarkFeesPaidView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        data = request.data or {}
        today = timezone.localdate()
        fee_id = data.get("fee_id")
        if fee_id:
            fee = MonthlyFee.objects.get(id=fee_id)
            amt_str = str(data.get("amount", 0))
            amt = Decimal(amt_str)
            total_due = fee.amount + compute_late_fee_for_record(fee, on_date=today)
            fee.amount_paid += amt
            if fee.amount_paid >= total_due:
                fee.is_paid = True; fee.is_partially_paid = False
            else:
                fee.is_paid = False; fee.is_partially_paid = True
            fee.late_fee_applied = compute_late_fee_for_record(fee, on_date=today)
            fee.save()
            if amt > 0: Receipt.objects.create(fee=fee, amount=amt)
            return Response({"status": "OK"})
        return Response({"detail": "Fee ID required"}, status=400)

class SendWhatsappPendingFeesView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request): return Response({"status": "Deprecated"})

class WaiveFineView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request): return Response({"status": "Deprecated"})

class UnitEconomicsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request): return Response({"detail": "Moved to inventory branch_pnl"})

class GenerateReceiptPDFView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, receipt_id):
        receipt = Receipt.objects.select_related('fee__student__user', 'fee__student__hostel').get(pk=receipt_id)
        response = HttpResponse(content_type='application/pdf'); response['Content-Disposition'] = f'attachment; filename="Receipt_{receipt.receipt_no}.pdf"'
        doc = SimpleDocTemplate(response, pagesize=A4); elements = []; styles = getSampleStyleSheet()
        elements.append(Paragraph(f"<b>MARYAM HOSTEL RECEIPT</b>", styles['Title']))
        data_table = [["No:", receipt.receipt_no, "Date:", receipt.date_issued.strftime("%d %b %Y")], ["Student:", receipt.fee.student.user.get_full_name(), "Amount:", f"Rs {receipt.amount:,.2f}"]]
        t = Table(data_table); t.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.grey)])); elements.append(t); doc.build(elements); return response

class ParentSecureLedgerView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, token):
        try:
            student = StudentProfile.objects.select_related('user', 'hostel', 'bed__room').get(parent_link_token=token)
            fees = MonthlyFee.objects.filter(student=student).order_by('-month')
            
            today = timezone.localdate()
            paid_sum = 0
            outstanding_sum = 0
            ledger_entries = []
            
            for f in fees:
                fine = f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today)
                if f.is_paid:
                    paid_sum += float(f.amount + f.late_fee_applied)
                    status = "PAID"
                else:
                    outstanding_sum += float(f.amount + fine)
                    status = "OUTSTANDING"
                
                ledger_entries.append({
                    "date": f.month.isoformat(),
                    "status": status,
                    "amount": float(f.amount),
                    "fine": float(fine),
                    "total": float(f.amount + fine)
                })

            return Response({
                "student_name": student.user.get_full_name() or student.user.username,
                "hostel_name": student.hostel.name if student.hostel else "N/A",
                "room_number": student.bed.room.number if (student.bed and student.bed.room) else "N/A",
                "summary": {
                    "total_paid": paid_sum,
                    "total_outstanding": outstanding_sum,
                },
                "ledger": ledger_entries
            })
        except:
            return Response({"detail": "Invalid token or data error"}, status=404)
