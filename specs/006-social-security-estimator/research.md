# Research: Social Security Benefit Estimator

**Feature**: 006-social-security-estimator
**Date**: 2026-02-24

## R1: Earnings History Reconstruction via AWI Ratios

**Decision**: Reconstruct past earnings using the Fidelity GRP methodology — scale current salary backward using AWI ratios. For each prior year Y: `estimated_salary[Y] = current_salary * AWI[Y] / AWI[current_year]`. Cap at that year's taxable maximum before indexing.

**Formula**:
```
Past years (start_year through current_year):
    estimated_salary[Y] = current_salary * AWI[Y] / AWI[current_year]
    earnings[Y] = min(estimated_salary[Y], taxable_max[Y])

Future years (current_year+1 through min(birth_year+70, birth_year+retirement_age)):
    projected_salary[Y] = current_salary * (1 + wage_growth_rate)^(Y - current_year)
    projected_tax_max[Y] = taxable_max[latest_known] * (1 + wage_growth_rate)^(Y - latest_known)
    earnings[Y] = min(projected_salary[Y], projected_tax_max[Y])
```

**Rationale**: The AWI-ratio method is the industry-standard approach used by Fidelity GRP, Aon, and other institutional retirement plan providers when actual earnings records are unavailable. It assumes the worker's career earnings tracked the national average wage trajectory, scaled proportionally to their current compensation level.

**Alternatives considered**:
- **Flat salary in today's dollars**: Massively overstates early-career earnings relative to the wage base. Rejected.
- **Custom age-earnings curve**: More realistic but requires additional assumptions about career shape. The AWI-ratio method is the accepted simplification.
- **Requiring actual SSA earnings records**: Out of scope — the spec calls for estimation from current compensation only.

**Source**: Fidelity GRP Social Security Methodology (fidelity.com)

## R2: AWI Reference Data

**Decision**: Embed the complete SSA-published AWI series from 1951 through 2023 (latest published) as a Python dictionary. For years beyond 2023, project using the workspace's `wage_growth_rate` assumption (default 3%).

**Key values**:
```python
AWI = {
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
```

**Rationale**: AWI changes once per year (published in October). Embedding as constants avoids external dependencies and is trivially updateable. The complete series is needed because the oldest default persona (age 58) has earnings going back to 1990 (age 22), and projected personas could need earlier values.

**Source**: SSA National Average Wage Index (ssa.gov/oact/cola/AWI.html)

## R3: Social Security Taxable Maximum Data

**Decision**: Embed the complete taxable maximum series from 1951 through 2026 as a Python dictionary. For years beyond 2026, project using wage growth rate (consistent with how SSA sets future maximums via AWI growth).

**Key values**:
```python
TAXABLE_MAX = {
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
```

**Source**: SSA Contribution and Benefit Base (ssa.gov/oact/cola/cbb.html)

## R4: Earnings Indexing Methodology

**Decision**: Implement exact SSA indexing per 20 CFR 404.211. Index all earnings to the year the worker turns 60. Earnings after age 60 used at nominal value.

**Formula**:
```
indexing_year = birth_year + 60

For earnings_year <= indexing_year:
    factor = AWI[indexing_year] / AWI[earnings_year]
    indexed[year] = earnings[year] * factor

For earnings_year > indexing_year:
    indexed[year] = earnings[year]  # nominal, no indexing
```

When `indexing_year` is in the future, project `AWI[indexing_year]` using wage growth rate.

**Rationale**: Exact SSA methodology. The indexing year (age 60) is two years before first eligibility (age 62).

## R5: AIME Computation

**Decision**: Select highest 35 years of indexed earnings, sum, divide by 420 (35 × 12), truncate to whole dollar.

```
top_35 = sorted(all_indexed_earnings, reverse=True)[:35]
# Pad with zeros if fewer than 35 years
AIME = floor(sum(top_35) / 420)
```

**Rationale**: Standard SSA computation. Truncation (not rounding) per SSA rules.

## R6: PIA Bend-Point Formula

**Decision**: Apply three-tier PIA formula using bend points for the year the worker turns 62.

**PIA formula**:
```
PIA = 0.90 * min(AIME, BP1)
    + 0.32 * max(0, min(AIME, BP2) - BP1)
    + 0.15 * max(0, AIME - BP2)

Truncate to nearest dime: PIA = floor(PIA * 10) / 10
```

**Bend point projection** (from 1979 base values):
```
BP1(year) = round(180 * AWI[year - 2] / 9779.44)
BP2(year) = round(1085 * AWI[year - 2] / 9779.44)
```

**Published bend points**: 2024: ($1,174, $7,078). 2025: ($1,226, $7,391).

**Rationale**: Codified in 1977 Amendments. Bend points scale with AWI, ensuring the formula maintains its progressivity across cohorts.

**Source**: SSA Benefit Formula Bend Points (ssa.gov/oact/cola/bendpoints.html)

## R7: Early Claiming Reduction

**Decision**: Two-tier monthly reduction for claiming before FRA (67).

