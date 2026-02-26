# Product Requirements Document: RetireModel

**Version:** 1.0  
**Author:** Nick Amaral  
**Date:** February 24, 2026  
**Status:** Draft

---

## 1. Executive Summary

RetireModel is a retirement plan income replacement modeling tool that enables plan sponsors, consultants, and analysts to simulate retirement outcomes for hypothetical employees under various plan designs. The application combines Monte Carlo simulation with an intuitive, card-based interface to help users understand how plan design decisions—deferral rates, match formulas, non-elective contributions, and asset allocation—translate into real retirement income replacement ratios and probability of success.

The tool supports two primary workflows: modeling multiple employee personas against a single plan design, and comparing multiple plan designs for a single employee. Results are presented as income replacement ratios, probability of success (the percentage of Monte Carlo scenarios in which total retirement income covers estimated expenses through the planning age), and balance trajectories at configurable confidence levels. Retirement expense targets are derived from income-based replacement ratio benchmarks that reflect the combined adequacy of DC plan income and Social Security.

---

## 2. Problem Statement

Retirement plan sponsors and their advisors need to evaluate whether a plan design will deliver adequate retirement income for employees across the compensation and tenure spectrum. Currently, this analysis requires either expensive proprietary tools or manual spreadsheet modeling that's error-prone and difficult to iterate on. There is no lightweight, self-contained tool that allows rapid plan design iteration with immediate visual feedback on projected outcomes across multiple employee profiles simultaneously.

---

## 3. Goals & Success Metrics

**Goals:**
- Enable rapid "what-if" plan design modeling with sub-second feedback for deterministic projections and under 5 seconds for Monte Carlo simulations
- Provide clear, visual comparison of retirement outcomes across employee personas and plan designs
- Support the full range of common defined contribution plan design elements (match, non-elective, auto-enroll, auto-escalation)
- Deliver results as income replacement ratios and probability of success at multiple confidence levels
- Simulate the full retirement lifecycle (accumulation through decumulation to planning age) to measure whether plan designs produce adequate retirement income

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
- Annual compensation limit ($360,000 for 2026, auto-populated)
- 402(g) deferral limit ($24,500 for 2026, auto-populated)
- 415 annual additions limit ($72,000 for 2026, auto-populated)
- Catch-up contribution limit for 50+ ($8,000 for 2026)
- Super catch-up for 60-63 ($11,250 for 2026)
- Wage growth assumption (default: inflation + 1.5% = 4.0%)
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
- Probability of success: percentage of simulation runs where total retirement income (DC plan withdrawals + Social Security) covers estimated retirement expenses through the planning age with ≥$1 remaining

**Retirement Expense Target (Income-Based Replacement Ratios):**

Estimated retirement expenses are derived from income-based replacement ratio targets. These targets represent the percentage of pre-retirement income needed in retirement to maintain living standards, considering the combined effect of DC plan income and Social Security. The ratios decrease at higher income levels because Social Security replaces a smaller percentage of income, and higher earners typically have lower marginal spending rates.

| Pre-Retirement Income | Target Replacement Ratio | Basis |
|---|---|---|
| Less than $50,000 | 80% | Higher SS replacement, lower savings capacity |
| $50,000 – $80,000 | 77% | Moderate SS replacement |
| $80,000 – $120,000 | 72% | SS replacement declining as % of income |
| $120,000 – $250,000 | 62% | Lower marginal spending rate, SS caps |
| More than $250,000 | 55% | High earners spend smaller fraction of income |

The target replacement ratio is applied to projected final pre-retirement salary (grown at the wage growth rate from current salary) to compute annual retirement expense need. This expense need is the benchmark against which probability of success is measured. The expense target is expressed in today's dollars and grows at the general inflation rate (2.5%) during the decumulation phase.

