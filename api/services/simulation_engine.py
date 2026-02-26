"""Monte Carlo simulation engine for retirement account projections."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np

from api.models.assumptions import Assumptions
from api.models.asset_allocation import CustomAllocation, TargetDateAllocation
from api.models.monte_carlo_config import MonteCarloConfig
from api.models.persona import Persona
from api.models.plan_design import PlanDesign
from api.models.simulation_result import (
    PercentileValues,
    PersonaSimulationResult,
    YearSnapshot,
)
from api.models.vesting import VestingSchedule
from api.models.withdrawal_strategy import ExpenseGapWithdrawal, WithdrawalStrategy
from api.services.scenario_matrix_loader import (
    MIN_AGE,
    NUM_SCENARIOS,
    ScenarioMatrixLoader,
    get_default_loader,
)
from api.services.ss_estimator import SocialSecurityEstimator

# Fidelity Freedom Fund glide path (effective Q1 2027)
# Columns: (years_to_target, us_equity, intl_equity, bonds, short_term)
# Positive = years before target date; negative = years after target date.
# Clamp: >= 30 years out → row 0; <= -19 years past → last row.
GLIDE_PATH: list[tuple[int, float, float, float, float]] = [
    ( 30,  0.570, 0.380, 0.050, 0.000),
    ( 24,  0.554, 0.370, 0.076, 0.000),
    ( 19,  0.539, 0.359, 0.102, 0.000),
    ( 14,  0.486, 0.324, 0.190, 0.000),
    (  9,  0.399, 0.266, 0.315, 0.020),
    (  4,  0.346, 0.231, 0.353, 0.070),
    (  0,  0.307, 0.205, 0.368, 0.120),
    ( -6,  0.258, 0.172, 0.427, 0.143),
    (-11,  0.216, 0.144, 0.446, 0.194),
    (-16,  0.183, 0.122, 0.457, 0.238),
    (-19,  0.168, 0.112, 0.430, 0.290),
]

PERCENTILES = (10, 25, 50, 75, 90)

# Income-tier replacement ratio lookup table (combined DC + SS target)
_IR_TIERS: list[tuple[float, float]] = [
    (50_000, 0.80),
    (80_000, 0.77),
    (120_000, 0.72),
    (250_000, 0.62),
    (float("inf"), 0.55),
]


def _lookup_replacement_ratio(salary: float, override: float | None) -> float:
    if override is not None:
        return override
    for threshold, ratio in _IR_TIERS:
        if salary < threshold:
            return ratio
    return 0.55


def _pos_assessment(pos: float) -> str:
    if pos >= 0.90:
        return "On Track"
    if pos >= 0.75:
        return "High"
    if pos >= 0.50:
        return "Needs Refinement"
    if pos >= 0.25:
        return "Most Likely Requires Adjustment"
    return "Needs Major Reassessment"


class SimulationEngine:
    """Monte Carlo engine for retirement projections using pre-computed scenario matrices."""

    def __init__(
        self,
        assumptions: Assumptions,
        plan_design: PlanDesign,
        config: MonteCarloConfig,
        withdrawal_strategy: WithdrawalStrategy | None = None,
        loader: ScenarioMatrixLoader | None = None,
    ) -> None:
        self._assumptions = assumptions
        self._plan = plan_design
        self._config = config
        self._strategy: WithdrawalStrategy = withdrawal_strategy or ExpenseGapWithdrawal()
        self._loader: ScenarioMatrixLoader = loader if loader is not None else get_default_loader()

    # --- Public API ---

    def run(self, personas: list[Persona]) -> list[PersonaSimulationResult]:
        """Run simulation for all personas.

        Derives per-persona RNG seeds from the master seed for wage-growth noise.
        Investment returns come from the pre-computed scenario matrices.
        """
        master_rng = np.random.default_rng(self._config.seed)
        persona_seeds = master_rng.integers(0, 2**63, size=len(personas))

        results: list[PersonaSimulationResult] = []
        for i, persona in enumerate(personas):
            rng = np.random.default_rng(int(persona_seeds[i]))
            result = self._simulate_persona(persona, rng)
            results.append(result)
        return results

    # --- Core simulation loop ---

    def _simulate_persona(
        self, persona: Persona, rng: np.random.Generator
    ) -> PersonaSimulationResult:
        """Simulate accumulation + distribution for a single persona across all 250 scenarios."""
        retirement_age = self._config.retirement_age
        n = NUM_SCENARIOS  # fixed at 250
        a = self._assumptions

        calendar_year = datetime.now(UTC).year

        # Edge case: persona already at or past retirement
        if persona.age >= retirement_age:
            pv = PercentileValues(
                p10=persona.current_balance,
                p25=persona.current_balance,
                p50=persona.current_balance,
                p75=persona.current_balance,
                p90=persona.current_balance,
            )
            snap = YearSnapshot(
                age=persona.age,
                p10=persona.current_balance,
                p25=persona.current_balance,
                p50=persona.current_balance,
                p75=persona.current_balance,
                p90=persona.current_balance,
            )
            return PersonaSimulationResult(
                persona_id=persona.id,
                persona_name=persona.name,
                retirement_balance=pv,
                trajectory=[snap],
                projected_salary_at_retirement=persona.salary,
            )

        num_years = retirement_age - persona.age - 1  # last contribution year is retirement_age - 1

        # Matrix row index for the first return year.
        # Row i corresponds to age MIN_AGE + i; clamp negative rows to 0.
        start_row = max(0, persona.age - MIN_AGE)

        # Initialise arrays (vectorised across 250 scenarios)
        balances = np.full(n, persona.current_balance, dtype=np.float64)
        salaries = np.full(n, persona.salary, dtype=np.float64)

        # Auto-enrollment
        initial_rate = persona.deferral_rate
        if self._plan.auto_enroll_enabled:
            if self._plan.auto_enroll_overrides_personal_rate or initial_rate == 0.0:
                initial_rate = self._plan.auto_enroll_rate
        deferral_rates = np.full(n, initial_rate, dtype=np.float64)

        # Contribution accumulators
        cum_deferrals = np.zeros(n, dtype=np.float64)
        cum_match = np.zeros(n, dtype=np.float64)
        cum_core = np.zeros(n, dtype=np.float64)

        # Year 0: record starting balance
        all_balances: list[np.ndarray] = [balances.copy()]
        base_year = calendar_year

        for year_idx in range(1, num_years + 1):
            age = persona.age + year_idx
            tenure = persona.tenure_years + year_idx

            # 1. Wage growth with noise — convert to real via Fisher formula
            growth = rng.normal(a.wage_growth_rate, a.wage_growth_std, n)
            real_growth = (1.0 + growth) / (1.0 + a.inflation_rate) - 1.0
            salaries = salaries * (1.0 + real_growth)

            # 2. Cap compensation
            capped_comp = np.minimum(salaries, a.comp_limit)

            # 3. Auto-escalation
            if self._plan.auto_enroll_enabled and self._plan.auto_escalation_enabled:
                deferral_rates = np.minimum(
                    deferral_rates + self._plan.auto_escalation_rate,
                    self._plan.auto_escalation_cap,
                )

            # 4. Employee deferrals capped at age-based IRS limit
            deferral_limit = self._get_deferral_limit(age)
            deferrals = np.minimum(deferral_rates * capped_comp, deferral_limit)

            # 5. Employer match
            match = self._calculate_match(deferrals, capped_comp)

            # 6. Employer core
            core = self._calculate_core(capped_comp, age, tenure)

            # 7. Eligibility check
            tenure_months = tenure * 12
            if tenure_months < self._plan.match_eligibility_months:
                match = np.zeros(n)
            if tenure_months < self._plan.core_eligibility_months:
                core = np.zeros(n)

            # 8. Section 415 limit
            total_additions = deferrals + match + core
            excess = np.maximum(total_additions - a.additions_limit, 0.0)
            core_reduction = np.minimum(excess, core)
            core = core - core_reduction
            excess = excess - core_reduction
            match_reduction = np.minimum(excess, match)
            match = match - match_reduction

            # 9. Vesting
            match_vested_pct = self._get_vesting_pct(self._plan.match_vesting, tenure)
            core_vested_pct = self._get_vesting_pct(self._plan.core_vesting, tenure)
            vested_match = match * match_vested_pct
            vested_core = core * core_vested_pct

            # 10. Investment returns from pre-computed scenario matrix.
            # Returns are already real (no Fisher conversion needed).
            # row = start_row + year_idx maps to age = persona.age + year_idx.
            current_year = base_year + year_idx
            us_eq, intl_eq, bonds_pct, short_term = self._get_allocation(
                persona, current_year
            )
            matrix_row = start_row + year_idx
            stock_ret = self._loader.stocks[matrix_row, :]  # shape (250,)
            bond_ret  = self._loader.bonds[matrix_row, :]
            cash_ret  = self._loader.cash[matrix_row, :]
            blended_return = (
                (us_eq + intl_eq) * stock_ret
                + bonds_pct * bond_ret
                + short_term * cash_ret
            )

            # 11. Balance update (beginning-of-year contribution assumption)
            contributions = deferrals + vested_match + vested_core
            balances = (balances + contributions) * (1.0 + blended_return)

            # Accumulate contributions
            cum_deferrals += deferrals
            cum_match += vested_match
            cum_core += vested_core

            all_balances.append(balances.copy())

        # --- Social Security ---
        ss_annual: float = 0.0
        if persona.include_social_security:
            ss_estimator = SocialSecurityEstimator(self._assumptions)
            try:
                ss_result = ss_estimator.estimate(
                    persona, retirement_age, calendar_year
                )
                ss_annual = ss_result.annual_benefit_today
            except ValueError:
                ss_annual = 0.0

        # --- Expense target ---
        years_to_retirement = retirement_age - persona.age
        projected_salary = persona.salary * (
            (1.0 + a.salary_real_growth_rate) ** (years_to_retirement - 1)
        )
        target_ratio = _lookup_replacement_ratio(
            projected_salary, a.target_replacement_ratio_override
        )
        expense_target_real = projected_salary * target_ratio

        # --- Distribution phase ---
        planning_age = self._config.planning_age
        distribution_years = planning_age - retirement_age + 1
        all_withdrawals: list[np.ndarray] = []

        # Saved after the dist_params block for the annuity calculation below.
        r_real_at_retirement: float = 0.0

        if distribution_years > 0:
            retirement_balances = balances.copy()

            # Expected nominal return at retirement for dist_params (scalar estimate).
            current_year_at_retirement = base_year + (retirement_age - persona.age)
            us_eq, intl_eq, bonds_pct, short_term = self._get_allocation(
                persona, current_year_at_retirement
            )
            r_nominal = (
                us_eq        * a.equity.expected_return
                + intl_eq    * a.intl_equity.expected_return
                + bonds_pct  * a.fixed_income.expected_return
                + short_term * a.cash.expected_return
            )
            r_real = (1.0 + r_nominal) / (1.0 + a.inflation_rate) - 1.0
            r_real_at_retirement = r_real

            dist_params = {
                "total_years": distribution_years,
                "real_return_rate": r_real,
                "inflation_rate": a.inflation_rate,
                "expense_target_real": expense_target_real,
                "ss_annual_real": ss_annual,
            }

            shortfall_ages = np.full(n, np.nan)

            for year_idx in range(1, distribution_years + 1):
                year_in_retirement = year_idx

                # Withdraw
                w_real = self._strategy.calculate_withdrawal(
                    balances, year_in_retirement, retirement_balances, dist_params
                )
                w_real = np.minimum(w_real, np.maximum(balances, 0.0))
                balances = balances - w_real
                balances = np.maximum(balances, 0.0)

                # Investment returns from matrix.
                # row = start_row + num_years + year_idx maps to age = retirement_age + year_idx - 1.
                current_year = base_year + num_years + year_idx
                us_eq, intl_eq, bonds_pct, short_term = self._get_allocation(
                    persona, current_year
                )
                matrix_row = start_row + num_years + year_idx
                stock_ret = self._loader.stocks[matrix_row, :]
                bond_ret  = self._loader.bonds[matrix_row, :]
                cash_ret  = self._loader.cash[matrix_row, :]
                blended_return = (
                    (us_eq + intl_eq) * stock_ret
                    + bonds_pct * bond_ret
                    + short_term * cash_ret
                )
                balances = balances * (1.0 + blended_return)
                balances = np.maximum(balances, 0.0)

                # Track first year each trial balance hits 0
                newly_depleted = (balances <= 0.0) & np.isnan(shortfall_ages)
                shortfall_ages = np.where(
                    newly_depleted, float(retirement_age - 1 + year_idx), shortfall_ages
                )

                all_balances.append(balances.copy())
                all_withdrawals.append(w_real.copy())

        # Compute percentiles across scenarios for each year
        num_accumulation_snapshots = num_years + 1  # year 0 through retirement
        trajectory: list[YearSnapshot] = []
        for snap_idx, year_balances in enumerate(all_balances):
            age = persona.age + snap_idx
            pcts = np.percentile(year_balances, PERCENTILES)

            withdrawal_pv: PercentileValues | None = None
            if snap_idx >= num_accumulation_snapshots:
                dist_idx = snap_idx - num_accumulation_snapshots
                w_pcts = np.percentile(all_withdrawals[dist_idx], PERCENTILES)
                withdrawal_pv = PercentileValues(
                    p10=round(float(w_pcts[0]), 2),
                    p25=round(float(w_pcts[1]), 2),
                    p50=round(float(w_pcts[2]), 2),
                    p75=round(float(w_pcts[3]), 2),
                    p90=round(float(w_pcts[4]), 2),
                )

            trajectory.append(
                YearSnapshot(
                    age=age,
                    p10=round(float(pcts[0]), 2),
                    p25=round(float(pcts[1]), 2),
                    p50=round(float(pcts[2]), 2),
                    p75=round(float(pcts[3]), 2),
                    p90=round(float(pcts[4]), 2),
                    withdrawal=withdrawal_pv,
                )
            )

        retirement_snap = trajectory[num_accumulation_snapshots - 1]
        retirement_balance = PercentileValues(
            p10=retirement_snap.p10,
            p25=retirement_snap.p25,
            p50=retirement_snap.p50,
            p75=retirement_snap.p75,
            p90=retirement_snap.p90,
        )

        # --- Annuity-derived income (scenario-specific, varies by retirement balance) ---
        # annual_retirement_income = DC portfolio income at each percentile
        #   = retirement_balance_pXX / annuity_factor
        # total_retirement_income  = dc_income + ss_annual
        # income_replacement_ratio = total_income / projected_salary
        # This is independent of the expense-gap withdrawal, so it differs
        # across plan scenarios for the same persona.
        annual_retirement_income: PercentileValues | None = None
        total_retirement_income: PercentileValues | None = None

        # Contribution totals
        total_employee_contributions = float(np.median(cum_deferrals))
        total_employer_contributions = float(np.median(cum_match + cum_core))

        # Probability of success + shortfall age
        probability_of_success = 1.0
        shortfall_age_p10: int | None = None
        shortfall_age_p25: int | None = None
        shortfall_age_p50: int | None = None
        if distribution_years > 0:
            final_balances = all_balances[-1]
            probability_of_success = float(np.sum(final_balances > 0) / n)
            failed = shortfall_ages[~np.isnan(shortfall_ages)]
            if len(failed) > 0:
                shortfall_age_p10 = int(np.percentile(failed, 10))
                shortfall_age_p25 = int(np.percentile(failed, 25))
                shortfall_age_p50 = int(np.percentile(failed, 50))

        income_replacement_ratio: PercentileValues | None = None
        if distribution_years > 0:
            annuity_factor = (
                (1.0 - (1.0 + r_real_at_retirement) ** (-distribution_years))
                / r_real_at_retirement
                if r_real_at_retirement > 1e-6
                else float(distribution_years)
            )
            annual_retirement_income = PercentileValues(
                p10=round(retirement_balance.p10 / annuity_factor, 2),
                p25=round(retirement_balance.p25 / annuity_factor, 2),
                p50=round(retirement_balance.p50 / annuity_factor, 2),
                p75=round(retirement_balance.p75 / annuity_factor, 2),
                p90=round(retirement_balance.p90 / annuity_factor, 2),
            )
            total_retirement_income = PercentileValues(
                p10=round(annual_retirement_income.p10 + ss_annual, 2),
                p25=round(annual_retirement_income.p25 + ss_annual, 2),
                p50=round(annual_retirement_income.p50 + ss_annual, 2),
                p75=round(annual_retirement_income.p75 + ss_annual, 2),
                p90=round(annual_retirement_income.p90 + ss_annual, 2),
            )
            if projected_salary > 0:
                income_replacement_ratio = PercentileValues(
                    p10=round(total_retirement_income.p10 / projected_salary, 4),
                    p25=round(total_retirement_income.p25 / projected_salary, 4),
                    p50=round(total_retirement_income.p50 / projected_salary, 4),
                    p75=round(total_retirement_income.p75 / projected_salary, 4),
                    p90=round(total_retirement_income.p90 / projected_salary, 4),
                )

        return PersonaSimulationResult(
            persona_id=persona.id,
            persona_name=persona.name,
            retirement_balance=retirement_balance,
            annual_retirement_income=annual_retirement_income,
            ss_annual_benefit=ss_annual,
            total_retirement_income=total_retirement_income,
            trajectory=trajectory,
            total_employee_contributions=round(total_employee_contributions, 2),
            total_employer_contributions=round(total_employer_contributions, 2),
            probability_of_success=round(probability_of_success, 4),
            income_replacement_ratio=income_replacement_ratio,
            projected_salary_at_retirement=round(projected_salary, 2),
            shortfall_age_p10=shortfall_age_p10,
            shortfall_age_p25=shortfall_age_p25,
            shortfall_age_p50=shortfall_age_p50,
            pos_assessment=_pos_assessment(round(probability_of_success, 4)),
            target_replacement_ratio=round(target_ratio, 4),
        )

    # --- Helper: IRS deferral limit ---

    def _get_deferral_limit(self, age: int) -> float:
        """Return the applicable IRS deferral limit based on age."""
        a = self._assumptions
        if 60 <= age <= 63:
            return a.deferral_limit + a.super_catchup_limit
        if age >= 50:
            return a.deferral_limit + a.catchup_limit
        return a.deferral_limit

    # --- Helper: vesting percentage ---

    @staticmethod
    def _get_vesting_pct(vesting: VestingSchedule, tenure_years: int) -> float:
        """Return the vesting percentage for the given tenure."""
        match vesting.type:
            case "immediate":
                return 1.0
            case "cliff":
                return 1.0 if tenure_years >= vesting.years else 0.0
            case "graded":
                applicable = {
                    y: pct
                    for y, pct in vesting.schedule.items()
                    if y <= tenure_years
                }
                return max(applicable.values()) if applicable else 0.0
            case _:
                return 0.0

    # --- Helper: allocation weights ---

    @staticmethod
    def _get_allocation(
        persona: Persona, current_year: int
    ) -> tuple[float, float, float, float]:
        """Return (us_equity, intl_equity, bonds, short_term) for the persona's allocation."""
        alloc = persona.allocation
        if isinstance(alloc, CustomAllocation):
            return alloc.stock_pct, 0.0, alloc.bond_pct, alloc.cash_pct

        assert isinstance(alloc, TargetDateAllocation)
        ytt = alloc.target_date_vintage - current_year

        if ytt >= GLIDE_PATH[0][0]:
            return GLIDE_PATH[0][1], GLIDE_PATH[0][2], GLIDE_PATH[0][3], GLIDE_PATH[0][4]
        if ytt <= GLIDE_PATH[-1][0]:
            return GLIDE_PATH[-1][1], GLIDE_PATH[-1][2], GLIDE_PATH[-1][3], GLIDE_PATH[-1][4]

        for i in range(len(GLIDE_PATH) - 1):
            hi = GLIDE_PATH[i]
            lo = GLIDE_PATH[i + 1]
            if lo[0] <= ytt <= hi[0]:
                span = hi[0] - lo[0]
                w = (ytt - lo[0]) / span
                return (
                    hi[1] * w + lo[1] * (1 - w),
                    hi[2] * w + lo[2] * (1 - w),
                    hi[3] * w + lo[3] * (1 - w),
                    hi[4] * w + lo[4] * (1 - w),
                )

    # --- Helper: employer match ---

    def _calculate_match(
        self, deferrals: np.ndarray, capped_comp: np.ndarray
    ) -> np.ndarray:
        """Calculate employer match using tiered formula."""
        n = len(deferrals)
        total_match = np.zeros(n)
        remaining = deferrals.copy()

        for tier in self._plan.match_tiers:
            tier_threshold = tier.on_first_pct * capped_comp
            applicable = np.minimum(remaining, tier_threshold)
            total_match += tier.match_rate * applicable
            remaining -= applicable

        return total_match

    # --- Helper: employer core ---

    def _calculate_core(
        self, capped_comp: np.ndarray, age: int, tenure: int
    ) -> np.ndarray:
        """Calculate employer core contributions."""
        tiers = self._plan.core_age_service_tiers

        if tiers is None:
            return self._plan.core_contribution_pct * capped_comp

        for tier in tiers:
            age_ok = True
            service_ok = True

            if tier.min_age is not None and age < tier.min_age:
                age_ok = False
            if tier.max_age is not None and age >= tier.max_age:
                age_ok = False
            if tier.min_service is not None and tenure < tier.min_service:
                service_ok = False
            if tier.max_service is not None and tenure >= tier.max_service:
                service_ok = False

            if age_ok and service_ok:
                return tier.contribution_pct * capped_comp

        return np.zeros(len(capped_comp))
