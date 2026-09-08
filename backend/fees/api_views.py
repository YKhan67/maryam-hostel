# backend/fees/api_views.py

from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, F, Q
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from fees.models import MonthlyFee, SecurityDeposit, Receipt, FeeHead, StudentUtilityBill
from fees.utils import compute_late_fee_for_record
from hostels.models import StudentProfile


class CurrentMonthFeeDashboard(APIView):
    """
    Hostel-wide fee KPIs for the Fee Dashboard's Summary tab.

    mode:
      "current" - this calendar month to date (default)
      "ytd"     - Jan 1 of `year` (defaults to current year) through today
      "range"   - last `months` months up to and including the current month
      "custom"  - from_year/from_month through to_year/to_month (inclusive)

    This previously read a "period"/"year"/"month" contract
    ("CURRENT_MONTH"/"YTD"/"SPECIFIC") that the frontend never actually sent
    (it sent "mode"/"months" instead) - every option except the default
    silently fell back to current-month data regardless of what was
    selected. This also previously never returned fine_collected /
    fine_outstanding / total_fine at all, despite the frontend rendering
    them (always "Rs 0" as a result). Both are fixed here.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        mode = request.query_params.get("mode", "current")

        try:
            if mode == "ytd":
                year = int(request.query_params.get("year", today.year))
                f_date, t_date = date(year, 1, 1), today
                label = f"Year to date – {year}"

            elif mode == "range":
                months = max(1, int(request.query_params.get("months", 3)))
                start_total = today.year * 12 + (today.month - 1) - (months - 1)
                start_year, start_month = divmod(start_total, 12)
                f_date, t_date = date(start_year, start_month + 1, 1), today
                label = f"Last {months} months"

            elif mode == "custom":
                from_year = int(request.query_params["from_year"])
                from_month = int(request.query_params["from_month"])
                to_year = int(request.query_params["to_year"])
                to_month = int(request.query_params["to_month"])
                if not (1 <= from_month <= 12 and 1 <= to_month <= 12):
                    return Response({"detail": "Month must be between 1 and 12."}, status=400)
                f_date = date(from_year, from_month, 1)
                next_m = (to_month % 12) + 1
                next_y = to_year + (1 if to_month == 12 else 0)
                t_date = date(next_y, next_m, 1) - timedelta(days=1)
                if f_date > t_date:
                    return Response({"detail": "'From' must be before or equal to 'To'."}, status=400)
                label = "Custom range"

            else:  # "current"
                f_date, t_date = today.replace(day=1), today
                label = "Current month"
        except (KeyError, ValueError):
            return Response({"detail": "Invalid or missing date parameters."}, status=400)

        hostel_scoped = request.user.role in ["HOSTEL_MANAGER", "PARTNER"] and request.user.hostel

        r_qs = Receipt.objects.filter(date_issued__date__gte=f_date, date_issued__date__lte=t_date)
        if hostel_scoped:
            r_qs = r_qs.filter(fee__student__hostel=request.user.hostel)
        tc = float(r_qs.aggregate(s=Sum('amount'))['s'] or 0)

        unpaid = MonthlyFee.objects.filter(is_paid=False, month__gte=f_date, month__lte=t_date)
        if hostel_scoped:
            unpaid = unpaid.filter(student__hostel=request.user.hostel)
        to_ = float(unpaid.aggregate(s=Sum('amount'))['s'] or 0)

        paid_in_range = MonthlyFee.objects.filter(is_paid=True, month__gte=f_date, month__lte=t_date)
        if hostel_scoped:
            paid_in_range = paid_in_range.filter(student__hostel=request.user.hostel)
        fine_collected = float(paid_in_range.aggregate(s=Sum('late_fee_applied'))['s'] or 0)

        fine_outstanding = 0.0
        for f in unpaid.select_related('fee_head'):
            fine_outstanding += float(compute_late_fee_for_record(f, on_date=today))

        # Payment-behavior stats: distinct students, not raw fee rows, so a
        # student with two fee heads (e.g. rent + mess) late in the same
        # month isn't counted twice.
        paid_on_time_students = paid_in_range.filter(
            late_fee_applied=0, fine_was_waived=False
        ).values('student_id').distinct().count()
        paid_late_students = paid_in_range.filter(late_fee_applied__gt=0).values('student_id').distinct().count()

        waived_qs = MonthlyFee.objects.filter(month__gte=f_date, month__lte=t_date, fine_was_waived=True)
        if hostel_scoped:
            waived_qs = waived_qs.filter(student__hostel=request.user.hostel)
        waived_students = waived_qs.values('student_id').distinct().count()

        return Response({
            "label": label, "mode": mode, "from": f_date.isoformat(), "to": t_date.isoformat(),
            "total_billed": tc + to_, "total_collected": tc, "total_outstanding": to_,
            "fine_collected": fine_collected, "fine_outstanding": fine_outstanding,
            "total_fine": fine_collected + fine_outstanding,
            "students_paid_on_time": paid_on_time_students,
            "students_paid_with_late_fee": paid_late_students,
            "students_fine_waived": waived_students,
        })


def _build_fee_breakdown_rows(request):
    """
    Shared row-building logic for the Student Breakdown table and its
    CSV/PDF/DOCX exports (StudentFeeBreakdownView and
    StudentFeeBreakdownExportView) - kept in one place so an export can
    never drift from what's actually shown on screen.

    Returns (meta_dict, rows_list). Raises PermissionError for role checks
    and ValueError for bad query params, so callers can translate those into
    whatever response shape fits (JSON error vs. plain HttpResponse).
    """
    if not (hasattr(request.user, "role") and request.user.role in
            ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "PARTNER", "STAFF"]):
        raise PermissionError("You don't have permission to view this.")

    today = timezone.localdate()

    try:
        year = int(request.query_params.get("year", today.year))
        from_month = int(request.query_params.get("from_month", 1))
        to_month = int(request.query_params.get("to_month", 12))
    except (TypeError, ValueError):
        raise ValueError("Invalid year/month.")

    if not (1 <= from_month <= 12 and 1 <= to_month <= 12 and from_month <= to_month):
        raise ValueError("from_month/to_month must be 1-12, with from_month <= to_month.")

    is_active_param = (request.query_params.get("is_active", "true") or "true").lower()
    name_query = request.query_params.get("name", "").strip()

    students = StudentProfile.objects.select_related("user", "hostel").all()

    if request.user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and request.user.hostel:
        students = students.filter(hostel=request.user.hostel)

    if is_active_param == "true":
        students = students.filter(is_active=True)
    elif is_active_param == "false":
        students = students.filter(is_active=False)
    # "all" -> no is_active filter

    if name_query:
        students = students.filter(
            Q(user__first_name__icontains=name_query) | Q(user__last_name__icontains=name_query)
        )

    students = students.order_by("user__first_name", "user__last_name")
    student_ids = list(students.values_list("id", flat=True))
    students_by_id = {s.id: s for s in students}

    range_months = []
    y, m = year, from_month
    while (y, m) <= (year, to_month):
        range_months.append(date(y, m, 1))
        m += 1

    meta = {"year": year, "from_month": from_month, "to_month": to_month}

    if not student_ids or not range_months:
        return meta, []

    fees_qs = MonthlyFee.objects.filter(
        student_id__in=student_ids, month__gte=range_months[0], month__lte=range_months[-1]
    ).select_related("fee_head")
    fees_by_student_month = {}
    for f in fees_qs:
        fees_by_student_month.setdefault((f.student_id, f.month), []).append(f)

    utility_bills = StudentUtilityBill.objects.filter(
        student_id__in=student_ids, month__gte=range_months[0], month__lte=range_months[-1]
    )
    utility_by_student_month = {(u.student_id, u.month): u for u in utility_bills}

    rows = []
    for month in range_months:
        for student_id in student_ids:
            fee_rows = fees_by_student_month.get((student_id, month), [])
            if not fee_rows:
                continue

            student = students_by_id[student_id]
            amount = Decimal("0")
            fine = Decimal("0")
            amount_paid = Decimal("0")
            due_dates = []
            all_fees_paid = True

            for f in fee_rows:
                amount += f.amount
                f_fine = f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today)
                fine += f_fine
                amount_paid += f.amount_paid
                due_dates.append(f.get_due_date())
                if not f.is_paid:
                    all_fees_paid = False

            utility_record = utility_by_student_month.get((student_id, month))
            utility_amount = utility_record.amount if utility_record else Decimal("0")
            utility_paid = utility_record.is_paid if utility_record else True  # no record -> nothing owed for it

            total_due = float(amount + fine + utility_amount)
            total_paid = float(amount_paid) + (float(utility_amount) if utility_paid else 0)
            outstanding = round(total_due - total_paid, 2)

            rows.append({
                "student_id": student_id,
                "student_name": student.user.get_full_name() or student.user.username,
                "nic_number": student.nic_number,
                "is_active": student.is_active,
                "month": month.strftime("%B %Y"),
                "due_date": min(due_dates).isoformat() if due_dates else None,
                "amount_due": outstanding,
                "utility_bill": float(utility_amount),
                "fine": float(fine),
                "amount_paid": round(total_paid, 2),
                "status": "PAID" if (all_fees_paid and utility_paid) else "OUTSTANDING",
            })

    return meta, rows


class StudentFeeBreakdownView(APIView):
    """
    Per-student, per-month fee breakdown for the Fee Dashboard's "Student
    Breakdown" tab. One row per (student, month) in the requested range,
    combining that month's fee(s) + utility bill + fine - reuses the same
    per-student-per-month computation as StudentLedgerView, just applied
    across a filtered set of students instead of the logged-in student only.

    amount_due here means outstanding for that SPECIFIC month, not the
    lifetime sum StudentLedgerView's own "amount_due" field represents -
    kept as a distinct field on this new endpoint rather than reusing that
    name's existing (lifetime) meaning.

    Query params:
      is_active: "true" (default) | "false" | "all"
      name: partial match against student's first/last name
      year: required, e.g. 2026 (defaults to current year)
      from_month / to_month: 1-12 (defaults to 1 / 12)

    Students with no MonthlyFee generated yet for a given month in the range
    are skipped for that month (no phantom zero-amount row), rather than
    shown as if nothing is owed.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            meta, rows = _build_fee_breakdown_rows(request)
        except PermissionError as e:
            return Response({"error": str(e)}, status=403)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        return Response({**meta, "count": len(rows), "rows": rows})


