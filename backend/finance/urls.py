from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssetCategoryViewSet, AssetViewSet, 
    PartnerCapitalViewSet, LiabilityViewSet,
    BalanceSheetView
)

router = DefaultRouter()
router.register(r'asset-categories', AssetCategoryViewSet, basename='asset-category')
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'capital', PartnerCapitalViewSet, basename='capital')
router.register(r'liabilities', LiabilityViewSet, basename='liability')

urlpatterns = [
    path('balance-sheet/', BalanceSheetView.as_view(), name='balance-sheet'),
    path('', include(router.urls)),
]
