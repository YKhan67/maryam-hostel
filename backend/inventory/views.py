import io
import re
import csv
import json
import qrcode
import logging
from datetime import date

from django.db.models import Sum, Avg, F, Q
from django.http import HttpResponse
from django.utils import timezone
from django.conf import settings

from rest_framework import viewsets, permissions, parsers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

# Hardware/AI Dependencies
try:
    from PIL import Image
except ImportError:
    Image = None

# PDF Dependencies
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Image as RLImage, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

from .models import Category, Unit, Item, Vendor, Purchase, Consumption
from hostels.models import Hostel, Property, StudentProfile
from fees.models import Receipt
from payroll.models import SalarySlip
from finance.models import Asset, PropertyRentAccrual, InvestorPropertyAccess, InvestorPropertyOwnership

from .serializers import (
    CategorySerializer, UnitSerializer, ItemSerializer,
    VendorSerializer, PurchaseSerializer, ConsumptionSerializer,
)

logger = logging.getLogger(__name__)

class IsHostelManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role in ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "PARTNER", "STAFF"]

class InventorySummaryView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({"status": "Redirecting", "engine": "6.0"}, status=200)

class BranchProfitLossView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()
        try:
            year = int(request.query_params.get("year", today.year))
            month_p = request.query_params.get("month")
            month = int(month_p) if month_p else today.month
            period = request.query_params.get("period", "CURRENT_MONTH")
        except:
            year, month, period = today.year, today.month, "CURRENT_MONTH"

        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            hostels = Hostel.objects.filter(id=user.hostel.id)
        else:
            h_id = request.query_params.get("hostel_id")
            hostels = Hostel.objects.filter(id=h_id) if h_id else Hostel.objects.all()

        partner_properties = []
        if user.role == "PARTNER":
            partner_properties = list(Property.objects.filter(
                investor_access__investor=user,
                investor_access__can_view_financials=True,
                is_active=True,
            ).distinct())

        if partner_properties:
            matrix = []
            total_revenue = total_logistics = total_payroll = total_rent = 0.0
            for property_obj in partner_properties:
                r_qs = apply_filters(Receipt.objects.filter(
                    fee__student__bed__room__floor__building__property=property_obj
                ), "date_issued__date")
                revenue = float(r_qs.aggregate(s=Sum("amount"))["s"] or 0)
                rent = float(apply_filters(
                    PropertyRentAccrual.objects.filter(property=property_obj), "month"
                ).aggregate(s=Sum("amount"))["s"] or 0)
                asset_cost = float(apply_filters(
                    Asset.objects.filter(property=property_obj), "purchase_date"
                ).aggregate(s=Sum("purchase_price"))["s"] or 0)
                net_profit = revenue - rent - asset_cost
                ownership = InvestorPropertyOwnership.objects.filter(
                    investor=user, property=property_obj, effective_from__lte=today,
                ).filter(
                    Q(effective_to__isnull=True) | Q(effective_to__gte=today)
                ).order_by("-effective_from").first()
                percentage = float(ownership.ownership_percentage) if ownership else 0.0
                matrix.append({
                    "property_id": property_obj.id,
                    "property_name": property_obj.name,
                    "hostel_name": property_obj.hostel.name,
                    "income": revenue,
                    "groceries": asset_cost,
                    "payroll_burn": 0.0,
                    "accommodation_rent": rent,
                    "net_profit": net_profit,
                    "ownership_percentage": percentage,
                    "investor_profit": net_profit * percentage / 100,
                    "profit_margin": round(net_profit / revenue * 100, 1) if revenue else 0,
                })
                total_revenue += revenue
                total_logistics += asset_cost
                total_rent += rent
            return Response({
                "version": "property-1.0",
                "matrix": matrix,
                "summary": {
                    "total_revenue": total_revenue,
                    "total_logistics": total_logistics,
                    "total_payroll": total_payroll,
                    "total_accommodation_rent": total_rent,
                    "net_margin": total_revenue - total_logistics - total_rent,
                    "investor_profit": sum(row["investor_profit"] for row in matrix),
                    "student_count": 0,
                },
            })
        
        def apply_filters(qs, date_field):
            if period == "YTD": return qs.filter(**{f"{date_field}__year": year, f"{date_field}__month__lte": today.month})
            elif period == "SPECIFIC": return qs.filter(**{f"{date_field}__year": year, f"{date_field}__month": month})
            else: return qs.filter(**{f"{date_field}__year": today.year, f"{date_field}__month": today.month})

        matrix = []
        t_rev, t_log, t_pay, t_rent, t_stu = 0.0, 0.0, 0.0, 0.0, 0

        for h in hostels:
            r_qs = apply_filters(Receipt.objects.filter(fee__student__hostel=h), "date_issued__date")
            rev_val = float(r_qs.aggregate(s=Sum('amount'))['s'] or 0)
            
            p_qs = apply_filters(Purchase.objects.filter(hostel=h, status='APPROVED'), "date")
            logi_val = float(p_qs.annotate(c=F('quantity')*F('price_per_unit')).aggregate(s=Sum('c'))['s'] or 0)

            a_qs = apply_filters(Asset.objects.filter(hostel=h), "purchase_date")
            asset_val = float(a_qs.aggregate(s=Sum('purchase_price'))['s'] or 0)
            
            py_qs = apply_filters(SalarySlip.objects.filter(employee__user__hostel=h, is_disbursed=True), "disbursed_at__date")
            payr_val = float(py_qs.aggregate(s=Sum('net_salary'))['s'] or 0)

            rent_qs = apply_filters(PropertyRentAccrual.objects.filter(property__hostel=h), "month")
            rent_val = float(rent_qs.aggregate(s=Sum('amount'))['s'] or 0)
            
            s_count = StudentProfile.objects.filter(hostel=h, is_active=True).count()
            t_rev += rev_val; t_log += (logi_val + asset_val); t_pay += payr_val; t_rent += rent_val; t_stu += s_count

            matrix.append({
                "hostel_id": h.id, "hostel_name": h.name, "income": rev_val, "groceries": logi_val + asset_val,
                "payroll_burn": payr_val, "accommodation_rent": rent_val,
                "net_profit": rev_val - (logi_val + asset_val + payr_val + rent_val),
                "profit_margin": round(((rev_val - (logi_val + asset_val + payr_val + rent_val)) / rev_val * 100), 1) if rev_val > 0 else 0
            })

        students_den = t_stu if t_stu > 0 else 1
        return Response({
            "version": "6.0",
            "matrix": matrix,
            "summary": {
                "total_revenue": t_rev, "total_logistics": t_log, "total_payroll": t_pay,
                "total_accommodation_rent": t_rent,
                "net_margin": t_rev - (t_log + t_pay + t_rent),
                "avg_revenue": t_rev / students_den, "avg_cost": (t_log + t_pay + t_rent) / students_den,
                "student_count": t_stu
            }
        })

class InventoryListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user; from_d = request.query_params.get("from_date"); to_d = request.query_params.get("to_date")
        qs = Purchase.objects.select_related("hostel", "vendor", "item", "item__unit")
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel: qs = qs.filter(hostel=user.hostel)
        if from_d: qs = qs.filter(date__gte=from_d)
        if to_d: qs = qs.filter(date__lte=to_d)
        return Response([{
            "id": p.id,
            "date": p.date,
            "hostel": p.hostel.name,
            "vendor": p.vendor.name,
            "item": p.item.name,
            "quantity": float(p.quantity),
            "unit": p.item.unit.name,
            "total_cost": float(p.quantity * p.price_per_unit),
            "status": p.status,
            "invoice_photo": p.invoice_photo.url if p.invoice_photo else None,
            "items_photo": p.items_photo.url if p.items_photo else None,
        } for p in qs.order_by("-date")])

class InventoryExportCSVView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        response = HttpResponse(content_type="text/csv"); response["Content-Disposition"] = 'attachment; filename="inventory.csv"'; writer = csv.writer(response)
        writer.writerow(["Date", "Hostel", "Vendor", "Item", "Qty", "Price", "Total"])
        qs = Purchase.objects.filter(status='APPROVED').select_related("hostel", "vendor", "item")
        user = request.user
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel: qs = qs.filter(hostel=user.hostel)
        for p in qs: writer.writerow([p.date, p.hostel.name, p.vendor.name, p.item.name, p.quantity, p.price_per_unit, p.total_cost])
        return response

class VendorPriceTrendView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        item_id = request.query_params.get("item_id")
        if not item_id: return Response({"detail": "item_id required"}, status=400)
        user = request.user; purchases = Purchase.objects.filter(item_id=item_id, status='APPROVED')
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel: purchases = purchases.filter(hostel=user.hostel)
        trend = purchases.values("vendor__name", "date__year", "date__month").annotate(avg_price=Avg("price_per_unit")).order_by("date__year", "date__month")
        return Response(trend)

class SavingsSuggestionsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user; items = Item.objects.all(); suggestions = []
        for item in items:
            qs = Purchase.objects.filter(item=item, status='APPROVED')
            if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel: qs = qs.filter(hostel=user.hostel)
            best_v = qs.values("vendor__name").annotate(avg_p=Avg("price_per_unit")).order_by("avg_p").first()
            if best_v: suggestions.append({"item": item.name, "best_vendor": best_v["vendor__name"], "best_avg_price": float(best_v["avg_p"])})
        return Response(suggestions)

