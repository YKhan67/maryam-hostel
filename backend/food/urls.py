# backend/food/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MealCategoryViewSet, MealViewSet, DailyMenuViewSet,
    WeeklyMenuTemplateViewSet, MealFeedbackViewSet, GroceryRequirementViewSet,
    ExportMealTemplateView, ImportMealExcelView,
    ExportRecipeTemplateView, ImportRecipeExcelView
)

router = DefaultRouter()
router.register(r'categories', MealCategoryViewSet, basename='meal-category')
router.register(r'meals', MealViewSet, basename='meal')
router.register(r'daily-menu', DailyMenuViewSet, basename='daily-menu')
router.register(r'templates', WeeklyMenuTemplateViewSet, basename='menu-template')
router.register(r'feedback', MealFeedbackViewSet, basename='meal-feedback')
router.register(r'grocery', GroceryRequirementViewSet, basename='grocery-requirement')

urlpatterns = [
    path('', include(router.urls)),
    path('export-template/', ExportMealTemplateView.as_view(), name='export-template'),
    path('import-excel/', ImportMealExcelView.as_view(), name='import-excel'),
    path('recipes/export-template/', ExportRecipeTemplateView.as_view(), name='export-recipe-template'),
    path('recipes/import-excel/', ImportRecipeExcelView.as_view(), name='import-recipe-excel'),
]