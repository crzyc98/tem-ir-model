"""Tests for VestingSchedule variants."""

import pytest
from pydantic import TypeAdapter, ValidationError

from api.models import ImmediateVesting, CliffVesting, GradedVesting
from api.models.vesting import VestingSchedule


class TestImmediateVesting:
    """Tests for ImmediateVesting model."""

    def test_type_field_is_immediate(self):
        """ImmediateVesting type field should be 'immediate'."""
        obj = ImmediateVesting()
        assert obj.type == "immediate"


class TestCliffVesting:
    """Tests for CliffVesting model."""

    def test_valid_years(self):
        """Valid CliffVesting with years=3."""
        obj = CliffVesting(years=3)
        assert obj.type == "cliff"
        assert obj.years == 3

    def test_years_zero_rejected(self):
        """years=0 should be rejected (ge=1 constraint)."""
        with pytest.raises(ValidationError):
            CliffVesting(years=0)

    def test_years_seven_rejected(self):
        """years=7 should be rejected (le=6 constraint)."""
        with pytest.raises(ValidationError):
            CliffVesting(years=7)

    def test_missing_years_rejected(self):
        """Construction without years field should be rejected (US2-4)."""
        with pytest.raises(ValidationError):
            CliffVesting()


class TestGradedVesting:
    """Tests for GradedVesting model."""

    def test_valid_with_schedule(self):
        """Valid GradedVesting with a schedule dict."""
        obj = GradedVesting(schedule={1: 0.25, 2: 0.50, 3: 0.75, 4: 1.0})
        assert obj.type == "graded"
        assert obj.schedule == {1: 0.25, 2: 0.50, 3: 0.75, 4: 1.0}


class TestVestingScheduleDiscriminator:
    """Tests for discriminated union routing via VestingSchedule."""

    def setup_method(self):
        """Set up TypeAdapter for VestingSchedule."""
        self.adapter = TypeAdapter(VestingSchedule)

    def test_immediate_routing(self):
        """Discriminator routes type='immediate' to ImmediateVesting."""
        obj = self.adapter.validate_python({"type": "immediate"})
        assert isinstance(obj, ImmediateVesting)
        assert obj.type == "immediate"

    def test_cliff_routing(self):
        """Discriminator routes type='cliff' to CliffVesting."""
        obj = self.adapter.validate_python({"type": "cliff", "years": 3})
        assert isinstance(obj, CliffVesting)
        assert obj.years == 3

    def test_graded_routing(self):
        """Discriminator routes type='graded' to GradedVesting."""
        obj = self.adapter.validate_python({"type": "graded", "schedule": {1: 0.0}})
        assert isinstance(obj, GradedVesting)
        assert obj.schedule == {1: 0.0}