class SmartReorderSheetView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user; items = Item.objects.filter(is_active=True); results = []
        for item in items:
            in_qs = Purchase.objects.filter(item=item, status='APPROVED'); out_qs = Consumption.objects.filter(item=item)
            if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel: in_qs, out_qs = in_qs.filter(hostel=user.hostel), out_qs.filter(hostel=user.hostel)
            stock = (in_qs.aggregate(s=Sum('quantity'))['s'] or 0) - (out_qs.aggregate(s=Sum('quantity'))['s'] or 0)
            last_p = in_qs.order_by('-date', '-id').first(); best_v = in_qs.values("vendor__name").annotate(avg_p=Avg("price_per_unit")).order_by("avg_p").first()
            results.append({"item_id": item.id, "item_name": item.name, "unit": item.unit.name, "current_stock": float(stock), "reorder_level": float(item.reorder_level), "last_price": float(last_p.price_per_unit) if last_p else 0, "best_vendor": best_v["vendor__name"] if best_v else "N/A", "best_avg_price": float(best_v["avg_p"]) if best_v else 0, "needs_reorder": stock <= item.reorder_level and item.reorder_level > 0})
        return Response(results)

class ConsumptionAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user; today = date.today(); start = date(today.year, today.month, 1); items = Item.objects.filter(is_active=True); results = []
        for item in items:
            cur = Consumption.objects.filter(item=item, date__gte=start)
            if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel: cur = cur.filter(hostel=user.hostel)
            results.append({"item": item.name, "current_month": float(cur.aggregate(s=Sum('quantity'))['s'] or 0)})
        return Response({"abnormal_consumption": results})

class ExportPnLReportView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request): return Response({"detail": "Use frontend table export."})

class GeneratePurchaseOrderView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        purchase = Purchase.objects.select_related('item', 'vendor', 'hostel').get(pk=pk)
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="PO_{purchase.id}.pdf"'

        doc = SimpleDocTemplate(response, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        elements.append(Paragraph("<b>PURCHASE ORDER</b>", styles['Title']))
        elements.append(Spacer(1, 12))

        header_data = [
            [Paragraph("<b>Purchase ID</b>", styles['Normal']), str(purchase.id)],
            [Paragraph("<b>Date</b>", styles['Normal']), str(purchase.date)],
            [Paragraph("<b>Hostel</b>", styles['Normal']), purchase.hostel.name],
            [Paragraph("<b>Vendor</b>", styles['Normal']), purchase.vendor.name],
            [Paragraph("<b>Invoice No</b>", styles['Normal']), purchase.invoice_no or "-"],
        ]
        header_table = Table(header_data, colWidths=[2.2 * inch, 4 * inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.black),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 12))

        table_data = [["Code", "Item", "Qty", "Price", "Total"],
                      [purchase.item.code, purchase.item.name, f"{purchase.quantity}", f"Rs {purchase.price_per_unit}", f"Rs {purchase.total_cost}"]]
        t = Table(table_data, colWidths=[1.2*inch, 2.6*inch, 0.8*inch, 1.2*inch, 1.2*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 16))

        if purchase.invoice_photo or purchase.items_photo:
            elements.append(Paragraph("<b>Attached Photos</b>", styles['Heading2']))
            elements.append(Spacer(1, 8))
            image_cells = []
            if purchase.invoice_photo:
                try:
                    image_cells.append(RLImage(purchase.invoice_photo.path, width=3*inch, height=3*inch))
                except Exception:
                    image_cells.append(Paragraph("Invoice photo not available.", styles['Normal']))
            if purchase.items_photo:
                try:
                    image_cells.append(RLImage(purchase.items_photo.path, width=3*inch, height=3*inch))
                except Exception:
                    image_cells.append(Paragraph("Items photo not available.", styles['Normal']))

            if image_cells:
                photo_table = Table([image_cells], colWidths=[3*inch] * len(image_cells))
                photo_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('ALIGN', (0,0), (-1,-1), 'CENTER')]))
                elements.append(photo_table)
                elements.append(Spacer(1, 8))
                caption_data = [[Paragraph('<b>Invoice Photo</b>', styles['Normal']) if purchase.invoice_photo else '', Paragraph('<b>Items Photo</b>', styles['Normal']) if purchase.items_photo else '']]
                caption_table = Table(caption_data, colWidths=[3*inch] * len(image_cells))
                caption_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER')]))
                elements.append(caption_table)
                elements.append(Spacer(1, 12))

        doc.build(elements)
        return response

class SendPOWhatsAppView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk): return Response({"status": "Sent (Mock)"})

