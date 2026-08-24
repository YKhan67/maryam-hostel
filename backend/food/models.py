# backend/food/models.py

from django.db import models
from django.conf import settings
from hostels.models import Hostel, StudentProfile
from inventory.models import Item

User = settings.AUTH_USER_MODEL


class MealCategory(models.Model):
    """Categories for meals (e.g., Breakfast, Lunch, Dinner, Snacks)"""
    name = models.CharField(max_length=50, unique=True)
    emoji = models.CharField(max_length=10, default='🍽️')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.emoji} {self.name}"


class Meal(models.Model):
    """Individual meal item with recipe"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    category = models.ForeignKey(MealCategory, on_delete=models.PROTECT, related_name='meals')
    dietary_tags = models.CharField(max_length=200, blank=True, help_text="e.g., Vegetarian, Gluten-Free, Halal")
    preparation_time = models.PositiveIntegerField(default=30, help_text="Time in minutes")
    
    calories = models.PositiveIntegerField(default=0, help_text="Calories per serving")
    protein = models.DecimalField(max_digits=6, decimal_places=2, default=0, help_text="Protein in grams")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name


class MealRecipe(models.Model):
    """Ingredients and quantities for a meal"""
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name='recipes')
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='meal_ingredients')
    quantity_required = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit = models.CharField(max_length=20, default='kg', help_text="e.g., kg, g, pieces, liters")
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Estimated cost per unit")
    
    # Waste factor as percentage (0.01 = 1%)
    waste_factor = models.DecimalField(
        max_digits=5, 
        decimal_places=4, 
        default=0.015, 
        help_text="Waste percentage (e.g., 0.015 for 1.5%, max 5%)"
    )
    
    substitute_item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='substitute_ingredients')
    
    class Meta:
        unique_together = ('meal', 'item')
    
    def __str__(self):
        return f"{self.quantity_required} {self.unit} of {self.item.name} for {self.meal.name}"


class DailyMenu(models.Model):
    """Daily menu for a specific date and hostel"""
    MEAL_TYPE_CHOICES = [
        ('BREAKFAST', 'Breakfast'),
        ('BRUNCH', 'Brunch'),
        ('LUNCH', 'Lunch'),
        ('SNACKS', 'Snacks'),
        ('DINNER', 'Dinner'),
    ]
    
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name='menus')
    date = models.DateField()
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES)
    meal = models.ForeignKey(Meal, on_delete=models.PROTECT, related_name='daily_menus')
    
    special_note = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_menus')
    
    class Meta:
        unique_together = ('hostel', 'date', 'meal_type')
        ordering = ['date', 'meal_type']
    
    def __str__(self):
        return f"{self.get_meal_type_display()} - {self.meal.name} ({self.date})"


class WeeklyMenuTemplate(models.Model):
    """Pre-defined weekly menu patterns for easy scheduling"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name='menu_templates')
    
    # Monday
    monday_breakfast = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='mon_breakfast')
    monday_lunch = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='mon_lunch')
    monday_dinner = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='mon_dinner')
    
    # Tuesday
    tuesday_breakfast = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='tue_breakfast')
    tuesday_lunch = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='tue_lunch')
    tuesday_dinner = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='tue_dinner')
    
    # Wednesday
    wednesday_breakfast = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='wed_breakfast')
    wednesday_lunch = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='wed_lunch')
    wednesday_dinner = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='wed_dinner')
    
    # Thursday
    thursday_breakfast = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='thu_breakfast')
    thursday_lunch = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='thu_lunch')
    thursday_dinner = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='thu_dinner')
    
    # Friday
    friday_breakfast = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='fri_breakfast')
    friday_lunch = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='fri_lunch')
    friday_dinner = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='fri_dinner')
    
    # Saturday
    saturday_breakfast = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='sat_breakfast')
    saturday_lunch = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='sat_lunch')
    saturday_dinner = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='sat_dinner')
    
    # Sunday
    sunday_breakfast = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='sun_breakfast')
    sunday_lunch = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='sun_lunch')
    sunday_dinner = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True, related_name='sun_dinner')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class MealFeedback(models.Model):
    """Student feedback on meals"""
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='meal_feedback')
    daily_menu = models.ForeignKey(DailyMenu, on_delete=models.CASCADE, related_name='feedback')
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('student', 'daily_menu')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student.user.username} - {self.rating}⭐"


class GroceryRequirement(models.Model):
    """Generated grocery list based on menu plan"""
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('PURCHASED', 'Purchased'),
    ]
    
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name='grocery_requirements')
    start_date = models.DateField()
    end_date = models.DateField()
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='grocery_items')
    quantity_needed = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.item.name} - {self.quantity_needed} {self.unit} ({self.get_status_display()})"