# backend/food/serializers.py

from rest_framework import serializers
from .models import (
    MealCategory, Meal, MealRecipe, DailyMenu, 
    WeeklyMenuTemplate, MealFeedback, GroceryRequirement
)


class MealCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MealCategory
        fields = '__all__'


class MealRecipeSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_code = serializers.CharField(source='item.code', read_only=True)
    
    class Meta:
        model = MealRecipe
        fields = ['id', 'item', 'item_name', 'item_code', 'quantity_required', 'unit', 'estimated_cost']


class MealSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_emoji = serializers.CharField(source='category.emoji', read_only=True)
    recipes = MealRecipeSerializer(many=True, read_only=True)
    
    class Meta:
        model = Meal
        fields = ['id', 'name', 'description', 'category', 'category_name', 'category_emoji',
                  'dietary_tags', 'preparation_time', 'calories', 'protein', 'is_active', 'recipes', 'created_at']


class DailyMenuSerializer(serializers.ModelSerializer):
    meal_details = MealSerializer(source='meal', read_only=True)
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)
    meal_type_display = serializers.CharField(source='get_meal_type_display', read_only=True)
    
    class Meta:
        model = DailyMenu
        fields = ['id', 'hostel', 'hostel_name', 'date', 'meal_type', 'meal_type_display', 
                  'meal', 'meal_details', 'special_note', 'is_featured', 'created_at']


class MealFeedbackSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    meal_name = serializers.CharField(source='daily_menu.meal.name', read_only=True)
    
    class Meta:
        model = MealFeedback
        fields = ['id', 'student', 'student_name', 'daily_menu', 'meal_name', 'rating', 'comment', 'created_at']


class GroceryRequirementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)
    
    class Meta:
        model = GroceryRequirement
        fields = ['id', 'hostel', 'hostel_name', 'start_date', 'end_date', 
                  'item', 'item_name', 'quantity_needed', 'unit', 
                  'estimated_cost', 'actual_cost', 'status', 'created_at']