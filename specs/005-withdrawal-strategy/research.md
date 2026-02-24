# Research: Withdrawal Strategy Interface

**Feature**: 005-withdrawal-strategy
**Date**: 2026-02-24

## R1: PMT Formula for Systematic Withdrawal

**Decision**: Use the standard annuity-depletion (PMT) formula to compute the level real annual withdrawal.

**Formula**:
```
W = PV × r / (1 − (1 + r)^(−N))
```
Where:
- `W` = level real annual withdrawal amount
- `PV` = portfolio value at retirement (per trial)
- `r` = expected real return rate (blended nominal return − inflation)
- `N` = years in retirement (planning_age − retirement_age)

**Edge case**: If `r ≈ 0` (within ±0.0001), use `W = PV / N` to avoid division by zero.

**Rationale**: This is the standard financial formula for computing a level payment that depletes an annuity to zero over a fixed period at a constant rate. It's widely used in retirement income planning and maps directly to the spec requirement of "depleting the portfolio to $0 at the planning age."

**Alternatives considered**:
- **Percentage-of-balance** (e.g., 4% rule): Variable annual income, doesn't guarantee depletion. Rejected because the spec requires depletion to $0.
- **RMD-based**: Required Minimum Distribution tables divide balance by remaining life expectancy. More conservative, doesn't target $0. Out of scope per spec.
- **Dynamic recalculation**: Recalculate W each year based on remaining balance and years. Smoother outcomes but violates "level real" requirement in the spec.

## R2: Real Return Rate Derivation

**Decision**: Compute the real return rate from the blended expected nominal return at the retirement-age allocation, minus inflation, using the exact Fisher formula.

**Formula**:
```
r_real = (1 + r_nominal) / (1 + inflation) − 1
```
Where:
- `r_nominal = stock_pct × equity.expected_return + bond_pct × fixed_income.expected_return + cash_pct × cash.expected_return`
- Allocation weights (`stock_pct`, `bond_pct`, `cash_pct`) are evaluated at the retirement year using the existing `_get_allocation()` method
- `inflation` = `assumptions.inflation_rate` (default 2.5%)

**Default calculation** (target-date fund at age 67, vintage 2060, current year ~2026 → ~34 years to target):
```
t = (40 − 34) / 40 = 0.15
equity = 0.90 − 0.15 × 0.60 = 0.81
bonds = 0.08 + 0.15 × 0.42 = 0.143
cash = 0.02 + 0.15 × 0.18 = 0.047

r_nominal = 0.81 × 0.075 + 0.143 × 0.04 + 0.047 × 0.03 = 0.0682
r_real = (1.0682) / (1.025) − 1 = 0.0421 (4.21%)
```

**Rationale**: The Fisher formula is the exact relationship between real and nominal rates. Using expected returns (not realized stochastic returns) for the PMT calculation ensures the withdrawal amount is computed once deterministically per trial, while stochastic returns during retirement create the variance captured by percentile reporting.

**Alternatives considered**:
- **Approximate formula** (`r_real ≈ r_nominal − inflation`): Close for small rates but introduces compounding error over 26 years. Rejected for precision.
- **Average allocation over retirement**: Could use the average of retirement-start and retirement-end allocations. Rejected because the spec explicitly says "using the allocation at retirement age."
- **Risk-free rate**: Too conservative; would produce unnecessarily low withdrawals. Rejected.

## R3: Distribution Phase Integration with Existing Engine

**Decision**: Extend `SimulationEngine._simulate_persona()` with a second loop from `retirement_age + 1` to `planning_age`, reusing the existing investment return sampling and allocation logic.

**Year-by-year distribution phase operations**:
```
for each year from retirement_age+1 to planning_age:
    1. Compute nominal withdrawal: W_nominal = W_real × (1 + inflation)^year_in_retirement
    2. Subtract withdrawal: balances = balances − W_nominal
    3. Floor at zero: balances = max(balances, 0)
    4. Zero out withdrawals for depleted trials: W_effective = where(pre_withdrawal_balance > 0, W_nominal, 0)
    5. Get allocation for current calendar year (glide path continues)
    6. Sample asset class returns (same RNG, same distribution as accumulation)
    7. Compute blended return
    8. Apply returns: balances = balances × (1 + blended_return)
    9. Floor at zero again (in case returns push negative)
    10. Store balances and real withdrawal amounts for percentile computation
```

**Rationale**: Reusing the existing `_get_allocation()` and return-sampling pattern ensures consistency with the accumulation phase and maintains the NumPy-vectorized architecture. The distribution loop is simpler (no contributions, no vesting, no IRS limits) so it naturally extends the existing code.

**Alternatives considered**:
- **Separate distribution engine class**: More modular but adds unnecessary indirection for what is effectively 20 lines of loop code. Rejected per over-engineering principle.
- **Compose accumulation + distribution as two engines**: Would require passing intermediate state (balances, RNG) between engines. Rejected; single method with two loops is simpler and maintains RNG continuity.

## R4: Withdrawal Strategy Protocol Design

