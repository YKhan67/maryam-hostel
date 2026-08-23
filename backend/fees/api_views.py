# backend/fees/api_views.py

from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone
from django.db.models import Sum, F, Q
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from fees.models import MonthlyFee, SecurityDeposit, Receipt, FeeHead
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
        dossier_fine = 0
        utility_bill = float(student.calculate_active_utility_bill())
        security_deposit = float(getattr(student, 'security_deposit', object()).amount) if hasattr(student, 'security_deposit') else 0.0
        ledger = []
        for f in fees:
            fine = f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today)
            dossier_fine += float(fine)
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

        amount_due = float(sum((f.amount + (f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today))) for f in fees)) + utility_bill
        amount_paid = total_paid_acc
        total = amount_due
        
        return Response({
            "summary": {
                "student_id": student.id, "hostel_id": student.hostel_id, "hostel_name": student.hostel.name if student.hostel else "N/A",
                "room_number": getattr(student.bed.room, 'number', 'N/A') if (student.bed and student.bed.room) else 'N/A',
                "bed_number": getattr(student.bed, 'label', 'N/A') if student.bed else 'N/A',
                "student_picture": student.profile_picture.url if student.profile_picture else None,
                "nic_number": student.nic_number,
                "month": today.strftime("%B %Y"),
                "status": "ACTIVE" if student.is_active else "INACTIVE",
                "security_deposit": security_deposit,
                "amount_due": amount_due,
                "amount_paid": amount_paid,
                "utilities_bill": utility_bill,
                "fine": dossier_fine,
                "total": total,
                "total_paid": total_paid_acc, "total_outstanding": total_out_acc
            },
            "ledger": ledger,
            "tickets": [{"id": t.id, "category": t.category, "subject": t.subject, "status": t.status, "created_at": t.created_at.isoformat()} for t in student.tickets.all()]
        })


class LastThreeMonthsFeeKpi(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request): return Response([])


class GenerateMonthlyFeesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            data = request.data or {}
            scope = data.get("scope", "ALL")
            year = int(data.get("year", date.today().year))
            month = int(data.get("month", date.today().month))
            student_id = data.get("student_id")
            
            month_date = date(year, month, 1)
            
            fee_head, _ = FeeHead.objects.get_or_create(
                name="Rent",
                defaults={
                    "description": "Monthly Rent",
                    "is_recurring": True,
                    "frequency": "MONTHLY",
                    "default_amount": 0
                }
            )
            
            if scope == "STUDENT" and student_id:
                students = StudentProfile.objects.filter(
                    id=student_id,
                    is_active=True,
                    user__is_active=True,
                    user__role="STUDENT"
                ).filter(
                    Q(left_on__isnull=True) | Q(left_on__gte=month_date)
                )
                
                if not students.exists():
                    inactive_student = StudentProfile.objects.filter(id=student_id).first()
                    if inactive_student:
                        if inactive_student.user.role != "STUDENT":
                            return Response({
                                "created": 0,
                                "skipped_existing": 0,
                                "total": 0,
                                "message": f"User {student_id} has role '{inactive_student.user.role}'. Only STUDENT role can have fees generated."
                            }, status=200)
                        elif not inactive_student.is_active:
                            return Response({
                                "created": 0,
                                "skipped_existing": 0,
                                "total": 0,
                                "message": f"Student {student_id} is INACTIVE in profile."
                            }, status=200)
                        elif not inactive_student.user.is_active:
                            return Response({
                                "created": 0,
                                "skipped_existing": 0,
                                "total": 0,
                                "message": f"Student {student_id} has INACTIVE user account."
                            }, status=200)
                        elif inactive_student.left_on and inactive_student.left_on < month_date:
                            return Response({
                                "created": 0,
                                "skipped_existing": 0,
                                "total": 0,
                                "message": f"Student {student_id} has LEFT the hostel on {inactive_student.left_on}."
                            }, status=200)
                    else:
                        return Response({
                            "created": 0,
                            "skipped_existing": 0,
                            "total": 0,
                            "message": f"Student {student_id} does not exist."
                        }, status=200)
            else:
                students = StudentProfile.objects.filter(
                    is_active=True,
                    user__is_active=True,
                    user__role="STUDENT"
                ).filter(
                    Q(left_on__isnull=True) | Q(left_on__gte=month_date)
                )
            
            user = request.user
            if hasattr(user, "role") and user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
                students = students.filter(hostel=user.hostel)
            
            created_count = 0
            skipped_count = 0
            
            for student in students:
                if student.left_on and student.left_on < month_date:
                    continue
                if not student.user.is_active:
                    continue
                if student.user.role != "STUDENT":
                    continue
                
                existing_fee = MonthlyFee.objects.filter(
                    student=student,
                    fee_head=fee_head,
                    month=month_date
                ).first()
                
                if existing_fee:
                    skipped_count += 1
                    continue
                
                rent_amount = student.monthly_rent or fee_head.default_amount or Decimal("0")
                
                MonthlyFee.objects.create(
                    student=student,
                    fee_head=fee_head,
                    month=month_date,
                    amount=rent_amount,
                    amount_paid=0,
                    is_paid=False,
                    is_partially_paid=False,
                    late_fee_applied=0
                )
                created_count += 1
            
            return Response({
                "created": created_count,
                "skipped_existing": skipped_count,
                "total_active_students": students.count(),
                "message": f"Generated fees for {created_count} active STUDENT role users."
            }, status=200)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                "detail": f"Error generating fees: {str(e)}"
            }, status=500)


