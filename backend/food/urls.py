# backend/food/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MealCategoryViewSet, MealViewSet, DailyMenuViewSet,
    WeeklyMenuTemplateViewSet, MealFeedbackViewSet, GroceryRequirementViewSet
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
]