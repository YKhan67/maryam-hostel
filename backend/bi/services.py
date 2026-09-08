# backend/bi/services.py
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from hostels.models import StudentProfile, Hostel, Property, Bed
from fees.models import MonthlyFee, SecurityDeposit
from fees.models import Receipt
from inventory.models import Purchase, Consumption, Item
from finance.models import PropertyRentAccrual, PropertySharedCost
from payroll.models import SalarySlip, EmployeeProfile
from food.models import MealFeedback, DailyMenu
from django.db.models import F

class ReportService:
    """Service class for generating various reports"""

    @staticmethod
    def generate_revenue_report(filters):
        """Generate revenue report"""
        hostel_id = filters.get('hostel_id')
        start_date = filters.get('start_date')
        end_date = filters.get('end_date')

        queryset = MonthlyFee.objects.all()
        if hostel_id:
            queryset = queryset.filter(student__hostel_id=hostel_id)
        if start_date:
            queryset = queryset.filter(month__gte=start_date)
        if end_date:
            queryset = queryset.filter(month__lte=end_date)

        total_revenue = queryset.aggregate(total=Sum('amount_paid'))['total'] or 0
        total_due = queryset.filter(is_paid=False).aggregate(total=Sum('amount'))['total'] or 0

        monthly_data = []
        monthly_agg = queryset.values('month').annotate(
            total=Sum('amount_paid'),
            count=Count('id')
        ).order_by('month')

        for item in monthly_agg:
            monthly_data.append({
                'month': item['month'].strftime('%Y-%m'),
                'total': float(item['total']),
                'count': item['count']
            })

        return {
            'summary': {
                'total_revenue': float(total_revenue),
                'total_due': float(total_due),
                'total_students': StudentProfile.objects.filter(is_active=True).count()
            },
            'monthly_data': monthly_data
        }

    @staticmethod
    def generate_fee_collection_report(filters):
        """Generate fee collection report"""
        hostel_id = filters.get('hostel_id')
        month = filters.get('month')

        queryset = MonthlyFee.objects.all()
        if hostel_id:
            queryset = queryset.filter(student__hostel_id=hostel_id)
        if month:
            queryset = queryset.filter(month__month=month)

        total_collected = queryset.aggregate(total=Sum('amount_paid'))['total'] or 0
        total_expected = queryset.aggregate(total=Sum('amount'))['total'] or 0

        return {
            'summary': {
                'total_collected': float(total_collected),
                'total_expected': float(total_expected),
                'collection_rate': float(total_collected / total_expected * 100) if total_expected else 0
            }
        }

    @staticmethod
    def generate_occupancy_report(filters):
        """Generate occupancy report"""
        hostel_id = filters.get('hostel_id')
        
        queryset = StudentProfile.objects.filter(is_active=True)
        if hostel_id:
            queryset = queryset.filter(hostel_id=hostel_id)

        total_students = queryset.filter(bed__isnull=False).count()
        total_beds = Bed.objects.filter(room__floor__building__hostel_id=hostel_id).count() if hostel_id else Bed.objects.count()

        return {
            'summary': {
                'total_students': total_students,
                'total_beds': total_beds,
                'occupancy_rate': float(total_students / total_beds * 100) if total_beds else 0
            }
        }

    @staticmethod
    def generate_property_performance_report(filters):
        hostel_id = filters.get("hostel_id")
        property_ids = filters.get("property_ids")
        start_date = filters.get("start_date")
        end_date = filters.get("end_date")
        properties = Property.objects.filter(is_active=True)
        if hostel_id:
            properties = properties.filter(hostel_id=hostel_id)
        if property_ids:
            properties = properties.filter(id__in=property_ids)

        rows = []
        totals = {"revenue": 0, "inventory_cost": 0, "payroll_cost": 0, "accommodation_rent": 0, "shared_cost": 0}
        for property_obj in properties:
            revenue = Receipt.objects.filter(
                fee__student__bed__room__floor__building__property=property_obj
            )
            inventory = Purchase.objects.filter(property=property_obj, status="APPROVED")
            payroll = SalarySlip.objects.filter(employee__property=property_obj, is_disbursed=True)
            rent = PropertyRentAccrual.objects.filter(property=property_obj)
            shared = PropertySharedCost.objects.filter(property=property_obj)
            if start_date:
                revenue = revenue.filter(date_issued__date__gte=start_date)
                inventory = inventory.filter(date__gte=start_date)
                payroll = payroll.filter(disbursed_at__date__gte=start_date)
                rent = rent.filter(month__gte=start_date)
                shared = shared.filter(date__gte=start_date)
            if end_date:
                revenue = revenue.filter(date_issued__date__lte=end_date)
                inventory = inventory.filter(date__lte=end_date)
                payroll = payroll.filter(disbursed_at__date__lte=end_date)
                rent = rent.filter(month__lte=end_date)
                shared = shared.filter(date__lte=end_date)

            values = {
                "revenue": float(revenue.aggregate(value=Sum("amount"))["value"] or 0),
                "inventory_cost": float(inventory.annotate(value=F("quantity") * F("price_per_unit")).aggregate(value=Sum("value"))["value"] or 0),
                "payroll_cost": float(payroll.aggregate(value=Sum("net_salary"))["value"] or 0),
                "accommodation_rent": float(rent.aggregate(value=Sum("amount"))["value"] or 0),
                "shared_cost": float(shared.aggregate(value=Sum("amount"))["value"] or 0),
            }
            values["net_profit"] = values["revenue"] - sum(values[key] for key in ("inventory_cost", "payroll_cost", "accommodation_rent", "shared_cost"))
            rows.append({"property_id": property_obj.id, "property_name": property_obj.name, "hostel_name": property_obj.hostel.name, **values})
            for key in totals:
                totals[key] += values[key]

        totals["net_profit"] = totals["revenue"] - sum(totals[key] for key in ("inventory_cost", "payroll_cost", "accommodation_rent", "shared_cost"))
        return {"summary": totals, "property_data": rows}

    @staticmethod
    def generate_inventory_report(filters):
        """Generate inventory report"""
        hostel_id = filters.get('hostel_id')
        
        queryset = Item.objects.filter(is_active=True)
        if hostel_id:
            queryset = queryset.filter(purchase__hostel_id=hostel_id)

        total_items = queryset.count()
        low_stock = queryset.filter(current_stock__lte=0).count()

        return {
            'summary': {
                'total_items': total_items,
                'low_stock': low_stock
            }
        }

    @staticmethod
    def generate_payroll_report(filters):
        """Generate payroll report"""
        month = filters.get('month')
        
        queryset = SalarySlip.objects.all()
        if month:
            queryset = queryset.filter(payroll_master__month__month=month)

        total_payroll = queryset.aggregate(total=Sum('net_salary'))['total'] or 0
        total_employees = EmployeeProfile.objects.filter(is_active=True).count()

        return {
            'summary': {
                'total_payroll': float(total_payroll),
                'total_employees': total_employees
            }
        }

    @staticmethod
    def generate_meal_feedback_report(filters):
        """Generate meal feedback report"""
        hostel_id = filters.get('hostel_id')
        start_date = filters.get('start_date')
        end_date = filters.get('end_date')

        queryset = MealFeedback.objects.all()
        if hostel_id:
            queryset = queryset.filter(daily_menu__hostel_id=hostel_id)
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        avg_rating = queryset.aggregate(avg=Avg('rating'))['avg'] or 0
        total_feedback = queryset.count()

        return {
            'summary': {
                'average_rating': float(avg_rating),
                'total_feedback': total_feedback
            }
        }

    @staticmethod
    def generate_security_deposit_report(filters):
        """Generate security deposit report"""
        hostel_id = filters.get('hostel_id')
        
        queryset = SecurityDeposit.objects.all()
        if hostel_id:
            queryset = queryset.filter(student__hostel_id=hostel_id)

        total_deposits = queryset.aggregate(total=Sum('amount'))['total'] or 0
        active_deposits = queryset.filter(status='HELD').count()

        return {
            'summary': {
                'total_deposits': float(total_deposits),
                'active_deposits': active_deposits
            }
        }

    @staticmethod
    def generate_hostel_performance_report(filters):
        """Generate hostel performance report"""
        hostel_id = filters.get('hostel_id')
        
        # This would combine multiple KPIs
        return {
            'summary': {
                'occupancy_rate': 75,
                'revenue_growth': 10,
                'student_satisfaction': 4.2
            }
        }

    @staticmethod
    def generate_vendor_analysis_report(filters):
        """Generate vendor analysis report"""
        hostel_id = filters.get('hostel_id')
        
        queryset = Purchase.objects.all()
        if hostel_id:
            queryset = queryset.filter(hostel_id=hostel_id)

        total_spent = queryset.aggregate(total=Sum('total_cost'))['total'] or 0
        vendor_count = queryset.values('vendor').distinct().count()

        return {
            'summary': {
                'total_spent': float(total_spent),
                'vendor_count': vendor_count
            }
        }

    @staticmethod
    def generate_stock_level_report(filters):
        """Generate stock level report"""
        hostel_id = filters.get('hostel_id')
        
        queryset = Item.objects.filter(is_active=True)
        if hostel_id:
            queryset = queryset.filter(purchase__hostel_id=hostel_id)

        low_stock_items = queryset.filter(current_stock__lte=0)
        total_items = queryset.count()

        return {
            'summary': {
                'total_items': total_items,
                'low_stock_items': low_stock_items.count()
            },
            'low_stock_items': [
                {
                    'name': item.name,
                    'code': item.code,
                    'stock': float(item.current_stock)
                }
                for item in low_stock_items[:10]
            ]
        }