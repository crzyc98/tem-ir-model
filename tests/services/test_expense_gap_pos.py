"""Tests for expense-gap probability of success semantics."""

import pytest

from api.models.assumptions import Assumptions
from api.models.asset_allocation import CustomAllocation
from api.models.defaults import default_personas
from api.models.match_tier import MatchTier
from api.models.monte_carlo_config import MonteCarloConfig
from api.models.persona import Persona
from api.models.plan_design import PlanDesign
from api.models.vesting import ImmediateVesting
from api.services.simulation_engine import (
    SimulationEngine,
    _lookup_replacement_ratio,
    _pos_assessment,
)


def _simple_plan() -> PlanDesign:
    return PlanDesign(
        name="Simple 401(k)",
        match_tiers=[MatchTier(match_rate=1.0, on_first_pct=0.03)],
        match_vesting=ImmediateVesting(),
        core_contribution_pct=0.0,
    )


def _wealthy_persona() -> Persona:
    """A persona with a very large balance — should almost never deplete."""
    return Persona(
        name="Wealthy",
        label="High Balance",
        age=60,
        tenure_years=30,
        salary=100_000,
        deferral_rate=0.15,
        current_balance=5_000_000,
        allocation=CustomAllocation(stock_pct=0.40, bond_pct=0.50, cash_pct=0.10),
        include_social_security=False,
    )


def _broke_persona() -> Persona:
    """A persona close to retirement with minimal savings and no SS."""
    return Persona(
        name="Broke",
        label="No Savings",
        age=65,
        tenure_years=1,
        salary=80_000,
        deferral_rate=0.0,
        current_balance=5_000,
        allocation=CustomAllocation(stock_pct=0.20, bond_pct=0.60, cash_pct=0.20),
        include_social_security=False,
    )


class TestHighBalanceLowExpenseTarget:
    def test_pos_near_one(self):
        """Very large balance + forced low expense target → PoS ≈ 1.0."""
        persona = _wealthy_persona()
        # 10% replacement → tiny expense target → gap is tiny vs $5M portfolio
        assumptions = Assumptions(target_replacement_ratio_override=0.10)
        config = MonteCarloConfig(
            num_simulations=500, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=assumptions, plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        result = results[0]
        assert result.probability_of_success >= 0.95
        assert result.shortfall_age_p50 is None


class TestLowBalanceHighExpenseTarget:
    def test_pos_below_one_and_shortfall_age_set(self):
        """Tiny balance + 90% replacement → most trials deplete, shortfall_age_p50 set."""
        persona = _broke_persona()
        assumptions = Assumptions(target_replacement_ratio_override=0.90)
        config = MonteCarloConfig(
            num_simulations=500, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=assumptions, plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        result = results[0]
        assert result.probability_of_success < 0.10
        assert result.shortfall_age_p50 is not None
        # Depletion should happen near retirement age (balance only ~$5k)
        assert result.shortfall_age_p50 <= 70


class TestLookupTable:
    """Verify _lookup_replacement_ratio routing."""

    def test_salary_below_50k_returns_80pct(self):
        assert _lookup_replacement_ratio(49_999.0, None) == pytest.approx(0.80)

    def test_salary_at_50k_returns_77pct(self):
        # 50_000 is NOT < 50_000, so falls to next tier
        assert _lookup_replacement_ratio(50_000.0, None) == pytest.approx(0.77)

    def test_salary_between_50k_80k_returns_77pct(self):
        assert _lookup_replacement_ratio(65_000.0, None) == pytest.approx(0.77)

    def test_salary_between_80k_120k_returns_72pct(self):
        assert _lookup_replacement_ratio(100_000.0, None) == pytest.approx(0.72)

    def test_salary_between_120k_250k_returns_62pct(self):
        assert _lookup_replacement_ratio(200_000.0, None) == pytest.approx(0.62)

    def test_salary_above_250k_returns_55pct(self):
        assert _lookup_replacement_ratio(300_000.0, None) == pytest.approx(0.55)


class TestOverrideRespected:
    def test_override_beats_lookup(self):
        """target_replacement_ratio_override bypasses the salary tier table."""
        # salary $40k would normally get 0.80; override to 0.60
        ratio = _lookup_replacement_ratio(40_000.0, 0.60)
        assert ratio == pytest.approx(0.60)

    def test_override_reflected_in_result(self):
        """Engine uses override and stores it in target_replacement_ratio."""
        persona = default_personas()[0]  # Jordan, salary $40k → normal ratio 0.80
        assumptions = Assumptions(target_replacement_ratio_override=0.60)
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=assumptions, plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        assert results[0].target_replacement_ratio == pytest.approx(0.60)


class TestSSFullyCoverExpenses:
    def test_zero_gap_means_no_withdrawal_and_full_pos(self):
        """expense_target = 0 (ratio override = 0) → gap = 0 → pos = 1.0."""
        persona = default_personas()[0]
        assumptions = Assumptions(target_replacement_ratio_override=0.0)
        config = MonteCarloConfig(
            num_simulations=200, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=assumptions, plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        # Zero expense target → no withdrawals → portfolio only grows → pos = 1.0
        assert results[0].probability_of_success == pytest.approx(1.0)
        assert results[0].shortfall_age_p50 is None


class TestPosAssessmentBands:
    """Verify _pos_assessment returns the correct Fidelity 5-tier label."""

    def test_on_track(self):
        assert _pos_assessment(0.90) == "On Track"
        assert _pos_assessment(1.00) == "On Track"

    def test_high(self):
        assert _pos_assessment(0.75) == "High"
        assert _pos_assessment(0.89) == "High"

    def test_needs_refinement(self):
        assert _pos_assessment(0.50) == "Needs Refinement"
        assert _pos_assessment(0.74) == "Needs Refinement"

    def test_most_likely_requires_adjustment(self):
        assert _pos_assessment(0.25) == "Most Likely Requires Adjustment"
        assert _pos_assessment(0.49) == "Most Likely Requires Adjustment"

    def test_needs_major_reassessment(self):
        assert _pos_assessment(0.00) == "Needs Major Reassessment"
        assert _pos_assessment(0.24) == "Needs Major Reassessment"