class ReceiptOCRView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        api_key = getattr(settings, "GEMINI_API_KEY", None)
        if not api_key:
            logger.error("GEMINI_API_KEY not configured")
            return Response({"detail": "GEMINI_API_KEY is not configured on the server."}, status=500)

        file = request.FILES.get('image')
        if not file:
            return Response({"detail": "No image provided."}, status=400)

        try:
            from google import genai
            from google.genai import types
        except ImportError:
            logger.error("google-genai not installed")
            return Response({"detail": "The google-genai package is missing."}, status=500)

        client = genai.Client(api_key=api_key)

        # Build parts: prompt text FIRST, then image bytes (exactly like read-slip.py)
        prompt = """
        Analyze this purchase receipt image. Extract all raw numerical price amounts.
        Provide your response in the following strict format:

        [PRICES_START]
        (List each detected number on a new line)
        [PRICES_END]
        """

        file.seek(0)
        parts = [
            types.Part.from_text(text=prompt),
            types.Part.from_bytes(data=file.read(), mime_type=file.content_type or "image/jpeg")
        ]
        user_content = types.Content(role="user", parts=parts)

        try:
            logger.debug("Calling Gemini model=gemini-3.6-flash with single image")
            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=user_content
            )
            result_text = response.text
            logger.info("Gemini raw response: %s", result_text)

            nums = []
            if "[PRICES_START]" in result_text and "[PRICES_END]" in result_text:
                prices_block = result_text.split("[PRICES_START]")[1].split("[PRICES_END]")[0].strip()
                for line in prices_block.split("\n"):
                    match = re.search(r'(\d+(?:\.\d+)?)', line)
                    if match:
                        nums.append(float(match.group(1)))

            return Response({"detected_total": max(nums) if nums else 0})

        except Exception as e:
            logger.exception("Gemini call failed")
            return Response({"detail": f"AI OCR extraction failed: {str(e)}"}, status=502)

class GenerateAllItemLabelsPDFView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        items = Item.objects.filter(is_active=True).order_by('name'); response = HttpResponse(content_type='application/pdf'); response['Content-Disposition'] = 'attachment; filename="Labels.pdf"'; doc = SimpleDocTemplate(response, pagesize=A4); elements = []; styles = getSampleStyleSheet(); table_data = []; row = []
        for i, item in enumerate(items):
            qr = qrcode.QRCode(version=1, box_size=10, border=2); qr.add_data(f"https://maryamhostel.com/item/{item.id}/"); qr.make(fit=True); qr_img = qr.make_image(fill_color="black", back_color="white"); buf = io.BytesIO(); qr_img.save(buf, format="PNG"); buf.seek(0); row.append([Paragraph(f"<b>{item.name}</b>", styles['Normal']), RLImage(buf, width=1.1*inch, height=1.1*inch)])
            if (i + 1) % 4 == 0: table_data.append(row); row = []
        if row: 
            while len(row) < 4: row.append(Paragraph("", styles['Normal']))
            table_data.append(row)
        t = Table(table_data, colWidths=[1.8*inch]*4); t.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('GRID', (0,0), (-1,-1), 0.5, colors.grey)])); elements.append(t); doc.build(elements); return response

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name"); serializer_class = CategorySerializer; permission_classes = [IsHostelManagerOrAbove]
class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all().order_by("name"); serializer_class = UnitSerializer; permission_classes = [IsHostelManagerOrAbove]
class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.filter(is_active=True).order_by("name")
    serializer_class = ItemSerializer
    permission_classes = [IsHostelManagerOrAbove]

    @action(detail=True, methods=['get'], url_path='qr_code')
    def qr_code(self, request, pk=None):
        item = self.get_object()
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(f"https://maryamhostel.com/item/{item.id}/")
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        buf = io.BytesIO()
        qr_img.save(buf, format='PNG')
        buf.seek(0)
        response = HttpResponse(buf, content_type='image/png')
        response['Content-Disposition'] = f'attachment; filename="QR_Item_{item.id}.png"'
        return response

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all().order_by("name"); serializer_class = VendorSerializer; permission_classes = [IsHostelManagerOrAbove]
class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.select_related("hostel", "vendor", "item").all().order_by("-date")
    serializer_class = PurchaseSerializer
    permission_classes = [IsHostelManagerOrAbove]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        qs = super().get_queryset(); user = self.request.user
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel: return qs.filter(hostel=user.hostel)
        return qs
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        p = self.get_object(); p.status = 'APPROVED'; p.approved_by = request.user; p.save(); return Response({"status": "OK"})
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        p = self.get_object(); p.status = 'REJECTED'; p.rejection_remarks = request.data.get("remarks", ""); p.save(); return Response({"status": "OK"})
class ConsumptionViewSet(viewsets.ModelViewSet):
    queryset = Consumption.objects.select_related("hostel", "item").all().order_by("-date")
    serializer_class = ConsumptionSerializer
    permission_classes = [IsHostelManagerOrAbove]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        qs = super().get_queryset(); user = self.request.user
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel: return qs.filter(hostel=user.hostel)
        return qs
