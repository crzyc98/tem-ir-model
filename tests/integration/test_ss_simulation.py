"""Integration tests for SS estimator integration with the simulation engine."""

from api.models.assumptions import Assumptions
from api.models.asset_allocation import TargetDateAllocation
from api.models.match_tier import MatchTier
from api.models.monte_carlo_config import MonteCarloConfig
from api.models.persona import Persona
from api.models.plan_design import PlanDesign
from api.models.vesting import ImmediateVesting
from api.services.simulation_engine import SimulationEngine
from api.services.ss_estimator import SocialSecurityEstimator


def _simple_plan() -> PlanDesign:
    return PlanDesign(
        name="Simple 401(k)",
        match_tiers=[MatchTier(match_rate=1.0, on_first_pct=0.03)],
        match_vesting=ImmediateVesting(),
        core_contribution_pct=0.0,
    )


def _make_persona(
    include_social_security: bool = True,
    ss_claiming_age: int = 67,
    age: int = 42,
    salary: float = 120_000,
    name: str = "Test",
) -> Persona:
    return Persona(
        name=name,
        label="Test Persona",
        age=age,
        tenure_years=max(age - 22, 0),
        salary=salary,
        deferral_rate=0.06,
        current_balance=100_000,
        allocation=TargetDateAllocation(target_date_vintage=2050),
        include_social_security=include_social_security,
        ss_claiming_age=ss_claiming_age,
    )


class TestSSToggleOn:
    def test_ss_annual_benefit_positive(self):
        """SC-003: include_social_security=True → ss_annual_benefit > 0."""
        persona = _make_persona(include_social_security=True)
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(), plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        result = results[0]
        assert result.ss_annual_benefit > 0

    def test_total_retirement_income_equals_dc_plus_ss(self):
        """total_retirement_income.p50 == annual_retirement_income.p50 + ss_annual_benefit."""
        persona = _make_persona(include_social_security=True)
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(), plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        result = results[0]
        assert result.annual_retirement_income is not None
        assert result.total_retirement_income is not None
        assert abs(
            result.total_retirement_income.p50
            - (result.annual_retirement_income.p50 + result.ss_annual_benefit)
        ) < 0.01
        assert abs(
            result.total_retirement_income.p25
            - (result.annual_retirement_income.p25 + result.ss_annual_benefit)
        ) < 0.01
        assert abs(
            result.total_retirement_income.p75
            - (result.annual_retirement_income.p75 + result.ss_annual_benefit)
        ) < 0.01
        assert abs(
            result.total_retirement_income.p90
            - (result.annual_retirement_income.p90 + result.ss_annual_benefit)
        ) < 0.01


class TestSSToggleOff:
    def test_ss_annual_benefit_zero(self):
        """SC-004: include_social_security=False → ss_annual_benefit == 0."""
        persona = _make_persona(include_social_security=False)
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(), plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        assert results[0].ss_annual_benefit == 0.0

    def test_total_equals_dc_income_when_ss_off(self):
        """total_retirement_income equals annual_retirement_income when SS is off."""
        persona = _make_persona(include_social_security=False)
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(), plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        result = results[0]
        assert result.annual_retirement_income is not None
        assert result.total_retirement_income is not None
        assert result.total_retirement_income.p25 == result.annual_retirement_income.p25
        assert result.total_retirement_income.p50 == result.annual_retirement_income.p50
        assert result.total_retirement_income.p75 == result.annual_retirement_income.p75
        assert result.total_retirement_income.p90 == result.annual_retirement_income.p90


class TestSSImpactOnTotalIncome:
    def test_total_income_higher_with_ss_on(self):
        """SS adds to total_retirement_income; portfolio income (annuity) is the same either way."""
        plan = _simple_plan()
        assumptions = Assumptions()
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )

        persona_on = _make_persona(include_social_security=True, name="On")
        persona_off = _make_persona(include_social_security=False, name="Off")
        # Same persona id → same wage-growth seed → same retirement balance
        persona_off = persona_off.model_copy(update={"id": persona_on.id})

        engine_on = SimulationEngine(
            assumptions=assumptions, plan_design=plan, config=config
        )
        results_on = engine_on.run([persona_on])

        engine_off = SimulationEngine(
            assumptions=assumptions, plan_design=plan, config=config
        )
        results_off = engine_off.run([persona_off])

        ri_on = results_on[0].annual_retirement_income
        ri_off = results_off[0].annual_retirement_income
        assert ri_on is not None
        assert ri_off is not None

        # Portfolio income (balance / annuity_factor) is identical because
        # SS has no effect on the accumulation phase or the retirement balance.
        assert ri_on.p50 == ri_off.p50

        # Total income is higher when SS is on
        tot_on = results_on[0].total_retirement_income
        tot_off = results_off[0].total_retirement_income
        assert tot_on is not None and tot_off is not None
        assert tot_on.p50 > tot_off.p50

        # The difference equals the SS benefit
        ss_benefit = results_on[0].ss_annual_benefit
        assert abs((tot_on.p50 - tot_off.p50) - ss_benefit) < 0.01


class TestMixedPersonas:
    def test_mixed_ss_toggle(self):
        """Mixed personas: one SS on, one SS off."""
        persona_on = _make_persona(include_social_security=True, name="SSOn")
        persona_off = _make_persona(include_social_security=False, name="SSOff")
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(), plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona_on, persona_off])
        assert results[0].ss_annual_benefit > 0
        assert results[1].ss_annual_benefit == 0.0


class TestBackwardCompatibility:
    def test_existing_fields_unchanged(self):
        """Existing fields (retirement_balance, trajectory) are not affected."""
        persona = _make_persona(include_social_security=True)
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(), plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        result = results[0]
        assert result.retirement_balance is not None
        assert result.retirement_balance.p50 > 0
        assert len(result.trajectory) > 0
        # Trajectory should still be correct
        assert result.trajectory[0].age == 42
        assert result.trajectory[-1].age == 93


class TestNoDistributionPhase:
    def test_at_retirement_age_income_none(self):
        """Persona at retirement age → no distribution → income fields are None."""
        persona = _make_persona(age=67, salary=100_000)
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(), plan_design=_simple_plan(), config=config
        )
        results = engine.run([persona])
        assert results[0].annual_retirement_income is None
        assert results[0].total_retirement_income is None


class TestConsistency:
    def test_standalone_and_simulation_same_benefit(self):
        """Standalone endpoint and simulation produce the same ss_annual_benefit."""
        from datetime import UTC, datetime

        persona = _make_persona(include_social_security=True)
        assumptions = Assumptions()
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )

        # Simulation
        engine = SimulationEngine(
            assumptions=assumptions, plan_design=_simple_plan(), config=config
        )
        sim_results = engine.run([persona])
        sim_ss = sim_results[0].ss_annual_benefit

        # Standalone
        estimator = SocialSecurityEstimator(assumptions)
        current_year = datetime.now(UTC).year
        standalone = estimator.estimate(persona, 67, current_year)

        assert abs(sim_ss - standalone.annual_benefit_today) < 0.01
