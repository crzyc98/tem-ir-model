"""Social Security benefit estimator using Fidelity GRP / SSA methodology."""

from __future__ import annotations

import math

from api.models.assumptions import Assumptions
from api.models.persona import Persona
from api.models.ss_estimator import SSBenefitEstimate

# --- Named constants ---

FRA = 67
MIN_CLAIMING_AGE = 62
MAX_CLAIMING_AGE = 70
EMPLOYMENT_START_AGE = 22
INDEXING_AGE = 60
COMPUTATION_YEARS = 35
BP1_BASE = 180
BP2_BASE = 1085
AWI_1977 = 9779.44
PIA_RATE_1 = 0.90
PIA_RATE_2 = 0.32
PIA_RATE_3 = 0.15

# --- AWI series 1951-2023 (SSA published) ---

AWI: dict[int, float] = {
    1951: 2799.16, 1952: 2973.32, 1953: 3139.44, 1954: 3155.64, 1955: 3301.44,
    1956: 3532.36, 1957: 3641.72, 1958: 3673.80, 1959: 3855.80, 1960: 4007.12,
    1961: 4086.76, 1962: 4291.40, 1963: 4396.64, 1964: 4576.32, 1965: 4658.72,
    1966: 4938.36, 1967: 5213.44, 1968: 5571.76, 1969: 5893.76, 1970: 6186.24,
    1971: 6497.08, 1972: 7133.80, 1973: 7580.16, 1974: 8030.76, 1975: 8630.92,
    1976: 9226.48, 1977: 9779.44, 1978: 10556.03, 1979: 11479.46, 1980: 12513.46,
    1981: 13773.10, 1982: 14531.34, 1983: 15239.24, 1984: 16135.07, 1985: 16822.51,
    1986: 17321.82, 1987: 18426.51, 1988: 19334.04, 1989: 20099.55, 1990: 21027.98,
    1991: 21811.60, 1992: 22935.42, 1993: 23132.67, 1994: 23753.53, 1995: 24705.66,
    1996: 25913.90, 1997: 27426.00, 1998: 28861.44, 1999: 30469.84, 2000: 32154.82,
    2001: 32921.92, 2002: 33252.09, 2003: 34064.95, 2004: 35648.55, 2005: 36952.94,
    2006: 38651.41, 2007: 40405.48, 2008: 41334.97, 2009: 40711.61, 2010: 41673.83,
    2011: 42979.61, 2012: 44321.67, 2013: 44888.16, 2014: 46481.52, 2015: 48098.63,
    2016: 48642.15, 2017: 50321.89, 2018: 52145.80, 2019: 54099.99, 2020: 55628.60,
    2021: 60575.07, 2022: 63795.13, 2023: 66621.80,
}

# --- Taxable maximum series 1951-2026 (SSA published) ---

TAXABLE_MAX: dict[int, float] = {
    1951: 3600, 1952: 3600, 1953: 3600, 1954: 3600,
    1955: 4200, 1956: 4200, 1957: 4200, 1958: 4200,
    1959: 4800, 1960: 4800, 1961: 4800, 1962: 4800, 1963: 4800, 1964: 4800, 1965: 4800,
    1966: 6600, 1967: 6600,
    1968: 7800, 1969: 7800, 1970: 7800, 1971: 7800,
    1972: 9000, 1973: 10800, 1974: 13200, 1975: 14100,
    1976: 15300, 1977: 16500, 1978: 17700, 1979: 22900,
    1980: 25900, 1981: 29700, 1982: 32400, 1983: 35700,
    1984: 37800, 1985: 39600, 1986: 42000, 1987: 43800,
    1988: 45000, 1989: 48000, 1990: 51300, 1991: 53400,
    1992: 55500, 1993: 57600, 1994: 60600, 1995: 61200,
    1996: 62700, 1997: 65400, 1998: 68400, 1999: 72600,
    2000: 76200, 2001: 80400, 2002: 84900, 2003: 87000,
    2004: 87900, 2005: 90000, 2006: 94200, 2007: 97500,
    2008: 102000, 2009: 106800, 2010: 106800, 2011: 106800,
    2012: 110100, 2013: 113700, 2014: 117000, 2015: 118500,
    2016: 118500, 2017: 127200, 2018: 128400, 2019: 132900,
    2020: 137700, 2021: 142800, 2022: 147000, 2023: 160200,
    2024: 168600, 2025: 176100, 2026: 184500,
}

