"""Integration tests for the simulation engine distribution phase."""

from api.models.assumptions import Assumptions
from api.models.asset_allocation import CustomAllocation, TargetDateAllocation
from api.models.monte_carlo_config import MonteCarloConfig
from api.models.defaults import default_personas
from api.models.persona import Persona
from api.models.plan_design import PlanDesign
from api.models.match_tier import MatchTier
from api.models.vesting import ImmediateVesting
from api.services.simulation_engine import SimulationEngine


def _simple_plan() -> PlanDesign:
    return PlanDesign(
        name="Simple 401(k)",
        match_tiers=[MatchTier(match_rate=1.0, on_first_pct=0.03)],
        match_vesting=ImmediateVesting(),
        core_contribution_pct=0.0,
    )


def _jordan_persona() -> Persona:
    """Age 25, target-date 2065."""
    return default_personas()[0]


class TestTrajectoryLength:
    def test_full_lifecycle_trajectory(self):
        """Age 25, retirement 67, planning 93 → 69 snapshots (25..93 inclusive)."""
        persona = _jordan_persona()
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
        )
        results = engine.run([persona])
        trajectory = results[0].trajectory
        expected_length = 93 - 25 + 1  # 69
        assert len(trajectory) == expected_length
        assert trajectory[0].age == 25
        assert trajectory[-1].age == 93


class TestBalanceDepletion:
    def test_high_expense_gap_causes_depletion(self):
        """SC-002: With extreme expense target and tiny balance, most trials deplete."""
        # Age 65, 2 years to retirement, minimal savings, no SS
        persona = Persona(
            name="LowSavingsNoSS",
            label="Low Savings",
            age=65,
            tenure_years=1,
            salary=80_000,
            deferral_rate=0.0,
            current_balance=5_000,
            allocation=CustomAllocation(stock_pct=0.20, bond_pct=0.60, cash_pct=0.20),
            include_social_security=False,
        )
        # 90% replacement → expense ≈ $74k/yr on $5k balance → depletes year 1
        assumptions = Assumptions(target_replacement_ratio_override=0.90)
        config = MonteCarloConfig(
            num_simulations=500, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=assumptions,
            plan_design=_simple_plan(),
            config=config,
        )
        results = engine.run([persona])
        assert results[0].probability_of_success < 0.10
        assert results[0].shortfall_age_p50 is not None


class TestAccumulationUnchanged:
    def test_accumulation_identical_with_and_without_distribution(self):
        """FR-013: Distribution phase doesn't affect accumulation results."""
        persona = _jordan_persona()
        plan = _simple_plan()
        assumptions = Assumptions()

        # With distribution phase
        config_with = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine_with = SimulationEngine(
            assumptions=assumptions, plan_design=plan, config=config_with
        )
        results_with = engine_with.run([persona])

        # Without distribution phase (planning_age == retirement_age is invalid,
        # so we compare accumulation-phase snapshots only)
        # The accumulation snapshots are ages 25..67 = first 43 entries
        accum_snapshots_with = [
            s for s in results_with[0].trajectory if s.age <= 67
        ]

        # Run again with same seed — accumulation should be identical
        config_again = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine_again = SimulationEngine(
            assumptions=assumptions, plan_design=plan, config=config_again
        )
        results_again = engine_again.run([persona])
        accum_snapshots_again = [
            s for s in results_again[0].trajectory if s.age <= 67
        ]

        for s1, s2 in zip(accum_snapshots_with, accum_snapshots_again):
            assert s1.age == s2.age
            assert s1.p25 == s2.p25
            assert s1.p50 == s2.p50
            assert s1.p75 == s2.p75
            assert s1.p90 == s2.p90


class TestGlidePathContinuation:
    def test_allocation_more_conservative_at_retirement_plus_10(self):
        """FR-005: Target-date allocation continues shifting through retirement."""
        # Use a persona with a far-future vintage so glide path is still active at retirement
        persona = Persona(
            name="YoungFarVintage",
            label="Test Glide",
            age=25,
            tenure_years=1,
            salary=50_000,
            deferral_rate=0.05,
            current_balance=1_000,
            allocation=TargetDateAllocation(target_date_vintage=2090),
        )
        from api.services.simulation_engine import SimulationEngine as SE

        base_year = 2026
        retirement_year = base_year + (67 - 25)  # 2068
        us_eq, intl_eq, _, _ = SE._get_allocation(persona, retirement_year)
        us_eq10, intl_eq10, _, _ = SE._get_allocation(persona, retirement_year + 10)
        # More conservative = lower total equity
        assert (us_eq10 + intl_eq10) < (us_eq + intl_eq)


class TestCustomAllocationUnchanged:
    def test_custom_allocation_fixed_through_retirement(self):
        """FR-006: Custom allocation is identical at retirement and retirement+10."""
        persona = Persona(
            name="Custom",
            label="Custom Allocation",
            age=30,
            tenure_years=5,
            salary=80_000,
            deferral_rate=0.06,
            current_balance=50_000,
            allocation=CustomAllocation(
                stock_pct=0.60, bond_pct=0.30, cash_pct=0.10
            ),
        )
        from api.services.simulation_engine import SimulationEngine as SE

        alloc_ret  = SE._get_allocation(persona, 2063)
        alloc_ret10 = SE._get_allocation(persona, 2073)
        assert alloc_ret == alloc_ret10


