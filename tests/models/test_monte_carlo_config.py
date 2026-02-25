"""Tests for the MonteCarloConfig model."""

import pytest
from pydantic import ValidationError

from api.models import MonteCarloConfig


class TestMonteCarloConfigDefaults:
    def test_retirement_age_default(self):
        mc = MonteCarloConfig()
        assert mc.retirement_age == 67

    def test_planning_age_default(self):
        mc = MonteCarloConfig()
        assert mc.planning_age == 93

    def test_seed_default_none(self):
        mc = MonteCarloConfig()
        assert mc.seed is None


class TestMonteCarloConfigFieldConstraints:
    def test_retirement_age_below_min_rejected(self):
        with pytest.raises(ValidationError):
            MonteCarloConfig(retirement_age=54)

    def test_planning_age_below_min_rejected(self):
        with pytest.raises(ValidationError):
            MonteCarloConfig(planning_age=84)


class TestMonteCarloConfigEdgeCases:
    def test_seed_can_be_set(self):
        mc = MonteCarloConfig(seed=42)
        assert mc.seed == 42
