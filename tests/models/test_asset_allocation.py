"""Tests for AssetAllocation variants."""

import pytest
from pydantic import TypeAdapter, ValidationError

from api.models import TargetDateAllocation, CustomAllocation
from api.models.asset_allocation import AssetAllocation


class TestTargetDateAllocation:
    """Tests for TargetDateAllocation model."""

    def test_valid_target_date(self):
        """Valid TargetDateAllocation with a future vintage year."""
        obj = TargetDateAllocation(target_date_vintage=2065)
        assert obj.type == "target_date"
        assert obj.target_date_vintage == 2065

    def test_past_vintage_year_rejected(self):
        """Past vintage year should be rejected."""
        with pytest.raises(ValidationError):
            TargetDateAllocation(target_date_vintage=2020)


class TestCustomAllocation:
    """Tests for CustomAllocation model."""

    def test_valid_allocation_sums_to_one(self):
        """Valid CustomAllocation where percentages sum to 1.0."""
        obj = CustomAllocation(stock_pct=0.6, bond_pct=0.3, cash_pct=0.1)
        assert obj.type == "custom"
        assert obj.stock_pct == 0.6
        assert obj.bond_pct == 0.3
        assert obj.cash_pct == 0.1

    def test_allocation_sum_not_one_rejected(self):
        """Allocation percentages not summing to 1.0 should be rejected (US2-2)."""
        with pytest.raises(ValidationError):
            CustomAllocation(stock_pct=0.5, bond_pct=0.3, cash_pct=0.1)

    def test_allocation_sum_within_tolerance_accepted(self):
        """Allocation percentages summing to ~1.0 within tolerance should be accepted."""
        obj = CustomAllocation(stock_pct=0.334, bond_pct=0.333, cash_pct=0.333)
        assert obj.stock_pct == 0.334
        assert obj.bond_pct == 0.333
        assert obj.cash_pct == 0.333


class TestAssetAllocationDiscriminator:
    """Tests for discriminated union routing via AssetAllocation."""

    def setup_method(self):
        """Set up TypeAdapter for AssetAllocation."""
        self.adapter = TypeAdapter(AssetAllocation)

    def test_target_date_routing(self):
        """Discriminator routes type='target_date' to TargetDateAllocation."""
        obj = self.adapter.validate_python(
            {"type": "target_date", "target_date_vintage": 2065}
        )
        assert isinstance(obj, TargetDateAllocation)
        assert obj.target_date_vintage == 2065

    def test_custom_routing(self):
        """Discriminator routes type='custom' to CustomAllocation."""
        obj = self.adapter.validate_python(
            {"type": "custom", "stock_pct": 0.6, "bond_pct": 0.3, "cash_pct": 0.1}
        )
        assert isinstance(obj, CustomAllocation)
        assert obj.stock_pct == 0.6