**Retirement Income Calculation:**
- All values expressed in pre-tax, today's dollars
- Retirement age: 67 (default, configurable 55-70)
- Planning age (mortality assumption): 93 (default, configurable 85-100)
- Simulation runs full lifecycle: accumulation (working years) + decumulation (retirement years through planning age)
- Withdrawal strategy: Pluggable engine (systematic withdrawal default; proprietary model to be integrated)
- Social Security: Estimated based on current age and current income, optional inclusion
- Income replacement ratio = (Annual retirement income from plan + optional Social Security) / (Final pre-retirement salary)
- Probability of success = (Number of scenarios where total income ≥ expenses every year through planning age) / (Total scenarios)
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
- Annual retirement income at selected confidence level (DC plan withdrawals + optional Social Security)
- Income replacement ratio (%)
- Target replacement ratio (%) — from income-based lookup table
- Estimated annual retirement expense need ($) — target ratio × projected final salary
- Probability of success (% of runs where income covers expenses through planning age)
- Probability of success assessment (On Target / High / Needs Refinement / Needs Adjustment / Needs Reassessment)
- Shortfall age (median age of asset exhaustion in failed scenarios, if applicable)
- Total employer contributions over career
- Total employee contributions over career

**Visualizations:**
- Grouped bar chart: Income replacement ratio by persona at selected confidence level, with per-persona target replacement ratio shown as individual reference markers (not a single horizontal line — each persona has a different target based on their income level)
- Line chart: Balance accumulation and decumulation trajectories from current age through planning age (93) for all personas (median with shaded confidence bands), showing both growth and drawdown phases
- Stacked area chart: Contribution source breakdown (employee deferral, match, core) over time for selected persona
- Probability of success dial/gauge per persona with Fidelity-style assessment bands
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
- Probability of success delta between plans (with assessment labels)
- Employer cost per employee (annual and cumulative)
- Employee contribution required to hit target replacement ratio
- Projected balance at retirement
- Shortfall age in failed scenarios (if applicable)

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

# Income-based replacement ratio targets (DC + Social Security combined)
# Applied to projected final pre-retirement salary to derive expense target
REPLACEMENT_RATIO_TABLE: list[tuple[float, float, float]] = [
    # (income_floor, income_ceiling, target_ratio)
    (0,       50_000,  0.80),   # <$50k:     80%
    (50_000,  80_000,  0.77),   # $50k-$80k: 77%
    (80_000,  120_000, 0.72),   # $80k-$120k:72%
    (120_000, 250_000, 0.62),   # $120k-$250k:62%
    (250_000, float('inf'), 0.55),  # >$250k: 55%
]

def get_target_replacement_ratio(pre_retirement_income: float) -> float:
    """Look up the target replacement ratio based on pre-retirement income."""
    for floor, ceiling, ratio in REPLACEMENT_RATIO_TABLE:
        if floor <= pre_retirement_income < ceiling:
            return ratio
    return 0.55  # Default for very high earners

class ExpenseTarget(BaseModel):
    """Retirement expense target derived from income-based replacement ratios."""
    target_replacement_ratio: float    # From lookup table (e.g., 0.72 for $80k-$120k)
    projected_final_salary: float      # Salary grown at wage_growth_rate to retirement
    annual_expense_need: float         # target_ratio × projected_final_salary (today's $)
    expense_inflation_rate: float = 0.025  # General inflation, applied during decumulation

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
    comp_limit: float = 360000               # 2026, held constant
    deferral_limit: float = 24500            # 2026 402(g), held constant
    additions_limit: float = 72000           # 2026 415, held constant
    catchup_limit: float = 8000              # 2026, held constant
    super_catchup_limit: float = 11250       # 2026, held constant
    ss_taxable_max: float = 184500           # 2026, held constant

class PersonaResult(BaseModel):
    persona_id: str
    projected_balance_at_retirement: dict[str, float]  # confidence -> value
    annual_retirement_income: dict[str, float]         # DC withdrawals at each confidence
    annual_ss_benefit: float                           # Social Security annual (0 if excluded)
    total_annual_income: dict[str, float]              # DC + SS at each confidence
    income_replacement_ratio: dict[str, float]         # total_income / final_salary
    expense_target: ExpenseTarget                      # Derived from income-based lookup
    probability_of_success: float                      # 0.0 to 1.0
    probability_assessment: Literal[
        "On Target",           # 90%+
        "High",                # 75-89%
        "Needs Refinement",    # 50-74%
        "Needs Adjustment",    # 25-49%
        "Needs Reassessment"   # <25%
    ]
    shortfall_age: int | None = None                   # Median age of depletion in failed runs
    total_employer_contributions: float
    total_employee_contributions: float
    balance_trajectory: list[dict]  # Year-by-year for charting (accumulation + decumulation)
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

