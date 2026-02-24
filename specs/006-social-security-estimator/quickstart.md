# Quickstart: Social Security Benefit Estimator

**Feature**: 006-social-security-estimator
**Branch**: `006-social-security-estimator`

## Prerequisites

- Python 3.12+
- Existing dependencies installed (`pip install -r api/requirements.txt`)

## What's changing

This feature adds a **Social Security benefit estimator** that computes an estimated retired-worker benefit using the Fidelity GRP methodology. It runs as a deterministic calculation (no Monte Carlo) and integrates with the existing simulation engine as a purely additive supplement to plan withdrawals.

### Files to create

| File | Purpose |
|------|---------|
| `api/models/ss_estimator.py` | `SSBenefitEstimate` result model |
| `api/services/ss_estimator.py` | Core SS engine: AWI data, earnings reconstruction, AIME, PIA, claiming adjustment |
| `api/routers/ss_estimate.py` | Standalone SS estimate endpoint |
| `tests/models/test_ss_estimator.py` | Model validation tests |
| `tests/services/test_ss_estimator.py` | Core calculation unit tests |
| `tests/integration/test_ss_simulation.py` | Simulation integration tests |

### Files to modify

| File | Change |
|------|--------|
| `api/models/persona.py` | Add `ss_claiming_age: int` field (62-70, default 67) |
| `api/models/simulation_result.py` | Add `ss_annual_benefit` and `total_retirement_income` to `PersonaSimulationResult` |
| `api/models/defaults.py` | Add `ss_claiming_age=67` to default personas |
| `api/services/simulation_engine.py` | Call SS estimator per persona, populate new response fields |
| `api/main.py` | Register SS estimate router |

## Key implementation details

### SS calculation pipeline

```python
# 1. Reconstruct earnings history using AWI ratios
for year in range(birth_year + 22, current_year + 1):
    earnings[year] = min(salary * AWI[year] / AWI[current_year], taxable_max[year])

# 2. Project future earnings through age 60 or retirement
for year in range(current_year + 1, min(birth_year + 61, birth_year + retirement_age) + 1):
    proj_salary = salary * (1 + wage_growth) ** (year - current_year)
    earnings[year] = min(proj_salary, projected_taxable_max[year])

# 3. Index earnings to age-60 year
indexing_year = birth_year + 60
for year, amount in earnings.items():
    if year <= indexing_year:
        indexed[year] = amount * AWI[indexing_year] / AWI[year]
    else:
        indexed[year] = amount  # nominal

# 4. AIME: top 35 years / 420, truncated to whole dollar
aime = int(sum(sorted(indexed.values(), reverse=True)[:35]) / 420)

# 5. PIA: bend-point formula, truncated to nearest dime
bp1, bp2 = get_bend_points(birth_year + 62)
pia = 0.90 * min(aime, bp1) + 0.32 * max(0, min(aime, bp2) - bp1) + 0.15 * max(0, aime - bp2)
pia = int(pia * 10) / 10

# 6. Apply COLA from age 62 to claiming age, then claiming adjustment
# 7. Discount to today's dollars
```

### Claiming adjustment factor

```python
def claiming_factor(claiming_age: int, fra: int = 67) -> float:
    months_diff = (claiming_age - fra) * 12
    if months_diff < 0:  # early
        months_early = abs(months_diff)
        if months_early <= 36:
            return 1.0 - months_early * 5 / 9 / 100
        return 1.0 - (36 * 5 / 9 / 100 + (months_early - 36) * 5 / 12 / 100)
    elif months_diff > 0:  # delayed
        months_late = min(months_diff, 36)
        return 1.0 + months_late * 2 / 3 / 100
    return 1.0
```

### Simulation integration (pseudocode)

```python
# In SimulationEngine._simulate_persona(), after distribution phase:
if persona.include_social_security:
    ss_est = SocialSecurityEstimator(assumptions).estimate(
        persona, retirement_age, current_year
    )
    ss_annual = ss_est.annual_benefit_today
else:
    ss_annual = 0.0

# Build result with three fields:
PersonaSimulationResult(
    annual_withdrawal=withdrawal_percentiles,     # unchanged
    ss_annual_benefit=ss_annual,                   # deterministic scalar
    total_retirement_income=PercentileValues(       # withdrawal + SS at each percentile
        p25=withdrawal_percentiles.p25 + ss_annual,
        p50=withdrawal_percentiles.p50 + ss_annual,
        p75=withdrawal_percentiles.p75 + ss_annual,
        p90=withdrawal_percentiles.p90 + ss_annual,
    ),
    ...
)
```

## Running tests

```bash
cd /Users/nicholasamaral/Developer/tem-ir-model
python -m pytest tests/ -v
```

## Validation checklist

- [ ] AIME for a known persona matches hand-calculated reference
- [ ] PIA at FRA (claiming age 67) matches bend-point formula output
- [ ] Claiming at 62 produces ~30% reduction from PIA
- [ ] Claiming at 70 produces ~24% increase from PIA
- [ ] All 8 default personas produce non-zero estimates (ages 25-58, salaries $40K-$210K)
- [ ] Earnings capped at taxable maximum in every year
- [ ] Persona with < 35 working years: zero-padded years reduce AIME correctly
- [ ] Persona under 22: $0 AIME, $0 benefit
- [ ] `include_social_security=false`: `ss_annual_benefit=0.0`, `annual_withdrawal` unchanged
- [ ] `include_social_security=true`: `total_retirement_income` = `annual_withdrawal` + SS at each percentile
- [ ] Standalone endpoint returns same estimate as simulation integration
- [ ] Existing simulation tests still pass (no regression)
