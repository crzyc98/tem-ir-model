# Product Requirements Document: RetireModel

**Version:** 1.0  
**Author:** Nick Amaral  
**Date:** February 24, 2026  
**Status:** Draft

---

## 1. Executive Summary

RetireModel is a retirement plan income replacement modeling tool that enables plan sponsors, consultants, and analysts to simulate retirement outcomes for hypothetical employees under various plan designs. The application combines Monte Carlo simulation with an intuitive, card-based interface to help users understand how plan design decisions—deferral rates, match formulas, non-elective contributions, and asset allocation—translate into real retirement income replacement ratios.

The tool supports two primary workflows: modeling multiple employee personas against a single plan design, and comparing multiple plan designs for a single employee. Results are presented as income replacement ratios at configurable confidence levels from Monte Carlo simulation output.

---

## 2. Problem Statement

Retirement plan sponsors and their advisors need to evaluate whether a plan design will deliver adequate retirement income for employees across the compensation and tenure spectrum. Currently, this analysis requires either expensive proprietary tools or manual spreadsheet modeling that's error-prone and difficult to iterate on. There is no lightweight, self-contained tool that allows rapid plan design iteration with immediate visual feedback on projected outcomes across multiple employee profiles simultaneously.

---

## 3. Goals & Success Metrics

**Goals:**
- Enable rapid "what-if" plan design modeling with sub-second feedback for deterministic projections and under 5 seconds for Monte Carlo simulations
- Provide clear, visual comparison of retirement outcomes across employee personas and plan designs
- Support the full range of common defined contribution plan design elements (match, non-elective, auto-enroll, auto-escalation)
- Deliver results as income replacement ratios at multiple confidence levels

**Success Metrics:**
- User can configure a complete plan design and 8 employee personas and view results within 2 minutes
- Plan design comparison (up to 4 designs) renders results for a single employee within 10 seconds
- Monte Carlo simulation (1,000+ runs) completes within 5 seconds per employee

---

## 4. Tech Stack

### Backend
| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.12 | Runtime |
| FastAPI | 0.115.6 | API framework |
| DuckDB | 1.1.3 | Embedded database for simulation data and scenarios |
| Pydantic | 2.10.4 | Data validation and serialization |
| NumPy | latest | Monte Carlo simulation engine |

### Frontend
| Component | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.3 | UI framework |
| TypeScript | 5.8.2 | Type safety |
| Vite | 6.2.0 | Build tool |
| Tailwind CSS | CDN | Styling |
| Recharts | latest | Data visualization |
| Lucide React | latest | Iconography |

---

## 5. Design System

### Visual Identity
- **Primary color:** `#00853F` (green)
- **Font:** Roboto (Google Fonts)
- **Background:** `bg-gray-50` (light gray)
- **Cards:** White, `shadow-sm`, `border border-gray-100`, `rounded-xl`
- **Buttons:** `rounded-lg`, subtle transitions, hover states
- **Status badges:** Colored backgrounds with borders (green/blue/red)

### Layout
- Fixed sidebar (`w-64`) with navigation items and collapsible dropdowns
- Top header bar with app title, breadcrumbs, and user controls
- Main content area with card-based grid layout
- Clean, professional SaaS aesthetic with generous whitespace

### Data Visualization
- Recharts for all charts
- Consistent color palette derived from primary green
- Chart cards follow the same white/rounded-xl/shadow-sm pattern
- Income replacement thresholds shown as reference lines (e.g., 70%, 80%, 100%)

---

## 6. Information Architecture

### Navigation Structure

```
RetireModel
├── Workspace Selector (dropdown in sidebar header)
├── Dashboard (workspace landing — recent scenarios, quick stats)
├── Persona Modeling
│   ├── Plan Design Configuration (scenario-level)
│   ├── Persona Gallery (inherited from workspace base, overridable)
│   └── Results Dashboard
├── Plan Comparison
│   ├── Select Scenarios (2-4 from current workspace)
│   ├── Employee Selection (single persona or full set)
│   └── Comparison Results
├── Scenarios (list/manage all scenarios in workspace)
├── Workspace Settings
│   ├── Client Info
│   ├── Base Assumptions (inherited by all scenarios)
│   ├── Default Persona Set
│   └── Monte Carlo Configuration
└── Workspaces (manage all workspaces — create, import, export)
```

---

## 7. Feature Specifications

### 7.1 Plan Design Configuration

A plan design is defined by the following inputs, presented as a card-based form:

**Employer Match Formula:**
- Tiered match structure (up to 3 tiers)
- Each tier: match rate (%), on first X% of deferrals
- Example: "100% on first 3%, 50% on next 2%" = 4% total match on 5% deferral
- Match vesting schedule (immediate, 1-year cliff, 2-6 year graded)
- Eligibility waiting period (immediate, 30 days, 60 days, 90 days, 6 months, 1 year)

**Employer Non-Elective (Core) Contribution:**
- Fixed percentage of compensation
- Age/service-weighted schedule option (up to 5 tiers by age or service bands)
- Vesting schedule
- Eligibility waiting period

**Auto-Enrollment:**
- Enabled/disabled toggle
- Default deferral rate (typically 3%-6%)
- Auto-escalation enabled/disabled
- Auto-escalation rate (default: 1% per year)
- Auto-escalation cap (default: 10%)

**Compensation & Limits:**
- Annual compensation limit ($345,000 for 2026, auto-populated)
- 402(g) deferral limit ($23,500 for 2026, auto-populated)
- 415 annual additions limit ($70,000 for 2026, auto-populated)
- Catch-up contribution limit for 50+ ($7,500 for 2026)
- Super catch-up for 60-63 ($11,250 for 2026)
- Wage growth assumption (default: 3.0%)
- Inflation assumption (default: 2.5%)

