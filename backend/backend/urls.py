from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.contrib.auth import logout
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from accounts.views import UserViewSet, MeView, ChangePasswordView, ModulePermissionViewSet
from hostels.views import (
    CityViewSet, HostelViewSet, PropertyViewSet, BuildingViewSet, FloorViewSet,
    RoomViewSet, BedViewSet, BedAllocationViewSet, StudentProfileViewSet,
    ManagementKPIView
)
from inventory.views import (
    CategoryViewSet, UnitViewSet, ItemViewSet, VendorViewSet,
    PurchaseViewSet, ConsumptionViewSet, InventorySummaryView,
    InventoryListView, InventoryExportCSVView, VendorPriceTrendView,
    SavingsSuggestionsView, SmartReorderSheetView, ConsumptionAnalyticsView,
    BranchProfitLossView, ExportPnLReportView, ReceiptOCRView,
    GeneratePurchaseOrderView, SendPOWhatsAppView, GenerateAllItemLabelsPDFView,
)
from inventory.receipt_scan import ScanReceiptView, ScanReceiptSaveView
from fees.views import (
    FeeHeadViewSet, FeeRuleViewSet, MonthlyFeeViewSet, PaymentProofViewSet,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static

def logout_view(request):
    logout(request)
    return redirect("/admin/")

router = DefaultRouter()

# Accounts
router.register(r"users", UserViewSet, basename="user")
router.register(r"module-permissions", ModulePermissionViewSet, basename="modulepermission")

# Hostels
router.register(r"cities", CityViewSet, basename="city")
router.register(r"hostels", HostelViewSet, basename="hostel")
router.register(r"properties", PropertyViewSet, basename="property")
router.register(r"buildings", BuildingViewSet, basename="building")
router.register(r"floors", FloorViewSet, basename="floor")
router.register(r"rooms", RoomViewSet, basename="room")
router.register(r"beds", BedViewSet, basename="bed")
router.register(r"bed-allocations", BedAllocationViewSet, basename="bed-allocation")
router.register(r"students", StudentProfileViewSet, basename="student")

# Inventory
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"units", UnitViewSet, basename="unit")
router.register(r"items", ItemViewSet, basename="item")
router.register(r"vendors", VendorViewSet, basename="vendor")
router.register(r"purchases", PurchaseViewSet, basename="purchase")
router.register(r"consumptions", ConsumptionViewSet, basename="consumption")

# Fees
router.register(r"fee_heads", FeeHeadViewSet, basename="feehead")
router.register(r"fee_rules", FeeRuleViewSet, basename="feerule")
router.register(r"monthly_fees", MonthlyFeeViewSet, basename="monthlyfee")
router.register(r"payment_proofs", PaymentProofViewSet, basename="paymentproof")

urlpatterns = [
    path("admin/logout/", logout_view),
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),

    # Business Intelligence
    path("api/bi/", include("bi.urls")),
    
    # Food App
    path("api/food/", include("food.urls")),
    
    path("api/me/", MeView.as_view(), name="me"),
    path("api/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("api/management/kpis/", ManagementKPIView.as_view(), name="management-kpis"),
    path("api/inventory/summary/", InventorySummaryView.as_view(), name="inventory-summary"),
    path("api/inventory/list/", InventoryListView.as_view(), name="inventory-list"),
    path("api/inventory/export/", InventoryExportCSVView.as_view(), name="inventory-export"),
    path("api/inventory/vendor_trend/", VendorPriceTrendView.as_view(), name="vendor-trend"),
    path("api/inventory/savings_suggestions/", SavingsSuggestionsView.as_view(), name="savings-suggestions"),
    path("api/inventory/reorder_sheet/", SmartReorderSheetView.as_view(), name="reorder-sheet"),
    path("api/inventory/consumption_analytics/", ConsumptionAnalyticsView.as_view(), name="consumption-analytics"),
    path("api/inventory/branch_pnl/", BranchProfitLossView.as_view(), name="branch-pnl"),
    path("api/inventory/export_pnl/", ExportPnLReportView.as_view(), name="export-pnl"),
    path("api/inventory/scan-receipt/", ScanReceiptView.as_view(), name="inventory-scan-receipt"),
    path("api/inventory/scan-receipt/save/", ScanReceiptSaveView.as_view(), name="inventory-scan-receipt-save"),
    path("api/inventory/purchases/<int:pk>/po/", GeneratePurchaseOrderView.as_view(), name="generate-po"),
    path("api/inventory/purchases/<int:pk>/send_vendor/", SendPOWhatsAppView.as_view(), name="send-vendor-whatsapp"),
    path("api/inventory/print_all_labels/", GenerateAllItemLabelsPDFView.as_view(), name="print-all-labels"),
    path("api/fees/", include("fees.urls")),
    path("api/communication/", include("communication.urls")),
    path("api/payroll/", include("payroll.urls")),
    path("api/finance/", include("finance.urls")),

    # Schema & Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)