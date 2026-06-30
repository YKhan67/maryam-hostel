from django.shortcuts import render
from datetime import date
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


# Create your views here.

# backend/hostels/views.py
from rest_framework import viewsets, permissions
from .models import City, Hostel, Building, Floor, Room, Bed, StudentProfile
from .serializers import (
    CitySerializer, HostelSerializer, BuildingSerializer, FloorSerializer,
    RoomSerializer, BedSerializer, StudentProfileSerializer
)

class IsSuperAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role == "SUPER_ADMIN"

class CityViewSet(viewsets.ModelViewSet):
    queryset = City.objects.all().order_by("name")
    serializer_class = CitySerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class HostelViewSet(viewsets.ModelViewSet):
    queryset = Hostel.objects.all().order_by("code")
    serializer_class = HostelSerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class BuildingViewSet(viewsets.ModelViewSet):
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class FloorViewSet(viewsets.ModelViewSet):
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.select_related("user", "hostel", "bed").all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

from .models import Bed, StudentProfile, Hostel, City
from fees.models import MonthlyFee


class ManagementKPIView(APIView):
    """
    Management KPIs, with optional filters:
    - ?city_id=1
    - ?hostel_id=5
    - ?month=2025-11
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # --- filters from query params ---
        city_id = request.query_params.get("city_id")
        hostel_id = request.query_params.get("hostel_id")
        month_str = request.query_params.get("month")

        today = date.today()

        if month_str:
            try:
                year, month = map(int, month_str.split("-"))
                month_start = date(year, month, 1)
            except Exception:
                month_start = date(today.year, today.month, 1)
        else:
            month_start = date(today.year, today.month, 1)

        # --- hostels selection based on filters ---
        hostels_qs = Hostel.objects.all()
        if city_id:
            hostels_qs = hostels_qs.filter(city_id=city_id)
        if hostel_id:
            hostels_qs = hostels_qs.filter(id=hostel_id)

        # --- beds & occupancy ---
        # Try to restrict beds to selected hostels, but fall back to global if relation chain is different
        try:
            beds_qs = Bed.objects.filter(
                room__floor__building__hostel__in=hostels_qs
            )
        except Exception:
            beds_qs = Bed.objects.all()

        total_beds = beds_qs.count()
        occupied_beds = beds_qs.filter(is_occupied=True).count()

        # --- active students in selected hostels ---
        students_qs = StudentProfile.objects.filter(is_active=True)
        if hostels_qs.exists():
            students_qs = students_qs.filter(hostel__in=hostels_qs)
        active_students = students_qs.count()

        occupancy_rate = (occupied_beds / total_beds * 100) if total_beds else 0.0

        # --- current month fees, filtered by hostels ---
        month_fees = MonthlyFee.objects.filter(month=month_start)
        if hostels_qs.exists():
            month_fees = month_fees.filter(student__hostel__in=hostels_qs)

        # invoiced (base + late)
        agg_all = month_fees.aggregate(
            base=Sum("amount"),
            late=Sum("late_fee_applied"),
        )
        month_invoiced = (agg_all["base"] or 0) + (agg_all["late"] or 0)

        # collected
        paid_fees = month_fees.filter(is_paid=True)
        agg_paid = paid_fees.aggregate(
            base=Sum("amount"),
            late=Sum("late_fee_applied"),
        )
        month_collected = (agg_paid["base"] or 0) + (agg_paid["late"] or 0)
        month_outstanding = month_invoiced - month_collected

        # --- overdue fees: any unpaid before this month ---
        overdue_qs = MonthlyFee.objects.filter(
            is_paid=False,
            month__lt=month_start,
        )
        if hostels_qs.exists():
            overdue_qs = overdue_qs.filter(student__hostel__in=hostels_qs)

        overdue_students = overdue_qs.values("student").distinct().count()
        overdue_invoices = overdue_qs.count()

        data = {
            "today": today,
            "month_start": month_start,
            "filters": {
                "city_id": city_id,
                "hostel_id": hostel_id,
            },
            "beds": {
                "total_beds": total_beds,
                "occupied_beds": occupied_beds,
                "occupancy_rate": round(occupancy_rate, 1),
                "active_students": active_students,
            },
            "rent": {
                "month_invoiced": float(month_invoiced),
                "month_collected": float(month_collected),
                "month_outstanding": float(month_outstanding),
            },
            "overdue": {
                "overdue_students": overdue_students,
                "overdue_invoices": overdue_invoices,
            },
        }
        return Response(data)

class InventorySummaryView(APIView):
    """
    SAFE placeholder: returns zero spend and empty lists.
    We'll plug in real Purchase model aggregates later.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = {
            "total_spent": 0.0,
            "by_vendor": [],
            "by_item": [],
        }
        return Response(data)