### 7.2 Employee Personas

**Default Persona Set (8 personas):**

| Persona | Name | Age | Tenure | Salary | Deferral Rate | Current Balance | Allocation |
|---------|------|-----|--------|--------|---------------|-----------------|------------|
| Early Career Entry-Level | Jordan | 25 | 1 yr | $40,000 | 3% | $2,000 | Target Date 2065 |
| Early Career Professional | Priya | 30 | 3 yrs | $65,000 | 6% | $35,000 | Target Date 2060 |
| Mid-Career Individual Contributor | Marcus | 38 | 8 yrs | $90,000 | 8% | $150,000 | Target Date 2055 |
| Mid-Career Manager | Sarah | 42 | 12 yrs | $120,000 | 10% | $320,000 | Target Date 2050 |
| Senior Manager | David | 48 | 18 yrs | $160,000 | 12% | $650,000 | Target Date 2045 |
| Director / Executive | Michelle | 52 | 22 yrs | $210,000 | 15% | $1,100,000 | Target Date 2040 |
| Late Career / Near Retirement | Robert | 58 | 28 yrs | $140,000 | 10% | $480,000 | Target Date 2035 |
| Lower-Paid Long-Tenure | Linda | 55 | 30 yrs | $52,000 | 5% | $120,000 | Target Date 2035 |

**Persona Configuration Fields:**
- Name (display label)
- Age
- Years of service / tenure
- Current annual compensation
- Employee deferral rate (%)
- Current account balance ($)
- Asset allocation: Target Date Fund (select vintage) or Custom Mix (% stock, % bond, % cash)
- Include Social Security estimate (toggle, based on current salary)

**Persona Management:**
- Edit any default persona inline
- Add custom personas (up to 12 total)
- Delete/hide personas from the active set
- Reset to defaults

### 7.3 Modeling Assumptions & Monte Carlo Engine

**Return Assumptions:**

Asset class returns are derived from historical performance analysis of benchmark indexes (see Section 9.2), not hardcoded expected returns. The simulation randomly generates returns for each asset class using the historical mean, standard deviation, distribution, and correlation characteristics. This approach follows the Fidelity P&GC methodology, using data from 1926 through the most recent year-end available.

**Monte Carlo Configuration:**
- Number of simulations: 250 (default, per P&GC), configurable up to 1,000
- Confidence levels displayed: 50th percentile (default view), 75th, 90th
- Toggle: "Probability of success" mode — shows the percentage of simulation runs where the retiree has ≥$1 remaining at the planning age

**Retirement Income Calculation:**
- All values expressed in pre-tax, today's dollars
- Retirement age: 67 (default, configurable 55-70)
- Planning age (mortality assumption): 93 (default, configurable 85-100)
- Withdrawal strategy: Pluggable engine (4% rule placeholder; proprietary model to be integrated)
- Social Security: Estimated based on current age and current income, optional inclusion
- Income replacement ratio = (Annual retirement income from plan) / (Final pre-retirement salary)
- IRS limits held constant at current-year values throughout projection

### 7.4 Persona Modeling Page (Primary View)

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Plan Design Card (collapsible)               │
│             │  ┌──────────────────────────────────────────┐  │
│  Persona    │  │ Match: 100% on 3%, 50% on next 2%       │  │
│  Modeling   │  │ Core: 3% non-elective                    │  │
│             │  │ Auto-enroll: 6%, escalate 1%/yr to 10%   │  │
│  Plan       │  └──────────────────────────────────────────┘  │
│  Comparison │                                                │
│             │  Persona Gallery (grid of 8 persona cards)     │
│  Saved      │  ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  Scenarios  │  │ Jordan  │ │ Priya   │ │ Marcus  │ ...      │
│             │  │ Age 25  │ │ Age 30  │ │ Age 38  │          │
│  Settings   │  │ $40k    │ │ $65k    │ │ $90k    │          │
│             │  └─────────┘ └─────────┘ └─────────┘          │
│             │                                                │
│             │  Results Dashboard                             │
│             │  ┌──────────────────────────────────────────┐  │
│             │  │ Bar chart: Income Replacement by Persona │  │
│             │  │ 70% threshold line                       │  │
│             │  │ Confidence toggle: 50% | 75% | 90%      │  │
│             │  └──────────────────────────────────────────┘  │
│             │  ┌──────────────────────────────────────────┐  │
│             │  │ Balance Growth Trajectories (line chart) │  │
│             │  │ One line per persona, fan chart for       │  │
│             │  │ confidence intervals                      │  │
│             │  └──────────────────────────────────────────┘  │
│             │  ┌──────────────────────────────────────────┐  │
│             │  │ Summary Table: All personas, key metrics │  │
│             │  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Results for Each Persona:**
- Projected balance at retirement
- Annual retirement income (at selected confidence level)
- Income replacement ratio (%)
- Probability of success (% of runs with ≥$1 at planning age)
- Total employer contributions over career
- Total employee contributions over career

**Visualizations:**
- Grouped bar chart: Income replacement ratio by persona at selected confidence level, with 70% and 80% reference lines
- Line chart: Balance accumulation trajectories through retirement for all personas (median with shaded confidence bands)
- Stacked area chart: Contribution source breakdown (employee deferral, match, core) over time for selected persona
- Summary data table with sortable columns

