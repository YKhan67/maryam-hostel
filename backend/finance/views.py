from rest_framework import viewsets, permissions, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum
from decimal import Decimal
from datetime import date
import logging
from hostels.models import Property

# Internal Imports
from .models import (
    AssetCategory, Asset, PartnerCapital, Liability, PropertyRentalContract,
    PropertyRentAccrual, InvestorPropertyAccess, InvestorPropertyOwnership,
    PropertySharedCost, PropertyRentPayment,
)
from .serializers import (
    AssetCategorySerializer, AssetSerializer, 
    PartnerCapitalSerializer, LiabilitySerializer, PropertyRentalContractSerializer,
    PropertyRentAccrualSerializer, InvestorPropertyAccessSerializer,
    InvestorPropertyOwnershipSerializer,
    PropertySharedCostSerializer, PropertyRentPaymentSerializer,
)

logger = logging.getLogger(__name__)

class IsHostelManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role in ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "PARTNER", "STAFF"]

class PropertyFinancePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return request.user.role in ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "PARTNER"]
        return request.user.role in ["SUPER_ADMIN", "CITY_MANAGER"]


def accessible_property_ids(user):
    if user.role in ["SUPER_ADMIN", "CITY_MANAGER"]:
        return None
    if user.role == "HOSTEL_MANAGER" and user.hostel_id:
        return Property.objects.filter(hostel_id=user.hostel_id).values_list("id", flat=True)
    return InvestorPropertyAccess.objects.filter(
        investor=user, can_view_financials=True
    ).values_list("property_id", flat=True)

