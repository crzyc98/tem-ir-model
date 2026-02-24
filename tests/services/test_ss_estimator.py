"""Core calculation unit tests for the Social Security estimator."""

import math

import pytest

from api.models.assumptions import Assumptions
from api.models.asset_allocation import TargetDateAllocation
from api.models.persona import Persona
from api.services.ss_estimator import (
    AWI,
    TAXABLE_MAX,
    SocialSecurityEstimator,
)


def _default_assumptions() -> Assumptions:
    return Assumptions()


def _estimator(assumptions: Assumptions | None = None) -> SocialSecurityEstimator:
    return SocialSecurityEstimator(assumptions or _default_assumptions())


def _make_persona(
    age: int = 42,
    salary: float = 120_000,
    ss_claiming_age: int = 67,
    include_social_security: bool = True,
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


class TestAWILookupAndProjection:
    def test_published_awi_2023(self):
        est = _estimator()
        assert est._get_awi(2023) == 66621.80

    def test_published_awi_1977(self):
        est = _estimator()
        assert est._get_awi(1977) == 9779.44

    def test_future_awi_projection(self):
        est = _estimator()
        expected = 66621.80 * (1.03) ** 2  # 2025
        assert abs(est._get_awi(2025) - expected) < 0.01


class TestTaxableMaxLookupAndProjection:
    def test_published_taxable_max_2026(self):
        est = _estimator()
        assert est._get_taxable_max(2026) == 184500

    def test_future_taxable_max_projection(self):
        est = _estimator()
        expected = 184500 * (1.03) ** 1  # 2027
        assert abs(est._get_taxable_max(2027) - expected) < 0.01


class TestEarningsReconstruction:
    def test_past_earnings_scaled_by_awi(self):
        est = _estimator()
        # Persona aged 42, salary $120K, current year 2026
        earnings = est._reconstruct_earnings(
            birth_year=1984, current_age=42, salary=120_000,
            retirement_age=67, current_year=2026,
        )
        # Year 2006 (age 22): earnings = 120000 * AWI[2006] / AWI[2026]
        awi_2006 = AWI[2006]
        awi_2026 = est._get_awi(2026)
        expected = 120_000 * awi_2006 / awi_2026
        tax_max_2006 = TAXABLE_MAX[2006]
        expected = min(expected, tax_max_2006)
        assert abs(earnings[2006] - expected) < 0.01

    def test_earnings_capped_at_taxable_max(self):
        est = _estimator()
        # High earner — salary $210K should be capped
        earnings = est._reconstruct_earnings(
            birth_year=1974, current_age=52, salary=210_000,
            retirement_age=67, current_year=2026,
        )
        for year, amount in earnings.items():
            tax_max = est._get_taxable_max(year)
            assert amount <= tax_max + 0.01

    def test_future_earnings_grow_at_wage_rate(self):
        est = _estimator()
        earnings = est._reconstruct_earnings(
            birth_year=1984, current_age=42, salary=120_000,
            retirement_age=67, current_year=2026,
        )
        # 2027 salary = 120000 * 1.03^1
        expected_salary = 120_000 * 1.03
        tax_max_2027 = est._get_taxable_max(2027)
        expected = min(expected_salary, tax_max_2027)
        assert abs(earnings[2027] - expected) < 0.01


class TestEarningsIndexing:
    def test_pre_60_earnings_indexed(self):
        est = _estimator()
        earnings = {2010: 50000.0, 2020: 80000.0}
        birth_year = 1970  # age 60 in 2030
        indexed = est._index_earnings(earnings, birth_year)
        awi_2030 = est._get_awi(2030)
        expected_2010 = 50000.0 * awi_2030 / AWI[2010]
        assert abs(indexed[2010] - expected_2010) < 0.01

    def test_post_60_earnings_at_nominal(self):
        est = _estimator()
        earnings = {2035: 100000.0}
        birth_year = 1970  # age 60 in 2030
        indexed = est._index_earnings(earnings, birth_year)
        assert indexed[2035] == 100000.0


class TestAIMEComputation:
    def test_top_35_years_selection(self):
        est = _estimator()
        # 40 years of earnings, top 35 should be selected
        indexed = {yr: float(yr * 100) for yr in range(1990, 2030)}
        aime = est._compute_aime(indexed)
        # Top 35 are years 1995-2029
        top_35 = sorted(indexed.values(), reverse=True)[:35]
        expected = math.floor(sum(top_35) / 420)
        assert aime == expected

    def test_fewer_than_35_years_padded(self):
        est = _estimator()
        indexed = {2020: 60000.0, 2021: 62000.0, 2022: 64000.0}
        aime = est._compute_aime(indexed)
        expected = math.floor((60000 + 62000 + 64000) / 420)
        assert aime == expected

    def test_aime_truncated_to_whole_dollar(self):
        est = _estimator()
        indexed = {yr: 50000.5 for yr in range(1990, 2025)}
        aime = est._compute_aime(indexed)
        assert isinstance(aime, int)


class TestBendPoints:
    def test_2025_bend_points(self):
        """Verify 2025 bend points match published values ($1,226, $7,391)."""
        est = _estimator()
        bp1, bp2 = est._get_bend_points(2025)
        assert bp1 == 1226
        assert bp2 == 7391

    def test_2024_bend_points(self):
        """Verify 2024 bend points match published values ($1,174, $7,078)."""
        est = _estimator()
        bp1, bp2 = est._get_bend_points(2024)
        assert bp1 == 1174
        assert bp2 == 7078

    def test_future_bend_points_projection(self):
        est = _estimator()
        bp1, bp2 = est._get_bend_points(2030)
        # Should use AWI[2028] which is projected
        assert bp1 > 0
        assert bp2 > bp1


class TestPIA:
    def test_three_tier_formula(self):
        est = _estimator()
        # Known AIME, known bend points
        aime = 5000
        bp1 = 1226
        bp2 = 7391
        expected = 0.90 * 1226 + 0.32 * (5000 - 1226) + 0.15 * 0
        expected = math.floor(expected * 10) / 10
        pia = est._compute_pia(aime, bp1, bp2)
        assert pia == expected

    def test_pia_truncated_to_nearest_dime(self):
        est = _estimator()
        pia = est._compute_pia(5000, 1226, 7391)
        # Verify it's truncated to nearest dime (one decimal)
        assert pia == math.floor(pia * 10) / 10

    def test_pia_above_bp2(self):
        est = _estimator()
        aime = 10000
        bp1 = 1226
        bp2 = 7391
        expected = 0.90 * 1226 + 0.32 * (7391 - 1226) + 0.15 * (10000 - 7391)
        expected = math.floor(expected * 10) / 10
        pia = est._compute_pia(aime, bp1, bp2)
        assert pia == expected


class TestClaimingAdjustment:
    def test_age_62_factor(self):
        est = _estimator()
        factor = est._claiming_adjustment_factor(62)
        assert abs(factor - 0.70) < 0.001

    def test_age_63_factor(self):
        est = _estimator()
        factor = est._claiming_adjustment_factor(63)
        assert abs(factor - 0.75) < 0.001

    def test_age_64_factor(self):
        est = _estimator()
        factor = est._claiming_adjustment_factor(64)
        assert abs(factor - 0.80) < 0.001

    def test_age_65_factor(self):
        est = _estimator()
        factor = est._claiming_adjustment_factor(65)
        assert abs(factor - 0.8667) < 0.001

    def test_age_66_factor(self):
        est = _estimator()
        factor = est._claiming_adjustment_factor(66)
        assert abs(factor - 0.9333) < 0.001

    def test_age_67_factor(self):
        est = _estimator()
        factor = est._claiming_adjustment_factor(67)
        assert factor == 1.0

    def test_age_68_factor(self):
        est = _estimator()
        factor = est._claiming_adjustment_factor(68)
        assert abs(factor - 1.08) < 0.001

    def test_age_69_factor(self):
        est = _estimator()
        factor = est._claiming_adjustment_factor(69)
        assert abs(factor - 1.16) < 0.001

    def test_age_70_factor(self):
        est = _estimator()
        factor = est._claiming_adjustment_factor(70)
        assert abs(factor - 1.24) < 0.001


class TestEndToEndEstimate:
    def test_sarah_age42_salary120k_claiming67(self):
        """Acceptance scenario (a): persona aged 42, $120K salary, claiming 67."""
        est = _estimator()
        persona = _make_persona(age=42, salary=120_000, ss_claiming_age=67)
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        # At FRA, factor should be 1.0
        assert result.claiming_adjustment_factor == 1.0
        # AIME should be reasonable for $120K earner
        assert result.aime > 0
        # PIA should be positive
        assert result.pia_monthly > 0
        # Annual = floor(monthly) * 12
        assert result.annual_benefit_today == math.floor(result.monthly_benefit_today) * 12

    def test_jordan_age25_salary40k_claiming62(self):
        """Acceptance scenario (b): persona aged 25, $40K salary, claiming 62."""
        est = _estimator()
        persona = _make_persona(age=25, salary=40_000, ss_claiming_age=62, name="Jordan")
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        # Early claiming at 62 → ~70% of PIA
        assert abs(result.claiming_adjustment_factor - 0.70) < 0.001
        assert result.aime > 0
        assert result.monthly_benefit_today > 0

    def test_michelle_age52_salary210k_claiming70(self):
        """Acceptance scenario (c): persona aged 52, $210K salary, claiming 70."""
        est = _estimator()
        persona = _make_persona(age=52, salary=210_000, ss_claiming_age=70, name="Michelle")
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        # Delayed claiming at 70 → ~124% of PIA
        assert abs(result.claiming_adjustment_factor - 1.24) < 0.001
        assert result.aime > 0
        assert result.monthly_benefit_today > 0


class TestEdgeCases:
    def test_persona_under_22_no_past_earnings(self):
        """Persona under age 22 has no past earnings, only projected future."""
        est = _estimator()
        persona = _make_persona(age=18, salary=30_000, ss_claiming_age=67)
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        # Under 22: no past earnings, but future earnings are projected
        # So AIME will be > 0 due to projected working years from age 22
        assert result.aime >= 0
        assert result.monthly_benefit_today >= 0

    def test_current_age_exceeds_claiming_age_raises(self):
        """Current age > claiming age → ValueError."""
        est = _estimator()
        persona = _make_persona(age=68, salary=100_000, ss_claiming_age=67)
        with pytest.raises(ValueError, match="claiming_age"):
            est.estimate(persona, retirement_age=67, current_year=2026)

    def test_zero_salary_zero_benefit(self):
        """Salary $0 is not valid (Persona rejects gt=0), so test very low salary."""
        est = _estimator()
        persona = _make_persona(age=30, salary=1.0, ss_claiming_age=67)
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        # Very low salary → very low benefit
        assert result.aime >= 0
        assert result.monthly_benefit_today >= 0

    def test_high_salary_capped_at_taxable_max(self):
        """Salary above taxable max → earnings capped every year."""
        est = _estimator()
        persona = _make_persona(age=50, salary=500_000, ss_claiming_age=67)
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        assert result.aime > 0
        # The AIME should be bounded — even at max salary, can't exceed ~taxable_max/12
        # for all years. Rough upper bound check.
        assert result.aime < 25000  # Reasonable upper bound

    def test_annual_equals_floor_monthly_times_12(self):
        """Verify annual_benefit_today = floor(monthly_benefit_today) * 12."""
        est = _estimator()
        persona = _make_persona(age=42, salary=120_000, ss_claiming_age=67)
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        assert result.annual_benefit_today == math.floor(result.monthly_benefit_today) * 12


# --- T014: Claiming Age Sensitivity Tests (Phase 5, US3) ---


class TestClaimingAgeSensitivity:
    def test_default_claiming_age_uses_67(self):
        """Default claiming age (67) → factor == 1.0, benefit equals PIA."""
        est = _estimator()
        persona = _make_persona(age=42, salary=120_000)
        # Default ss_claiming_age is 67
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        assert result.claiming_adjustment_factor == 1.0

    def test_claiming_62_approximately_70_percent(self):
        """Claiming at 62 → ~70% of PIA (30% reduction)."""
        est = _estimator()
        persona = _make_persona(age=42, salary=120_000, ss_claiming_age=62)
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        assert abs(result.claiming_adjustment_factor - 0.70) < 0.001

    def test_claiming_70_approximately_124_percent(self):
        """Claiming at 70 → ~124% of PIA (24% increase)."""
        est = _estimator()
        persona = _make_persona(age=42, salary=120_000, ss_claiming_age=70)
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        assert abs(result.claiming_adjustment_factor - 1.24) < 0.001

    def test_all_ages_62_to_70_factors(self):
        """SC-002: Each integer claiming age 62-70 matches reference table."""
        est = _estimator()
        expected_factors = {
            62: 0.70, 63: 0.75, 64: 0.80, 65: 0.8667,
            66: 0.9333, 67: 1.0, 68: 1.08, 69: 1.16, 70: 1.24,
        }
        for claiming_age, expected in expected_factors.items():
            factor = est._claiming_adjustment_factor(claiming_age)
            assert abs(factor - expected) < 0.001, (
                f"Age {claiming_age}: expected {expected}, got {factor}"
            )

    def test_benefit_monotonically_increases_with_claiming_age(self):
        """Benefit strictly increases as claiming age increases 62-70."""
        est = _estimator()
        benefits = []
        for claiming_age in range(62, 71):
            persona = _make_persona(
                age=42, salary=120_000, ss_claiming_age=claiming_age
            )
            result = est.estimate(persona, retirement_age=67, current_year=2026)
            benefits.append(result.monthly_benefit_today)

        for i in range(1, len(benefits)):
            assert benefits[i] > benefits[i - 1], (
                f"Benefit at age {62 + i} ({benefits[i]}) not > "
                f"benefit at age {62 + i - 1} ({benefits[i-1]})"
            )

    def test_claiming_age_validation_raises_for_young(self):
        """FR-013: claiming_age < current age → ValueError."""
        est = _estimator()
        persona = _make_persona(age=25, salary=50_000, ss_claiming_age=62)
        # persona aged 25, claiming at 62 is fine — 62 >= 25
        result = est.estimate(persona, retirement_age=67, current_year=2026)
        assert result.claiming_age == 62

        # But persona aged 65 with claiming_age 62 → error
        persona_old = _make_persona(age=65, salary=50_000, ss_claiming_age=62)
        with pytest.raises(ValueError, match="claiming_age"):
            est.estimate(persona_old, retirement_age=67, current_year=2026)

    def test_different_claiming_ages_in_same_simulation(self):
        """Two personas with different claiming ages produce different benefits."""
        from api.models.match_tier import MatchTier
        from api.models.monte_carlo_config import MonteCarloConfig
        from api.models.plan_design import PlanDesign
        from api.models.vesting import ImmediateVesting
        from api.services.simulation_engine import SimulationEngine

        persona_62 = _make_persona(
            age=42, salary=120_000, ss_claiming_age=62, name="Early"
        )
        persona_70 = _make_persona(
            age=42, salary=120_000, ss_claiming_age=70, name="Late"
        )
        plan = PlanDesign(
            name="Simple",
            match_tiers=[MatchTier(match_rate=1.0, on_first_pct=0.03)],
            match_vesting=ImmediateVesting(),
            core_contribution_pct=0.0,
        )
        config = MonteCarloConfig(
            num_simulations=100, seed=42, retirement_age=67, planning_age=93
        )
        engine = SimulationEngine(
            assumptions=Assumptions(), plan_design=plan, config=config
        )
        results = engine.run([persona_62, persona_70])
        # Both should have positive SS benefits
        assert results[0].ss_annual_benefit > 0
        assert results[1].ss_annual_benefit > 0
        # Delayed claimer should have higher benefit
        assert results[1].ss_annual_benefit > results[0].ss_annual_benefit
