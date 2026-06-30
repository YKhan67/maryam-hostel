# backend/fees/api_views.py

from datetime import date
from decimal import Decimal

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from fees.models import FeeHead, MonthlyFee
from fees.utils import compute_late_fee_for_record  # as created earlier

from django.db import transaction
from hostels.models import StudentProfile
from .whatsapp import send_whatsapp_text

def first_day_of_month(year: int, month: int) -> date:
    return date(year, month, 1)


def shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    """
    Move (year, month) by delta months (delta can be negative).
    """
    total = year * 12 + (month - 1) + delta
    new_year = total // 12
    new_month = total % 12 + 1
    return new_year, new_month


class CurrentMonthFeeDashboard(APIView):
    """
    Fee dashboard summary with modes:
      - mode=current (default): current month only
      - mode=ytd: Year-to-date (from 1 January of current year to current month)
      - mode=range&months=N: last N months (including current)

    Returns:
      {
        "mode": "current" | "ytd" | "range",
        "from": "YYYY-MM-DD",
        "to": "YYYY-MM-DD",
        "label": "string label for UI",
        "total_billed": float,
        "total_collected": float,
        "total_outstanding": float,
        "fine_collected": float,
        "fine_outstanding": float,
        "total_fine": float
      }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        mode = (request.query_params.get("mode") or "current").lower()

        # Determine date range based on mode
        if mode == "ytd":
            year = today.year
            range_start = date(year, 1, 1)
            range_end = date(year, today.month, 1)
            label = f"YTD {year}"
        elif mode == "range":
            try:
                months_back = int(request.query_params.get("months", 3))
            except ValueError:
                months_back = 3
            if months_back < 1:
                months_back = 1

            # Start = first day of month N-1 months ago
            base_year, base_month = today.year, today.month
            start_year, start_month = shift_month(
                base_year, base_month, -(months_back - 1)
            )
            range_start = first_day_of_month(start_year, start_month)
            range_end = first_day_of_month(base_year, base_month)
            label = f"Last {months_back} month(s)"
        else:
            # Default: current month only
            month_start = today.replace(day=1)
            range_start = month_start
            range_end = month_start
            label = month_start.strftime("%B %Y")
            mode = "current"

        # MonthlyFee.month is stored as first day of that month
        qs = (
            MonthlyFee.objects.filter(month__gte=range_start, month__lte=range_end)
            .select_related("student", "fee_head")
        )

        total_billed = Decimal("0")
        total_collected = Decimal("0")
        total_outstanding = Decimal("0")
        fine_collected = Decimal("0")
        fine_outstanding = Decimal("0")

        for fee in qs:
            amount = fee.amount or Decimal("0")

            if fee.is_paid:
                total_collected += amount
                fine_collected += fee.late_fee_applied or Decimal("0")
            else:
                total_outstanding += amount
                fine_outstanding += compute_late_fee_for_record(
                    fee, on_date=today
                )

        total_billed = total_collected + total_outstanding
        total_fine = fine_collected + fine_outstanding

        data = {
            "mode": mode,
            "from": range_start.isoformat(),
            "to": range_end.isoformat(),
            "label": label,
            "total_billed": float(total_billed),
            "total_collected": float(total_collected),
            "total_outstanding": float(total_outstanding),
            "fine_collected": float(fine_collected),
            "fine_outstanding": float(fine_outstanding),
            "total_fine": float(total_fine),
        }
        return Response(data)


class LastThreeMonthsFeeKpi(APIView):
    """
    Returns KPI for last 3 months (including current):
    For each month:
      - total_billed
      - total_collected
      - total_outstanding
      - fine_collected
      - fine_outstanding
      - total_fine
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        base_year = today.year
        base_month = today.month

        results = []

        for delta in [0, -1, -2]:
            year, month = shift_month(base_year, base_month, delta)
            month_start = first_day_of_month(year, month)
            qs = MonthlyFee.objects.filter(month=month_start)

            total_billed = Decimal("0")
            total_collected = Decimal("0")
            total_outstanding = Decimal("0")
            fine_collected = Decimal("0")
            fine_outstanding = Decimal("0")

            for fee in qs:
                amount = fee.amount or Decimal("0")

                if fee.is_paid:
                    total_collected += amount
                    fine_collected += fee.late_fee_applied or Decimal("0")
                else:
                    total_outstanding += amount
                    fine_outstanding += compute_late_fee_for_record(fee, on_date=today)

            total_billed = total_collected + total_outstanding
            total_fine = fine_collected + fine_outstanding

            results.append(
                {
                    "year": year,
                    "month": month,
                    "label": month_start.strftime("%b %Y"),
                    "total_billed": float(total_billed),
                    "total_collected": float(total_collected),
                    "total_outstanding": float(total_outstanding),
                    "fine_collected": float(fine_collected),
                    "fine_outstanding": float(fine_outstanding),
                    "total_fine": float(total_fine),
                }
            )

        return Response(results)