**Probability of Success:** Total number of successful market scenarios divided by total number of market scenarios. A successful scenario is one in which total retirement income (DC plan withdrawals + Social Security) fully covers estimated retirement expenses (derived from the income-based replacement ratio target) through the planning age with at least $1 of portfolio balance remaining. See Section 9.5 for the full decumulation methodology and assessment bands.

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

**Target Date Fund Glide Path — Fidelity Freedom Fund:**

When a persona selects a target date fund vintage, the allocation follows the Fidelity Freedom Fund glide path — a single curve parameterized by years-to-target-date. All vintages follow the same curve; the vintage determines the entry point. The allocation shifts automatically each simulation year as `years_to_target = vintage - sim_year` changes.

The glide path uses four simplified asset classes (US Equity, International Equity, Bonds, Short-Term) mapped from the Fidelity Freedom Fund revised strategic asset allocation (effective Q1 2027, per institutional.fidelity.com). The engine linearly interpolates between the data points below for any intermediate year. Values are clamped at the endpoints.

| Years to Target | US Equity | Intl Equity | Total Equity | Bonds | Short-Term |
|---|---|---|---|---|---|
| +30 or more | 57.0% | 38.0% | 95.0% | 5.0% | 0.0% |
| +24 | 55.4% | 37.0% | 92.4% | 7.6% | 0.0% |
| +19 | 53.9% | 35.9% | 89.8% | 10.2% | 0.0% |
| +14 | 48.6% | 32.4% | 81.0% | 19.0% | 0.0% |
| +9 | 39.9% | 26.6% | 66.5% | 31.5% | 2.0% |
| +4 | 34.6% | 23.1% | 57.7% | 35.3% | 7.0% |
| 0 (at target) | 30.7% | 20.5% | 51.2% | 36.8% | 12.0% |
| −6 | 25.8% | 17.2% | 43.0% | 42.7% | 14.3% |
| −11 | 21.6% | 14.4% | 36.0% | 44.6% | 19.4% |
| −16 | 18.3% | 12.2% | 30.5% | 45.7% | 23.8% |
| −19 or beyond (terminal) | 16.8% | 11.2% | 28.0% | 43.0% | 29.0% |

**Glide Path Implementation Notes:**
1. The curve is stored as a lookup table of ~11 data points keyed by `years_to_target`.
2. For any simulation year: `years_to_target = persona.target_date_vintage - current_sim_year`.
3. Linearly interpolate each of the four asset class percentages between the two nearest data points.
4. Clamp: for 30+ years out, use the maximum equity allocation (95%); for 19+ years past target, use the terminal allocation (28% equity).
5. The equity split remains ~60/40 domestic/international across the entire glide path.
6. The glide path continues through retirement — the allocation keeps shifting toward the terminal allocation during the decumulation phase. This means a Freedom 2035 Fund holder who retires in 2035 continues to de-risk through 2054 (19 years post-target) when the allocation reaches terminal.
7. All vintages eventually converge to the terminal allocation (equivalent to the Fidelity Freedom Retirement Fund): ~17% US equity, ~11% international equity, ~43% bonds, ~29% short-term.

### 9.4 Phase 1: Accumulation (Working Years)

For each simulation run and each year from current age to retirement age:

1. **Wage growth:** Apply salary growth rate (default: inflation + 1.5%, per P&GC methodology using Department of Labor and Census Bureau data). Salary is capped at the IRS compensation limit ($360,000 for 2026, held constant).

2. **Employee deferrals:** Calculate based on persona's deferral rate × salary, subject to:
   - 402(g) elective deferral limit ($24,500 for 2026)
   - Catch-up contributions if age 50+ ($8,000) or age 60–63 super catch-up ($11,250)
   - Auto-escalation applied annually if enabled (deferral_rate += escalation_rate, capped at escalation_cap)

3. **Employer match:** Apply tiered match formula against employee deferral rate. Match is computed on compensation capped at the IRS compensation limit.

4. **Employer core contribution:** Apply fixed percentage or age/service-tiered rate against compensation (capped at IRS comp limit).

5. **Annual additions limit:** Total employee + employer contributions capped at 415 limit ($72,000 for 2026).