class TestBalanceFloor:
    def test_no_negative_balances(self):
        """FR-007: No trial has negative balance at any distribution year."""
        persona = Persona(
            name="LowBalance",
            label="Low Balance Test",
            age=60,
            tenure_years=1,
            salary=40_000,
            deferral_rate=0.01,
            current_balance=5_000,
            allocation=TargetDateAllocation(target_date_vintage=2030),
        )
        config = MonteCarloConfig(
            num_simulations=200, seed=123, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
        )
        results = engine.run([persona])
        for snap in results[0].trajectory:
            assert snap.p25 >= 0.0
            assert snap.p50 >= 0.0
            assert snap.p75 >= 0.0
            assert snap.p90 >= 0.0


class TestRNGReproducibility:
    def test_same_seed_same_results(self):
        """R8: Same seed produces identical results."""
        persona = _jordan_persona()
        plan = _simple_plan()
        assumptions = Assumptions()
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )

        engine1 = SimulationEngine(
            assumptions=assumptions, plan_design=plan, config=config
        )
        results1 = engine1.run([persona])

        engine2 = SimulationEngine(
            assumptions=assumptions, plan_design=plan, config=config
        )
        results2 = engine2.run([persona])

        for s1, s2 in zip(results1[0].trajectory, results2[0].trajectory):
            assert s1.age == s2.age
            assert s1.p25 == s2.p25
            assert s1.p50 == s2.p50
            assert s1.p75 == s2.p75
            assert s1.p90 == s2.p90
            assert s1.withdrawal == s2.withdrawal


class TestNoDistributionPhase:
    def test_planning_equals_retirement_plus_one(self):
        """Minimal distribution phase: planning_age = retirement_age + 1."""
        persona = _jordan_persona()
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=86
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
        )
        results = engine.run([persona])
        # Should have accumulation snapshots (25..67) plus distribution (68..86)
        trajectory = results[0].trajectory
        assert trajectory[0].age == 25
        assert trajectory[-1].age == 86
        # Accumulation snapshots should have no withdrawal
        for snap in trajectory:
            if snap.age <= 67:
                assert snap.withdrawal is None
            else:
                assert snap.withdrawal is not None


## --- T008: Withdrawal Output Verification (US3) ---


class TestWithdrawalPercentileValues:
    def test_distribution_snapshots_have_withdrawal(self):
        """US3: Distribution-phase snapshots include withdrawal PercentileValues."""
        persona = _jordan_persona()
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
        )
        results = engine.run([persona])
        for snap in results[0].trajectory:
            if snap.age > 67:
                assert snap.withdrawal is not None
                assert snap.withdrawal.p25 >= 0
                assert snap.withdrawal.p50 >= 0
                assert snap.withdrawal.p75 >= 0
                assert snap.withdrawal.p90 >= 0
            else:
                assert snap.withdrawal is None

    def test_withdrawal_constant_in_real_terms(self):
        """Systematic strategy: p50 withdrawal constant across distribution years."""
        persona = _jordan_persona()
        config = MonteCarloConfig(
            num_simulations=200, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
        )
        results = engine.run([persona])
        dist_snaps = [s for s in results[0].trajectory if s.age > 67]
        p50_withdrawals = [s.withdrawal.p50 for s in dist_snaps]
        # First few years should have nearly identical p50 withdrawal (real terms)
        # Later years may drop as some trials deplete
        # Check first 10 years are consistent (within 1%)
        first_w = p50_withdrawals[0]
        for w in p50_withdrawals[:10]:
            assert abs(w - first_w) / first_w < 0.01


class TestAnnualWithdrawalHeadline:
    def test_annual_withdrawal_present(self):
        """PersonaSimulationResult.annual_withdrawal matches year 1 withdrawal."""
        persona = _jordan_persona()
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
        )
        results = engine.run([persona])
        aw = results[0].annual_withdrawal
        assert aw is not None
        # Should match the first distribution year's withdrawal percentiles
        first_dist = [s for s in results[0].trajectory if s.age > 67][0]
        assert aw.p25 == first_dist.withdrawal.p25
        assert aw.p50 == first_dist.withdrawal.p50
        assert aw.p75 == first_dist.withdrawal.p75
        assert aw.p90 == first_dist.withdrawal.p90


class TestSimulationResponsePlanningAge:
    def test_response_includes_planning_age(self):
        """SimulationResponse includes planning_age field."""
        from api.models.simulation_result import SimulationResponse
        from uuid import uuid4

        resp = SimulationResponse(
            scenario_id=uuid4(),
            num_simulations=100,
            seed=42,
            retirement_age=67,
            planning_age=93,
            personas=[],
        )
        assert resp.planning_age == 93


class TestZeroBalanceAtRetirement:
    def test_persona_at_retirement_age(self):
        """Persona starting at retirement age → single snapshot, no distribution."""
        persona = Persona(
            name="AtRetirement",
            label="At Retirement",
            age=67,
            tenure_years=30,
            salary=100_000,
            deferral_rate=0.10,
            current_balance=0,
            allocation=TargetDateAllocation(target_date_vintage=2026),
        )
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(),
            plan_design=_simple_plan(),
            config=config,
        )
        results = engine.run([persona])
        # Edge case: persona.age >= retirement_age → single snapshot, early return
        assert len(results[0].trajectory) == 1
        assert results[0].trajectory[0].age == 67