### 7.5 Plan Comparison Page

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Employee Selection                            │
│             │  (Single persona from workspace gallery         │
│  Workspace: │   or custom employee)                           │
│  Dana-Farber│                                                 │
│  ──────────── Scenario Cards (2-4 from current workspace)    │
│  Dashboard  │  ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  Persona    │  │ Current    │ │ Proposed   │ │ Alt Design │  │
│  Modeling   │  │ Plan       │ │ +1% Match  │ │ +3% Core   │  │
│  Compare    │  │ Scenario A │ │ Scenario B │ │ Scenario C │  │
│  Scenarios  │  └────────────┘ └────────────┘ └────────────┘  │
│  Settings   │                                                 │
│             │  Comparison Results                             │
│             │  ┌──────────────────────────────────────────┐   │
│             │  │ Side-by-side bar chart:                  │   │
│             │  │ Income replacement by plan design        │   │
│             │  └──────────────────────────────────────────┘   │
│             │  ┌──────────────────────────────────────────┐   │
│             │  │ Overlay line chart:                      │   │
│             │  │ Balance trajectories by plan             │   │
│             │  └──────────────────────────────────────────┘   │
│             │  ┌──────────────────────────────────────────┐   │
│             │  │ Comparison table: Key metrics by plan    │   │
│             │  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Comparison Metrics:**
- Income replacement ratio delta between plans
- Employer cost per employee (annual and cumulative)
- Employee contribution required to hit 80% replacement
- Projected balance at retirement
- Probability of success

### 7.6 Workspaces & Scenarios

A **workspace** is the top-level organizational container, typically representing a client or engagement. Each workspace contains one or more **scenarios** that represent distinct plan design configurations and their simulation results.

**Workspace Structure:**

```
~/.retiremodel/workspaces/{workspace_id}/
├── workspace.json          # Metadata (id, name, client, timestamps)
├── base_config.yaml        # Default assumptions & persona set
├── scenarios/
│   └── {scenario_id}/
│       ├── scenario.json   # Scenario metadata & plan design
│       ├── overrides.yaml  # Assumption overrides (merged with base)
│       ├── results.duckdb  # Simulation results
│       └── runs/           # Historical run records
└── comparisons/            # Cross-scenario comparison results
```

**Workspace Properties:**
- **Client name** — the plan sponsor or engagement this workspace represents
- **Base configuration** — default assumptions, IRS limits, Monte Carlo settings, and persona set that all scenarios inherit
- **Scenarios** — each scenario contains a complete plan design and can override any base assumption (e.g., different return assumptions for a conservative vs. aggressive projection)

**Configuration Merging:**
Scenario config = deep merge of workspace `base_config` + scenario `overrides.yaml`. This means you set up your personas and assumptions once at the workspace level, then each scenario only needs to define what's different — typically just the plan design and any assumption tweaks.

**Scenario Comparison:**
The Plan Comparison page operates within a workspace, letting you select 2-4 scenarios and compare their outcomes side by side for a single employee or across the full persona set. Comparison results are persisted in the `comparisons/` directory.

**Workspace Management:**
- Create, rename, duplicate, archive, and delete workspaces
- Export workspace as a portable archive (JSON + YAML config + DuckDB results)
- Import workspace from archive with conflict resolution (rename, replace, skip)
- List recent workspaces on the landing page for quick access

**Workspace Selector:**
The sidebar includes a workspace selector dropdown at the top. Switching workspaces loads that client's base config, persona set, and scenario list. The app always operates within the context of a single active workspace.

### 7.7 Settings

**Global Assumptions:**
- Inflation rate
- Wage growth rate
- Asset class return assumptions (mean and standard deviation)
- IRS limits (auto-populated for current year, overridable)

**Monte Carlo Configuration:**
- Number of simulation runs
- Random seed (optional, for reproducibility)
- Retirement age default
- Planning age default

---

## 8. API Design

### Endpoints

```
# Workspaces
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/{workspace_id}
PUT    /api/v1/workspaces/{workspace_id}
DELETE /api/v1/workspaces/{workspace_id}
POST   /api/v1/workspaces/{workspace_id}/export
POST   /api/v1/workspaces/import

# Scenarios (scoped to workspace)
GET    /api/v1/workspaces/{workspace_id}/scenarios
POST   /api/v1/workspaces/{workspace_id}/scenarios
GET    /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}
PUT    /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}
DELETE /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}

# Simulation (scoped to scenario)
POST   /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate
       Body: { personas[] (optional, defaults to workspace set) }
       Returns: { results[] } with per-persona outcomes at all confidence levels

# Plan Comparison (across scenarios in a workspace)
POST   /api/v1/workspaces/{workspace_id}/compare
       Body: { scenario_ids[], persona_id (single) or persona_ids[] }
       Returns: { results[] } with per-scenario outcomes

# Workspace base config & personas
GET    /api/v1/workspaces/{workspace_id}/config
PUT    /api/v1/workspaces/{workspace_id}/config
GET    /api/v1/workspaces/{workspace_id}/personas
PUT    /api/v1/workspaces/{workspace_id}/personas

# Defaults (for new workspace creation)
GET    /api/v1/defaults/personas
GET    /api/v1/defaults/assumptions

# Export
POST   /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/export
       Query: format=csv|pdf
```

### Data Models (Pydantic)

