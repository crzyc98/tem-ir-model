# Research: Results Dashboard

**Branch**: `011-results-dashboard` | **Date**: 2026-02-24

## Decision 1: Percentile Extension for 90% Confidence Level

**Decision**: Add p10 to the `PERCENTILES` tuple in the simulation engine and extend `PercentileValues` and `YearSnapshot` models to include a `p10` field.

**Rationale**: The spec requires a 90% confidence level, meaning "90% of simulation trials meet or exceed this outcome." This corresponds to the 10th percentile (p10). The engine currently computes only p25, p50, p75, p90. Since `np.percentile` already accepts an arbitrary tuple, adding `10` to `PERCENTILES = (10, 25, 50, 75, 90)` is a one-line change in the engine. The downstream models (`PercentileValues`, `YearSnapshot`) each need one new `p10: float` field. The confidence level mapping becomes: 50% confidence → p50, 75% confidence → p25, 90% confidence → p10.

**Alternatives considered**:
- **Interpolate p10 from p25 and p50**: Rejected — statistical interpolation between percentiles is unreliable and defeats the purpose of Monte Carlo simulation.
- **Re-run simulation with fewer percentiles per confidence level**: Rejected — unnecessary complexity; a single simulation run should serve all confidence views.
- **Use p25 as a proxy for 90% confidence**: Rejected — misrepresents the confidence level to the user; p25 only guarantees 75% of trials exceed it.

## Decision 2: Contribution Tracking in Simulation Engine

**Decision**: Accumulate per-trial cumulative employee deferrals, employer match, and employer core contributions in the simulation engine's accumulation loop, then return median (p50) totals per persona in the response.

**Rationale**: The spec requires total employer and total employee contributions in the summary table (FR-005, FR-006). The engine currently computes `deferrals`, `vested_match`, and `vested_core` per year per trial but discards them after updating balances. The fix is to add three running-total numpy arrays (`cum_deferrals`, `cum_match`, `cum_core`) that accumulate each year's values, then take the p50 of each at the end of the accumulation phase. Contribution totals are deterministic given salary and plan design, but salary growth has stochastic noise, so contributions vary across trials — the median is the most representative single number. These values do not change with the confidence level toggle per the spec assumption.

**Alternatives considered**:
- **Compute contributions on the frontend from plan design parameters**: Rejected — would duplicate the engine's complex logic (tiered matching, vesting, auto-escalation, IRS caps) and would diverge from actual simulation assumptions.
- **Return per-trial contribution arrays**: Rejected — excessive data transfer; only aggregate totals are needed for the dashboard.
- **Return percentile breakdown of contributions**: Rejected — over-engineered for the use case; the summary table has a single column per contribution type.

## Decision 3: Probability of Success Calculation

**Decision**: Compute probability of success as `np.sum(final_balances > 0) / n` where `final_balances` is the balance array at planning age after the distribution phase, and return it as a scalar float per persona.

**Rationale**: The spec defines probability of success as "the percentage of simulation trials in which the persona's balance sustains withdrawals through the full planning horizon without depletion" (FR-004). The engine already runs the distribution phase and clamps balances to zero via `np.maximum(balances, 0.0)`. After the distribution loop completes (at planning age), counting trials with balance > 0 is a single numpy operation. This value is trial-count-based and does not change with the confidence level toggle.

**Alternatives considered**:
- **Define success as "income replacement ratio > 70%"**: Rejected — spec explicitly defines it as balance sustainability, not income adequacy.
- **Track the first year of depletion per trial**: Rejected — the dashboard only needs a single probability number, not a depletion timeline.
- **Skip probability of success if no distribution phase exists**: Decided to return 100% (or null) for personas whose planning age equals retirement age, since there is no depletion risk.

## Decision 4: Income Replacement Ratio and Projected Salary

**Decision**: Compute income replacement ratio in the simulation engine as `total_retirement_income / projected_salary_at_retirement` and return both the ratio (as percentile values) and the projected salary (as a scalar) per persona. Projected salary uses the deterministic formula: `persona.salary * (1 + wage_growth_rate) ^ years_to_retirement`.

