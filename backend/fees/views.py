# backend/fees/views.py

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import date
from .models import FeeHead, FeeRule, MonthlyFee, PaymentProof, SecurityDeposit
from .serializers import (
    FeeHeadSerializer, FeeRuleSerializer, MonthlyFeeSerializer, 
    PaymentProofSerializer, SecurityDepositSerializer
)
from hostels.models import StudentProfile


class FeeHeadViewSet(viewsets.ModelViewSet):
    queryset = FeeHead.objects.all()
    serializer_class = FeeHeadSerializer
    permission_classes = [permissions.IsAuthenticated]


class FeeRuleViewSet(viewsets.ModelViewSet):
    queryset = FeeRule.objects.all()
    serializer_class = FeeRuleSerializer
    permission_classes = [permissions.IsAuthenticated]


class MonthlyFeeViewSet(viewsets.ModelViewSet):
    queryset = MonthlyFee.objects.select_related("student__user", "fee_head").all()
    serializer_class = MonthlyFeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if hasattr(user, "role") and user.role == "STUDENT":
            try:
                student_profile = user.student_profile
                return qs.filter(student=student_profile)
            except StudentProfile.DoesNotExist:
                return qs.none()
        
        if hasattr(user, "role") and user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            return qs.filter(student__hostel=user.hostel)

        return qs


class PaymentProofViewSet(viewsets.ModelViewSet):
    queryset = PaymentProof.objects.all()
    serializer_class = PaymentProofSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class SecurityDepositViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Security Deposits with CRUD operations.
    """
    queryset = SecurityDeposit.objects.select_related('student__user').all()
    serializer_class = SecurityDepositSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter deposits based on user role"""
        user = self.request.user
        queryset = super().get_queryset()

        # Super Admin sees all
        if user.role == "SUPER_ADMIN":
            return queryset

        # Hostel managers and partners see only their hostel's deposits
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            return queryset.filter(student__hostel=user.hostel)

        # Students see only their own deposit
        if user.role == "STUDENT":
            try:
                student_profile = user.student_profile
                return queryset.filter(student=student_profile)
            except StudentProfile.DoesNotExist:
                return queryset.none()

        return queryset.none()

    def create(self, request, *args, **kwargs):
        """Override create to handle hostel isolation"""
        user = request.user
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            student_id = request.data.get('student_id') or request.data.get('student')
            if student_id:
                try:
                    student = StudentProfile.objects.get(id=student_id)
                    if student.hostel != user.hostel:
                        return Response(
                            {"detail": "You can only create deposits for students in your hostel."},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except StudentProfile.DoesNotExist:
                    return Response(
                        {"detail": "Student not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Override update to handle hostel isolation"""
        user = request.user
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            instance = self.get_object()
            if instance.student.hostel != user.hostel:
                return Response(
                    {"detail": "You can only update deposits for students in your hostel."},
                    status=status.HTTP_403_FORBIDDEN
                )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle hostel isolation"""
        user = request.user
        if user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            instance = self.get_object()
            if instance.student.hostel != user.hostel:
                return Response(
                    {"detail": "You can only delete deposits for students in your hostel."},
                    status=status.HTTP_403_FORBIDDEN
                )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """Mark a deposit as refunded"""
        deposit = self.get_object()
        if deposit.status == "REFUNDED":
            return Response(
                {"detail": "This deposit has already been refunded."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deposit.status = "REFUNDED"
        deposit.refund_date = date.today()
        deposit.save()
        
        return Response({
            "status": "success",
            "message": f"Deposit of {deposit.amount} refunded successfully.",
            "deposit": SecurityDepositSerializer(deposit).data
        })

    @action(detail=True, methods=['post'])
    def forfeit(self, request, pk=None):
        """Mark a deposit as forfeited"""
        deposit = self.get_object()
        if deposit.status == "FORFEITED":
            return Response(
                {"detail": "This deposit has already been forfeited."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deposit.status = "FORFEITED"
        deposit.save()
        
        return Response({
            "status": "success",
            "message": f"Deposit of {deposit.amount} forfeited successfully.",
            "deposit": SecurityDepositSerializer(deposit).data
        })