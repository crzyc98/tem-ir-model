"""Tests for the PlanDesign model."""

import pytest
from pydantic import ValidationError

from api.models import PlanDesign, MatchTier, GradedVesting, CoreContributionTier, CliffVesting


class TestPlanDesignValid:
    def test_standard_401k_with_match_and_vesting(self):
        """Acceptance scenario US1-1: valid plan with 2 match tiers + graded vesting + auto-enroll."""
        pd = PlanDesign(
            name="Standard 401(k)",
            match_tiers=[
                MatchTier(match_rate=1.0, on_first_pct=0.03),
                MatchTier(match_rate=0.5, on_first_pct=0.02),
            ],
            match_vesting=GradedVesting(
                schedule={1: 0.0, 2: 0.20, 3: 0.40, 4: 0.60, 5: 0.80, 6: 1.0}
            ),
            core_contribution_pct=0.03,
        )
        assert pd.name == "Standard 401(k)"
        assert len(pd.match_tiers) == 2

    def test_zero_match_tiers_and_zero_core_allowed(self):
        """Edge case: minimal plan with no match or core contribution."""
        pd = PlanDesign(name="Minimal")
        assert pd.name == "Minimal"

    def test_non_overlapping_core_tiers_accepted(self):
        """Disjoint age ranges [25,35) and [35,45) should be accepted."""
        pd = PlanDesign(
            name="Disjoint",
            core_age_service_tiers=[
                CoreContributionTier(min_age=25, max_age=35, contribution_pct=0.03),
                CoreContributionTier(min_age=35, max_age=45, contribution_pct=0.04),
            ],
        )
        assert len(pd.core_age_service_tiers) == 2


class TestPlanDesignRejections:
    def test_more_than_three_match_tiers_rejected(self):
        """Acceptance scenario US2-3: more than 3 match tiers is invalid."""
        with pytest.raises(ValidationError):
            PlanDesign(
                name="Too many tiers",
                match_tiers=[
                    MatchTier(match_rate=1.0, on_first_pct=0.01),
                    MatchTier(match_rate=0.75, on_first_pct=0.01),
                    MatchTier(match_rate=0.50, on_first_pct=0.01),
                    MatchTier(match_rate=0.25, on_first_pct=0.01),
                ],
            )

    def test_escalation_cap_below_enroll_rate_rejected(self):
        """FR-014: auto_escalation_cap must not be less than auto_enroll_rate."""
        with pytest.raises(ValidationError):
            PlanDesign(
                name="Bad escalation",
                auto_enroll_rate=0.06,
                auto_escalation_cap=0.04,
            )

    def test_overlapping_core_tier_ranges_rejected(self):
        """Acceptance scenario US2-5: overlapping age ranges must be rejected."""
        with pytest.raises(ValidationError):
            PlanDesign(
                name="Overlap",
                core_age_service_tiers=[
                    CoreContributionTier(min_age=25, max_age=35, contribution_pct=0.03),
                    CoreContributionTier(min_age=30, max_age=40, contribution_pct=0.04),
                ],
            )