_LATEST_AWI_YEAR = 2023
_LATEST_TAXABLE_MAX_YEAR = 2026


class SocialSecurityEstimator:
    """Computes estimated SS retired-worker benefit using the Fidelity GRP methodology."""

    def __init__(self, assumptions: Assumptions) -> None:
        self._inflation_rate = assumptions.inflation_rate
        self._wage_growth_rate = assumptions.wage_growth_rate

    # --- Public API ---

    def estimate(
        self, persona: Persona, retirement_age: int, current_year: int
    ) -> SSBenefitEstimate:
        """Compute estimated SS benefit for a persona.

        Raises ValueError if claiming_age < current age.
        """
        claiming_age = persona.ss_claiming_age
        if claiming_age < persona.age:
            raise ValueError(
                f"claiming_age ({claiming_age}) must be >= current age ({persona.age})"
            )

        birth_year = current_year - persona.age

        # Pipeline
        earnings = self._reconstruct_earnings(
            birth_year, persona.age, persona.salary, retirement_age, current_year
        )
        indexed = self._index_earnings(earnings, birth_year)
        aime = self._compute_aime(indexed)
        year_turning_62 = birth_year + 62
        bp1, bp2 = self._get_bend_points(year_turning_62)
        pia = self._compute_pia(aime, bp1, bp2)
        factor = self._claiming_adjustment_factor(claiming_age)
        monthly_today, annual_today = self._apply_cola_and_discount(
            pia, persona.age, claiming_age
        )

        return SSBenefitEstimate(
            persona_id=persona.id,
            persona_name=persona.name,
            claiming_age=claiming_age,
            monthly_benefit_today=round(monthly_today, 2),
            annual_benefit_today=round(annual_today, 2),
            pia_monthly=pia,
            claiming_adjustment_factor=round(factor, 4),
            aime=aime,
        )

    # --- Private helpers ---

    def _get_awi(self, year: int) -> float:
        """Return published AWI or project from 2023."""
        if year in AWI:
            return AWI[year]
        return AWI[_LATEST_AWI_YEAR] * (1 + self._wage_growth_rate) ** (year - _LATEST_AWI_YEAR)

    def _get_taxable_max(self, year: int) -> float:
        """Return published taxable max or project from 2026."""
        if year in TAXABLE_MAX:
            return TAXABLE_MAX[year]
        return TAXABLE_MAX[_LATEST_TAXABLE_MAX_YEAR] * (1 + self._wage_growth_rate) ** (year - _LATEST_TAXABLE_MAX_YEAR)

    def _reconstruct_earnings(
        self,
        birth_year: int,
        current_age: int,
        salary: float,
        retirement_age: int,
        current_year: int,
    ) -> dict[int, float]:
        """Reconstruct past and project future earnings per R1."""
        start_year = birth_year + EMPLOYMENT_START_AGE
        # Work years: from age 22 until min(retirement_age-1, 70) inclusive
        end_year = birth_year + min(retirement_age, MAX_CLAIMING_AGE)
        earnings: dict[int, float] = {}

        awi_current = self._get_awi(current_year)

        for year in range(start_year, end_year + 1):
            if year <= current_year:
                # Past/current: scale by AWI ratio
                awi_year = self._get_awi(year)
                estimated_salary = salary * awi_year / awi_current
            else:
                # Future: project with wage growth
                estimated_salary = salary * (1 + self._wage_growth_rate) ** (year - current_year)

            tax_max = self._get_taxable_max(year)
            earnings[year] = min(estimated_salary, tax_max)

        return earnings

    def _index_earnings(
        self, earnings: dict[int, float], birth_year: int
    ) -> dict[int, float]:
        """Index all earnings to the age-60 year per R4."""
        indexing_year = birth_year + INDEXING_AGE
        awi_indexing = self._get_awi(indexing_year)

        indexed: dict[int, float] = {}
        for year, amount in earnings.items():
            if year <= indexing_year:
                awi_year = self._get_awi(year)
                indexed[year] = amount * awi_indexing / awi_year
            else:
                indexed[year] = amount  # nominal, no indexing

        return indexed

    def _compute_aime(self, indexed_earnings: dict[int, float]) -> int:
        """Select top 35 years, compute AIME, truncate to whole dollar per R5."""
        values = sorted(indexed_earnings.values(), reverse=True)
        # Pad with zeros if fewer than 35 years
        top_35 = values[:COMPUTATION_YEARS]
        while len(top_35) < COMPUTATION_YEARS:
            top_35.append(0.0)
        return math.floor(sum(top_35) / 420)

    def _get_bend_points(self, year_turning_62: int) -> tuple[int, int]:
        """Compute bend points for the year the worker turns 62 per R6."""
        # Bend points use AWI from two years before the eligibility year
        awi_ref = self._get_awi(year_turning_62 - 2)
        bp1 = round(BP1_BASE * awi_ref / AWI_1977)
        bp2 = round(BP2_BASE * awi_ref / AWI_1977)
        return bp1, bp2

    def _compute_pia(self, aime: int, bp1: int, bp2: int) -> float:
        """Three-tier PIA formula, truncated to nearest dime per R6."""
        pia = (
            PIA_RATE_1 * min(aime, bp1)
            + PIA_RATE_2 * max(0, min(aime, bp2) - bp1)
            + PIA_RATE_3 * max(0, aime - bp2)
        )
        return math.floor(pia * 10) / 10

    def _claiming_adjustment_factor(self, claiming_age: int) -> float:
        """Compute early reduction or delayed credit factor per R7/R8."""
        months_diff = (claiming_age - FRA) * 12

        if months_diff < 0:
            # Early claiming
            months_early = abs(months_diff)
            if months_early <= 36:
                reduction = months_early * (5 / 9) / 100
            else:
                reduction = 36 * (5 / 9) / 100 + (months_early - 36) * (5 / 12) / 100
            return 1.0 - reduction
        elif months_diff > 0:
            # Delayed claiming
            months_late = min(months_diff, 36)
            credit = months_late * (2 / 3) / 100
            return 1.0 + credit
        return 1.0

    def _apply_cola_and_discount(
        self, pia: float, current_age: int, claiming_age: int
    ) -> tuple[float, float]:
        """Apply COLA from age 62 to claiming, apply claiming factor, discount to today per R9."""
        factor = self._claiming_adjustment_factor(claiming_age)
        inflation = self._inflation_rate

        # Apply COLA from age 62 to claiming age (truncate to nearest dime each year)
        pia_adjusted = pia
        cola_years = claiming_age - 62
        for _ in range(cola_years):
            pia_adjusted = math.floor(pia_adjusted * (1 + inflation) * 10) / 10

        # Apply claiming adjustment factor
        monthly_at_claiming = math.floor(pia_adjusted * factor * 100) / 100

        # Discount to today's dollars
        years_to_claiming = claiming_age - current_age
        if years_to_claiming > 0:
            monthly_today = monthly_at_claiming / (1 + inflation) ** years_to_claiming
        else:
            monthly_today = monthly_at_claiming

        # Annual = floor(monthly) * 12 per R12
        annual_today = math.floor(monthly_today) * 12

        return monthly_today, annual_today