class AssetViewSet(viewsets.ModelViewSet):
    """
    Handles Add/Edit/Sold operations for assets with branch-level security.
    """
    queryset = Asset.objects.all().select_related('category', 'hostel')
    serializer_class = AssetSerializer
    permission_classes = [IsHostelManagerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Isolation: Managers only see their own branch assets
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            return qs.filter(hostel=user.hostel)
        return qs

    def perform_create(self, serializer):
        # Auto-set current_value to purchase_price on first save
        instance = serializer.save()
        if not instance.current_value:
            instance.current_value = instance.purchase_price
            instance.save()

class BalanceSheetView(APIView):
    permission_classes = [IsHostelManagerOrAbove]
    def get(self, request):
        try:
            user = request.user
            hostel_id = request.query_params.get("hostel_id")
            from hostels.models import Hostel
            if user.role in ["HOSTEL_MANAGER", "PARTNER"] and user.hostel:
                scope_hostels = Hostel.objects.filter(id=user.hostel.id)
            elif hostel_id:
                scope_hostels = Hostel.objects.filter(id=hostel_id)
            else:
                scope_hostels = Hostel.objects.all()

            scope_properties = None
            if user.role == "PARTNER":
                accessible_properties = InvestorPropertyAccess.objects.filter(
                    investor=user, can_view_financials=True
                ).values_list("property_id", flat=True)
                if accessible_properties.exists():
                    scope_properties = accessible_properties
                    scope_hostels = Hostel.objects.filter(properties__id__in=scope_properties).distinct()

            assets_qs = Asset.objects.filter(hostel__in=scope_hostels, status__in=['ACTIVE', 'MAINTENANCE'])
            if scope_properties is not None:
                assets_qs = assets_qs.filter(property_id__in=scope_properties) | assets_qs.filter(property__isnull=True)
            fixed_val = assets_qs.aggregate(s=Sum('current_value'))['s'] or Decimal('0')
            from fees.models import MonthlyFee
            student_dues = MonthlyFee.objects.filter(student__hostel__in=scope_hostels, is_paid=False).aggregate(s=Sum('amount'))['s'] or Decimal('0')
            from inventory.models import Purchase, Consumption, Item
            total_inventory_value = Decimal('0')
            active_items = Item.objects.filter(is_active=True)
            for item in active_items:
                in_q = Purchase.objects.filter(item=item, hostel__in=scope_hostels, status='APPROVED').aggregate(s=Sum('quantity'))['s'] or Decimal('0')
                out_q = Consumption.objects.filter(item=item, hostel__in=scope_hostels).aggregate(s=Sum('quantity'))['s'] or Decimal('0')
                balance = in_q - out_q
                if balance > 0:
                    last_p = Purchase.objects.filter(item=item, status='APPROVED').order_by('-date').first()
                    total_inventory_value += (Decimal(str(balance)) * (last_p.price_per_unit if last_p else 0))

            from fees.models import SecurityDeposit
            sec_liab = SecurityDeposit.objects.filter(student__hostel__in=scope_hostels, status='HELD').aggregate(s=Sum('amount'))['s'] or Decimal('0')
            other_liab = Liability.objects.filter(hostel__in=scope_hostels, is_settled=False).aggregate(s=Sum('remaining_amount'))['s'] or Decimal('0')
            rent_payable = PropertyRentAccrual.objects.filter(
                property__hostel__in=scope_hostels,
                property__is_active=True,
            )
            if scope_properties is not None:
                rent_payable = rent_payable.filter(property_id__in=scope_properties)
            rent_payable = sum((accrual.outstanding_amount for accrual in rent_payable), Decimal('0'))

            t_assets = float(fixed_val + student_dues + total_inventory_value)
            t_liab = float(sec_liab + other_liab + rent_payable)

            return Response({
                "date": date.today().isoformat(),
                "assets": {"fixed_assets": float(fixed_val), "student_receivables": float(student_dues), "inventory_valuation": float(total_inventory_value), "total": t_assets},
                "liabilities": {"security_deposits": float(sec_liab), "accrued_expenses": float(other_liab), "rent_payable": float(rent_payable), "total": t_liab},
                "equity": t_assets - t_liab
            })
        except Exception as e:
            return Response({"detail": str(e)}, status=500)

class AssetCategoryViewSet(viewsets.ModelViewSet):
    queryset = AssetCategory.objects.all(); serializer_class = AssetCategorySerializer; permission_classes = [IsHostelManagerOrAbove]
class PartnerCapitalViewSet(viewsets.ModelViewSet):
    queryset = PartnerCapital.objects.all(); serializer_class = PartnerCapitalSerializer; permission_classes = [IsHostelManagerOrAbove]
class LiabilityViewSet(viewsets.ModelViewSet):
    queryset = Liability.objects.all(); serializer_class = LiabilitySerializer; permission_classes = [IsHostelManagerOrAbove]

class PropertyRentalContractViewSet(viewsets.ModelViewSet):
    queryset = PropertyRentalContract.objects.select_related("property__hostel").all()
    serializer_class = PropertyRentalContractSerializer
    permission_classes = [PropertyFinancePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        property_ids = accessible_property_ids(self.request.user)
        return qs if property_ids is None else qs.filter(property_id__in=property_ids)

class PropertyRentAccrualViewSet(viewsets.ModelViewSet):
    queryset = PropertyRentAccrual.objects.select_related("property", "contract").all()
    serializer_class = PropertyRentAccrualSerializer
    permission_classes = [PropertyFinancePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        property_ids = accessible_property_ids(self.request.user)
        return qs if property_ids is None else qs.filter(property_id__in=property_ids)


class PropertyRentPaymentViewSet(viewsets.ModelViewSet):
    queryset = PropertyRentPayment.objects.select_related(
        "accrual__property", "accrual__contract", "created_by"
    ).all()
    serializer_class = PropertyRentPaymentSerializer
    permission_classes = [PropertyFinancePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        property_ids = accessible_property_ids(self.request.user)
        return qs if property_ids is None else qs.filter(accrual__property_id__in=property_ids)

    @transaction.atomic
    def perform_create(self, serializer):
        accrual = PropertyRentAccrual.objects.select_for_update().get(
            pk=serializer.validated_data["accrual"].pk
        )
        payment_amount = serializer.validated_data["amount"]
        outstanding = accrual.amount - accrual.paid_amount
        if payment_amount > outstanding:
            raise serializers.ValidationError({
                "amount": f"Payment cannot exceed outstanding rent of {outstanding}."
            })
        accrual.paid_amount += payment_amount
        accrual.paid_on = serializer.validated_data["paid_on"]
        accrual.save(update_fields=["paid_amount", "paid_on"])
        serializer.save(created_by=self.request.user)

    def refresh_paid_on(self, accrual):
        latest_payment = accrual.payments.order_by("-paid_on", "-id").first()
        accrual.paid_on = latest_payment.paid_on if latest_payment else None
        accrual.save(update_fields=["paid_on"])

    @transaction.atomic
    def perform_update(self, serializer):
        payment = PropertyRentPayment.objects.select_for_update().get(pk=serializer.instance.pk)
        old_accrual = PropertyRentAccrual.objects.select_for_update().get(pk=payment.accrual_id)
        new_accrual = PropertyRentAccrual.objects.select_for_update().get(
            pk=serializer.validated_data.get("accrual", payment.accrual).pk
        )
        new_amount = serializer.validated_data.get("amount", payment.amount)

        old_accrual.paid_amount -= payment.amount
        if old_accrual.paid_amount < 0:
            old_accrual.paid_amount = 0
        old_accrual.save(update_fields=["paid_amount"])

        if new_amount > new_accrual.amount - new_accrual.paid_amount:
            raise serializers.ValidationError({
                "amount": f"Payment cannot exceed outstanding rent of {new_accrual.amount - new_accrual.paid_amount}."
            })
        new_accrual.paid_amount += new_amount
        new_accrual.paid_on = serializer.validated_data.get("paid_on", payment.paid_on)
        new_accrual.save(update_fields=["paid_amount", "paid_on"])
        serializer.save()
        if old_accrual.pk != new_accrual.pk:
            self.refresh_paid_on(old_accrual)
        self.refresh_paid_on(new_accrual)

    @transaction.atomic
    def perform_destroy(self, instance):
        accrual = PropertyRentAccrual.objects.select_for_update().get(pk=instance.accrual_id)
        accrual.paid_amount -= instance.amount
        if accrual.paid_amount < 0:
            accrual.paid_amount = 0
        accrual.save(update_fields=["paid_amount"])
        instance.delete()
        self.refresh_paid_on(accrual)

class InvestorPropertyAccessViewSet(viewsets.ModelViewSet):
    queryset = InvestorPropertyAccess.objects.select_related("investor", "property").all()
    serializer_class = InvestorPropertyAccessSerializer
    permission_classes = [PropertyFinancePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == "PARTNER":
            return qs.filter(investor=self.request.user, can_view_financials=True)
        return qs

class InvestorPropertyOwnershipViewSet(viewsets.ModelViewSet):
    queryset = InvestorPropertyOwnership.objects.select_related("investor", "property").all()
    serializer_class = InvestorPropertyOwnershipSerializer
    permission_classes = [PropertyFinancePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == "PARTNER":
            return qs.filter(investor=self.request.user)
        return qs

class PropertySharedCostViewSet(viewsets.ModelViewSet):
    queryset = PropertySharedCost.objects.select_related("hostel", "property").all()
    serializer_class = PropertySharedCostSerializer
    permission_classes = [PropertyFinancePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        property_ids = accessible_property_ids(self.request.user)
        if property_ids is None:
            return qs
        return qs.filter(property_id__in=property_ids)
