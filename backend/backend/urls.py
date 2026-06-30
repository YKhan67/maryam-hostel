# backend/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from accounts.views import UserViewSet, MeView
from hostels.views import (
    CityViewSet, HostelViewSet, BuildingViewSet, FloorViewSet,
    RoomViewSet, BedViewSet, StudentProfileViewSet,
)
from inventory.views import (
    CategoryViewSet,
    UnitViewSet,
    ItemViewSet,
    VendorViewSet,
    PurchaseViewSet,
    ConsumptionViewSet,
    InventorySummaryView,
    InventoryListView,
    InventoryExportCSVView,
    VendorPriceTrendView,
    SavingsSuggestionsView,
)

from fees.views import (
    FeeHeadViewSet, FeeRuleViewSet, MonthlyFeeViewSet, PaymentProofViewSet,
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from hostels.views import ManagementKPIView
from inventory.views import InventorySummaryView
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()

# Accounts
router.register(r"users", UserViewSet, basename="user")

# Hostels
router.register(r"cities", CityViewSet, basename="city")
router.register(r"hostels", HostelViewSet, basename="hostel")
router.register(r"buildings", BuildingViewSet, basename="building")
router.register(r"floors", FloorViewSet, basename="floor")
router.register(r"rooms", RoomViewSet, basename="room")
router.register(r"beds", BedViewSet, basename="bed")
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

# Group all API v1 routes
v1_urlpatterns = [
    path("", include(router.urls)),
    path("me/", MeView.as_view(), name="me"),
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("management/kpis/", ManagementKPIView.as_view(), name="management-kpis"),
    path("inventory/summary/", InventorySummaryView.as_view(), name="inventory-summary"),
    path("inventory/list/", InventoryListView.as_view(), name="inventory-list"),
    path("inventory/export/", InventoryExportCSVView.as_view(), name="inventory-export"),
    path("inventory/vendor_trend/", VendorPriceTrendView.as_view(), name="vendor-trend"),
    path("inventory/savings_suggestions/", SavingsSuggestionsView.as_view(), name="savings-suggestions"),
    path("fees/", include("fees.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # API v1
    path("api/v1/", include(v1_urlpatterns)),

    # Schema & Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
