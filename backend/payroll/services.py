from datetime import date
from django.db.models import Sum
from .models import EmployeeProfile, SalaryAdvance, PayrollRecord, SalarySlip
from communication.models import Ticket

def generate_monthly_payroll(target_date: date):
    """
    Creates a draft payroll for the given month.
    """
    first_day = target_date.replace(day=1)
    
    # Check if a live (Approved or Paid) payroll exists
    live_record = PayrollRecord.objects.filter(month=first_day).filter(status__in=['APPROVED', 'PAID']).exists()
    if live_record:
        return None, "Cannot generate. An Approved or Paid payroll already exists for this month."

    # Create a new record (Previous Drafts/Rejected stay in the DB for audit)
    payroll_master = PayrollRecord.objects.create(month=first_day, status='DRAFT')
    employees = EmployeeProfile.objects.filter(is_active=True)
    
    for emp in employees:
        base_pay = 0
        allowances = 0
        task_pay = 0
        task_count = 0
        advance_deduct = 0
        
        # 1. Fixed Salary Logic
        if emp.pay_type == 'MONTHLY':
            base_pay = emp.base_salary
            allowances = emp.housing_allowance + emp.fuel_allowance + emp.other_allowance
            
        # 2. Per-Task Logic (SLA Integration)
        else:
            # Count resolved tickets for this month
            tickets = Ticket.objects.filter(
                assigned_to=emp.user,
                status='RESOLVED',
                resolved_at__year=first_day.year,
                resolved_at__month=first_day.month
            )
            task_count = tickets.count()
            task_pay = task_count * emp.rate_per_task
            
        # 3. Advance Deductions
        pending_advances = SalaryAdvance.objects.filter(employee=emp, is_deducted=False)
        advance_deduct = pending_advances.aggregate(total=Sum('amount'))['total'] or 0
        
        # Create Slip
        SalarySlip.objects.create(
            payroll_master=payroll_master,
            employee=emp,
            base_pay=base_pay,
            allowances=allowances,
            task_count=task_count,
            task_pay=task_pay,
            advance_deduction=advance_deduct
        )
    
    # Calculate Total Net Payout for the master record
    total_net = SalarySlip.objects.filter(payroll_master=payroll_master).aggregate(s=Sum('net_salary'))['s'] or 0
    payroll_master.total_net_payout = total_net
    payroll_master.save()
        
    return payroll_master, "Draft payroll generated."