class HostelIncomeSummary(APIView):
    """
    Returns per-hostel income for:
      - current month (fees marked as paid)
      - last 3 months (including current), fees marked as paid

    Output:
      [
        {
          "hostel": "Maryam Tower",
          "current_month_income": 12345.0,
          "last_three_month_income": 45678.0
        },
        ...
      ]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        base_year = today.year
        base_month = today.month

        # Months: current (0), previous (-1), previous (-2)
        m0_year, m0_month = base_year, base_month
        m1_year, m1_month = shift_month(base_year, base_month, -1)
        m2_year, m2_month = shift_month(base_year, base_month, -2)

        m0 = first_day_of_month(m0_year, m0_month)
        m1 = first_day_of_month(m1_year, m1_month)
        m2 = first_day_of_month(m2_year, m2_month)

        months = {m0, m1, m2}

        # We assume StudentProfile has a .hostel ForeignKey with .name
        fees = (
            MonthlyFee.objects.filter(month__in=months, is_paid=True)
            .select_related("student__hostel")
        )

        summary: dict[str, dict] = {}

        for fee in fees:
            student = fee.student
            hostel = getattr(student, "hostel", None)
            hostel_name = getattr(hostel, "name", "Unassigned")

            # income = base amount + late fee applied (final)
            amount = fee.amount or Decimal("0")
            late_fee = fee.late_fee_applied or Decimal("0")
            income_value = amount + late_fee

            if hostel_name not in summary:
                summary[hostel_name] = {
                    "hostel": hostel_name,
                    "current_month_income": Decimal("0"),
                    "last_three_month_income": Decimal("0"),
                }

            summary[hostel_name]["last_three_month_income"] += income_value
            if fee.month == m0:
                summary[hostel_name]["current_month_income"] += income_value

        result = []
        for item in summary.values():
            result.append(
                {
                    "hostel": item["hostel"],
                    "current_month_income": float(item["current_month_income"]),
                    "last_three_month_income": float(
                        item["last_three_month_income"]
                    ),
                }
            )

        return Response(result)

class GenerateMonthlyFeesView(APIView):
    """
    POST: Generate fees for:
      - scope: "ALL" or "STUDENT"
      - student_id: if scope == "STUDENT"
      - year, month
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}
        scope = (data.get("scope") or "ALL").upper()

        # Validate scope
        if scope not in ("ALL", "STUDENT"):
            return Response(
                {"detail": "scope must be 'ALL' or 'STUDENT'."},
                status=400,
            )

        # Year / month
        today = timezone.localdate()
        try:
            year = int(data.get("year", today.year))
            month = int(data.get("month", today.month))
            target_month = date(year, month, 1)
        except Exception:
            return Response(
                {"detail": "Invalid year or month."},
                status=400,
            )

        # Fee heads – if you only want recurring monthly, keep this filter
        fee_heads = FeeHead.objects.filter(is_recurring=True, frequency="MONTHLY")
        if not fee_heads.exists():
            return Response(
                {
                    "detail": "No recurring monthly FeeHead found. "
                    "Please configure at least one FeeHead with is_recurring=True and frequency='MONTHLY'."
                },
                status=400,
            )

        # Students
        if scope == "STUDENT":
            student_id = data.get("student_id")
            if not student_id:
                return Response(
                    {"detail": "student_id is required when scope='STUDENT'."},
                    status=400,
                )
            students = StudentProfile.objects.filter(id=student_id)
        else:
            students = StudentProfile.objects.all()

        if not students.exists():
            return Response(
                {"detail": "No students found for the given selection."},
                status=400,
            )

        total_created = 0
        skipped_existing = 0

        for student in students:
            for head in fee_heads:
                defaults = {
                    "amount": head.default_amount,
                    "is_paid": False,
                    "late_fee_applied": Decimal("0"),
                }
                with transaction.atomic():
                    fee, created = MonthlyFee.objects.get_or_create(
                        student=student,
                        fee_head=head,
                        month=target_month,
                        defaults=defaults,
                    )
                    if created:
                        total_created += 1
                    else:
                        skipped_existing += 1

        return Response(
            {
                "year": year,
                "month": month,
                "created": total_created,
                "skipped_existing": skipped_existing,
            }
        )


class MarkFeesPaidView(APIView):
    """
    POST: Mark fees as paid

    Request body:
      - scope: "ALL" or "STUDENT"
      - student_id: if scope == "STUDENT"
      - all_months: bool
      - year, month: if all_months == False

    Behaviour:
      - Only touches MonthlyFee where is_paid = False
      - Marks them as paid and snapshots late_fee_applied (if helper is available)
    """
    # We used AllowAny earlier to avoid 401, you can switch back to IsAuthenticated later
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        scope = (data.get("scope") or "ALL").upper()
        student_id = data.get("student_id")
        all_months = bool(data.get("all_months", False))

        today = timezone.localdate()

        # Start from unpaid records only
        qs = MonthlyFee.objects.filter(is_paid=False)

        # Month/year filter
        if not all_months:
            try:
                year = int(data.get("year", today.year))
                month = int(data.get("month", today.month))
                month_start = date(year, month, 1)
            except Exception:
                return Response(
                    {"detail": "Invalid year or month."},
                    status=400,
                )
            qs = qs.filter(month=month_start)

        # Scope filter
        if scope == "STUDENT":
            if not student_id:
                return Response(
                    {"detail": "student_id is required when scope='STUDENT'."},
                    status=400,
                )
            qs = qs.filter(student_id=student_id)

        total = qs.count()
        updated = 0

        for fee in qs:
            fee.is_paid = True

            # Try to compute late fee snapshot
            try:
                late_fee = compute_late_fee_for_record(fee, on_date=today)
                fee.late_fee_applied = late_fee
                fee.save(update_fields=["is_paid", "late_fee_applied"])
            except Exception:
                # If helper/field not available, at least mark as paid
                fee.save(update_fields=["is_paid"])

            updated += 1

        return Response({"total": total, "updated": updated})
    