```python
class Workspace(BaseModel):
    id: str                    # UUID
    name: str                  # Display name, e.g., "Dana-Farber 2026 Review"
    client_name: str           # Plan sponsor name
    created_at: datetime
    updated_at: datetime
    base_config: Assumptions
    personas: list[Persona]    # Default persona set for this workspace

class Scenario(BaseModel):
    id: str                    # UUID
    workspace_id: str
    name: str                  # e.g., "Current Plan Design", "Proposed Enhancement"
    description: str | None = None
    plan_design: PlanDesign
    overrides: Assumptions | None = None  # Merged with workspace base_config
    created_at: datetime
    updated_at: datetime
    last_run_at: datetime | None = None

class MatchTier(BaseModel):
    match_rate: float          # e.g., 1.0 for 100%, 0.5 for 50%
    on_first_pct: float        # e.g., 0.03 for "on first 3%"

class VestingSchedule(BaseModel):
    type: Literal["immediate", "cliff", "graded"]
    years: int | None = None
    schedule: dict[int, float] | None = None  # year -> vested %

class PlanDesign(BaseModel):
    name: str
    match_tiers: list[MatchTier]
    match_vesting: VestingSchedule
    match_eligibility_months: int = 0
    core_contribution_pct: float = 0.0
    core_age_service_tiers: list[dict] | None = None
    core_vesting: VestingSchedule
    core_eligibility_months: int = 0
    auto_enroll_enabled: bool = True
    auto_enroll_rate: float = 0.06
    auto_escalation_enabled: bool = True
    auto_escalation_rate: float = 0.01
    auto_escalation_cap: float = 0.10

class AssetAllocation(BaseModel):
    type: Literal["target_date", "target_mix", "custom"]
    target_date_vintage: int | None = None       # e.g., 2065, 2040
    target_mix: Literal[
        "short_term", "conservative", "moderate_income",
        "moderate", "balanced", "growth_income",
        "growth", "aggressive_growth", "most_aggressive"
    ] | None = None                              # P&GC nine-mix model
    domestic_stock_pct: float | None = None       # Custom mix
    foreign_stock_pct: float | None = None
    bond_pct: float | None = None
    short_term_pct: float | None = None

class Persona(BaseModel):
    id: str
    name: str
    label: str                 # e.g., "Early Career Entry-Level"
    age: int
    tenure_years: int
    salary: float
    deferral_rate: float
    current_balance: float
    allocation: AssetAllocation
    include_social_security: bool = True

class MonteCarloConfig(BaseModel):
    num_simulations: int = 250     # P&GC default
    seed: int | None = None
    retirement_age: int = 67       # SSA Full Retirement Age
    planning_age: int = 93         # P&GC default (25% longevity age)
    ss_claiming_age: int = 67      # Default to FRA, configurable 62-70

class Assumptions(BaseModel):
    inflation_rate: float = 0.025            # P&GC default: 2.5%
    wage_growth_rate: float = 0.04           # P&GC: inflation + 1.5%
    # Asset class returns derived from historical benchmarks (see Section 9.2)
    # These are not directly configurable in v1 — returns are drawn from
    # historical distributions of the benchmark indexes
    comp_limit: float = 345000               # 2026, held constant
    deferral_limit: float = 23500            # 2026 402(g), held constant
    additions_limit: float = 70000           # 2026 415, held constant
    catchup_limit: float = 7500              # 2026, held constant
    super_catchup_limit: float = 11250       # 2026, held constant
    ss_taxable_max: float = 176100           # 2026, held constant

class PersonaResult(BaseModel):
    persona_id: str
    projected_balance_at_retirement: dict[str, float]  # confidence -> value
    annual_retirement_income: dict[str, float]
    income_replacement_ratio: dict[str, float]
    probability_of_success: float
    total_employer_contributions: float
    total_employee_contributions: float
    balance_trajectory: list[dict]  # year-by-year for charting
```

---

## 9. Simulation Methodology

This section documents the modeling methodology for RetireModel, aligned with the Fidelity Planning & Guidance Center Retirement Analysis methodology. All projections are hypothetical and for plan design evaluation purposes only. Results do not reflect actual investment performance and are not guarantees of future outcomes.

### 9.1 Monte Carlo Simulation Framework

RetireModel uses Monte Carlo simulations to project a range of hypothetical market return scenarios. Simulations are based on a historical performance analysis of asset class returns, including a range of potential returns for each asset class, volatility, and correlation, reviewed annually.

**Simulation Parameters:**
- Default: 250 simulations (matching P&GC), configurable up to 1,000
- Time increment: 1 year
- For each simulation, a rate of return is generated for each asset class using the mean and standard deviation of historical market index data
- Returns are randomly generated and are required to simulate the mean, standard deviation, distribution, and correlated behavior of asset class returns
- The same simulated market scenarios are used within a session unless otherwise updated

**Confidence Levels:**

| Market Conditions | Performance Assumptions Fail | Performance Assumptions Meet or Exceed | Confidence Level |
|---|---|---|---|
| Significantly below average | 10 out of 100 times | 90 out of 100 times | 90% |
| Below average | 25 out of 100 times | 75 out of 100 times | 75% |
| Average | 50 out of 100 times | 50 out of 100 times | 50% |

The default view uses the 50th percentile (average market conditions). Users can toggle between 50%, 75%, and 90% confidence levels.

**Probability of Success:** Total number of successful market scenarios divided by total number of market scenarios. A successful scenario is one in which all income needs are fully met through the planning age and there is at least $1 remaining.

### 9.2 Asset Classes & Historical Benchmarks

Asset classes are represented by benchmark return data, not actual investments. Indexes are unmanaged and it is not possible to invest directly in an index.

| Asset Class | Benchmark Representation |
|---|---|
| Domestic Equities | S&P 500 Index (1926–1986), Dow Jones U.S. Total Market Index (1987–present) |
| Foreign Equities | S&P 500 Index (1926–1969), MSCI EAFE Index (1970–2000), MSCI ACWI Ex USA Index (2001–present) |
| Bonds | U.S. Intermediate-Term Bonds (1926–1975), Bloomberg U.S. Aggregate Bond Index (1976–present) |
| Short-Term / Cash | 30-day U.S. Treasury bill rates (1926–present) |

