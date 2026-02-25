"""Pluggability validation: alternative withdrawal strategy with zero engine changes (SC-003)."""

from typing import Any

import numpy as np

from api.models.assumptions import Assumptions
from api.models.defaults import default_personas
from api.models.match_tier import MatchTier
from api.models.monte_carlo_config import MonteCarloConfig
from api.models.plan_design import PlanDesign
from api.models.vesting import ImmediateVesting
from api.models.withdrawal_strategy import ExpenseGapWithdrawal
from api.services.simulation_engine import SimulationEngine


class FixedDollarWithdrawal:
    """Test-only strategy: fixed nominal dollar amount per year."""

    def __init__(self, annual_amount: float = 20_000.0) -> None:
        self._amount = annual_amount

    def calculate_withdrawal(
        self,
        current_balance: np.ndarray,
        year_in_retirement: int,
        initial_retirement_balance: np.ndarray,
        params: dict[str, Any],
    ) -> np.ndarray:
        w = np.full_like(current_balance, self._amount)
        return np.minimum(w, np.maximum(current_balance, 0.0))


def _simple_plan() -> PlanDesign:
    return PlanDesign(
        name="Simple 401(k)",
        match_tiers=[MatchTier(match_rate=1.0, on_first_pct=0.03)],
        match_vesting=ImmediateVesting(),
        core_contribution_pct=0.0,
    )


class TestAlternativeStrategyRuns:
    def test_fixed_dollar_strategy_completes(self):
        """Alternative strategy runs without engine changes."""
        persona = default_personas()[0]
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
            withdrawal_strategy=FixedDollarWithdrawal(),
        )
        results = engine.run([persona])
        assert len(results) == 1
        trajectory = results[0].trajectory
        # Distribution phase should be populated
        dist_snaps = [s for s in trajectory if s.age > 67]
        assert len(dist_snaps) == 26  # 68..93

    def test_distribution_trajectory_populated(self):
        persona = default_personas()[0]
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
            withdrawal_strategy=FixedDollarWithdrawal(),
        )
        results = engine.run([persona])
        for snap in results[0].trajectory:
            if snap.age > 67:
                assert snap.withdrawal is not None


class TestAccumulationIdenticalDistributionDiffers:
    def test_accumulation_same_distribution_different(self):
        """Same seed: accumulation identical, distribution differs between strategies."""
        persona = default_personas()[0]
        plan = _simple_plan()
        assumptions = Assumptions()
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )

        engine_gap = SimulationEngine(
            assumptions=assumptions,
            plan_design=plan,
            config=config,
            withdrawal_strategy=ExpenseGapWithdrawal(),
        )
        results_sys = engine_gap.run([persona])

        engine_fixed = SimulationEngine(
            assumptions=assumptions,
            plan_design=plan,
            config=config,
            withdrawal_strategy=FixedDollarWithdrawal(),
        )
        results_fixed = engine_fixed.run([persona])

        traj_sys = results_sys[0].trajectory
        traj_fixed = results_fixed[0].trajectory

        # Accumulation snapshots (age <= 67) should be identical
        for s1, s2 in zip(traj_sys, traj_fixed):
            if s1.age > 67:
                break
            assert s1.p25 == s2.p25
            assert s1.p50 == s2.p50
            assert s1.p75 == s2.p75
            assert s1.p90 == s2.p90

        # Distribution results should differ
        dist_sys = [s for s in traj_sys if s.age > 67]
        dist_fixed = [s for s in traj_fixed if s.age > 67]

        any_balance_diff = any(
            s1.p50 != s2.p50 for s1, s2 in zip(dist_sys, dist_fixed)
        )
        assert any_balance_diff, "Distribution-phase balances should differ between strategies"


class TestFixedStrategyExpectedWithdrawals:
    def test_fixed_amount_or_balance_cap(self):
        """FixedDollarWithdrawal returns $20k or balance cap."""
        persona = default_personas()[0]
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
            withdrawal_strategy=FixedDollarWithdrawal(annual_amount=20_000.0),
        )
        results = engine.run([persona])
        # First distribution year: withdrawal should be ≈ $20k for trials
        # with balance > $20k (p50 withdrawal should be near $20k)
        first_dist = [s for s in results[0].trajectory if s.age == 68][0]
        assert first_dist.withdrawal is not None
        # p50 withdrawal (in real terms) should be close to 20000 / (1.025)^1
        # since the engine records real = nominal / (1+inflation)^year
        expected_real = 20_000.0 / 1.025
        assert abs(first_dist.withdrawal.p50 - expected_real) < 1_000
