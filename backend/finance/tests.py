from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from hostels.models import City, Hostel, Property
from finance.models import InvestorPropertyOwnership, PropertyRentalContract
from finance.serializers import InvestorPropertyAccessSerializer, InvestorPropertyOwnershipSerializer, PropertyRentAccrualSerializer


class PropertyFinanceValidationTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.partner = User.objects.create_user(username="partner-1", role="PARTNER")
        self.second_partner = User.objects.create_user(username="partner-2", role="PARTNER")
        self.staff = User.objects.create_user(username="staff-1", role="STAFF")
        city = City.objects.create(name="Finance City")
        hostel = Hostel.objects.create(name="Finance Hostel", code="FIN-1", city=city)
        self.property = Property.objects.create(hostel=hostel, name="Finance House", code="FIN-HOUSE", property_type="HOUSE")

    def test_access_requires_partner_role(self):
        serializer = InvestorPropertyAccessSerializer(data={"investor": self.staff.id, "property": self.property.id})
        self.assertFalse(serializer.is_valid())
        self.assertIn("investor", serializer.errors)

    def test_rent_accrual_contract_must_match_property(self):
        other_property = Property.objects.create(
            hostel=self.property.hostel,
            name="Other House",
            code="OTHER-HOUSE",
            property_type="HOUSE",
        )
        contract = PropertyRentalContract.objects.create(
            property=self.property,
            landlord_name="Landlord",
            start_date=date(2026, 1, 1),
            monthly_rent=Decimal("1000"),
        )
        serializer = PropertyRentAccrualSerializer(data={
            "property": other_property.id,
            "contract": contract.id,
            "month": date(2026, 1, 1),
            "amount": "1000",
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("contract", serializer.errors)

    def test_ownership_cannot_exceed_one_hundred(self):
        InvestorPropertyOwnership.objects.create(
            investor=self.partner,
            property=self.property,
            ownership_percentage=Decimal("80"),
            effective_from=date(2026, 1, 1),
        )
        serializer = InvestorPropertyOwnershipSerializer(data={
            "investor": self.second_partner.id,
            "property": self.property.id,
            "ownership_percentage": "25",
            "effective_from": date(2026, 1, 1),
        })
        self.assertTrue(serializer.is_valid())
        with self.assertRaises(ValidationError):
            candidate = InvestorPropertyOwnership(**serializer.validated_data)
            candidate.full_clean()
