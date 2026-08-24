# backend/food/serializers.py

from rest_framework import serializers
from .models import (
    MealCategory, Meal, MealRecipe, DailyMenu, 
    WeeklyMenuTemplate, MealFeedback, GroceryRequirement
)


class MealCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MealCategory
        fields = ['id', 'name', 'emoji', 'description', 'is_active']


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
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 'category_emoji',
            'dietary_tags', 'preparation_time', 'calories', 'protein', 'is_active', 
            'recipes', 'created_at', 'updated_at'
        ]


class DailyMenuSerializer(serializers.ModelSerializer):
    meal_details = MealSerializer(source='meal', read_only=True)
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)
    meal_type_display = serializers.CharField(source='get_meal_type_display', read_only=True)
    
    class Meta:
        model = DailyMenu
        fields = [
            'id', 'hostel', 'hostel_name', 'date', 'meal_type', 'meal_type_display', 
            'meal', 'meal_details', 'special_note', 'is_featured', 'created_at', 'updated_at'
        ]


class WeeklyMenuTemplateSerializer(serializers.ModelSerializer):
    """Serializer for WeeklyMenuTemplate model"""
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)
    
    # Monday meals
    monday_breakfast_name = serializers.CharField(source='monday_breakfast.name', read_only=True, allow_null=True)
    monday_lunch_name = serializers.CharField(source='monday_lunch.name', read_only=True, allow_null=True)
    monday_dinner_name = serializers.CharField(source='monday_dinner.name', read_only=True, allow_null=True)
    
    # Tuesday meals
    tuesday_breakfast = serializers.PrimaryKeyRelatedField(read_only=True)
    tuesday_lunch = serializers.PrimaryKeyRelatedField(read_only=True)
    tuesday_dinner = serializers.PrimaryKeyRelatedField(read_only=True)
    tuesday_breakfast_name = serializers.CharField(source='tuesday_breakfast.name', read_only=True, allow_null=True)
    tuesday_lunch_name = serializers.CharField(source='tuesday_lunch.name', read_only=True, allow_null=True)
    tuesday_dinner_name = serializers.CharField(source='tuesday_dinner.name', read_only=True, allow_null=True)
    
    # Wednesday meals
    wednesday_breakfast = serializers.PrimaryKeyRelatedField(read_only=True)
    wednesday_lunch = serializers.PrimaryKeyRelatedField(read_only=True)
    wednesday_dinner = serializers.PrimaryKeyRelatedField(read_only=True)
    wednesday_breakfast_name = serializers.CharField(source='wednesday_breakfast.name', read_only=True, allow_null=True)
    wednesday_lunch_name = serializers.CharField(source='wednesday_lunch.name', read_only=True, allow_null=True)
    wednesday_dinner_name = serializers.CharField(source='wednesday_dinner.name', read_only=True, allow_null=True)
    
    # Thursday meals
    thursday_breakfast = serializers.PrimaryKeyRelatedField(read_only=True)
    thursday_lunch = serializers.PrimaryKeyRelatedField(read_only=True)
    thursday_dinner = serializers.PrimaryKeyRelatedField(read_only=True)
    thursday_breakfast_name = serializers.CharField(source='thursday_breakfast.name', read_only=True, allow_null=True)
    thursday_lunch_name = serializers.CharField(source='thursday_lunch.name', read_only=True, allow_null=True)
    thursday_dinner_name = serializers.CharField(source='thursday_dinner.name', read_only=True, allow_null=True)
    
    # Friday meals
    friday_breakfast = serializers.PrimaryKeyRelatedField(read_only=True)
    friday_lunch = serializers.PrimaryKeyRelatedField(read_only=True)
    friday_dinner = serializers.PrimaryKeyRelatedField(read_only=True)
    friday_breakfast_name = serializers.CharField(source='friday_breakfast.name', read_only=True, allow_null=True)
    friday_lunch_name = serializers.CharField(source='friday_lunch.name', read_only=True, allow_null=True)
    friday_dinner_name = serializers.CharField(source='friday_dinner.name', read_only=True, allow_null=True)
    
    # Saturday meals
    saturday_breakfast = serializers.PrimaryKeyRelatedField(read_only=True)
    saturday_lunch = serializers.PrimaryKeyRelatedField(read_only=True)
    saturday_dinner = serializers.PrimaryKeyRelatedField(read_only=True)
    saturday_breakfast_name = serializers.CharField(source='saturday_breakfast.name', read_only=True, allow_null=True)
    saturday_lunch_name = serializers.CharField(source='saturday_lunch.name', read_only=True, allow_null=True)
    saturday_dinner_name = serializers.CharField(source='saturday_dinner.name', read_only=True, allow_null=True)
    
    # Sunday meals
    sunday_breakfast = serializers.PrimaryKeyRelatedField(read_only=True)
    sunday_lunch = serializers.PrimaryKeyRelatedField(read_only=True)
    sunday_dinner = serializers.PrimaryKeyRelatedField(read_only=True)
    sunday_breakfast_name = serializers.CharField(source='sunday_breakfast.name', read_only=True, allow_null=True)
    sunday_lunch_name = serializers.CharField(source='sunday_lunch.name', read_only=True, allow_null=True)
    sunday_dinner_name = serializers.CharField(source='sunday_dinner.name', read_only=True, allow_null=True)
    
    class Meta:
        model = WeeklyMenuTemplate
        fields = [
            'id', 'name', 'description', 'hostel', 'hostel_name',
            'is_active', 'created_at',
            # Monday
            'monday_breakfast', 'monday_breakfast_name',
            'monday_lunch', 'monday_lunch_name',
            'monday_dinner', 'monday_dinner_name',
            # Tuesday
            'tuesday_breakfast', 'tuesday_breakfast_name',
            'tuesday_lunch', 'tuesday_lunch_name',
            'tuesday_dinner', 'tuesday_dinner_name',
            # Wednesday
            'wednesday_breakfast', 'wednesday_breakfast_name',
            'wednesday_lunch', 'wednesday_lunch_name',
            'wednesday_dinner', 'wednesday_dinner_name',
            # Thursday
            'thursday_breakfast', 'thursday_breakfast_name',
            'thursday_lunch', 'thursday_lunch_name',
            'thursday_dinner', 'thursday_dinner_name',
            # Friday
            'friday_breakfast', 'friday_breakfast_name',
            'friday_lunch', 'friday_lunch_name',
            'friday_dinner', 'friday_dinner_name',
            # Saturday
            'saturday_breakfast', 'saturday_breakfast_name',
            'saturday_lunch', 'saturday_lunch_name',
            'saturday_dinner', 'saturday_dinner_name',
            # Sunday
            'sunday_breakfast', 'sunday_breakfast_name',
            'sunday_lunch', 'sunday_lunch_name',
            'sunday_dinner', 'sunday_dinner_name',
        ]


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
        fields = [
            'id', 'hostel', 'hostel_name', 'start_date', 'end_date', 
            'item', 'item_name', 'quantity_needed', 'unit', 
            'estimated_cost', 'actual_cost', 'status', 'created_at', 'updated_at'
        ]