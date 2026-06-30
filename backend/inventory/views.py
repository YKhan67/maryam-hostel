from django.shortcuts import render
from datetime import date, timedelta
from django.db.models import Sum, Avg, F, DecimalField, Q
from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Category, Unit, Item, Vendor, Purchase, Consumption
from hostels.models import Hostel

from .serializers import (
    CategorySerializer,
    UnitSerializer,
    ItemSerializer,
    VendorSerializer,
    PurchaseSerializer,
    ConsumptionSerializer,
)

class IsHostelManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [
            "SUPER_ADMIN",
            "CITY_MANAGER",
            "HOSTEL_MANAGER",
            "STAFF",
        ]

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [IsHostelManagerOrAbove]

class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all().order_by("name")
    serializer_class = UnitSerializer
    permission_classes = [IsHostelManagerOrAbove]

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.filter(is_active=True).order_by("name")
    serializer_class = ItemSerializer
    permission_classes = [IsHostelManagerOrAbove]

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all().order_by("name")
    serializer_class = VendorSerializer
    permission_classes = [IsHostelManagerOrAbove]

class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.select_related("hostel", "vendor", "item").all().order_by("-date")
    serializer_class = PurchaseSerializer
    permission_classes = [IsHostelManagerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "HOSTEL_MANAGER" and user.hostel:
            return qs.filter(hostel=user.hostel)
        return qs

class ConsumptionViewSet(viewsets.ModelViewSet):
    queryset = Consumption.objects.select_related("hostel", "item").all().order_by("-date")
    serializer_class = ConsumptionSerializer
    permission_classes = [IsHostelManagerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "HOSTEL_MANAGER" and user.hostel:
            return qs.filter(hostel=user.hostel)
        return qs

class InventorySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        month_start = date(today.year, today.month, 1)
        user = request.user

        purchases = Purchase.objects.filter(date__gte=month_start)
        items_qs = Item.objects.all()
        
        if user.role == "HOSTEL_MANAGER" and user.hostel:
            purchases = purchases.filter(hostel=user.hostel)
            # For stock levels, we also filter by hostel in the annotation
            items_qs = items_qs.annotate(
                total_purchased=Sum('purchases__quantity', filter=Q(purchases__hostel=user.hostel)),
                total_consumed=Sum('consumptions__quantity', filter=Q(consumptions__hostel=user.hostel)),
            )
        else:
            items_qs = items_qs.annotate(
                total_purchased=Sum('purchases__quantity'),
                total_consumed=Sum('consumptions__quantity'),
            )

        total_spent = purchases.aggregate(
            total=Sum(F("quantity") * F("price_per_unit"), output_field=DecimalField(max_digits=20, decimal_places=2))
        )["total"] or 0

        stock_levels = [
            {
                "item": item.name,
                "unit": item.unit.name,
                "purchased": float(item.total_purchased or 0),
                "consumed": float(item.total_consumed or 0),
                "balance": float((item.total_purchased or 0) - (item.total_consumed or 0))
            }
            for item in items_qs.filter(Q(total_purchased__gt=0) | Q(total_consumed__gt=0))
        ]

        data = {
            "total_spent_this_month": float(total_spent),
            "stock_levels": stock_levels,
            "top_vendors": purchases.values("vendor__name").annotate(
                total=Sum(F("quantity") * F("price_per_unit"), output_field=DecimalField())
            ).order_by("-total")[:5]
        }
        return Response(data)

class InventoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        city_id = request.query_params.get("city_id")
        hostel_id = request.query_params.get("hostel_id")
        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")
        search = request.query_params.get("search")
        ordering = request.query_params.get("ordering")

        purchases = Purchase.objects.select_related("hostel", "vendor", "item", "item__unit")

        # Security: Hostel Managers can ONLY see their hostel
        if user.role == "HOSTEL_MANAGER" and user.hostel:
            purchases = purchases.filter(hostel=user.hostel)
        else:
            if city_id: purchases = purchases.filter(hostel__city_id=city_id)
            if hostel_id: purchases = purchases.filter(hostel_id=hostel_id)

        if from_date: purchases = purchases.filter(date__gte=from_date)
        if to_date: purchases = purchases.filter(date__lte=to_date)
        if search:
            purchases = purchases.filter(Q(vendor__name__icontains=search) | Q(item__name__icontains=search))

        purchases = purchases.annotate(total_cost_annot=F("quantity") * F("price_per_unit"))

        if ordering:
            purchases = purchases.order_by(ordering.replace("total_cost", "total_cost_annot"))
        else:
            purchases = purchases.order_by("-date")

        return Response([
            {
                "id": p.id,
                "date": p.date,
                "hostel": p.hostel.name,
                "vendor": p.vendor.name,
                "item": p.item.name,
                "quantity": float(p.quantity),
                "unit": p.item.unit.name,
                "price_per_unit": float(p.price_per_unit),
                "total_cost": float(p.total_cost_annot),
            } for p in purchases
        ])

class InventoryExportCSVView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import csv
        user = request.user
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="inventory_export.csv"'
        writer = csv.writer(response)
        writer.writerow(["Date", "Hostel", "Vendor", "Item", "Qty", "Unit", "Price", "Total"])
        
        qs = Purchase.objects.all().select_related("hostel", "vendor", "item", "item__unit")
        if user.role == "HOSTEL_MANAGER" and user.hostel:
            qs = qs.filter(hostel=user.hostel)

        for p in qs:
            writer.writerow([p.date, p.hostel.name, p.vendor.name, p.item.name, p.quantity, p.item.unit.name, p.price_per_unit, p.total_cost])
        
        return response

class VendorPriceTrendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        item_id = request.query_params.get("item_id")
        if not item_id: return Response({"detail": "item_id required"}, status=400)
        
        user = request.user
        purchases = Purchase.objects.filter(item_id=item_id)
        if user.role == "HOSTEL_MANAGER" and user.hostel:
            purchases = purchases.filter(hostel=user.hostel)

        trend = purchases.values(
            "vendor__name", "date__year", "date__month"
        ).annotate(
            avg_price=Avg("price_per_unit")
        ).order_by("date__year", "date__month")
        
        return Response(trend)

class SavingsSuggestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        items = Item.objects.all()
        suggestions = []
        for item in items:
            qs = Purchase.objects.filter(item=item)
            if user.role == "HOSTEL_MANAGER" and user.hostel:
                qs = qs.filter(hostel=user.hostel)

            best_price = qs.values("vendor__name").annotate(
                min_p=Avg("price_per_unit")
            ).order_by("min_p").first()
            
            if best_price:
                suggestions.append({
                    "item": item.name,
                    "best_vendor": best_price["vendor__name"],
                    "best_avg_price": float(best_price["min_p"])
                })
        return Response(suggestions)
