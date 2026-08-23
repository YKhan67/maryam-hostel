# backend/food/views.py

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from datetime import date, timedelta
from .models import (
    MealCategory, Meal, MealRecipe, DailyMenu, 
    WeeklyMenuTemplate, MealFeedback, GroceryRequirement
)
from .serializers import (
    MealCategorySerializer, MealSerializer, MealRecipeSerializer,
    DailyMenuSerializer, WeeklyMenuTemplateSerializer,
    MealFeedbackSerializer, GroceryRequirementSerializer
)
from hostels.models import StudentProfile


class MealCategoryViewSet(viewsets.ModelViewSet):
    queryset = MealCategory.objects.filter(is_active=True)
    serializer_class = MealCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class MealViewSet(viewsets.ModelViewSet):
    queryset = Meal.objects.filter(is_active=True)
    serializer_class = MealSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def recipes(self, request, pk=None):
        meal = self.get_object()
        recipes = meal.recipes.all()
        serializer = MealRecipeSerializer(recipes, many=True)
        return Response(serializer.data)


class DailyMenuViewSet(viewsets.ModelViewSet):
    queryset = DailyMenu.objects.all()
    serializer_class = DailyMenuSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        # If student, only show their hostel's menus
        if hasattr(user, 'role') and user.role == 'STUDENT':
            try:
                student = user.student_profile
                queryset = queryset.filter(hostel=student.hostel)
            except StudentProfile.DoesNotExist:
                return queryset.none()
        
        # If hostel manager/partner, show their hostel only
        elif hasattr(user, 'role') and user.role in ['HOSTEL_MANAGER', 'PARTNER', 'STAFF'] and user.hostel:
            queryset = queryset.filter(hostel=user.hostel)

        return queryset

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's menu for the student's hostel"""
        today = date.today()
        user = request.user
        
        if hasattr(user, 'role') and user.role == 'STUDENT':
            try:
                student = user.student_profile
                hostel = student.hostel
            except StudentProfile.DoesNotExist:
                return Response({"error": "Student profile not found"}, status=400)
        elif user.hostel:
            hostel = user.hostel
        else:
            return Response({"error": "No hostel associated with user"}, status=400)

        menu = DailyMenu.objects.filter(hostel=hostel, date=today)
        serializer = DailyMenuSerializer(menu, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def week(self, request):
        """Get the full week's menu for the student's hostel"""
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())  # Monday
        end_of_week = start_of_week + timedelta(days=6)  # Sunday
        
        user = request.user
        
        if hasattr(user, 'role') and user.role == 'STUDENT':
            try:
                student = user.student_profile
                hostel = student.hostel
            except StudentProfile.DoesNotExist:
                return Response({"error": "Student profile not found"}, status=400)
        elif user.hostel:
            hostel = user.hostel
        else:
            return Response({"error": "No hostel associated with user"}, status=400)

        menu = DailyMenu.objects.filter(
            hostel=hostel, 
            date__gte=start_of_week, 
            date__lte=end_of_week
        ).order_by('date', 'meal_type')
        
        serializer = DailyMenuSerializer(menu, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def feedback(self, request, pk=None):
        """Submit feedback for a specific menu"""
        daily_menu = self.get_object()
        user = request.user
        
        if user.role != 'STUDENT':
            return Response({"error": "Only students can provide feedback"}, status=403)
        
        try:
            student = user.student_profile
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=400)
        
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if not rating or rating < 1 or rating > 5:
            return Response({"error": "Rating must be between 1 and 5"}, status=400)
        
        feedback, created = MealFeedback.objects.get_or_create(
            student=student,
            daily_menu=daily_menu,
            defaults={'rating': rating, 'comment': comment}
        )
        
        if not created:
            feedback.rating = rating
            feedback.comment = comment
            feedback.save()
        
        serializer = MealFeedbackSerializer(feedback)
        return Response(serializer.data)


class GroceryRequirementViewSet(viewsets.ModelViewSet):
    queryset = GroceryRequirement.objects.all()
    serializer_class = GroceryRequirementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if hasattr(user, 'role') and user.role in ['HOSTEL_MANAGER', 'PARTNER', 'STAFF'] and user.hostel:
            queryset = queryset.filter(hostel=user.hostel)

        return queryset

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate grocery requirements for a date range"""
        user = request.user
        
        if user.role not in ['SUPER_ADMIN', 'HOSTEL_MANAGER', 'PARTNER']:
            return Response({"error": "Permission denied"}, status=403)
        
        hostel_id = request.data.get('hostel')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not hostel_id or not start_date or not end_date:
            return Response({"error": "hostel, start_date, and end_date are required"}, status=400)
        
        try:
            hostel = Hostel.objects.get(id=hostel_id)
        except Hostel.DoesNotExist:
            return Response({"error": "Hostel not found"}, status=404)
        
        # Get all menus in the date range
        menus = DailyMenu.objects.filter(
            hostel=hostel,
            date__gte=start_date,
            date__lte=end_date
        ).select_related('meal')
        
        # Aggregate ingredient requirements
        ingredient_totals = {}
        
        for daily_menu in menus:
            for recipe in daily_menu.meal.recipes.all():
                item_key = recipe.item.id
                if item_key not in ingredient_totals:
                    ingredient_totals[item_key] = {
                        'item': recipe.item,
                        'quantity': 0,
                        'unit': recipe.unit,
                        'estimated_cost': 0
                    }
                ingredient_totals[item_key]['quantity'] += recipe.quantity_required
                ingredient_totals[item_key]['estimated_cost'] += recipe.estimated_cost
        
        # Create grocery requirements
        created_items = []
        for item_id, data in ingredient_totals.items():
            grocery_item, created = GroceryRequirement.objects.get_or_create(
                hostel=hostel,
                start_date=start_date,
                end_date=end_date,
                item=data['item'],
                defaults={
                    'quantity_needed': data['quantity'],
                    'unit': data['unit'],
                    'estimated_cost': data['estimated_cost'],
                    'status': 'DRAFT'
                }
            )
            if created:
                created_items.append(grocery_item.id)
        
        return Response({
            "message": f"Generated grocery requirements for {len(created_items)} items",
            "items_created": len(created_items),
            "total_estimated_cost": sum([g.estimated_cost for g in GroceryRequirement.objects.filter(id__in=created_items)])
        })