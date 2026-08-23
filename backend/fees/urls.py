# backend/fees/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    CurrentMonthFeeDashboard,
    LastThreeMonthsFeeKpi,
    HostelIncomeSummary,
    GenerateMonthlyFeesView,
    MarkFeesPaidView,
    SendWhatsappPendingFeesView,
    WaiveFineView,
    StudentLedgerView,
    UnitEconomicsView,
    GenerateReceiptPDFView,
    ParentSecureLedgerView,
)
from .views import (
    FeeHeadViewSet,
    FeeRuleViewSet,
    MonthlyFeeViewSet,
    PaymentProofViewSet,
    SecurityDepositViewSet,
)

# Create a router for the ViewSets
router = DefaultRouter()
router.register(r'fee_heads', FeeHeadViewSet, basename='feehead')
router.register(r'fee_rules', FeeRuleViewSet, basename='feerule')
router.register(r'monthly_fees', MonthlyFeeViewSet, basename='monthlyfee')
router.register(r'payment_proofs', PaymentProofViewSet, basename='paymentproof')
router.register(r'security-deposits', SecurityDepositViewSet, basename='securitydeposit')

urlpatterns = [
    # API endpoints from router
    path('', include(router.urls)),
    
    # Parent portal
    path(
        "parent-ledger/<str:token>/",
        ParentSecureLedgerView.as_view(),
        name="fees-parent-ledger",
    ),
    
    # Student ledger
    path(
        "student-ledger/",
        StudentLedgerView.as_view(),
        name="fees-student-ledger",
    ),
    
    # Unit economics
    path(
        "unit-economics/",
        UnitEconomicsView.as_view(),
        name="fees-unit-economics",
    ),
    
    # Receipt generation
    path(
        "receipt/<int:receipt_id>/",
        GenerateReceiptPDFView.as_view(),
        name="fees-generate-receipt",
    ),
    
    # Dashboard endpoints
    path(
        "dashboard/current-month/",
        CurrentMonthFeeDashboard.as_view(),
        name="fees-dashboard-current-month",
    ),
    path(
        "dashboard/last-three-months/",
        LastThreeMonthsFeeKpi.as_view(),
        name="fees-dashboard-last-three-months",
    ),
    path(
        "dashboard/hostel-income/",
        HostelIncomeSummary.as_view(),
        name="fees-dashboard-hostel-income",
    ),
    
    # Action endpoints
    path(
        "actions/generate-fees/",
        GenerateMonthlyFeesView.as_view(),
        name="fees-generate-fees",
    ),
    path(
        "actions/mark-paid/",
        MarkFeesPaidView.as_view(),
        name="fees-mark-paid",
    ),
    path(
        "actions/send-whatsapp-pending/",
        SendWhatsappPendingFeesView.as_view(),
        name="fees-send-whatsapp-pending",
    ),
    path(
        "actions/waive-fine/",
        WaiveFineView.as_view(),
        name="fees-waive-fine",
    ),
]