**Decision**: Define `WithdrawalStrategy` as a Python `Protocol` class (structural subtyping) with a single `calculate_withdrawal` method.

**Method signature**:
```python
def calculate_withdrawal(
    self,
    current_balance: np.ndarray,
    year_in_retirement: int,
    initial_retirement_balance: np.ndarray,
    params: dict[str, Any],
) -> np.ndarray
```

**Parameters**:
- `current_balance`: Shape `(n,)` — current portfolio balance per trial (before this year's withdrawal)
- `year_in_retirement`: 1-based year index (1 = first year of retirement)
- `initial_retirement_balance`: Shape `(n,)` — balance at the start of retirement per trial (immutable reference)
- `params`: Strategy-specific parameters (e.g., `total_years`, `real_return_rate` for systematic)

**Returns**: `np.ndarray` shape `(n,)` — withdrawal amount per trial (in nominal dollars for internal engine use)

**Rationale**: A Protocol (rather than ABC) enables structural subtyping — any class with a matching `calculate_withdrawal` method satisfies the interface without explicit inheritance. This is the most Pythonic approach and makes the proprietary model a true drop-in: implement the method, pass the instance, done.

Using `dict[str, Any]` for params keeps the interface maximally flexible. Each strategy defines its own parameter schema. The engine doesn't need to know what's in params — it just passes them through.

**Alternatives considered**:
- **Abstract Base Class (ABC)**: Requires explicit inheritance, which couples the proprietary model to our codebase. Rejected for extensibility.
- **Callable/function**: Too loose; no self-documenting structure. Rejected.
- **Generic typed params** (`Protocol[P]`): Over-engineered for the current need; the dict approach is simpler and equally flexible. Can be tightened later if needed.

## R5: YearSnapshot Extension for Withdrawal Amounts

**Decision**: Add an optional `withdrawal` field of type `PercentileValues | None` to the existing `YearSnapshot` model.

**Structure**:
```python
class YearSnapshot(BaseModel):
    age: int
    p25: float
    p50: float
    p75: float
    p90: float
    withdrawal: PercentileValues | None = None  # NEW
```

**Behavior**:
- Accumulation-phase snapshots: `withdrawal = None` (omitted from JSON output via `exclude_none`)
- Distribution-phase snapshots: `withdrawal = PercentileValues(p25=..., p50=..., p75=..., p90=...)` with values in real/today's dollars

**Rationale**: Using the existing `PercentileValues` model keeps the output structure consistent. The optional field is backward-compatible — existing consumers parsing `{age, p25, p50, p75, p90}` will ignore the new field. The withdrawal amounts are in real/today's dollars per the clarification, so the value is constant across all distribution years for the systematic strategy (per trial).

**Alternatives considered**:
- **Flat fields** (`withdrawal_p25`, `withdrawal_p50`, etc.): More consistent with the existing flat p25-p90 on YearSnapshot, but adds 4 nullable fields. Less clean than a nested optional object.
- **Separate trajectory list**: A parallel `withdrawal_trajectory: list[YearSnapshot]` on PersonaSimulationResult. Rejected because it duplicates ages and makes it harder to correlate balance and withdrawal for the same year.

## R6: PersonaSimulationResult Extension

**Decision**: Add an optional `annual_withdrawal` field of type `PercentileValues | None` to `PersonaSimulationResult` as a headline summary metric.

**Structure**:
```python
class PersonaSimulationResult(BaseModel):
    persona_id: UUID
    persona_name: str
    retirement_balance: PercentileValues
    annual_withdrawal: PercentileValues | None = None  # NEW — real/today's dollars
    trajectory: list[YearSnapshot]
```

**Rationale**: The `retirement_balance` provides a headline number for the accumulation phase. The `annual_withdrawal` provides the equivalent for the distribution phase — "how much annual income does this plan design produce?" For the systematic strategy, this is the level real withdrawal amount at each percentile. This directly supports the income replacement ratio use case mentioned in clarification.

## R7: SimulationResponse Extension

**Decision**: Add `planning_age: int` to `SimulationResponse` for completeness alongside the existing `retirement_age`.

```python
class SimulationResponse(BaseModel):
    scenario_id: UUID
    num_simulations: int
    seed: int | None
    retirement_age: int
    planning_age: int  # NEW
    personas: list[PersonaSimulationResult]
```

**Rationale**: Consumers need to know the planning horizon boundary. Since `retirement_age` is already present, `planning_age` provides the full picture.

## R8: RNG Continuity Between Phases

**Decision**: Use the same `rng` (NumPy Generator) instance continuously from accumulation through distribution phase.

**Rationale**: The RNG is already seeded per-persona for reproducibility. Continuing to draw from the same generator ensures that:
1. Distribution-phase returns are deterministic given the same seed
2. The accumulation phase is unaffected by the presence of the distribution phase (draws happen in sequence)
3. No additional seed management is needed

**Alternative considered**:
- **Separate RNG for distribution**: Fork a new generator from a derived seed. Unnecessary complexity; the sequential approach maintains reproducibility and is simpler.