6. **Vesting:** Employer match and core contributions are vested based on the scenario's vesting schedule and the persona's tenure. Unvested amounts are excluded from the projected balance.

7. **Investment returns:** Generate annual return from the asset class return distributions based on the persona's asset allocation. For target date funds, shift allocation along the glide path each year.

8. **Rebalancing:** At year end, the portfolio is rebalanced to the target asset allocation.

9. **Balance update:** New balance = (prior balance + total vested contributions) × (1 + annual portfolio return).

**IRS Limits:** All IRS limits are held constant at current-year (2026) values throughout the projection. Limits are not inflation-adjusted.

**No Leakage:** The model assumes no loans, hardship withdrawals, or cashouts during the accumulation phase.

### 9.5 Phase 2: Decumulation (Retirement Years)

The simulation continues from retirement age through planning age (default 93), running a year-by-year cash flow engine that tests whether the plan design produces sufficient income to cover estimated retirement expenses.

**Retirement Expense Target Derivation:**

At the start of simulation, the engine computes each persona's annual retirement expense need:

1. **Project final pre-retirement salary:** Grow current salary at the wage growth rate (inflation + 1.5%) from current age to retirement age, subject to the IRS compensation limit.
2. **Look up target replacement ratio** based on projected final salary:

| Pre-Retirement Income | Target Replacement Ratio |
|---|---|
| Less than $50,000 | 80% |
| $50,000 – $80,000 | 77% |
| $80,000 – $120,000 | 72% |
| $120,000 – $250,000 | 62% |
| More than $250,000 | 55% |

These targets represent the total income needed from all sources (DC plan + Social Security) to maintain pre-retirement living standards. The ratios decrease at higher income levels because Social Security replaces a smaller fraction of income and higher earners typically have lower marginal spending rates.

3. **Compute annual expense need:** `annual_expense = target_replacement_ratio × projected_final_salary`. This is expressed in today's dollars and grows at the general inflation rate (2.5%) each year during retirement.

**Annual Decumulation Logic:**

For each simulation run and each year from retirement age to planning age, the engine processes events in this order (following the P&GC event-driven methodology):

1. **Apply investment returns:** Generate annual return on the portfolio balance based on the persona's asset allocation. For target-date funds, the allocation continues to shift along the Fidelity Freedom Fund glide path through retirement toward the terminal allocation.

2. **Compute expense need for the year:** The annual expense target, inflation-adjusted to the current simulation year.

3. **Compute total income available:**
   - Social Security benefit (if included for this persona), inflation-adjusted
   - Any other modeled income sources

4. **Compute withdrawal needed:** `withdrawal = expense_need - social_security - other_income`. If income sources fully cover expenses, withdrawal = $0 (surplus remains invested).

5. **Execute withdrawal:** Deduct the withdrawal amount from the portfolio balance.

6. **Rebalance:** At year end, rebalance remaining portfolio to the target asset allocation.

7. **Check for depletion:** If portfolio balance ≤ $0, mark this simulation run as "failed" and record the age at which depletion occurred (the "shortfall age").

**Withdrawal Strategy Interface:**

The withdrawal engine is designed as a pluggable interface (`WithdrawalStrategy`) to support the proprietary income model. The default implementation uses the expense-gap method described above.

```python
class WithdrawalStrategy(Protocol):
    def calculate_annual_withdrawal(
        self,
        balance: float,
        year_in_retirement: int,
        expense_need: float,
        social_security_income: float,
        other_income: float,
        params: WithdrawalParams
    ) -> float:
        """Return the withdrawal amount from the DC plan for this year."""
        ...
```

**Default Implementation (Expense-Gap Withdrawal):**
Withdraws exactly the amount needed to cover the gap between expenses and other income. If the gap exceeds the remaining balance, the full balance is withdrawn and the scenario records a partial shortfall for that year.

The pluggable interface allows the proprietary income model to be bolted on as a drop-in replacement without changing the simulation engine. The proprietary model may implement more sophisticated strategies (dynamic withdrawal rates, guardrails, etc.) while the engine only calls `calculate_annual_withdrawal()`.

**Probability of Success Calculation:**

After all 250 (or configured) simulation runs complete:

```
probability_of_success = count(scenarios where balance > $0 at planning age) / total_scenarios
```

