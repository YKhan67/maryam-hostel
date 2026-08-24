# backend/food/admin.py

from django.contrib import admin
from .models import (
    MealCategory, Meal, MealRecipe, DailyMenu,
    WeeklyMenuTemplate, MealFeedback, GroceryRequirement
)


@admin.register(MealCategory)
class MealCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'emoji', 'is_active']
    search_fields = ['name']


class MealRecipeInline(admin.TabularInline):
    model = MealRecipe
    extra = 1
    fields = ['item', 'quantity_required', 'unit', 'estimated_cost', 'waste_factor']


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'preparation_time', 'is_active']
    search_fields = ['name', 'description']
    list_filter = ['category', 'is_active']
    inlines = [MealRecipeInline]


@admin.register(DailyMenu)
class DailyMenuAdmin(admin.ModelAdmin):
    list_display = ['date', 'hostel', 'meal_type', 'meal', 'is_featured']
    list_filter = ['hostel', 'date', 'meal_type', 'is_featured']
    search_fields = ['meal__name', 'hostel__name']


@admin.register(WeeklyMenuTemplate)
class WeeklyMenuTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'hostel', 'is_active']
    search_fields = ['name', 'hostel__name']
    list_filter = ['is_active', 'hostel']


@admin.register(MealFeedback)
class MealFeedbackAdmin(admin.ModelAdmin):
    list_display = ['student', 'daily_menu', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['student__user__username', 'daily_menu__meal__name']


@admin.register(GroceryRequirement)
class GroceryRequirementAdmin(admin.ModelAdmin):
    list_display = ['item', 'hostel', 'quantity_needed', 'estimated_cost', 'status', 'created_at']
    list_filter = ['hostel', 'status']
    search_fields = ['item__name', 'hostel__name']