class WaiveFineView(APIView):
    """
    POST: Waive fines on MonthlyFee records where a late fee has been applied.

    Request body:
      - scope: "ALL" or "STUDENT"
      - student_id: required if scope == "STUDENT"
      - all_months: bool
      - year, month: if all_months == False
      - kind: "FULL" or "PARTIAL"
      - partial_amount: decimal, required if kind == "PARTIAL"

    Behaviour:
      - Only affects records where late_fee_applied > 0
      - For FULL: sets late_fee_applied = 0
      - For PARTIAL: subtracts partial_amount from late_fee_applied (minimum 0)
    """
    # Relax for now; you can later change to IsAuthenticated if your auth is stable
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        scope = (data.get("scope") or "ALL").upper()
        student_id = data.get("student_id")
        all_months = bool(data.get("all_months", False))
        kind = (data.get("kind") or "FULL").upper()

        # Validate kind
        if kind not in ("FULL", "PARTIAL"):
          return Response(
              {"detail": "kind must be 'FULL' or 'PARTIAL'."},
              status=400,
          )

        partial_amount = Decimal("0")
        if kind == "PARTIAL":
          raw = data.get("partial_amount")
          try:
            partial_amount = Decimal(str(raw))
          except Exception:
            return Response(
              {"detail": "partial_amount must be a valid number."},
              status=400,
            )
          if partial_amount <= 0:
            return Response(
              {"detail": "partial_amount must be greater than 0."},
              status=400,
            )

        today = timezone.localdate()
        qs = MonthlyFee.objects.filter(late_fee_applied__gt=0)

        # Month/year filter
        if not all_months:
          try:
            year = int(data.get("year", today.year))
            month = int(data.get("month", today.month))
            month_start = date(year, month, 1)
          except Exception:
            return Response(
              {"detail": "Invalid year or month."},
              status=400,
            )
          qs = qs.filter(month=month_start)

        # Scope filter
        if scope == "STUDENT":
          if not student_id:
            return Response(
              {"detail": "student_id is required when scope='STUDENT'."},
              status=400,
            )
          qs = qs.filter(student_id=student_id)

        total = qs.count()
        updated = 0

        for fee in qs:
          if kind == "FULL":
            fee.late_fee_applied = Decimal("0")
          else:
            current = fee.late_fee_applied or Decimal("0")
            new_val = current - partial_amount
            if new_val < 0:
              new_val = Decimal("0")
            fee.late_fee_applied = new_val
          fee.save(update_fields=["late_fee_applied"])
          updated += 1

        return Response({"total": total, "updated": updated})


class SendWhatsappPendingFeesView(APIView):
    """
    POST: Send WhatsApp to students with pending fees
      - scope: "ALL" or "STUDENT"
      - student_id: if scope == "STUDENT"
      - all_months: bool
      - year, month: if all_months == False
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}
        scope = data.get("scope", "ALL")
        student_id = data.get("student_id")
        all_months = bool(data.get("all_months", False))

        today = timezone.localdate()

        qs = MonthlyFee.objects.filter(is_paid=False).select_related("student")

        if not all_months:
            year = int(data.get("year", today.year))
            month = int(data.get("month", today.month))
            month_start = date(year, month, 1)
            qs = qs.filter(month=month_start)

        if scope == "STUDENT":
            if not student_id:
                return Response(
                    {"detail": "student_id is required when scope='STUDENT'."},
                    status=400,
                )
            qs = qs.filter(student_id=student_id)

        total = qs.count()
        sent = 0

        for fee in qs:
            student = fee.student
            # Adjust field name according to your StudentProfile
            phone = getattr(student, "whatsapp_number", None) or getattr(
                student, "phone_whatsapp", None
            )

            if not phone:
                continue

            # Build message using MonthlyFee helper
            try:
                msg = fee.build_whatsapp_text(on_date=today)
            except AttributeError:
                # if build_whatsapp_text not implemented, fallback simple
                msg = (
                    f"Assalamualaikum,\nYour hostel fee is pending for {fee.month:%B %Y}. "
                    f"Amount: Rs {fee.amount:,.0f}."
                )

            if send_whatsapp_text(phone, msg):
                sent += 1

        return Response({"total": total, "sent": sent})