```
months_early = (67 - claiming_age) * 12

if months_early <= 36:
    reduction = months_early * (5/9) / 100
else:
    reduction = 36 * (5/9) / 100 + (months_early - 36) * (5/12) / 100

factor = 1.0 - reduction
```

| Claiming Age | Months Early | Reduction | % of PIA |
|---|---|---|---|
| 62 | 60 | 30.00% | 70.00% |
| 63 | 48 | 25.00% | 75.00% |
| 64 | 36 | 20.00% | 80.00% |
| 65 | 24 | 13.33% | 86.67% |
| 66 | 12 | 6.67% | 93.33% |

**Rationale**: Exact SSA formula per 20 CFR 404.410. Two-tier structure is law.

## R8: Delayed Retirement Credits

**Decision**: 2/3 of 1% per month (8% per year) credit for claiming after FRA, capped at age 70.

```
months_late = min((claiming_age - 67) * 12, 36)
credit = months_late * (2/3) / 100
factor = 1.0 + credit
```

| Claiming Age | Months Late | Credit | % of PIA |
|---|---|---|---|
| 68 | 12 | 8.00% | 108.00% |
| 69 | 24 | 16.00% | 116.00% |
| 70 | 36 | 24.00% | 124.00% |

**Rationale**: Fixed at 8%/year for born-1943+. FRA=67 implies born-1960+, so single rate applies.

## R9: Today's-Dollar Expression

**Decision**: Compute the benefit at claiming age (PIA × COLA adjustments × claiming factor), then discount to today's dollars using the inflation rate.

**Formula**:
```
# Apply COLA from age 62 to claiming age
pia_adjusted = PIA
for each year from 62 to claiming_age:
    pia_adjusted = floor(pia_adjusted * (1 + inflation_rate) * 10) / 10

# Apply claiming adjustment
monthly_at_claiming = floor(pia_adjusted * claiming_factor * 100) / 100

# Discount to today's dollars
years_to_claiming = claiming_age - current_age
monthly_today = monthly_at_claiming / (1 + inflation_rate) ** years_to_claiming
annual_today = floor(monthly_today) * 12
```

**Rationale**: SSA applies COLA annually starting from age 62, truncated to the nearest dime. Discounting to present value makes the benefit comparable to the simulation's real-dollar outputs. For personas already past 62, fewer (or zero) COLA years are applied.

**Alternative considered**: Skip COLA and use raw PIA directly. Simpler, but less faithful to the methodology. The COLA and discounting roughly cancel for moderate inflation, but the full methodology handles edge cases better (e.g., very young personas with many COLA years).

## R10: Simulation Integration Design

**Decision**: SS estimator is a pure-function service invoked once per persona. The result is a deterministic scalar. The simulation engine adds it as a constant alongside the stochastic plan withdrawal.

**Integration flow**:
```
SimulationEngine.run(personas):
    for each persona:
        1. Run accumulation + distribution phases (existing, unchanged)
        2. if persona.include_social_security:
              ss = SocialSecurityEstimator.estimate(persona, assumptions, retirement_age)
              ss_annual = ss.annual_benefit_today
           else:
              ss_annual = 0.0
        3. PersonaSimulationResult:
              annual_withdrawal: PercentileValues  (unchanged — plan only)
              ss_annual_benefit: float             (deterministic constant)
              total_retirement_income: PercentileValues  (each percentile + ss_annual)
```

**Key design decisions**:
- SS benefit is **deterministic** — same across all Monte Carlo trials. Expressed as a scalar `float`, not `PercentileValues`.
- SS benefit is **purely additive** — `annual_withdrawal` unchanged. Toggle only affects `ss_annual_benefit` and `total_retirement_income`.
- `total_retirement_income` at each percentile = `annual_withdrawal` at that percentile + `ss_annual_benefit`.

**Rationale**: Minimal-impact integration. No changes to Monte Carlo loop, withdrawal strategy, or stochastic return sampling. Confirmed during clarification: SS is additive, plan withdrawal is independent.

**Alternative considered**: Making SS stochastic (varying COLA per trial). Rejected — SS benefits are government-guaranteed, not market-dependent.

## R11: Standalone Endpoint Design

**Decision**: `POST /api/v1/workspaces/{workspace_id}/ss-estimate` — accepts optional `persona_ids` filter, returns SS estimates for each persona.

**Why scoped to workspace**: Needs workspace assumptions (inflation_rate, wage_growth_rate) and persona data. Workspace provides both.

**Rationale**: Follows existing endpoint patterns (workspace-scoped, uses workspace service for loading). Optional filter lets analysts estimate for specific personas.

## R12: Truncation Rules

**Decision**: Follow SSA truncation conventions:

| Value | Rule |
|---|---|
| AIME | Floor to whole dollar |
| PIA | Floor to nearest dime |
| COLA-adjusted PIA | Floor to nearest dime (each year) |
| Final monthly benefit | Floor to whole dollar |

**Rationale**: SSA uses truncation (not rounding). Following these ensures estimates match SSA quick calculator results.