class MarkFeesPaidView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            data = request.data or {}
            scope = data.get("scope", "ALL")
            all_months = data.get("all_months", False)
            student_id = data.get("student_id")
            amount_str = data.get("amount", "0")
            amount = Decimal(str(amount_str)) if amount_str else Decimal("0")
            
            fees = MonthlyFee.objects.all()
            
            user = request.user
            if hasattr(user, "role") and user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
                fees = fees.filter(student__hostel=user.hostel)
            
            if scope == "STUDENT" and student_id:
                fees = fees.filter(student_id=student_id)
            
            if not all_months:
                year = int(data.get("year", date.today().year))
                month = int(data.get("month", date.today().month))
                month_date = date(year, month, 1)
                fees = fees.filter(month=month_date)
            
            updated_count = 0
            for fee in fees:
                total_due = fee.amount + compute_late_fee_for_record(fee, on_date=date.today())
                
                if amount > 0:
                    fee.amount_paid += amount
                    if fee.amount_paid >= total_due:
                        fee.is_paid = True
                        fee.is_partially_paid = False
                    else:
                        fee.is_paid = False
                        fee.is_partially_paid = True
                else:
                    fee.amount_paid = total_due
                    fee.is_paid = True
                    fee.is_partially_paid = False
                
                fee.late_fee_applied = compute_late_fee_for_record(fee, on_date=date.today())
                fee.save()
                
                if amount > 0:
                    Receipt.objects.create(fee=fee, amount=amount)
                elif fee.is_paid:
                    Receipt.objects.create(fee=fee, amount=total_due)
                
                updated_count += 1
            
            return Response({
                "updated": updated_count,
                "total": fees.count(),
                "message": f"Marked {updated_count} fees as paid"
            }, status=200)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                "detail": f"Error marking fees paid: {str(e)}"
            }, status=500)


class SendWhatsappPendingFeesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            data = request.data or {}
            scope = data.get("scope", "ALL")
            all_months = data.get("all_months", False)
            student_id = data.get("student_id")
            
            fees = MonthlyFee.objects.filter(is_paid=False)
            
            user = request.user
            if hasattr(user, "role") and user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
                fees = fees.filter(student__hostel=user.hostel)
            
            if scope == "STUDENT" and student_id:
                fees = fees.filter(student_id=student_id)
            
            if not all_months:
                year = int(data.get("year", date.today().year))
                month = int(data.get("month", date.today().month))
                month_date = date(year, month, 1)
                fees = fees.filter(month=month_date)
            
            student_ids = fees.values_list('student_id', flat=True).distinct()
            students = StudentProfile.objects.filter(id__in=student_ids)
            
            return Response({
                "sent": students.count(),
                "total": student_ids.count(),
                "message": f"WhatsApp reminders would be sent to {students.count()} students"
            }, status=200)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                "detail": f"Error sending WhatsApp reminders: {str(e)}"
            }, status=500)


