from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssetCategoryViewSet, AssetViewSet, 
    PartnerCapitalViewSet, LiabilityViewSet,
    BalanceSheetView, PropertyRentalContractViewSet, PropertyRentAccrualViewSet,
    InvestorPropertyAccessViewSet, InvestorPropertyOwnershipViewSet,
    PropertySharedCostViewSet, PropertyRentPaymentViewSet,
)

router = DefaultRouter()
router.register(r'asset-categories', AssetCategoryViewSet, basename='asset-category')
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'capital', PartnerCapitalViewSet, basename='capital')
router.register(r'liabilities', LiabilityViewSet, basename='liability')
router.register(r'rental-contracts', PropertyRentalContractViewSet, basename='rental-contract')
router.register(r'rent-accruals', PropertyRentAccrualViewSet, basename='rent-accrual')
router.register(r'rent-payments', PropertyRentPaymentViewSet, basename='rent-payment')
router.register(r'investor-property-access', InvestorPropertyAccessViewSet, basename='investor-property-access')
router.register(r'investor-property-ownership', InvestorPropertyOwnershipViewSet, basename='investor-property-ownership')
router.register(r'shared-costs', PropertySharedCostViewSet, basename='shared-cost')

urlpatterns = [
    path('balance-sheet/', BalanceSheetView.as_view(), name='balance-sheet'),
    path('', include(router.urls)),
]
