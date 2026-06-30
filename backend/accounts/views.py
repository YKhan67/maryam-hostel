from rest_framework import viewsets, permissions
from .models import User
from .serializers import UserSerializer, UserCreateUpdateSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", None) == "SUPER_ADMIN"
                or request.user.is_superuser
            )
        )


class UserViewSet(viewsets.ModelViewSet):
    """
    Users API for Super Admin:

    - GET /api/users/        → list users
    - POST /api/users/       → create new user
    - PUT/PATCH /api/users/:id/ → update existing user
    """
    queryset = User.objects.all().order_by("id")
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserCreateUpdateSerializer
        return UserSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
