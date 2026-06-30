# backend/fees/views.py
from rest_framework import viewsets, permissions
from .models import FeeHead, FeeRule, MonthlyFee, PaymentProof
from .serializers import (
    FeeHeadSerializer, FeeRuleSerializer, MonthlyFeeSerializer, PaymentProofSerializer
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
    # ✅ Add a base queryset so DRF router can infer basename
    queryset = MonthlyFee.objects.select_related("student__user", "fee_head").all()
    serializer_class = MonthlyFeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # If logged-in user is a student, only show their own fees
        if hasattr(user, "role") and user.role == "STUDENT":
            try:
                student_profile = user.student_profile
                return qs.filter(student=student_profile)
            except StudentProfile.DoesNotExist:
                return qs.none()

        # Management / admin: see all (later we can restrict by hostel)
        return qs


class PaymentProofViewSet(viewsets.ModelViewSet):
    queryset = PaymentProof.objects.all()
    serializer_class = PaymentProofSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
