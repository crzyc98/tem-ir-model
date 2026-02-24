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
from api.models.withdrawal_strategy import SystematicWithdrawal, WithdrawalStrategy
from api.services.ss_estimator import SocialSecurityEstimator

# --- Glide path constants (research.md R2) ---

GLIDE_EQUITY_START = 0.90
GLIDE_EQUITY_END = 0.30
GLIDE_BOND_START = 0.08
GLIDE_BOND_END = 0.50
GLIDE_CASH_START = 0.02
GLIDE_CASH_END = 0.20
GLIDE_YEARS = 40

PERCENTILES = (25, 50, 75, 90)


class SimulationEngine:
    """NumPy-vectorized Monte Carlo engine for retirement projections."""

    def __init__(
        self,
        assumptions: Assumptions,
        plan_design: PlanDesign,
        config: MonteCarloConfig,
        withdrawal_strategy: WithdrawalStrategy | None = None,
    ) -> None:
        self._assumptions = assumptions
        self._plan = plan_design
        self._config = config
        self._strategy: WithdrawalStrategy = withdrawal_strategy or SystematicWithdrawal()

    # --- Public API (T012) ---

    def run(self, personas: list[Persona]) -> list[PersonaSimulationResult]:
        """Run simulation for all personas.

        Derives per-persona seeds from the master seed (research.md R7)
        so each persona's result is deterministic and order-independent.
        """
        seed = self._config.seed
        master_rng = np.random.default_rng(seed)
        persona_seeds = master_rng.integers(0, 2**63, size=len(personas))

        results: list[PersonaSimulationResult] = []
        for i, persona in enumerate(personas):
            rng = np.random.default_rng(int(persona_seeds[i]))
            result = self._simulate_persona(persona, rng)
            results.append(result)
        return results

    # --- Core simulation loop (T011) ---

    def _simulate_persona(
        self, persona: Persona, rng: np.random.Generator
    ) -> PersonaSimulationResult:
        """Simulate accumulation phase for a single persona across all trials."""
        retirement_age = self._config.retirement_age
        n = self._config.num_simulations
        a = self._assumptions

        calendar_year = datetime.now(UTC).year

        # Edge case: persona already at or past retirement
        if persona.age >= retirement_age:
            pv = PercentileValues(
                p25=persona.current_balance,
                p50=persona.current_balance,
                p75=persona.current_balance,
                p90=persona.current_balance,
            )
            snap = YearSnapshot(
                age=persona.age,
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
            )

        num_years = retirement_age - persona.age  # years to simulate

        # Initialise arrays (vectorised across trials)
        balances = np.full(n, persona.current_balance, dtype=np.float64)
        salaries = np.full(n, persona.salary, dtype=np.float64)

        # Auto-enrollment (research.md R8)
        initial_rate = persona.deferral_rate
        if initial_rate == 0.0 and self._plan.auto_enroll_enabled:
            initial_rate = self._plan.auto_enroll_rate
        deferral_rates = np.full(n, initial_rate, dtype=np.float64)

        # Year 0: record starting balance
        all_balances: list[np.ndarray] = [balances.copy()]
        base_year = calendar_year

        for year_idx in range(1, num_years + 1):
            age = persona.age + year_idx
            tenure = persona.tenure_years + year_idx

            # 1. Wage growth with noise
            growth = rng.normal(a.wage_growth_rate, a.wage_growth_std, n)
            salaries = salaries * (1.0 + growth)

            # 2. Cap compensation
            capped_comp = np.minimum(salaries, a.comp_limit)

            # 3. Auto-escalation (research.md R8 — from year 1 onwards)
            if self._plan.auto_escalation_enabled:
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

            # 7. Eligibility check (FR-017)
            tenure_months = tenure * 12
            if tenure_months < self._plan.match_eligibility_months:
                match = np.zeros(n)
            if tenure_months < self._plan.core_eligibility_months:
                core = np.zeros(n)

            # 8. Section 415 limit (research.md R6)
            total_additions = deferrals + match + core
            excess = np.maximum(total_additions - a.additions_limit, 0.0)
            # Reduce core first
            core_reduction = np.minimum(excess, core)
            core = core - core_reduction
            excess = excess - core_reduction
            # Then reduce match
            match_reduction = np.minimum(excess, match)
            match = match - match_reduction

            # 9. Vesting
            match_vested_pct = self._get_vesting_pct(
                self._plan.match_vesting, tenure
            )
            core_vested_pct = self._get_vesting_pct(
                self._plan.core_vesting, tenure
            )
            vested_match = match * match_vested_pct
            vested_core = core * core_vested_pct

            # 10. Investment returns
            current_year = base_year + year_idx
            stock_pct, bond_pct, cash_pct = self._get_allocation(
                persona, current_year
            )

            eq_ret = rng.normal(a.equity.expected_return, a.equity.standard_deviation, n)
            fi_ret = rng.normal(
                a.fixed_income.expected_return, a.fixed_income.standard_deviation, n
            )
            ca_ret = rng.normal(a.cash.expected_return, a.cash.standard_deviation, n)
            blended_return = stock_pct * eq_ret + bond_pct * fi_ret + cash_pct * ca_ret

            # 12. Balance update (beginning-of-year contribution assumption)
            contributions = deferrals + vested_match + vested_core
            balances = (balances + contributions) * (1.0 + blended_return)

            all_balances.append(balances.copy())

        # --- Distribution phase (retirement_age+1 → planning_age) ---
        planning_age = self._config.planning_age
        distribution_years = planning_age - retirement_age
        all_withdrawals: list[np.ndarray] = []
        annual_withdrawal: PercentileValues | None = None

        if distribution_years > 0:
            retirement_balances = balances.copy()

            # Compute blended expected nominal return at retirement allocation
            current_year_at_retirement = base_year + num_years
            stock_pct, bond_pct, cash_pct = self._get_allocation(
                persona, current_year_at_retirement
            )
            r_nominal = (
                stock_pct * a.equity.expected_return
                + bond_pct * a.fixed_income.expected_return
                + cash_pct * a.cash.expected_return
            )
            # Fisher formula for real return
            r_real = (1.0 + r_nominal) / (1.0 + a.inflation_rate) - 1.0

            dist_params = {
                "total_years": distribution_years,
                "real_return_rate": r_real,
                "inflation_rate": a.inflation_rate,
            }

            for year_idx in range(1, distribution_years + 1):
                year_in_retirement = year_idx

                # Withdraw
                w_nominal = self._strategy.calculate_withdrawal(
                    balances, year_in_retirement, retirement_balances, dist_params
                )
                w_nominal = np.minimum(w_nominal, np.maximum(balances, 0.0))
                balances = balances - w_nominal
                balances = np.maximum(balances, 0.0)

                # Investment returns (reuse existing pattern)
                current_year = base_year + num_years + year_idx
                stock_pct, bond_pct, cash_pct = self._get_allocation(
                    persona, current_year
                )
                eq_ret = rng.normal(
                    a.equity.expected_return, a.equity.standard_deviation, n
                )
                fi_ret = rng.normal(
                    a.fixed_income.expected_return,
                    a.fixed_income.standard_deviation,
                    n,
                )
                ca_ret = rng.normal(
                    a.cash.expected_return, a.cash.standard_deviation, n
                )
                blended_return = (
                    stock_pct * eq_ret + bond_pct * fi_ret + cash_pct * ca_ret
                )
                balances = balances * (1.0 + blended_return)
                balances = np.maximum(balances, 0.0)

                all_balances.append(balances.copy())
                # Real withdrawal = nominal / (1 + inflation)^year_in_retirement
                w_real = w_nominal / ((1.0 + a.inflation_rate) ** year_in_retirement)
                all_withdrawals.append(w_real.copy())

        # Compute percentiles across trials for each year
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
                    p25=round(float(w_pcts[0]), 2),
                    p50=round(float(w_pcts[1]), 2),
                    p75=round(float(w_pcts[2]), 2),
                    p90=round(float(w_pcts[3]), 2),
                )

            trajectory.append(
                YearSnapshot(
                    age=age,
                    p25=round(float(pcts[0]), 2),
                    p50=round(float(pcts[1]), 2),
                    p75=round(float(pcts[2]), 2),
                    p90=round(float(pcts[3]), 2),
                    withdrawal=withdrawal_pv,
                )
            )

        retirement_snap = trajectory[num_accumulation_snapshots - 1]
        retirement_balance = PercentileValues(
            p25=retirement_snap.p25,
            p50=retirement_snap.p50,
            p75=retirement_snap.p75,
            p90=retirement_snap.p90,
        )

        # Headline annual withdrawal: percentiles of real withdrawal from year 1
        if all_withdrawals:
            aw_pcts = np.percentile(all_withdrawals[0], PERCENTILES)
            annual_withdrawal = PercentileValues(
                p25=round(float(aw_pcts[0]), 2),
                p50=round(float(aw_pcts[1]), 2),
                p75=round(float(aw_pcts[2]), 2),
                p90=round(float(aw_pcts[3]), 2),
            )

        # --- Social Security benefit (deterministic, computed once) ---
        ss_annual: float = 0.0
        if persona.include_social_security:
            ss_estimator = SocialSecurityEstimator(self._assumptions)
            try:
                ss_result = ss_estimator.estimate(
                    persona, self._config.retirement_age, calendar_year
                )
                ss_annual = ss_result.annual_benefit_today
            except ValueError:
                ss_annual = 0.0

        total_retirement_income: PercentileValues | None = None
        if annual_withdrawal is not None:
            total_retirement_income = PercentileValues(
                p25=round(annual_withdrawal.p25 + ss_annual, 2),
                p50=round(annual_withdrawal.p50 + ss_annual, 2),
                p75=round(annual_withdrawal.p75 + ss_annual, 2),
                p90=round(annual_withdrawal.p90 + ss_annual, 2),
            )

        return PersonaSimulationResult(
            persona_id=persona.id,
            persona_name=persona.name,
            retirement_balance=retirement_balance,
            annual_withdrawal=annual_withdrawal,
            ss_annual_benefit=ss_annual,
            total_retirement_income=total_retirement_income,
            trajectory=trajectory,
        )

    # --- Helper: IRS deferral limit (T006, FR-005) ---

    def _get_deferral_limit(self, age: int) -> float:
        """Return the applicable IRS deferral limit based on age."""
        a = self._assumptions
        if 60 <= age <= 63:
            return a.deferral_limit + a.super_catchup_limit
        if age >= 50:
            return a.deferral_limit + a.catchup_limit
        return a.deferral_limit

    # --- Helper: vesting percentage (T007) ---

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

    # --- Helper: allocation weights (T008, FR-011) ---

    @staticmethod
    def _get_allocation(
        persona: Persona, current_year: int
    ) -> tuple[float, float, float]:
        """Return (stock_pct, bond_pct, cash_pct) for the persona's allocation."""
        alloc = persona.allocation
        if isinstance(alloc, CustomAllocation):
            return alloc.stock_pct, alloc.bond_pct, alloc.cash_pct

        # TargetDateAllocation — apply glide path
        assert isinstance(alloc, TargetDateAllocation)
        years_to_target = alloc.target_date_vintage - current_year
        t = max(0.0, min(1.0, (GLIDE_YEARS - years_to_target) / GLIDE_YEARS))
        equity = GLIDE_EQUITY_START - t * (GLIDE_EQUITY_START - GLIDE_EQUITY_END)
        bonds = GLIDE_BOND_START + t * (GLIDE_BOND_END - GLIDE_BOND_START)
        cash = GLIDE_CASH_START + t * (GLIDE_CASH_END - GLIDE_CASH_START)
        return equity, bonds, cash

    # --- Helper: employer match (T009, FR-006) ---

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

    # --- Helper: employer core (T010, FR-007) ---

    def _calculate_core(
        self, capped_comp: np.ndarray, age: int, tenure: int
    ) -> np.ndarray:
        """Calculate employer core contributions."""
        tiers = self._plan.core_age_service_tiers

        if tiers is None:
            return self._plan.core_contribution_pct * capped_comp

        # Find matching tier for this age/tenure
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

        # No matching tier — no core contribution
        return np.zeros(len(capped_comp))
