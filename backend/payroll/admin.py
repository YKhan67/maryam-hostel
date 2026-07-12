from django.contrib import admin
from .models import EmployeeProfile, SalaryAdvance, PayrollRecord, SalarySlip

@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'designation', 'pay_type', 'base_salary', 'is_active')
    list_filter = ('pay_type', 'is_active')
    search_fields = ('user__username', 'designation')

@admin.register(SalaryAdvance)
class SalaryAdvanceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'amount', 'date_given', 'is_deducted')
    list_filter = ('is_deducted',)

class SalarySlipInline(admin.TabularInline):
    model = SalarySlip
    extra = 0
    readonly_fields = ('net_salary',)

@admin.register(PayrollRecord)
class PayrollRecordAdmin(admin.ModelAdmin):
    list_display = ('month', 'status', 'total_net_payout')
    list_filter = ('status',)
    inlines = [SalarySlipInline]

@admin.register(SalarySlip)
class SalarySlipAdmin(admin.ModelAdmin):
    list_display = ('employee', 'payroll_master', 'net_salary', 'is_disbursed')
    list_filter = ('is_disbursed', 'payroll_master')
