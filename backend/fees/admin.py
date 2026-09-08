# backend/fees/admin.py

from django.contrib import admin
from .models import FeeHead, FeeRule, MonthlyFee, PaymentProof, StudentUtilityBill

# Register your models
admin.site.register(FeeHead)
admin.site.register(FeeRule)
admin.site.register(MonthlyFee)
admin.site.register(PaymentProof)
admin.site.register(StudentUtilityBill)
