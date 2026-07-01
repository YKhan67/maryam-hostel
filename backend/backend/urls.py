# backend/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.contrib.auth import logout
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

# Custom Logout View to allow GET requests (Fixes 405 error in Django 5.x)
def logout_view(request):
    logout(request)
    return redirect("/")

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

urlpatterns = [
    # Override logout first to handle the GET request from admin logout link
    path("admin/logout/", logout_view),

    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/me/", MeView.as_view(), name="me"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("api/management/kpis/", ManagementKPIView.as_view(), name="management-kpis"),
    path("api/inventory/summary/", InventorySummaryView.as_view(), name="inventory-summary"),
    path("api/inventory/list/", InventoryListView.as_view(), name="inventory-list"),
    path("api/inventory/export/", InventoryExportCSVView.as_view(), name="inventory-export"),
    path("api/inventory/vendor_trend/", VendorPriceTrendView.as_view(), name="vendor-trend"),
    path("api/inventory/savings_suggestions/", SavingsSuggestionsView.as_view(), name="savings-suggestions"),
    path("api/fees/", include("fees.urls")),

    # Schema & Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
