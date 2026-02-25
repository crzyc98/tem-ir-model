"""End-to-end simulation for all 8 default personas against a realistic plan design."""

import pytest

from api.models.assumptions import Assumptions
from api.models.defaults import default_personas
from api.models.match_tier import MatchTier
from api.models.monte_carlo_config import MonteCarloConfig
from api.models.plan_design import PlanDesign
from api.models.vesting import ImmediateVesting
from api.services.simulation_engine import SimulationEngine


def _realistic_plan() -> PlanDesign:
    """Standard 401(k): 100% on first 3% + 50% on next 2%, immediate vesting."""
    return PlanDesign(
        name="Standard 401(k)",
        match_tiers=[
            MatchTier(match_rate=1.0, on_first_pct=0.03),
            MatchTier(match_rate=0.50, on_first_pct=0.02),
        ],
        match_vesting=ImmediateVesting(),
        core_contribution_pct=0.0,
    )


@pytest.fixture(scope="module")
def all_results():
    engine = SimulationEngine(
        assumptions=Assumptions(),
        plan_design=_realistic_plan(),
        config=MonteCarloConfig(
            num_simulations=250, seed=42, retirement_age=67, planning_age=93
        ),
    )
    return {p.persona_name: p for p in engine.run(default_personas())}


class TestPersonaCount:
    def test_all_eight_personas_returned(self, all_results):
        assert len(all_results) == 8

    def test_expected_names_present(self, all_results):
        expected = {"Jordan", "Priya", "Marcus", "Sarah", "David", "Michelle", "Robert", "Linda"}
        assert set(all_results.keys()) == expected


class TestProbabilityOfSuccess:
    def test_jordan_lower_pos_than_michelle(self, all_results):
        """Low earner at 3% deferral vs director at 15% — PoS must differ meaningfully."""
        assert all_results["Jordan"].probability_of_success < all_results["Michelle"].probability_of_success

    def test_michelle_high_pos(self, all_results):
        """Michelle: $1.1M balance, 15% deferral → should be well above 50%."""
        assert all_results["Michelle"].probability_of_success >= 0.70

    def test_pos_in_unit_interval(self, all_results):
        for name, result in all_results.items():
            pos = result.probability_of_success
            assert 0.0 <= pos <= 1.0, f"{name} PoS {pos} out of [0, 1]"

    def test_pos_assessment_matches_pos(self, all_results):
        """pos_assessment label must be consistent with the numeric PoS value."""
        for name, result in all_results.items():
            pos = result.probability_of_success
            label = result.pos_assessment
            if pos >= 0.90:
                assert label == "On Track", f"{name}: pos={pos:.2%} but assessment='{label}'"
            elif pos >= 0.75:
                assert label == "High", f"{name}: pos={pos:.2%} but assessment='{label}'"
            elif pos >= 0.50:
                assert label == "Needs Refinement", f"{name}: pos={pos:.2%} but assessment='{label}'"
            elif pos >= 0.25:
                assert label == "Most Likely Requires Adjustment", f"{name}: pos={pos:.2%} but assessment='{label}'"
            else:
                assert label == "Needs Major Reassessment", f"{name}: pos={pos:.2%} but assessment='{label}'"


class TestTargetReplacementRatio:
    def test_jordan_tier(self, all_results):
        """Jordan projected salary ~$75k → tier < $80k → 0.77."""
        assert all_results["Jordan"].target_replacement_ratio == pytest.approx(0.77)

    def test_michelle_tier(self, all_results):
        """Michelle projected salary ~$263k → tier > $250k → 0.55."""
        assert all_results["Michelle"].target_replacement_ratio == pytest.approx(0.55)

    def test_all_target_ratios_in_valid_range(self, all_results):
        for name, result in all_results.items():
            tr = result.target_replacement_ratio
            assert tr is not None, f"{name} missing target_replacement_ratio"
            assert 0.50 <= tr <= 0.85, f"{name} target ratio {tr} outside expected range"


class TestShortfallAge:
    def test_shortfall_age_present_when_pos_below_one(self, all_results):
        """Any persona with PoS < 1.0 must have a shortfall_age_p50 set."""
        for name, result in all_results.items():
            if result.probability_of_success < 1.0:
                assert result.shortfall_age_p50 is not None, (
                    f"{name} PoS={result.probability_of_success:.2%} but shortfall_age_p50 is None"
                )

    def test_shortfall_age_within_distribution_window(self, all_results):
        """Shortfall age must fall within distribution window [67, 93]."""
        for name, result in all_results.items():
            sa = result.shortfall_age_p50
            if sa is not None:
                assert 67 <= sa <= 93, f"{name} shortfall_age_p50={sa} outside [67, 93]"


class TestTrajectory:
    def test_trajectory_spans_full_lifecycle(self, all_results):
        """Each trajectory must run from persona.age to planning_age (93)."""
        personas_by_name = {p.name: p for p in default_personas()}
        for name, result in all_results.items():
            persona = personas_by_name[name]
            assert result.trajectory[0].age == persona.age, (
                f"{name}: trajectory starts at {result.trajectory[0].age}, expected {persona.age}"
            )
            assert result.trajectory[-1].age == 93, (
                f"{name}: trajectory ends at {result.trajectory[-1].age}, expected 93"
            )

    def test_no_negative_balances_in_trajectory(self, all_results):
        for name, result in all_results.items():
            for snap in result.trajectory:
                assert snap.p25 >= 0.0, f"{name} age {snap.age}: p25={snap.p25} < 0"
                assert snap.p50 >= 0.0, f"{name} age {snap.age}: p50={snap.p50} < 0"

    def test_distribution_snapshots_have_withdrawal(self, all_results):
        for name, result in all_results.items():
            for snap in result.trajectory:
                if snap.age >= 67:
                    assert snap.withdrawal is not None, (
                        f"{name} age {snap.age}: missing withdrawal in distribution phase"
                    )


class TestRetirementBalances:
    def test_senior_savers_have_substantial_balances(self, all_results):
        """Michelle, David, Marcus each have large balances and long contribution histories."""
        for name in ("Michelle", "David", "Marcus"):
            p50 = all_results[name].retirement_balance.p50
            assert p50 > 1_000_000, (
                f"{name} p50 retirement balance ${p50:,.0f} unexpectedly below $1M"
            )

    def test_all_have_positive_retirement_balance(self, all_results):
        for name, result in all_results.items():
            assert result.retirement_balance.p50 > 0, f"{name} has zero/negative p50 retirement balance"


class TestWithdrawal:
    def test_annual_withdrawal_present_for_all(self, all_results):
        for name, result in all_results.items():
            assert result.annual_withdrawal is not None, f"{name}: missing annual_withdrawal"
            assert result.annual_withdrawal.p50 >= 0, f"{name}: negative p50 annual_withdrawal"

    def test_income_replacement_ratio_present(self, all_results):
        for name, result in all_results.items():
            assert result.income_replacement_ratio is not None, f"{name}: missing income_replacement_ratio"