**Rationale**: The spec requires income replacement ratio in both the summary table and bar chart (FR-003). Since `total_retirement_income` varies by percentile (it includes withdrawal income), the ratio also varies by percentile and must be selectable by confidence level. The denominator (projected salary) uses the deterministic wage growth rate rather than per-trial stochastic salaries because: (a) it provides a stable, explainable reference salary, and (b) the spec says "pre-retirement annual salary" which aligns with the expected salary at retirement, not a trial-specific outcome. The deterministic projection matches the Social Security estimator's approach.

**Alternatives considered**:
- **Use current salary as the denominator**: Rejected — income replacement ratio is universally defined against pre-retirement income, not current income. A 30-year-old's current salary would produce misleadingly high ratios.
- **Use per-trial stochastic salary as the denominator**: Rejected — produces a distribution of ratios that is harder to interpret and explain. The deterministic projection gives a single, stable reference point.
- **Compute the ratio on the frontend**: Rejected — the projected salary calculation should live alongside the simulation logic for consistency.

## Decision 5: Frontend Architecture for Results Dashboard

**Decision**: Create a new `ResultsDashboardPage` at route `/scenarios/:scenarioId/results`, following the existing `useOutletContext` + `useState` + `useCallback` + `useEffect` pattern. Use Recharts `BarChart` for income replacement ratio, `ComposedChart` (Line + Area) for trajectory with confidence bands, and a plain HTML table for the summary. Add a `ConfidenceLevelToggle` component that stores the selected level in local state and passes it to all child visualizations.

**Rationale**: The existing frontend has no state management library — all pages use local React state via hooks. This pattern is well-established across 8 existing pages and should not be changed for a single feature. Recharts is already installed (v2.15) and used in `AllocationDonutChart.tsx`. The `ComposedChart` component allows overlaying `<Area>` (for confidence bands) with `<Line>` (for the central estimate) on the same axes. `ResponsiveContainer` should wrap all charts for responsive sizing (improving on the fixed-pixel approach in the donut chart). The confidence level toggle is pure client-side state — it selects which percentile field (p10, p25, p50) to read from the already-fetched simulation response.

**Alternatives considered**:
- **Use a charting library other than Recharts**: Rejected — Recharts is already a project dependency and the user explicitly requested it.
- **Use a global state manager (Zustand/Redux) for simulation results**: Rejected — no other page uses one; introducing it for a single feature adds unnecessary complexity.
- **Embed the dashboard within `PersonaModelingPage`**: Rejected — the dashboard has distinct concerns (simulation results vs persona configuration) and warrants its own route for clean navigation.

## Decision 6: Confidence Band Visualization Strategy

**Decision**: Use Recharts `<Area>` components to render shaded confidence bands on the trajectory chart. At 50% confidence, show the p25–p75 band around the p50 line. At 75% confidence, show the p10–p50 band around the p25 line. At 90% confidence, show a narrower band (p10 only as the line, no band) since p10 is the most conservative single estimate.

**Rationale**: Confidence bands should convey the range of outcomes at the selected confidence level. For 50% confidence (median), the natural band is the interquartile range (p25–p75) — 50% of trials fall within this range. For 75% confidence, the band spans from the most conservative available percentile (p10) up to the median (p50), showing the range within which the user can have 75% confidence. At 90% confidence, the p10 line itself is the floor estimate; showing a band below it would require even lower percentiles (p5, p1) that we don't compute, so the line alone suffices.

**Alternatives considered**:
- **Always show p10–p90 band regardless of confidence level**: Rejected — this doesn't change with the toggle, violating the spec requirement that all visualizations update when confidence level changes.
- **Show ±1 standard deviation bands**: Rejected — would require returning standard deviations from the engine; percentile bands are more intuitive for non-statistical users.
- **Show multiple overlapping bands (like a fan chart)**: Rejected — adds visual complexity; the single-band approach is cleaner and directly ties to the selected confidence level.
