# Research: 004-simulation-engine

**Date**: 2026-02-24

## R1: Simulation Architecture (NumPy Vectorization)

**Decision**: Use NumPy array operations to vectorize across all simulation trials for each persona. For each persona, maintain arrays of shape `(num_simulations,)` for salary, deferral_rate, and balance, then apply yearly operations as element-wise array operations.

**Rationale**: The performance targets (1k trials x 8 personas < 10s, 10k trials x 8 personas < 60s) require efficient computation. With 10k trials x 37 years x 8 personas = ~3M year-trial combinations, Python loops over individual trials would be too slow. NumPy vectorization across trials eliminates the inner loop, reducing to ~37 x 8 = 296 iterations with array operations on vectors of 10k elements each. NumPy is already in `api/requirements.txt`.

**Alternatives considered**:
- Pure Python loops: Too slow for 10k trials — estimated 30-60s per persona.
- Multiprocessing per persona: Adds complexity (process spawning, serialization overhead) without need — NumPy vectorization should hit targets.
- Pandas DataFrames: Higher overhead than raw NumPy arrays for numeric computation with no tabular benefit.

## R2: Glide Path Schedule Definition

**Decision**: Define a linear glide path with the following fixed schedule:

| Years to Target | Equity | Bonds | Cash |
|----------------|--------|-------|------|
| >= 40           | 90%    | 8%    | 2%   |
| 0 (at target)   | 30%    | 50%   | 20%  |
| < 0 (past)      | 30%    | 50%   | 20%  |

For intermediate years (0 < years_to_target < 40), use linear interpolation on each component independently. The sum of components equals 100% at all points since both endpoints sum to 100% and interpolation preserves this.

**Formula**:
```
t = clamp((40 - years_to_target) / 40, 0, 1)
equity = 0.90 - t * 0.60
bonds  = 0.08 + t * 0.42
cash   = 0.02 + t * 0.18
```

Example at 20 years before target (t=0.5): 60% equity, 29% bonds, 11% cash.

**Rationale**: Matches the spec's guidance of "approximately 90% equity at 40+ years" and "approximately 30% equity at and beyond target date." Linear interpolation over 40 years is the simplest form that provides a smooth transition. The bond/cash split follows standard TDF convention (bonds increase more than cash as equity decreases).

**Alternatives considered**:
- Configurable glide path in Assumptions: Over-engineered for current scope; can be extracted later if needed.
- S-curve or multi-segment path: More realistic but adds complexity without clear benefit for projection purposes.
- Lookup table with discrete age bands: Less smooth, no advantage over continuous formula.

## R3: Wage Growth Noise Parameterization

**Decision**: Add a `wage_growth_std` field to the `Assumptions` model with default value `0.02` (2%). The annual wage growth for each trial is drawn from `N(wage_growth_rate, wage_growth_std)`. Also add the corresponding optional field to `AssumptionsOverride`.

**Rationale**: The spec requires noise "parameterized by the assumptions" and says the standard deviation should be "approximately 2% of the wage growth rate or a fixed standard deviation around 1-2%." A fixed 2% (0.02) standard deviation is simple and reasonable — with a default 3% growth rate, this means ~68% of years have growth between 1% and 5%, which matches real-world wage variability. Making it a field on Assumptions allows scenario-level overrides (via AssumptionsOverride), keeping the engine configurable without hardcoding.

**Alternatives considered**:
- Hardcoded constant in engine: Less flexible, can't override per scenario.
- Proportional to wage_growth_rate (e.g., 0.5 * rate): Breaks down when rate is 0; less intuitive.
- Separate WageGrowthConfig model: Over-engineered for a single additional parameter.

## R4: Year-by-Year Simulation Order of Operations

**Decision**: For each simulated year (starting from year 1), execute operations in this order:

1. **Wage growth**: `salary *= (1 + N(wage_growth_rate, wage_growth_std))`
2. **Cap compensation**: `capped_comp = min(salary, comp_limit)`
3. **Auto-escalation**: `deferral_rate = min(deferral_rate + escalation_rate, escalation_cap)` (if enabled)
4. **Employee deferral**: `deferral = min(deferral_rate * capped_comp, age_based_deferral_limit)`
5. **Employer match**: Apply tiers sequentially to deferral amount on capped comp
6. **Employer core**: Evaluate age/service tiers (or flat rate) on capped comp
7. **Eligibility check**: Zero out match/core if tenure < eligibility threshold
8. **Section 415 limit**: Cap total additions; reduce core first, then match
9. **Vesting**: Apply vesting percentages to match and core separately
10. **Investment return**: Sample three asset class returns, blend by allocation weights
11. **Glide path shift**: Update target-date allocation for next year (if applicable)
12. **Balance update**: `balance = (balance + deferral + vested_match + vested_core) * (1 + blended_return)`

Year 0 records the starting balance (no operations).