class StudentFeeBreakdownExportView(APIView):
    """
    Exports the exact same rows StudentFeeBreakdownView returns, as CSV,
    PDF, or DOCX - controlled by ?export_format=csv|pdf|docx. Deliberately
    shares _build_fee_breakdown_rows() with the JSON view above rather than
    re-querying, so an export can never show different numbers than what's
    on screen.

    NOTE: the query param is named "export_format", NOT "format". DRF
    reserves "format" for its own content-negotiation override (e.g.
    ?format=json forces the JSON renderer) - during dispatch(), before
    permissions/authentication/the view method ever run, DRF tries to find
    a renderer whose `.format` matches that value. Since this view only has
    the default json/api renderers, a "?format=csv" query param made DRF's
    content negotiation raise Http404 (rendered as the generic DRF
    {"detail": "Not found."}) before the request ever reached this class's
    own logic. Using a differently-named param avoids the collision.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            meta, rows = _build_fee_breakdown_rows(request)
        except PermissionError as e:
            return Response({"error": str(e)}, status=403)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        fmt = (request.query_params.get("export_format") or "csv").lower()
        filename_base = f"fee_breakdown_{meta['year']}_{meta['from_month']:02d}-{meta['to_month']:02d}"
        if fmt == "csv":
            return self._export_csv(rows, filename_base)
        elif fmt == "pdf":
            return self._export_pdf(rows, meta, filename_base)
        elif fmt == "docx":
            return self._export_docx(rows, meta, filename_base)
        else:
            return Response({"error": "export_format must be one of: csv, pdf, docx"}, status=400)

    HEADERS = ["Student", "NIC", "Month", "Amount Due", "Due Date", "Utility", "Fine", "Amount Paid", "Status"]

    @staticmethod
    def _row_to_cells(row):
        return [
            row["student_name"],
            row["nic_number"] or "",
            row["month"],
            f"Rs {row['amount_due']:,.2f}",
            row["due_date"] or "",
            f"Rs {row['utility_bill']:,.2f}",
            f"Rs {row['fine']:,.2f}",
            f"Rs {row['amount_paid']:,.2f}",
            row["status"],
        ]

    def _export_csv(self, rows, filename_base):
        import csv
        import io
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(self.HEADERS)
        for row in rows:
            writer.writerow(self._row_to_cells(row))
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename_base}.csv"'
        return response

    def _export_pdf(self, rows, meta, filename_base):
        from reportlab.lib.pagesizes import landscape

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename_base}.pdf"'
        doc = SimpleDocTemplate(response, pagesize=landscape(A4))
        elements = []
        styles = getSampleStyleSheet()
        elements.append(Paragraph("<b>MARYAM HOSTEL - Student Fee Breakdown</b>", styles['Title']))
        elements.append(Paragraph(
            f"{meta['year']} · Month {meta['from_month']} to {meta['to_month']} · Generated {timezone.localdate().strftime('%d %b %Y')}",
            styles['Normal']
        ))
        elements.append(Paragraph(" ", styles['Normal']))

        table_data = [self.HEADERS] + [self._row_to_cells(row) for row in rows]
        t = Table(table_data, repeatRows=1)
        t.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        elements.append(t)
        doc.build(elements)
        return response

    def _export_docx(self, rows, meta, filename_base):
        # New dependency - requires `pip install python-docx` on the server.
        from docx import Document
        from docx.shared import Pt

        document = Document()
        document.add_heading("MARYAM HOSTEL - Student Fee Breakdown", level=1)
        document.add_paragraph(
            f"{meta['year']} · Month {meta['from_month']} to {meta['to_month']} · "
            f"Generated {timezone.localdate().strftime('%d %b %Y')}"
        )

        table = document.add_table(rows=1, cols=len(self.HEADERS))
        table.style = "Light Grid Accent 1"
        header_cells = table.rows[0].cells
        for i, header in enumerate(self.HEADERS):
            header_cells[i].text = header
            header_cells[i].paragraphs[0].runs[0].font.bold = True

        for row in rows:
            cells = table.add_row().cells
            for i, value in enumerate(self._row_to_cells(row)):
                cells[i].text = str(value)
                cells[i].paragraphs[0].runs[0].font.size = Pt(9)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        response["Content-Disposition"] = f'attachment; filename="{filename_base}.docx"'
        document.save(response)
        return response


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
        # Real per-month utility bill history (fees/services.py::generate_monthly_fees
        # now creates a StudentUtilityBill snapshot each month). Older MonthlyFee rows
        # that predate this won't have one - for those we fall back to the live total,
        # attributed only to the most recent row, same as the previous behavior.
        utility_bills_by_month = {ub.month: ub for ub in StudentUtilityBill.objects.filter(student=student)}
        current_utility_bill = float(student.calculate_active_utility_bill())
        security_deposit = float(getattr(student, 'security_deposit', object()).amount) if hasattr(student, 'security_deposit') else 0.0
        ledger = []
        summary_utility_bill = current_utility_bill
        for idx, f in enumerate(fees):
            fine = f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today)
            dossier_fine += float(fine)

            utility_record = utility_bills_by_month.get(f.month)
            if utility_record:
                entry_utility = float(utility_record.amount)
            else:
                entry_utility = current_utility_bill if idx == 0 else 0.0
            if idx == 0:
                summary_utility_bill = entry_utility

            entry_total = float(f.amount) + float(fine) + entry_utility
            if f.is_paid:
                status = "PAID"
                # Utility bill is collected together with the fee (see StudentUtilityBill
                # docstring), so it's counted as paid whenever the fee itself is paid.
                total_paid_acc += float(f.amount + f.late_fee_applied) + entry_utility
            else: 
                status = "OUTSTANDING"
                total_out_acc += float(f.amount + fine) + entry_utility
                if f.payment_proofs.filter(status='PENDING').exists(): status = "PENDING_VERIFICATION"
            
            ledger.append({
                "id": f.id, "label": f.month.strftime("%B %Y"), "amount": float(f.amount), 
                "fine": float(fine), "utility_bill": entry_utility, "total": entry_total,
                "status": status,
                "receipts": [{"id": r.id, "no": r.receipt_no} for r in f.receipts.all()]
            })

        amount_due = float(sum((f.amount + (f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today))) for f in fees)) + summary_utility_bill
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
                "utilities_bill": summary_utility_bill,
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
    
    @transaction.atomic
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
            utility_created_count = 0
            
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
                else:
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

                # Keep a historical utility snapshot alongside the monthly
                # fee. Existing snapshots are preserved so a later change to
                # active utility charges cannot rewrite an issued bill.
                utility_amount = Decimal(str(student.calculate_active_utility_bill()))
                _, utility_created = StudentUtilityBill.objects.get_or_create(
                    student=student,
                    month=month_date,
                    defaults={"amount": utility_amount},
                )
                if utility_created:
                    utility_created_count += 1
            
            return Response({
                "created": created_count,
                "skipped_existing": skipped_count,
                "utility_bills_created": utility_created_count,
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
                fine = compute_late_fee_for_record(fee, on_date=date.today())

                # Fold in that month's utility bill (collected together with the fee,
                # no separate proof needed for it - see StudentUtilityBill docstring).
                utility_bill = StudentUtilityBill.objects.filter(student=fee.student, month=fee.month).first()
                utility_amount = utility_bill.amount if (utility_bill and not utility_bill.is_paid) else Decimal("0")
                total_due = fee.amount + fine + utility_amount
                
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
                
                fee.late_fee_applied = fine
                fee.save()

                if fee.is_paid and utility_bill and not utility_bill.is_paid:
                    utility_bill.amount_paid = utility_bill.amount
                    utility_bill.is_paid = True
                    utility_bill.save(update_fields=["amount_paid", "is_paid"])
                
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
                    waived_amount = fee.late_fee_applied
                    fee.late_fee_applied = 0
                else:
                    if fee.late_fee_applied > partial_amount:
                        waived_amount = partial_amount
                        fee.late_fee_applied = fee.late_fee_applied - partial_amount
                    else:
                        waived_amount = fee.late_fee_applied
                        fee.late_fee_applied = 0
                if waived_amount > 0:
                    fee.fine_was_waived = True
                    fee.fine_waived_amount += waived_amount
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
            # Real per-month utility bill history (see StudentLedgerView for the same
            # pattern) - falls back to the live total on the latest row only, for any
            # legacy month that predates per-month utility tracking.
            utility_bills_by_month = {ub.month: ub for ub in StudentUtilityBill.objects.filter(student=student)}
            current_utility_bill = float(student.calculate_active_utility_bill())
            security_deposit = float(student.security_deposit.amount) if hasattr(student, 'security_deposit') else 0.0
            summary_utility_bill = current_utility_bill

            for idx, f in enumerate(fees):
                fine = f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today)
                fine_total += float(fine)

                utility_record = utility_bills_by_month.get(f.month)
                if utility_record:
                    entry_utility = float(utility_record.amount)
                else:
                    entry_utility = current_utility_bill if idx == 0 else 0.0
                if idx == 0:
                    summary_utility_bill = entry_utility

                if f.is_paid:
                    paid_sum += float(f.amount + f.late_fee_applied) + entry_utility
                    status = "PAID"
                else:
                    outstanding_sum += float(f.amount + fine) + entry_utility
                    status = "OUTSTANDING"
                    if f.payment_proofs.filter(status='PENDING').exists():
                        status = "PENDING_VERIFICATION"

                ledger_entries.append({
                    "date": f.month.isoformat(),
                    "status": status,
                    "amount": float(f.amount),
                    "fine": float(fine),
                    "utility_bill": entry_utility,
                    "total": float(f.amount + fine) + entry_utility
                })

            amount_due = float(sum((f.amount + (f.late_fee_applied if f.is_paid else compute_late_fee_for_record(f, on_date=today))) for f in fees)) + summary_utility_bill
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
                "utilities_bill": summary_utility_bill,
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