A "successful" scenario is one in which the portfolio balance remains positive through the entire planning horizon — meaning total retirement income (withdrawals + Social Security) covered expenses every year with at least $1 remaining at the planning age.

**Probability of Success Assessment Bands** (aligned with Fidelity P&GC):

| Probability of Success | Assessment | Interpretation |
|---|---|---|
| 90%+ | On Target | Plan likely succeeds even in significantly below-average markets |
| 75% – 89% | High | High likelihood of meeting income needs |
| 50% – 74% | Needs Refinement | Plan may not succeed in below-average markets |
| 25% – 49% | Needs Adjustment | Plan most likely requires changes |
| < 25% | Needs Reassessment | Plan may only succeed in above-average markets |

**Shortfall Age:** For failed scenarios, the engine records the age at which the portfolio was exhausted. The median shortfall age across all failed runs is reported, giving users a sense of how close the plan came to working (e.g., "assets depleted at median age 87 in failed scenarios" is much more informative than just "78% probability of success").

**Income Replacement Ratio Calculation:**
- Income replacement ratio = (Annual DC withdrawal + optional Social Security) / (Final pre-retirement salary)
- All values are expressed in pre-tax, today's dollars
- The income replacement ratio is calculated at each confidence level (50%, 75%, 90%)
- The ratio is compared against the persona's target replacement ratio from the income-based lookup table

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
4. Cap each year's earnings at the Social Security taxable maximum ($184,500 for 2026)
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
| Target replacement ratio | 55%–80% by income band | Income-based lookup table (see Section 9.5) |
| Expense inflation rate | 2.5% (general inflation) | P&GC default; v2 may add healthcare schedule |
| Probability of success threshold | 90% = "On Target" | Aligned with P&GC assessment bands |
| Fidelity Freedom Fund glide path | Revised strategic allocation (Q1 2027) | institutional.fidelity.com |
| Terminal TDF allocation | 17% US / 11% Intl / 43% Bonds / 29% ST | Freedom Retirement Fund |
| IRS compensation limit | $360,000 (2026) | Held constant |
| 402(g) deferral limit | $23,500 (2026) | Held constant |
| 415 annual additions limit | $72,000 (2026) | Held constant |
| Catch-up (50+) | $8,000 (2026) | Held constant |
| Super catch-up (60–63) | $11,250 (2026) | Held constant |
| SS taxable maximum | $184,500 (2026) | Held constant |
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
- Healthcare expense inflation schedule (starting at 4.9%, declining to general inflation per Fidelity research) as a separate inflation rate on 15% of estimated expenses
- User-overridable expense targets (allow plan sponsors to enter custom replacement ratio targets instead of using the income-based lookup table)
- Detailed expense categories (essential vs. discretionary, long-term care events)
- Tax-aware withdrawal strategies (mix of taxable/tax-deferred/tax-exempt account drawdown to minimize lifetime taxes)
- Spousal/household modeling (combined planning with two earners, joint Social Security optimization)

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

### S05 — Monte Carlo Simulation Engine (Full Lifecycle)

