# fees/urls.py

from django.urls import path
from .api_views import (
    CurrentMonthFeeDashboard,
    LastThreeMonthsFeeKpi,
    HostelIncomeSummary,
    GenerateMonthlyFeesView,
    MarkFeesPaidView,
    SendWhatsappPendingFeesView,
    WaiveFineView,
)

urlpatterns = [
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
