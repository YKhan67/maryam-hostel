from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import User, ModulePermission
from .serializers import (
    UserSerializer, UserCreateUpdateSerializer, 
    ChangePasswordSerializer, ModulePermissionSerializer
)

class ModulePermissionViewSet(viewsets.ModelViewSet):
    queryset = ModulePermission.objects.all()
    serializer_class = ModulePermissionSerializer
    permission_classes = [permissions.IsAuthenticated] # We will check role inside

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        if request.user.role != 'SUPER_ADMIN':
            return Response({"detail": "Forbidden"}, status=403)
        
        data = request.data
        try:
            from django.db import transaction
            with transaction.atomic():
                for item in data:
                    role = item.get('role')
                    user_id = item.get('user')
                    module = item.get('module_name')
                    
                    if user_id:
                        ModulePermission.objects.update_or_create(
                            user_id=user_id,
                            module_name=module,
                            defaults={
                                'can_view': item['can_view'],
                                'can_add': item['can_add'],
                                'can_edit': item['can_edit'],
                                'can_delete': item['can_delete'],
                                'role': None
                            }
                        )
                    else:
                        ModulePermission.objects.update_or_create(
                            role=role,
                            module_name=module,
                            user=None,
                            defaults={
                                'can_view': item['can_view'],
                                'can_add': item['can_add'],
                                'can_edit': item['can_edit'],
                                'can_delete': item['can_delete'],
                            }
                        )
            return Response({"status": "Permissions Updated"})
        except Exception as e:
            return Response({"detail": f"Database Error: {str(e)}"}, status=500)

class UserViewSet(viewsets.ModelViewSet):
    """
    Control Center for all User and Profile management.
    """
    queryset = User.objects.all().order_by("-id")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserCreateUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.all().select_related('hostel', 'student_profile').order_by("-id")
        
        # Admin Bypass
        if user.is_superuser or user.role == "SUPER_ADMIN":
            pass 
        elif user.role == "HOSTEL_MANAGER" and user.hostel:
            qs = qs.filter(hostel=user.hostel)
        else:
            qs = qs.filter(id=user.id)

        # Filters
        search = self.request.query_params.get('search')
        role = self.request.query_params.get('role')
        if search:
            qs = qs.filter(Q(username__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search))
        if role:
            qs = qs.filter(role=role)
        return qs

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_pass = request.data.get("new_password")
        if not new_pass:
            return Response({"detail": "New password required"}, status=400)
        user.set_password(new_pass)
        user.save()
        return Response({"status": "Password updated"})

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({"status": "Status updated", "is_active": user.is_active})

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        data = serializer.data
        
        # Add computed permissions
        perms = {}
        modules = [
            "DASHBOARD", "INVENTORY", "PROCUREMENT", "VISUAL_AUDIT", "INVENTORY_KPI",
            "PAYROLL", "EMPLOYEES", "ASSETS", "FEES", "USER_MGMT", "TASKS", "BALANCE_SHEET"
        ]
        for mod in modules:
            # User specific first
            up = ModulePermission.objects.filter(user=user, module_name=mod).first()
            if up:
                perms[mod] = {
                    'view': up.can_view, 'add': up.can_add, 
                    'edit': up.can_edit, 'delete': up.can_delete
                }
            else:
                # Role based fallback
                rp = ModulePermission.objects.filter(role=user.role, module_name=mod, user__isnull=True).first()
                if rp:
                    perms[mod] = {
                        'view': rp.can_view, 'add': rp.can_add, 
                        'edit': rp.can_edit, 'delete': rp.can_delete
                    }
                else:
                    # Default: Super Admin sees all, others see nothing if not defined
                    is_sa = user.role == 'SUPER_ADMIN'
                    perms[mod] = {
                        'view': is_sa, 'add': is_sa, 'edit': is_sa, 'delete': is_sa
                    }
        data['permissions'] = perms
        return Response(data)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"detail": "Success"})
        return Response(serializer.errors, status=400)