```
/speckit.specify Build the Monte Carlo simulation engine following the Fidelity P&GC 
methodology documented in PRD Section 9. The engine runs a FULL LIFECYCLE simulation 
for each persona — both accumulation (working years) and decumulation (retirement through 
planning age 93).

ACCUMULATION PHASE (current age → retirement age): For each simulation run and each 
year, apply wage growth at inflation + 1.5%, calculate employee deferrals with 
auto-escalation and IRS limits (held constant at 2026 values), calculate employer match 
per tiered formula, calculate employer core contributions, enforce the 415 annual 
additions limit, apply vesting based on tenure, and generate annual returns by randomly 
sampling from historical asset class return distributions (domestic equity, foreign 
equity, bonds, short-term) using their historical mean, standard deviation, and 
correlations since 1926. 

ASSET ALLOCATION: Support nine target asset mixes per the P&GC definitions AND the 
Fidelity Freedom Fund glide path. The Freedom Fund glide path is a single curve 
parameterized by years_to_target = vintage - sim_year, with 11 data points from +30 
years (95% equity) through -19 years terminal (28% equity). Linearly interpolate between 
data points. The glide path continues shifting through retirement — it does NOT freeze 
at retirement age. Store the glide path as a lookup table:
+30: 57.0/38.0/5.0/0.0, +24: 55.4/37.0/7.6/0.0, +19: 53.9/35.9/10.2/0.0, 
+14: 48.6/32.4/19.0/0.0, +9: 39.9/26.6/31.5/2.0, +4: 34.6/23.1/35.3/7.0, 
0: 30.7/20.5/36.8/12.0, -6: 25.8/17.2/42.7/14.3, -11: 21.6/14.4/44.6/19.4, 
-16: 18.3/12.2/45.7/23.8, -19: 16.8/11.2/43.0/29.0 (US Eq/Intl Eq/Bonds/ST).

DECUMULATION PHASE (retirement age → planning age): Each year: (1) apply investment 
returns to portfolio, (2) compute annual expense need from income-based replacement 
ratio target × projected final salary, inflation-adjusted, (3) subtract Social Security 
income, (4) withdraw the gap from portfolio, (5) rebalance, (6) if balance ≤ $0, mark 
run as failed and record shortfall age.

EXPENSE TARGET: Look up the target replacement ratio by projected final pre-retirement 
salary: <$50k=80%, $50-80k=77%, $80-120k=72%, $120-250k=62%, >$250k=55%. These targets 
represent total income needed (DC + Social Security combined).

PROBABILITY OF SUCCESS: count(runs where balance > $0 at planning age) / total runs. 
Assessment bands: 90%+=On Target, 75-89%=High, 50-74%=Needs Refinement, 
25-49%=Needs Adjustment, <25%=Needs Reassessment.

Run 250 simulations by default (configurable up to 1,000). Portfolio is rebalanced 
annually. All values are pre-tax in today's dollars. Output: percentile balances at 
retirement, income replacement ratios at 50th/75th/90th, probability of success with 
assessment, shortfall age for failed scenarios, and full year-by-year trajectory 
(accumulation + decumulation) for charting.
```

**Produces:** A `SimulationEngine` class with historical return sampling (not hardcoded means/stds), the nine P&GC asset mixes, Fidelity Freedom Fund glide path with interpolation, full lifecycle accumulation+decumulation, income-based expense target derivation, probability of success calculation with assessment bands, an API endpoint `POST /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate`, and response model with per-persona results at all confidence levels.

---

### S06 — Withdrawal Strategy Interface & Expense-Gap Default

```
/speckit.specify Design a pluggable withdrawal strategy interface for the decumulation 
phase (retirement age through planning age). Define a WithdrawalStrategy protocol with 
a calculate_annual_withdrawal method that takes current balance, year in retirement, 
annual expense need, Social Security income, other income, and parameters. Implement 
the default expense-gap withdrawal strategy: each year, withdraw exactly the amount 
needed to cover the gap between the persona's expense target and their non-portfolio 
income (Social Security + other). If the gap exceeds the remaining balance, withdraw 
the full balance and record the shortfall. The expense target is derived from the 
income-based replacement ratio lookup table (applied to projected final salary) and 
grows at the general inflation rate each year. The interface must be designed so that 
our proprietary income model can be bolted on later as a drop-in replacement without 
changing the simulation engine.
```

**Produces:** `WithdrawalStrategy` Protocol, `ExpenseGapWithdrawal` default implementation, expense target derivation from the income-based replacement ratio lookup table, integration into the simulation engine's decumulation phase, and probability-of-success calculation (% of runs with balance > $0 at planning age) with assessment bands.

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
pages are placeholder stubs for now. Clean enterprise SaaS aesthetic, no flashy animations.
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
(1) a grouped bar chart of income replacement ratio by persona with per-persona target 
replacement ratio markers (each persona has a different target based on their income 
level from the lookup table — NOT a single horizontal line), (2) a line chart showing 
balance trajectories from current age through planning age 93 for all personas (median 
with shaded confidence bands), showing both the accumulation growth phase and the 
decumulation drawdown phase, (3) a probability of success gauge/dial per persona 
colored by assessment band (green 90%+, yellow-green 75-89%, yellow 50-74%, orange 
25-49%, red <25%), (4) a summary data table with columns for persona name, projected 
balance at retirement, annual retirement income (DC + SS), income replacement ratio, 
target replacement ratio, probability of success with assessment label, shortfall age 
(if applicable), total employer contributions, and total employee contributions. Include 
a confidence level toggle (50% | 75% | 90%) that updates all visualizations. Use 
Recharts for all charts.
```

**Produces:** Results dashboard page with four visualization components (replacement ratio bar chart with per-persona targets, full lifecycle trajectory chart, probability of success gauges, summary table), confidence level toggle, loading states during simulation, and responsive layout.

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

### S15 — Scenario Results Export (Excel)

```
/speckit.specify Add the ability to export simulation results from a scenario as a 
Excel file. The Excel should include one row per persona with columns for all key metrics 
(projected balance, income replacement ratio at each confidence level, probability of 
success, total contributions). Include a header section with the plan design summary 
and assumptions used. Accessible via a download button on the results dashboard.
```

**Produces:** Excel export API endpoint, formatted output with plan design header, and download button in the results dashboard UI.

---

### S16 — Global Settings & Assumption Defaults

```
/speckit.specify Build the global settings page with two sections: 

