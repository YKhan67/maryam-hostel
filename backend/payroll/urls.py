from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeProfileViewSet, SalaryAdvanceViewSet, PayrollRecordViewSet, SalarySlipViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeProfileViewSet, basename='employee')
router.register(r'advances', SalaryAdvanceViewSet, basename='advance')
router.register(r'records', PayrollRecordViewSet, basename='payroll-record')
router.register(r'slips', SalarySlipViewSet, basename='salary-slip')

urlpatterns = [
    path('', include(router.urls)),
]