class WaiveFineView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            data = request.data or {}
            scope = data.get("scope", "ALL")
            all_months = data.get("all_months", False)
            student_id = data.get("student_id")
            kind = data.get("kind", "FULL")
            partial_amount = Decimal(str(data.get("partial_amount", 0))) if data.get("partial_amount") else Decimal("0")
            
            fees = MonthlyFee.objects.filter(late_fee_applied__gt=0)
            
            user = request.user
            if hasattr(user, "role") and user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
                fees = fees.filter(student__hostel=user.hostel)
            
            if scope == "STUDENT" and student_id:
                fees = fees.filter(student_id=student_id)
            
            if not all_months:
                year = int(data.get("year", date.today().year))
                month = int(data.get("month", date.today().month))
                month_date = date(year, month, 1)
                fees = fees.filter(month=month_date)
            
            updated_count = 0
            for fee in fees:
                if kind == "FULL":
                    fee.late_fee_applied = 0
                else:
                    if fee.late_fee_applied > partial_amount:
                        fee.late_fee_applied = fee.late_fee_applied - partial_amount
                    else:
                        fee.late_fee_applied = 0
                fee.save()
                updated_count += 1
            
            return Response({
                "updated": updated_count,
                "total": fees.count(),
                "message": f"Waived fines for {updated_count} fees"
            }, status=200)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                "detail": f"Error waiving fines: {str(e)}"
            }, status=500)


class UnitEconomicsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request): return Response({"detail": "Moved to inventory branch_pnl"})


class GenerateReceiptPDFView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, receipt_id):
        receipt = Receipt.objects.select_related('fee__student__user', 'fee__student__hostel').get(pk=receipt_id)
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Receipt_{receipt.receipt_no}.pdf"'
        doc = SimpleDocTemplate(response, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        elements.append(Paragraph("<b>MARYAM HOSTEL RECEIPT</b>", styles['Title']))
        data_table = [
            ["No:", receipt.receipt_no, "Date:", receipt.date_issued.strftime("%d %b %Y")],
            ["Student:", receipt.fee.student.user.get_full_name(), "Amount:", f"Rs {receipt.amount:,.2f}"]
        ]
        t = Table(data_table)
        t.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.grey)]))
        elements.append(t)
        doc.build(elements)
        return response


class ParentSecureLedgerView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, token):
        try:
            student = StudentProfile.objects.select_related('user', 'hostel', 'bed__room').get(parent_link_token=token)
            fees = MonthlyFee.objects.filter(student=student).order_by('-month')

            today = timezone.localdate()
            paid_sum = 0
            outstanding_sum = 0
            fine_total = 0
            ledger_entries = []
            utility_bill = float(student.calculate_active_utility_bill())
            security_deposit = float(student.security_deposit.amount) if hasattr(student, 'security_deposit') else 0.0

            for f in fees:
                fine = f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today)
                fine_total += float(fine)
                if f.is_paid:
                    paid_sum += float(f.amount + f.late_fee_applied)
                    status = "PAID"
                else:
                    outstanding_sum += float(f.amount + fine)
                    status = "OUTSTANDING"
                    if f.payment_proofs.filter(status='PENDING').exists():
                        status = "PENDING_VERIFICATION"

                ledger_entries.append({
                    "date": f.month.isoformat(),
                    "status": status,
                    "amount": float(f.amount),
                    "fine": float(fine),
                    "total": float(f.amount + fine)
                })

            amount_due = float(sum((f.amount + (f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today))) for f in fees)) + utility_bill
            amount_paid = paid_sum
            total = amount_due

            summary = {
                "student_id": student.id,
                "hostel_id": student.hostel_id,
                "student_picture": student.profile_picture.url if student.profile_picture else None,
                "nic_number": student.nic_number,
                "month": today.strftime("%B %Y"),
                "status": "ACTIVE" if student.is_active else "INACTIVE",
                "security_deposit": security_deposit,
                "amount_due": amount_due,
                "amount_paid": amount_paid,
                "utilities_bill": utility_bill,
                "fine": fine_total,
                "total": total,
                "total_paid": amount_paid,
                "total_outstanding": outstanding_sum,
            }

            return Response({
                "student_name": student.user.get_full_name() or student.user.username,
                "hostel_name": student.hostel.name if student.hostel else "N/A",
                "room_number": student.bed.room.number if (student.bed and student.bed.room) else "N/A",
                "student_picture": summary["student_picture"],
                "nic_number": summary["nic_number"],
                "month": summary["month"],
                "status": summary["status"],
                "security_deposit": summary["security_deposit"],
                "amount_due": summary["amount_due"],
                "amount_paid": summary["amount_paid"],
                "utilities_bill": summary["utilities_bill"],
                "fine": summary["fine"],
                "total": summary["total"],
                "summary": summary,
                "ledger": ledger_entries
            })
        except Exception:
            return Response({"detail": "Invalid token or data error"}, status=404)