Volatility of asset classes is based on historical annual data from 1926 through the most recent year-end data available. Annual returns assume reinvestment of interest income and dividends, no transaction costs, no management or servicing fees, and annual rebalancing to the target allocation.

### 9.3 Target Asset Mixes

Nine model target asset mixes are available, following the P&GC definitions:

| Target Asset Mix | Domestic Stock | Foreign Stock | Bonds | Short-Term |
|---|---|---|---|---|
| Short-Term | 0% | 0% | 0% | 100% |
| Conservative | 14% | 6% | 50% | 30% |
| Moderate with Income | 21% | 9% | 50% | 20% |
| Moderate | 28% | 12% | 45% | 15% |
| Balanced | 35% | 15% | 40% | 10% |
| Growth with Income | 42% | 18% | 35% | 5% |
| Growth | 49% | 21% | 25% | 5% |
| Aggressive Growth | 60% | 25% | 15% | 0% |
| Most Aggressive | 70% | 30% | 0% | 0% |

**Target Date Fund Glide Path:** When a persona selects a target date fund vintage, the allocation shifts along a glide path from aggressive (early career) to conservative (at and through retirement). The glide path maps the years-to-retirement to one of the nine asset mixes above, transitioning through approximately: Most Aggressive (40+ years out) → Aggressive Growth → Growth → Growth with Income → Balanced (at retirement) → Moderate with Income → Conservative (15+ years into retirement).

### 9.4 Accumulation Phase (Working Years)

For each simulation run and each year from current age to retirement age:

1. **Wage growth:** Apply salary growth rate (default: inflation + 1.5%, per P&GC methodology using Department of Labor and Census Bureau data). Salary is capped at the IRS compensation limit ($345,000 for 2026, held constant).

2. **Employee deferrals:** Calculate based on persona's deferral rate × salary, subject to:
   - 402(g) elective deferral limit ($23,500 for 2026)
   - Catch-up contributions if age 50+ ($7,500) or age 60–63 super catch-up ($11,250)
   - Auto-escalation applied annually if enabled (deferral_rate += escalation_rate, capped at escalation_cap)

3. **Employer match:** Apply tiered match formula against employee deferral rate. Match is computed on compensation capped at the IRS compensation limit.

4. **Employer core contribution:** Apply fixed percentage or age/service-tiered rate against compensation (capped at IRS comp limit).

5. **Annual additions limit:** Total employee + employer contributions capped at 415 limit ($70,000 for 2026).

6. **Vesting:** Employer match and core contributions are vested based on the scenario's vesting schedule and the persona's tenure. Unvested amounts are excluded from the projected balance.

7. **Investment returns:** Generate annual return from the asset class return distributions based on the persona's asset allocation. For target date funds, shift allocation along the glide path each year.

8. **Rebalancing:** At year end, the portfolio is rebalanced to the target asset allocation.

9. **Balance update:** New balance = (prior balance + total vested contributions) × (1 + annual portfolio return).

**IRS Limits:** All IRS limits are held constant at current-year (2026) values throughout the projection. Limits are not inflation-adjusted.

**No Leakage:** The model assumes no loans, hardship withdrawals, or cashouts during the accumulation phase.

### 9.5 Distribution Phase (Retirement Years)

The withdrawal engine is designed as a pluggable interface (`WithdrawalStrategy`) to support the proprietary income model. A systematic withdrawal placeholder is provided for development.

**WithdrawalStrategy Protocol:**
```python
class WithdrawalStrategy(Protocol):
    def calculate_withdrawal(
        self, balance: float, year_in_retirement: int,
        retirement_balance: float, params: WithdrawalParams
    ) -> float: ...
```

**Placeholder Implementation (Systematic Withdrawal):**
For each year from retirement age to planning age:
1. Call `WithdrawalStrategy.calculate_withdrawal()` to determine annual income amount
2. Generate annual return on remaining balance based on post-retirement asset allocation (which continues to shift along the glide path through retirement)
3. New balance = (prior balance - withdrawal) × (1 + annual return)
4. If balance ≤ 0, mark simulation as "failed" (depleted before planning age)

**Income Replacement Ratio Calculation:**
- Income replacement ratio = (Annual retirement income from plan + optional Social Security) / (Final pre-retirement salary)
- All values are expressed in pre-tax, today's dollars
- The income replacement ratio is calculated at each confidence level (50%, 75%, 90%)

### 9.6 Social Security Estimation

The Social Security estimator follows the Fidelity GRP Social Security Methodology, simplified for hypothetical persona modeling.

**Inputs:**
- Current age
- Current annual compensation (salary)
- Retirement age (defaults to 67)
- Social Security claiming age (defaults to 67, configurable 62–70)

**Estimation Method:**
1. Assume employment start age of 22
2. Estimate prior income history using the national average wage index (AWI) for each year, scaled to the persona's current compensation level
3. Project future income using the salary growth assumption until the earlier of claiming age or retirement age
4. Cap each year's earnings at the Social Security taxable maximum ($176,100 for 2026)
5. Select the top 35 years of highest indexed earnings to calculate Average Indexed Monthly Earnings (AIME)
6. Apply the SSA bend-point formula to AIME to calculate Primary Insurance Amount (PIA)
7. Adjust PIA for claiming age relative to Full Retirement Age (67 for those born 1960+):
   - Claiming before FRA: reduce benefit (up to ~30% reduction at age 62)
   - Claiming after FRA: increase benefit by 8% per year of deferral up to age 70