(1) Economic & IRS assumption defaults for new workspaces: inflation rate 
(default 2.5%), salary growth rate (default inflation + 1.5% = 4.0%), 
current-year IRS limits (compensation limit $360,000, 402(g) deferral limit 
$24,500, 415 annual additions limit $72,000, catch-up 50+ $8,000, super 
catch-up 60-63 $11,250, SS taxable maximum $184,500), and target replacement 
ratio setting (default: "use income-based lookup table" with option to override 
with a flat percentage applied to all personas). 

(2) Simulation configuration defaults: retirement age (default 67), planning 
age (default 93), and Social Security claiming age (default 67). Note: number 
of simulations is fixed at 250 per the scenario matrix architecture and is 
not configurable — display it as read-only for transparency.

Global defaults are persisted to a separate config file (~/.retiremodel/global_defaults.yaml), 
distinct from any workspace config. Changes apply only to newly created workspaces 
and do not retroactively modify existing ones. Include a "restore system defaults" 
button that resets all values to the hardcoded application defaults.
Produces: Global settings page with editable assumption tables and simulation config, persistence to ~/.retiremodel/global_defaults.yaml, read-only display of fixed parameters (num_simulations=250), target replacement ratio mode selector, and restore defaults functionality.

---

## 13. Design Decisions (Resolved)

1. **Deferrals are pre-tax only for v1.** All calculations are in pre-tax, today's dollars. Roth/after-tax split is a future enhancement.
2. **Social Security estimation uses current age and income as inputs.** No detailed PIA or bend-point calculation needed — the model derives an estimate from these two inputs.
3. **No in-plan Roth conversions or mega backdoor Roth modeling.** Out of scope for v1.
4. **Withdrawal strategy uses expense-gap method as default.** Each year in retirement, the engine withdraws exactly the amount needed to cover the gap between the persona's expense target and their Social Security income. The expense target is derived from the income-based replacement ratio lookup table applied to projected final salary. The `WithdrawalStrategy` protocol supports drop-in replacement with the proprietary income model.
5. **IRS limits hold constant at current-year values.** No inflation projection on contribution limits.
6. **No leakage modeling.** Loans, hardship withdrawals, and cashouts are excluded from v1.
7. **Retirement expense targets use income-based replacement ratios, not user-entered expenses.** Since personas are hypothetical employees (not real people with detailed budgets), the income-based lookup table provides a defensible, research-backed target. The replacement ratios consider DC + Social Security combined and decrease at higher income levels.
8. **Target-date fund allocation uses the actual Fidelity Freedom Fund glide path**, not the generic nine-mix P&GC model. The glide path is parameterized by years-to-target-date with linear interpolation between 11 data points, and continues shifting through retirement to the terminal allocation.
9. **Probability of success is the primary adequacy metric.** Income replacement ratio remains as a complementary metric for plan design comparison, but probability of success (% of Monte Carlo scenarios surviving to planning age) is the headline measure of whether a plan design works for a given persona.
10. **Full lifecycle simulation.** The Monte Carlo engine runs from current age through planning age 93, not just to retirement. This is essential for probability of success and gives users visibility into the decumulation phase.

## 14. Open Questions

_(None remaining for v1 scope.)_