**Rationale**: This ordering reflects the natural sequence of retirement account operations: income changes first, then contributions are calculated, then limits/vesting applied, then returns compound on the new balance. The beginning-of-year contribution assumption (contributions earn the full year's return) is standard in retirement projection models and slightly more generous than mid-year, providing a conservative "optimistic" baseline.

**Alternatives considered**:
- End-of-year contributions (`balance * (1 + return) + contributions`): Too conservative, understates growth.
- Mid-year contributions: More accurate but adds complexity with minimal impact on percentile projections over 30+ years.
- Escalation after contributions: Would delay the escalation effect by a year, inconsistent with typical plan administration.

## R5: Vesting Calculation Approach

**Decision**: Apply vesting percentages to each year's employer contributions independently, based on accumulated tenure at that point. Only the vested portion of each year's employer contribution is added to the balance.

```python
def get_vesting_pct(vesting: VestingSchedule, tenure_years: int) -> float:
    match vesting.type:
        case "immediate": return 1.0
        case "cliff": return 1.0 if tenure_years >= vesting.years else 0.0
        case "graded":
            # Find the highest vesting year <= accumulated tenure
            applicable = {y: pct for y, pct in vesting.schedule.items() if y <= tenure_years}
            return max(applicable.values()) if applicable else 0.0
```

**Rationale**: This is a standard simplification for Monte Carlo projections. In reality, vesting applies to the entire unvested employer balance upon separation. Since the simulation models the accumulation phase (no separation event), applying vesting year-by-year approximates the outcome for a participant who stays employed. The vesting percentage increases monotonically with tenure, so later years' contributions are always at least as vested as earlier years'. The spec says "counting only vested employer amounts toward the balance," which aligns with this approach.

**Alternatives considered**:
- Track vested/unvested balances separately with per-year employer contribution ledger: Significantly more complex, requires separate investment return tracking; only needed if modeling separation events.
- Apply final vesting % to total employer balance at retirement: Simpler but less accurate for intermediate trajectory data.

## R6: Section 415 Limit Enforcement Order

**Decision**: When total annual additions (employee deferral + employer match + employer core) exceed the Section 415 limit ($70,000 for 2026):

1. Employee deferrals are preserved (always take priority).
2. Remaining headroom = `additions_limit - deferrals`.
3. Core contributions are reduced first: `core = min(core, remaining_headroom)`.
4. Match contributions are reduced second: `match = min(match, remaining_headroom - core)`.

**Rationale**: The spec states "employee deferrals take priority" and "employer contributions are reduced." Within employer contributions, reducing core first preserves the match, which is the direct incentive linked to employee deferrals and is generally more valuable from the participant's perspective. This ordering is consistent with common plan administration practices.

**Alternatives considered**:
- Pro-rata reduction of employer contributions: More equitable but harder to implement with numpy, and the spec doesn't require it.
- Reduce match first: Less favorable to the participant; match incentivizes saving behavior.

## R7: Seed Management for Reproducibility

**Decision**: Use per-persona seed derivation from the master seed for deterministic, order-independent results:

```python
if seed is not None:
    master_rng = np.random.default_rng(seed)
    persona_seeds = master_rng.integers(0, 2**63, size=len(personas))
    # Each persona gets its own RNG: np.random.default_rng(persona_seeds[i])
else:
    # Use a single unseeded RNG for all personas (non-reproducible)
    master_rng = np.random.default_rng()
    persona_seeds = master_rng.integers(0, 2**63, size=len(personas))
```

**Rationale**: Per-persona seed derivation ensures (a) each persona's simulation is deterministic given the same master seed, and (b) adding/removing a persona doesn't change other personas' results. This satisfies FR-018 (identical results with same seed) and is more robust than a single shared RNG that would make results dependent on persona ordering.

**Alternatives considered**:
- Single shared RNG across all personas: Simpler, but adding/removing personas changes results for all subsequent personas.
- Hash-based seeds (hash(master_seed, persona_id)): Fully order-independent, but UUID hashing adds complexity and the integer derivation approach is sufficient for the current use case where persona order is deterministic.

## R8: Auto-Enrollment and Auto-Escalation Timing

**Decision**:
- **Auto-enrollment**: At simulation start (year 0), if `persona.deferral_rate == 0.0` and `plan_design.auto_enroll_enabled`, set the initial deferral rate to `plan_design.auto_enroll_rate`.
- **Auto-escalation**: Starting from year 1, before contribution calculations, increment the deferral rate by `plan_design.auto_escalation_rate` up to `plan_design.auto_escalation_cap`, if `plan_design.auto_escalation_enabled`.
- Auto-escalation applies regardless of how the initial rate was set (manual or auto-enrolled).

**Rationale**: Auto-enrollment is a one-time event at the start of participation (which for simulation purposes is year 0). Auto-escalation is an annual event starting from the first anniversary. This matches typical 401(k) plan administration. Applying escalation before contributions in each year ensures the escalated rate is used for that year's calculations.

**Alternatives considered**:
- Escalation at end of year (after contributions): Would delay the benefit by one year; less standard.
- Auto-enrollment check every year: Not needed — once enrolled, the rate persists.
- Skip escalation for auto-enrolled participants in year 1: Non-standard; most plans escalate on the first anniversary regardless of enrollment method.