8. Social Security benefit is assumed to grow at the 2.5% inflation rate in the projection

**Per-Persona Toggle:** Social Security can be included or excluded from the income replacement calculation for each persona. This allows modeling of income replacement from the plan design alone vs. total retirement income.

### 9.7 Key Assumptions Summary

| Assumption | Default Value | Source/Basis |
|---|---|---|
| General inflation rate | 2.5% | P&GC default |
| Salary growth rate | Inflation + 1.5% (4.0%) | Dept. of Labor / Census Bureau |
| Default retirement age | 67 | SSA Full Retirement Age |
| Default planning age | 93 | P&GC default (25% longevity age per RP-2014 mortality tables) |
| Monte Carlo simulations | 250 | P&GC default |
| IRS compensation limit | $345,000 (2026) | Held constant |
| 402(g) deferral limit | $23,500 (2026) | Held constant |
| 415 annual additions limit | $70,000 (2026) | Held constant |
| Catch-up (50+) | $7,500 (2026) | Held constant |
| Super catch-up (60–63) | $11,250 (2026) | Held constant |
| SS taxable maximum | $176,100 (2026) | Held constant |
| Social Security COLA | 2.5% (inflation rate) | P&GC assumption |
| Portfolio rebalancing | Annually | P&GC methodology |
| Leakage (loans, hardships) | None | v1 simplification |
| Tax treatment | Pre-tax, today's dollars | v1 simplification |

### 9.8 Methodology Disclaimer

All projections generated by RetireModel are hypothetical in nature, do not reflect actual investment results, and are not guarantees of future results. The tool uses historical returns based primarily on index performance rather than on the performance of any one security. Past performance is no guarantee of future results. It is not possible to invest directly in an index. Performance returns for actual investments will generally be reduced by fees and expenses not reflected in these hypothetical illustrations. Results may vary with each use and over time.

---

## 10. Non-Functional Requirements

**Performance:**
- Deterministic projection (single employee, no Monte Carlo): < 100ms
- Monte Carlo (250 runs, single employee): < 1 second
- Monte Carlo (250 runs, 8 personas): < 3 seconds
- Monte Carlo (1,000 runs, 8 personas): < 10 seconds
- Frontend rendering of results: < 500ms after API response

**Data Persistence:**
- Each workspace stores its own DuckDB file(s) for simulation results
- Workspace metadata and config stored as JSON/YAML on the filesystem
- Filesystem-backed at `~/.retiremodel/workspaces/` (configurable via env var)
- No external database dependencies
- Workspaces exportable as portable archives for sharing

**Browser Support:**
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Responsive down to 1024px width (primary use is desktop)

**Security:**
- Single-user desktop/local deployment (no auth required for v1)
- No PII stored — all employee data is hypothetical

---

## 11. Future Considerations (Out of Scope for v1)

- Roth / after-tax deferral split and tax-aware modeling
- Detailed PIA / bend-point Social Security calculation
- In-plan Roth conversions and mega backdoor Roth
- Guyton-Klinger guardrails withdrawal strategy option
- IRS limit inflation projections
- Leakage modeling (loans, hardships, cashouts)
- Multi-user support with authentication
- Defined benefit plan modeling
- HSA and ESPP integration
- Actual participant data import (census file upload)
- PDF report generation with branded templates
- SECURE 2.0 provision modeling (student loan match, emergency savings, etc.)
- Employer cost impact analysis (aggregate cost across workforce)
- Integration with PlanAlign platform

---

## 12. Spec-Kit Specify Statements

The following `/speckit.specify` statements are ordered for incremental delivery. Each produces a feature specification that feeds into the `/speckit.plan` → `/speckit.tasks` → `/speckit.implement` workflow in GitHub Copilot.

---

### S01 — Project Scaffolding & Constitution

```
/speckit.specify Bootstrap the RetireModel project with a Python 3.12 FastAPI backend 
and React 19 + TypeScript + Vite frontend. The backend serves the API, the frontend is 
a separate SPA. Establish the workspace filesystem structure at ~/.retiremodel/workspaces/. 
No features yet — just the skeleton, dev server, and health check endpoint.
```

**Produces:** Working monorepo with backend (`/api`) and frontend (`/app`), `GET /api/v1/health` returns 200, Vite dev server proxies to FastAPI, and the `~/.retiremodel/workspaces/` directory is created on first run.

---

### S02 — Pydantic Data Models

```
/speckit.specify Define the core Pydantic data models for RetireModel: Workspace, 
Scenario, PlanDesign (with tiered match formula, non-elective core contribution, 
auto-enrollment and auto-escalation settings, vesting schedules), Persona (age, tenure, 
salary, deferral rate, current balance, asset allocation as target-date or custom mix), 
Assumptions (return/risk by asset class, IRS limits, inflation, wage growth), and 
MonteCarloConfig. All models should have sensible defaults and full validation. Include 
a default set of 8 employee personas spanning early career to near retirement.
```

**Produces:** Validated Pydantic models importable across the backend, a `defaults.py` with the 8 persona definitions, and JSON schema export for frontend consumption.

---

### S03 — Workspace CRUD & Filesystem Persistence

```
/speckit.specify Build workspace management: create, list, get, update, and delete 
workspaces. Each workspace has a client name, base configuration (assumptions + default 
personas), and stores as JSON/YAML files under ~/.retiremodel/workspaces/{workspace_id}/. 
Scenarios live inside workspaces. Support configuration inheritance where scenarios 
deep-merge their overrides with the workspace base config. Expose REST endpoints for 
all CRUD operations.
```

