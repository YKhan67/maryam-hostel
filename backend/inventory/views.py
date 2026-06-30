from django.shortcuts import render
from datetime import date
from django.db.models import Sum, Avg, F, DecimalField, Q
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from rest_framework import viewsets, permissions

from .models import Category, Unit, Item, Vendor, Purchase
from hostels.models import Hostel

from .serializers import (
    CategorySerializer,
    UnitSerializer,
    ItemSerializer,
    VendorSerializer,
    PurchaseSerializer,
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
    queryset = (
        Purchase.objects.select_related("hostel", "vendor", "item")
        .all()
        .order_by("-date")
    )
    serializer_class = PurchaseSerializer
    permission_classes = [IsHostelManagerOrAbove]

    def perform_create(self, serializer):
        # later we can auto-limit hostel by user.hostel
        serializer.save()


class InventorySummaryView(APIView):
    """
    Groceries / inventory spend and price comparison
    for the management dashboard.

    - Total spend for current month
    - Top vendors by spend + avg unit price
    - Top items by spend + avg unit price
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        month_start = date(today.year, today.month, 1)

        # Filter purchases for the current month (inclusive)
        purchases = Purchase.objects.filter(
            date__gte=month_start,
            date__lte=today,
        )

        # Total spent = sum(quantity * price_per_unit)
        total_spent = (
            purchases.aggregate(
                total=Sum(
                    F("quantity") * F("price_per_unit"),
                    output_field=DecimalField(max_digits=20, decimal_places=2),
                )
            )["total"]
            or 0
        )

        # Top vendors by spend
        by_vendor_qs = (
            purchases.values("vendor__name")
            .annotate(
                total_spent=Sum(
                    F("quantity") * F("price_per_unit"),
                    output_field=DecimalField(max_digits=20, decimal_places=2),
                ),
                avg_unit_price=Avg("price_per_unit"),
            )
            .order_by("-total_spent")[:5]
        )

        # Top items by spend
        by_item_qs = (
            purchases.values("item__name")
            .annotate(
                total_spent=Sum(
                    F("quantity") * F("price_per_unit"),
                    output_field=DecimalField(max_digits=20, decimal_places=2),
                ),
                avg_unit_price=Avg("price_per_unit"),
            )
            .order_by("-total_spent")[:5]
        )

        data = {
            "month_start": month_start,
            "total_spent": float(total_spent),
            "by_vendor": [
                {
                    "vendor": row["vendor__name"],
                    "total_spent": float(row["total_spent"] or 0),
                    "avg_unit_price": float(row["avg_unit_price"] or 0),
                }
                for row in by_vendor_qs
            ],
            "by_item": [
                {
                    "item": row["item__name"],
                    "total_spent": float(row["total_spent"] or 0),
                    "avg_unit_price": float(row["avg_unit_price"] or 0),
                }
                for row in by_item_qs
            ],
        }
        return Response(data)


class InventoryListView(APIView):
    """
    Detailed list of purchases, with filters:
    - ?city_id=
    - ?hostel_id=
    - ?from_date=YYYY-MM-DD
    - ?to_date=YYYY-MM-DD
    - ?search=rice
    - ?ordering=date or -date or total_cost or -total_cost or price_per_unit/-price_per_unit
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        city_id = request.query_params.get("city_id")
        hostel_id = request.query_params.get("hostel_id")
        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")
        search = request.query_params.get("search")
        ordering = request.query_params.get("ordering")  # e.g. "-date", "total_cost"

        # Base queryset with all joins we need
        purchases = Purchase.objects.all().select_related(
            "hostel", "vendor", "item", "item__category", "item__unit"
        )

        # Filter by city / hostel using the hostel FK
        hostels_qs = Hostel.objects.all()
        if city_id:
            hostels_qs = hostels_qs.filter(city_id=city_id)
        if hostel_id:
            hostels_qs = hostels_qs.filter(id=hostel_id)
        if city_id or hostel_id:
            purchases = purchases.filter(hostel__in=hostels_qs)

        # Date range filters (if provided)
        if from_date:
            purchases = purchases.filter(date__gte=from_date)
        if to_date:
            purchases = purchases.filter(date__lte=to_date)

        # Search on vendor name and item name
        if search:
            purchases = purchases.filter(
                Q(vendor__name__icontains=search)
                | Q(item__name__icontains=search)
            )

        # Annotate total_cost_annot = quantity * price_per_unit
        # (we can't call it "total_cost" because the model has a @property with that name)
        purchases = purchases.annotate(
            total_cost_annot=F("quantity") * F("price_per_unit")
        )

        # Sorting: allow date, total_cost, price_per_unit (asc/desc)
        allowed_frontend_order = {
            "date",
            "-date",
            "total_cost",
            "-total_cost",
            "price_per_unit",
            "-price_per_unit",
        }

        if ordering in allowed_frontend_order:
            backend_order = ordering
            # map total_cost → total_cost_annot to avoid property conflict
            if "total_cost" in ordering:
                backend_order = ordering.replace("total_cost", "total_cost_annot")
            purchases = purchases.order_by(backend_order, "-id")
        else:
            purchases = purchases.order_by("-date", "-id")

        # Serialize rows
        data = []
        for p in purchases:
            # read from the annotation if present, else fallback to model property
            total_cost_val = getattr(p, "total_cost_annot", None)
            if total_cost_val is None:
                total_cost_val = p.total_cost  # model @property

            data.append(
                {
                    "id": p.id,
                    "date": p.date,
                    "hostel": p.hostel.name if getattr(p, "hostel", None) else None,
                    "vendor": p.vendor.name if getattr(p, "vendor", None) else None,
                    "item": p.item.name if getattr(p, "item", None) else None,
                    "category": getattr(getattr(p.item, "category", None), "name", None)
                    if getattr(p, "item", None)
                    else None,
                    "unit": getattr(getattr(p.item, "unit", None), "name", None)
                    if getattr(p, "item", None)
                    else None,
                    "quantity": float(p.quantity),
                    "price_per_unit": float(p.price_per_unit),
                    "total_cost": float(total_cost_val),
                }
            )

        return Response(data)


import csv


class InventoryExportCSVView(APIView):
    """
    CSV export of inventory with same filters as InventoryListView.
    Excel can open this directly.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment filename="inventory_export.csv"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "ID",
                "Date",
                "Hostel",
                "Vendor",
                "Item",
                "Category",
                "Unit",
                "Quantity",
                "Price per Unit",
                "Total Cost",
            ]
        )

        city_id = request.query_params.get("city_id")
        hostel_id = request.query_params.get("hostel_id")
        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")

        purchases = Purchase.objects.all().select_related(
            "hostel", "vendor", "item", "item__category", "item__unit"
        )

        hostels_qs = Hostel.objects.all()
        if city_id:
            hostels_qs = hostels_qs.filter(city_id=city_id)
        if hostel_id:
            hostels_qs = hostels_qs.filter(id=hostel_id)
        if city_id or hostel_id:
            purchases = purchases.filter(hostel__in=hostels_qs)

        if from_date:
            purchases = purchases.filter(date__gte=from_date)
        if to_date:
            purchases = purchases.filter(date__lte=to_date)

        # annotate with a safe name
        purchases = purchases.annotate(
            total_cost_annot=F("quantity") * F("price_per_unit")
        ).order_by("-date", "-id")

        for p in purchases:
            total_cost_val = getattr(p, "total_cost_annot", None)
            if total_cost_val is None:
                total_cost_val = p.total_cost

            writer.writerow(
                [
                    p.id,
                    p.date,
                    p.hostel.name if p.hostel_id else "",
                    p.vendor.name if p.vendor_id else "",
                    p.item.name if p.item_id else "",
                    (
                        getattr(getattr(p.item, "category", None), "name", "")
                        if p.item_id
                        else ""
                    ),
                    (
                        getattr(getattr(p.item, "unit", None), "name", "")
                        if p.item_id
                        else ""
                    ),
                    float(p.quantity),
                    float(p.price_per_unit),
                    float(total_cost_val),
                ]
            )

        return response


class VendorPriceTrendView(APIView):
    """
    Average price per vendor over time for a given item.
    - ?item_id=1
    Optional:
    - ?hostel_id=
    - ?city_id=
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        item_id = request.query_params.get("item_id")
        if not item_id:
            return Response({"detail": "item_id is required"}, status=400)

        city_id = request.query_params.get("city_id")
        hostel_id = request.query_params.get("hostel_id")

        purchases = Purchase.objects.filter(item_id=item_id)

        hostels_qs = Hostel.objects.all()
        if city_id:
            hostels_qs = hostels_qs.filter(city_id=city_id)
        if hostel_id:
            hostels_qs = hostels_qs.filter(id=hostel_id)
        if city_id or hostel_id:
            purchases = purchases.filter(hostel__in=hostels_qs)

        # group by year-month & vendor
        trend_qs = (
            purchases.annotate(
                ym_year=F("date__year"),
                ym_month=F("date__month"),
            )
            .values("ym_year", "ym_month", "vendor__name")
            .annotate(
                avg_price=Avg("price_per_unit"),
                total_qty=Sum("quantity"),
            )
            .order_by("ym_year", "ym_month", "vendor__name")
        )

        result = []
        for row in trend_qs:
            ym_str = f"{row['ym_year']}-{row['ym_month']:02d}"
            result.append(
                {
                    "year_month": ym_str,
                    "vendor": row["vendor__name"],
                    "avg_unit_price": float(row["avg_price"] or 0),
                    "total_quantity": float(row["total_qty"] or 0),
                }
            )

        return Response(result)


class SavingsSuggestionsView(APIView):
    """
    Simple savings hints per item based on average vendor prices.
    Optional filters: ?city_id= & ?hostel_id=
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        city_id = request.query_params.get("city_id")
        hostel_id = request.query_params.get("hostel_id")

        purchases = Purchase.objects.all()

        hostels_qs = Hostel.objects.all()
        if city_id:
            hostels_qs = hostels_qs.filter(city_id=city_id)
        if hostel_id:
            hostels_qs = hostels_qs.filter(id=hostel_id)
        if city_id or hostel_id:
            purchases = purchases.filter(hostel__in=hostels_qs)

        # avg price per item & vendor
        item_vendor_qs = purchases.values(
            "item_id", "item__name", "vendor_id", "vendor__name"
        ).annotate(
            avg_price=Avg("price_per_unit"),
            total_qty=Sum("quantity"),
        )

        # group by item in Python
        by_item = {}
        for row in item_vendor_qs:
            item_id = row["item_id"]
            if item_id not in by_item:
                by_item[item_id] = {
                    "item": row["item__name"],
                    "vendors": [],
                }
            by_item[item_id]["vendors"].append(
                {
                    "vendor_id": row["vendor_id"],
                    "vendor": row["vendor__name"],
                    "avg_price": float(row["avg_price"] or 0),
                    "total_qty": float(row["total_qty"] or 0),
                }
            )

        suggestions = []
        for item_id, info in by_item.items():
            vendors = info["vendors"]
            if len(vendors) < 2:
                continue  # no comparison possible

            # find cheapest vendor
            cheapest = min(vendors, key=lambda v: v["avg_price"])
            # approximate potential saving: compare others to cheapest
            potential_saving = 0.0
            for v in vendors:
                if v["vendor_id"] == cheapest["vendor_id"]:
                    continue
                price_diff = v["avg_price"] - cheapest["avg_price"]
                if price_diff > 0:
                    potential_saving += price_diff * v["total_qty"]

            if potential_saving <= 0:
                continue

            suggestions.append(
                {
                    "item": info["item"],
                    "cheapest_vendor": cheapest["vendor"],
                    "cheapest_avg_price": cheapest["avg_price"],
                    "estimated_saving_if_buy_from_cheapest": potential_saving,
                }
            )

        # sort by highest potential saving
        suggestions.sort(
            key=lambda s: s["estimated_saving_if_buy_from_cheapest"],
            reverse=True,
        )

        return Response(suggestions)
