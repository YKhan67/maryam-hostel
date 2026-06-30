from django.contrib import admin
from .models import FeeHead, FeeRule, MonthlyFee, PaymentProof

# Register your models here.
admin.site.register(FeeHead)
admin.site.register(FeeRule)
admin.site.register(MonthlyFee)
admin.site.register(PaymentProof)