**Produces:** Full workspace lifecycle via API, filesystem-backed storage with the directory structure from the PRD, and config merging logic (with atomic replacement for seed-config sections).

---

### S04 — Scenario CRUD & Plan Design Entry

```
/speckit.specify Build scenario management within a workspace: create, list, get, 
update, delete, and duplicate scenarios. Each scenario contains a plan design (match 
formula with up to 3 tiers, non-elective core contribution with optional age/service 
tiers, auto-enrollment settings, auto-escalation settings, vesting schedules, and 
eligibility waiting periods) and optional assumption overrides. Duplicating a scenario 
copies the plan design so users can create variants quickly.
```

**Produces:** Scenario CRUD endpoints nested under `/api/v1/workspaces/{workspace_id}/scenarios/`, duplicate operation, and plan design validation including IRS limit checks.

---

### S05 — Monte Carlo Simulation Engine

```
/speckit.specify Build the Monte Carlo simulation engine following the Fidelity P&GC 
methodology documented in PRD Section 9. Given a plan design, a persona, and assumptions, 
simulate the accumulation phase year-by-year from current age to retirement age: apply 
wage growth at inflation + 1.5%, calculate employee deferrals with auto-escalation and 
IRS limits (held constant at 2026 values), calculate employer match per tiered formula, 
calculate employer core contributions, enforce the 415 annual additions limit, apply 
vesting based on tenure, and generate annual returns by randomly sampling from historical 
asset class return distributions (domestic equity, foreign equity, bonds, short-term) 
using their historical mean, standard deviation, and correlations since 1926. Support 
nine target asset mixes and target-date fund glide paths per the P&GC definitions. 
Run 250 simulations by default (configurable up to 1,000). Portfolio is rebalanced 
annually. All values are pre-tax in today's dollars. Output percentile balances 
(50th, 75th, 90th) at retirement, probability of success, and year-by-year trajectory 
data for charting.
```

**Produces:** A `SimulationEngine` class with historical return sampling (not hardcoded means/stds), the nine P&GC asset mixes, target-date glide path logic, an API endpoint `POST /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate`, and response model with per-persona results at all confidence levels.

---

### S06 — Withdrawal Strategy Interface & Placeholder

```
/speckit.specify Design a pluggable withdrawal strategy interface for the distribution 
phase (retirement age to planning age). Define a WithdrawalStrategy protocol with a 
calculate_withdrawal method that takes current balance, year in retirement, initial 
retirement balance, and parameters. Implement a systematic withdrawal placeholder that 
calculates a level real (inflation-adjusted) annual withdrawal amount designed to 
deplete the portfolio to $0 at the planning age. The post-retirement asset allocation 
continues to shift along the target-date glide path through retirement. The interface 
must be designed so that our proprietary income model can be bolted on later as a 
drop-in replacement without changing the simulation engine.
```

**Produces:** `WithdrawalStrategy` Protocol, `SystematicWithdrawal` implementation, distribution phase integrated into the simulation engine, probability-of-success calculation (% of runs with ≥$1 at planning age), and income replacement ratio output at 50th, 75th, and 90th percentiles.

---

### S07 — Social Security Estimation

```
/speckit.specify Add a Social Security benefit estimator following the Fidelity GRP 
Social Security Methodology. Inputs are current age, current compensation, retirement 
age, and claiming age (configurable 62-70, default 67). The estimator assumes 
employment start at age 22, reconstructs an earnings history using the national 
average wage index (AWI) scaled to current compensation, caps each year at the SS 
taxable maximum, selects the top 35 years of indexed earnings to compute AIME, applies 
the SSA bend-point formula for PIA, and adjusts for early/delayed claiming relative 
to Full Retirement Age. Benefits grow at the 2.5% inflation rate. This should be a 
toggleable component per persona — users can include or exclude Social Security from 
the income replacement calculation.
```

**Produces:** `SocialSecurityEstimator` module implementing the AIME/PIA/bend-point calculation, AWI-based earnings history reconstruction, claiming age adjustment, integration with simulation results (SS income added to plan income for total replacement ratio), and per-persona toggle.

---

### S08 — Frontend Shell & Design System

```
/speckit.specify Build the React frontend shell following this design system: Tailwind 
CSS via CDN, Roboto font from Google Fonts, light gray background (bg-gray-50), white 
cards with rounded-xl shadow-sm border border-gray-100, fixed sidebar (w-64) with nav 
items and collapsible dropdowns, top header bar, primary brand color #00853F, Lucide 
React icons. Include a workspace selector dropdown in the sidebar header, navigation 
for Dashboard, Persona Modeling, Plan Comparison, Scenarios, and Settings pages. All 
pages are placeholder stubs for now. Clean enterprise SaaS aesthetic, no flashy animations.  please look at /examples/ for the details from our sister application, Fidelity PlanAlign for your inspiration./
```

**Produces:** Fully styled app shell with routing, workspace selector that hits the workspace list API, sidebar navigation, and placeholder page components.

---

### S09 — Workspace & Scenario Management UI

```
/speckit.specify Build the workspace management UI: a landing page showing recent 
workspaces as cards with client name, scenario count, and last modified date. Include 
create workspace flow (client name, optional base config customization), workspace 
settings page for editing base assumptions and the default persona set. Build the 
scenario list view within a workspace showing each scenario's plan design summary as 
a card, with create, duplicate, and delete actions.
```

**Produces:** Workspace dashboard page, workspace creation modal/flow, workspace settings page, scenario list with cards, and all CRUD wired to the backend API.

---

### S10 — Plan Design Configuration Form

