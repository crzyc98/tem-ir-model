"""Tests for CoreContributionTier model."""

import pytest
from pydantic import ValidationError

from api.models import CoreContributionTier


class TestCoreContributionTier:
    """Tests for the CoreContributionTier Pydantic model."""

    def test_valid_age_only(self):
        """Valid single-dimension tier: age only."""
        obj = CoreContributionTier(
            min_age=25, max_age=35, contribution_pct=0.03
        )
        assert obj.min_age == 25
        assert obj.max_age == 35
        assert obj.contribution_pct == 0.03

    def test_valid_service_only(self):
        """Valid single-dimension tier: service only."""
        obj = CoreContributionTier(
            min_service=0, max_service=5, contribution_pct=0.02
        )
        assert obj.min_service == 0
        assert obj.max_service == 5
        assert obj.contribution_pct == 0.02

    def test_valid_compound_age_and_service(self):
        """Valid compound tier: age + service dimensions."""
        obj = CoreContributionTier(
            min_age=25,
            max_age=35,
            min_service=0,
            max_service=5,
            contribution_pct=0.04,
        )
        assert obj.min_age == 25
        assert obj.max_age == 35
        assert obj.min_service == 0
        assert obj.max_service == 5
        assert obj.contribution_pct == 0.04

    def test_all_null_bounds_rejected(self):
        """All-null bounds should be rejected (US2-6)."""
        with pytest.raises(ValidationError):
            CoreContributionTier(contribution_pct=0.03)

    def test_min_age_ge_max_age_rejected(self):
        """min_age >= max_age should be rejected."""
        with pytest.raises(ValidationError):
            CoreContributionTier(min_age=35, max_age=35, contribution_pct=0.03)

    def test_min_service_ge_max_service_rejected(self):
        """min_service >= max_service should be rejected."""
        with pytest.raises(ValidationError):
            CoreContributionTier(min_service=5, max_service=5, contribution_pct=0.02)

    def test_contribution_pct_above_one_rejected(self):
        """contribution_pct > 1.0 should be rejected."""
        with pytest.raises(ValidationError):
            CoreContributionTier(
                min_age=25, max_age=35, contribution_pct=1.01
            )

    def test_contribution_pct_below_zero_rejected(self):
        """contribution_pct < 0.0 should be rejected."""
        with pytest.raises(ValidationError):
            CoreContributionTier(
                min_age=25, max_age=35, contribution_pct=-0.01
            )
