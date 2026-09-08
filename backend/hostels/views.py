from datetime import date
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


# Create your views here.

# backend/hostels/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from .models import City, Hostel, Property, Building, Floor, Room, Bed, BedAllocation, StudentProfile
from .serializers import (
    CitySerializer, HostelSerializer, PropertySerializer, BuildingSerializer,
    FloorSerializer, RoomSerializer, BedSerializer, BedAllocationSerializer,
    BedAllocationActionSerializer, BedReleaseActionSerializer, BulkBedSerializer,
    StudentProfileSerializer,
)
from .services import allocate_bed, release_bed, transfer_bed


def _bed_label(start_label, offset):
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    start = start_label.strip().upper() or "A"
    if len(start) == 1 and start in alphabet:
        index = alphabet.index(start) + offset
        if index < len(alphabet):
            return alphabet[index]
    return f"{start}-{offset + 1}"

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

class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.select_related("hostel").all().order_by("hostel__code", "name")
    serializer_class = PropertySerializer
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

    @action(detail=True, methods=["post"], url_path="bulk-beds")
    def bulk_beds(self, request, pk=None):
        room = self.get_object()
        serializer = BulkBedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        count = serializer.validated_data["count"]
        start_label = serializer.validated_data["start_label"]
        existing_labels = set(room.beds.values_list("label", flat=True))
        labels = []
        for offset in range(count):
            label = _bed_label(start_label, offset)
            if label in existing_labels:
                return Response({"detail": f"Bed label '{label}' already exists in this room."}, status=status.HTTP_400_BAD_REQUEST)
            labels.append(label)
        beds = [Bed(room=room, label=label) for label in labels]
        Bed.objects.bulk_create(beds)
        return Response(BedSerializer(beds, many=True).data, status=status.HTTP_201_CREATED)

class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class BedAllocationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BedAllocation.objects.select_related(
        "student__user", "bed__room__floor__building__property", "previous_bed", "created_by"
    ).all()
    serializer_class = BedAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "STUDENT":
            return qs.filter(student__user=user)
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            return qs.filter(student__hostel=user.hostel)
        return qs

class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.select_related("user", "hostel", "bed").all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "STUDENT":
            return qs.filter(user=user)
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            return qs.filter(hostel=user.hostel)
        return qs

    def _allocation_payload(self, request):
        serializer = BedAllocationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    @action(detail=True, methods=["post"], url_path="allocate-bed")
    def allocate_bed(self, request, pk=None):
        student = self.get_object()
        payload = self._allocation_payload(request)
        try:
            allocation = allocate_bed(
                student,
                payload["bed"],
                move_in_date=payload.get("move_in_date"),
                created_by=request.user,
                reason=payload.get("reason", ""),
                notes=payload.get("notes", ""),
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BedAllocationSerializer(allocation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="release-bed")
    def release_bed(self, request, pk=None):
        student = self.get_object()
        serializer = BedReleaseActionSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        try:
            allocation = release_bed(
                student,
                move_out_date=payload.get("move_out_date"),
                created_by=request.user,
                reason=payload.get("reason", ""),
                notes=payload.get("notes", ""),
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BedAllocationSerializer(allocation).data if allocation else {"detail": "Student has no assigned bed."})

    @action(detail=True, methods=["post"], url_path="transfer-bed")
    def transfer_bed(self, request, pk=None):
        student = self.get_object()
        payload = self._allocation_payload(request)
        try:
            allocation = transfer_bed(
                student,
                payload["bed"],
                move_in_date=payload.get("move_in_date"),
                created_by=request.user,
                reason=payload.get("reason", ""),
                notes=payload.get("notes", ""),
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BedAllocationSerializer(allocation).data, status=status.HTTP_200_OK)

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
        occupied_beds = StudentProfile.objects.filter(
            is_active=True,
            bed__in=beds_qs,
        ).count()

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