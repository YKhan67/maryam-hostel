from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, F, Q
from decimal import Decimal
from datetime import date
import logging
import traceback
import os

# Internal Imports
from .models import AssetCategory, Asset, PartnerCapital, Liability
from .serializers import (
    AssetCategorySerializer, AssetSerializer, 
    PartnerCapitalSerializer, LiabilitySerializer
)

logger = logging.getLogger(__name__)

class IsHostelManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "PARTNER", "STAFF"]

class BalanceSheetView(APIView):
    """
    Professional Balance Sheet Engine with Full Traceability.
    """
    permission_classes = [IsHostelManagerOrAbove]

    def get(self, request):
        progress = ["0. Engine Started"]
        try:
            user = request.user
            hostel_id = request.query_params.get("hostel_id")
            
            # 1. SCOPING
            progress.append("1. Scoping Hostels")
            from hostels.models import Hostel
            if user.role in ["HOSTEL_MANAGER", "PARTNER"] and user.hostel:
                scope_hostels = Hostel.objects.filter(id=user.hostel.id)
            elif hostel_id:
                scope_hostels = Hostel.objects.filter(id=hostel_id)
            else:
                scope_hostels = Hostel.objects.all()

            # 2. FIXED ASSETS
            progress.append("2. Calculating Fixed Assets")
            fixed_val = Asset.objects.filter(hostel__in=scope_hostels, status__in=['ACTIVE', 'MAINTENANCE']).aggregate(s=Sum('current_value'))['s'] or Decimal('0')

            # 3. STUDENT RECEIVABLES
            progress.append("3. Calculating Student Dues")
            from fees.models import MonthlyFee
            student_dues = MonthlyFee.objects.filter(student__hostel__in=scope_hostels, is_paid=False).aggregate(s=Sum('amount'))['s'] or Decimal('0')

            # 4. INVENTORY VALUATION (Full Logic)
            progress.append("4. Calculating Inventory Valuation")
            from inventory.models import Purchase, Consumption, Item
            total_inventory_value = Decimal('0')
            active_items = Item.objects.filter(is_active=True)
            for item in active_items:
                in_q = Purchase.objects.filter(item=item, hostel__in=scope_hostels, status='APPROVED').aggregate(s=Sum('quantity'))['s'] or Decimal('0')
                out_q = Consumption.objects.filter(item=item, hostel__in=scope_hostels).aggregate(s=Sum('quantity'))['s'] or Decimal('0')
                balance = in_q - out_q
                if balance > 0:
                    last_purchase = Purchase.objects.filter(item=item, status='APPROVED').order_by('-date').first()
                    price = last_purchase.price_per_unit if last_purchase else Decimal('0')
                    total_inventory_value += (Decimal(str(balance)) * price)

            # 5. LIABILITIES
            progress.append("5. Calculating Liabilities")
            from fees.models import SecurityDeposit
            sec_liabilities = SecurityDeposit.objects.filter(student__hostel__in=scope_hostels, status='HELD').aggregate(s=Sum('amount'))['s'] or Decimal('0')
            
            other_liabilities = Liability.objects.filter(hostel__in=scope_hostels, is_settled=False).aggregate(s=Sum('remaining_amount'))['s'] or Decimal('0')

            # 6. TOTALS
            progress.append("6. Finalizing Totals")
            t_assets = float(fixed_val + student_dues + total_inventory_value)
            t_liabilities = float(sec_liabilities + other_liabilities)

            return Response({
                "date": date.today().isoformat(),
                "assets": {
                    "fixed_assets": float(fixed_val),
                    "student_receivables": float(student_dues),
                    "inventory_valuation": float(total_inventory_value),
                    "total": t_assets
                },
                "liabilities": {
                    "security_deposits": float(sec_liabilities),
                    "accrued_expenses": float(other_liabilities),
                    "total": t_liabilities
                },
                "equity": t_assets - t_liabilities,
                "steps": progress
            })

        except Exception as e:
            # SAVE FULL ERROR TO FILE FOR DEEP DIVE
            with open("finance_error.log", "a") as f:
                f.write(f"\n--- ERROR AT {date.today()} ---\n")
                f.write(traceback.format_exc())
            
            return Response({
                "detail": "Internal Calculation Error",
                "message": str(e),
                "failed_at_step": progress[-1],
                "full_traceback": traceback.format_exc()
            }, status=500)

# --- Standard ViewSets ---
class AssetCategoryViewSet(viewsets.ModelViewSet):
    queryset = AssetCategory.objects.all(); serializer_class = AssetCategorySerializer; permission_classes = [IsHostelManagerOrAbove]

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().select_related('category', 'hostel'); serializer_class = AssetSerializer; permission_classes = [IsHostelManagerOrAbove]

class PartnerCapitalViewSet(viewsets.ModelViewSet):
    queryset = PartnerCapital.objects.all(); serializer_class = PartnerCapitalSerializer; permission_classes = [IsHostelManagerOrAbove]

class LiabilityViewSet(viewsets.ModelViewSet):
    queryset = Liability.objects.all(); serializer_class = LiabilitySerializer; permission_classes = [IsHostelManagerOrAbove]