```
/speckit.specify Build the plan design configuration form used when creating or editing 
a scenario. The form should be a card-based layout with sections for: employer match 
formula (add/remove tiers, each with match rate and "on first X%" input), employer 
non-elective core contribution (fixed % or age/service-tiered schedule), auto-enrollment 
toggle with default deferral rate, auto-escalation toggle with rate and cap, vesting 
schedule selectors for both match and core, and eligibility waiting period dropdowns. 
Include real-time validation and a summary card that shows the effective employer 
contribution at various deferral levels (e.g., "If employee defers 6%, employer 
contributes 7%").
```

**Produces:** Interactive plan design form component, real-time contribution summary, validation, and save-to-scenario API integration.

---

### S11 — Persona Gallery & Editor

```
/speckit.specify Build the persona gallery: a grid of persona cards showing name, 
label (e.g., "Early Career Entry-Level"), age, salary, deferral rate, and current 
balance. Clicking a card opens an inline editor to modify any field. Users can add 
custom personas (up to 12 total), delete/hide personas from the active set, and reset 
to the workspace defaults. Asset allocation is configured as either a target-date fund 
vintage selector or a custom stock/bond/cash percentage split with a visual donut chart. 
Include a Social Security toggle per persona.
```

**Produces:** Persona gallery grid, inline edit mode, add/delete/reset functionality, asset allocation selector with donut chart preview, all persisted to workspace config.

---

### S12 — Persona Modeling Results Dashboard

```
/speckit.specify Build the results dashboard for persona modeling. After running a 
simulation for all active personas against the current scenario's plan design, display: 
(1) a grouped bar chart of income replacement ratio by persona with 70% and 80% 
reference lines, (2) a line chart showing balance accumulation trajectories from 
current age through retirement with shaded confidence bands, (3) a summary data table 
with columns for persona name, projected balance at retirement, annual retirement 
income, income replacement ratio, probability of success, total employer contributions, 
and total employee contributions. Include a confidence level toggle (50% | 75% | 90%) 
that updates all visualizations. Use Recharts for all charts.
```

**Produces:** Results dashboard page with three visualization components, confidence level toggle, loading states during simulation, and responsive layout.

---

### S13 — Plan Comparison: Scenario Selection & Results

```
/speckit.specify Build the plan comparison page. Users select 2-4 scenarios from the 
current workspace and a single persona (or cycle through personas). Run simulations 
for the selected persona against each scenario's plan design and display: (1) side-by-side 
bar chart of income replacement ratio by scenario, (2) overlay line chart of balance 
trajectories colored by scenario, (3) comparison table showing key metrics by scenario 
with delta columns highlighting the differences. Include employer cost per employee 
(annual and cumulative) and the deferral rate required to reach 80% income replacement 
in each plan. Persist comparison results to the workspace.
```

**Produces:** Plan comparison page, scenario multi-select, single-persona selector, comparison visualizations, delta analysis, and comparison result persistence.

---

### S14 — Workspace Export & Import

```
/speckit.specify Add workspace export and import. Export packages the entire workspace 
(metadata, base config, all scenarios, and simulation results) into a portable archive 
file. Import accepts an archive, validates its structure, and creates a new workspace — 
with conflict resolution if a workspace with the same name exists (rename, replace, 
or skip). The export/import should be accessible from both the workspace list page and 
individual workspace settings.
```

**Produces:** Export/import API endpoints, archive creation (ZIP with manifest), import validation, conflict resolution UI, and download/upload flows in the frontend.

---

### S15 — Scenario Results Export (CSV)

```
/speckit.specify Add the ability to export simulation results from a scenario as a 
CSV file. The CSV should include one row per persona with columns for all key metrics 
(projected balance, income replacement ratio at each confidence level, probability of 
success, total contributions). Include a header section with the plan design summary 
and assumptions used. Accessible via a download button on the results dashboard.
```

**Produces:** CSV export API endpoint, formatted output with plan design header, and download button in the results dashboard UI.

---

### S16 — Global Settings & Assumption Defaults

```
/speckit.specify Build the settings page with two sections: (1) global defaults for 
new workspaces including inflation rate (default 2.5%), salary growth rate (default 
inflation + 1.5%), current-year IRS limits (compensation limit, deferral limit, 
additions limit, catch-up limits, SS taxable maximum), and the historical data 
year range used for return sampling; (2) Monte Carlo configuration defaults including 
number of simulations (default 250), retirement age (default 67), planning age 
(default 93), and Social Security claiming age (default 67). Changes to global 
defaults apply to newly created workspaces but do not retroactively change existing 
ones. Include a "restore system defaults" button.
```

**Produces:** Settings page with editable assumption tables and Monte Carlo config, persistence to a global config file, and restore defaults functionality.

---

## 13. Design Decisions (Resolved)

1. **Deferrals are pre-tax only for v1.** All calculations are in pre-tax, today's dollars. Roth/after-tax split is a future enhancement.
2. **Social Security estimation uses current age and income as inputs.** No detailed PIA or bend-point calculation needed — the model derives an estimate from these two inputs.
3. **No in-plan Roth conversions or mega backdoor Roth modeling.** Out of scope for v1.
4. **Withdrawal strategy will use a proprietary income model** that calculates sustainable annual withdrawals while remaining invested in the market. The 4% rule serves as a placeholder during development; the production withdrawal engine will be bolted on as a separate module. The API should be designed with a pluggable `WithdrawalStrategy` interface to accommodate this.
5. **IRS limits hold constant at current-year values.** No inflation projection on contribution limits.
6. **No leakage modeling.** Loans, hardship withdrawals, and cashouts are excluded from v1.

## 14. Open Questions

_(None remaining for v1 scope.)_