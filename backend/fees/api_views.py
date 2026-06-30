# backend/fees/api_views.py

from datetime import date
from decimal import Decimal

from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Q, F, Case, When, DecimalField
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from fees.models import FeeHead, MonthlyFee
from fees.utils import compute_late_fee_for_record
from hostels.models import StudentProfile
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
    
    if user.role == "HOSTEL_MANAGER" and user.hostel:
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
        
        qs = get_filtered_fees(user).filter(is_paid=False)
        if not data.get("all_months"):
            qs = qs.filter(month=date(int(data.get("year", today.year)), int(data.get("month", today.month)), 1))
        if data.get("scope") == "STUDENT":
            qs = qs.filter(student_id=data.get("student_id"))

        updated = 0
        for fee in qs:
            fee.is_paid = True
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
