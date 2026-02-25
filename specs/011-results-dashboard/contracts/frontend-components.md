# UI Component Contract: Results Dashboard

**Branch**: `011-results-dashboard` | **Date**: 2026-02-24

## Component Hierarchy

```text
ResultsDashboardPage
├── ConfidenceLevelToggle
├── IncomeReplacementChart
├── TrajectoryChart
└── ResultsSummaryTable
```

## Component: ResultsDashboardPage

**Location**: `app/src/pages/ResultsDashboardPage.tsx`

**Props**: None (page-level component, receives context via `useOutletContext`)

**Responsibilities**:
- Fetch scenario details on mount to display scenario name
- Trigger simulation via `runSimulation()` when user clicks "Run Simulation" button
- Hold simulation response in local state
- Hold selected confidence level in local state (default: "75")
- Pass simulation data + confidence level to all child components
- Display loading spinner during simulation execution
- Display "Run Simulation" call-to-action when no results are available
- Display error banner with retry option if simulation fails

**State**:
- `simulationResult: SimulationResponse | null` — the full simulation response
- `confidenceLevel: ConfidenceLevel` — "50" | "75" | "90", default "75"
- `loading: boolean` — true while simulation is running
- `error: string | null` — error message from failed simulation

**Route**: `/scenarios/:scenarioId/results`

**Layout**:

```text
┌─────────────────────────────────────────────────────────┐
│  Scenario Name                    [Run Simulation]      │
│  ┌────────────────────────────────────────────────────┐  │
│  │          [ 50% ]  [ 75% ]  [ 90% ]                │  │
│  │              ConfidenceLevelToggle                 │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐  │
│  │ Income Replacement   │  │ Balance Trajectories     │  │
│  │ Ratio by Persona     │  │                          │  │
│  │                      │  │  ╱──── Persona A         │  │
│  │  ┊  ┊  ██  ██  ┊    │  │ ╱  ░░░░ confidence band  │  │
│  │  ┊  ██ ██  ██  ██   │  │╱───── Persona B          │  │
│  │  ██ ██ ██  ██  ██   │  │                           │  │
│  │ ─────── 80% ─────── │  │                           │  │
│  │ ─────── 70% ─────── │  │                           │  │
│  │  A   B   C   D   E  │  │  30    40    50    60 Age │  │
│  └──────────────────────┘  └──────────────────────────┘  │
│                                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Persona  │ Balance │ Income │  IRR  │ P(Suc)│ ER  │  │
│  │──────────┼─────────┼────────┼───────┼───────┼─────│  │
│  │ Alice    │ $620K   │ $55K   │ 61.4% │ 87%   │$142K│  │
│  │ Bob      │ $480K   │ $42K   │ 52.1% │ 72%   │$98K │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Component: ConfidenceLevelToggle

**Location**: `app/src/components/ConfidenceLevelToggle.tsx`

**Props**:
- `value: ConfidenceLevel` — currently selected level ("50" | "75" | "90")
- `onChange: (level: ConfidenceLevel) => void` — callback when user selects a different level

**Responsibilities**:
- Render three toggle buttons labeled "50%", "75%", "90%"
- Visually highlight the currently selected button (filled background)
- Call `onChange` when a different button is clicked

**Layout**:

```text
┌─────────────────────────────────────┐
│  [ 50% ]  [▓75%▓]  [ 90% ]         │
│           ^^^^^^^^                  │
│           selected                  │
└─────────────────────────────────────┘
```

## Component: IncomeReplacementChart

**Location**: `app/src/components/IncomeReplacementChart.tsx`

**Props**:
- `personas: PersonaSimulationResult[]` — simulation results for all personas
- `confidenceLevel: ConfidenceLevel` — determines which percentile to display

**Responsibilities**:
- Render a Recharts `BarChart` wrapped in `ResponsiveContainer`
- One `<Bar>` per persona showing their income replacement ratio at the selected percentile
- Two `<ReferenceLine>` components at y=0.70 and y=0.80 with labels ("70%" and "80%")
- X-axis: persona names
- Y-axis: income replacement ratio (0%–120% range, formatted as percentage)
- Tooltip showing exact ratio value on hover
- Color-code bars: red below 70%, yellow between 70%–80%, green above 80%

**Percentile field selection**:
- 50% confidence → `income_replacement_ratio.p50`
- 75% confidence → `income_replacement_ratio.p25`
- 90% confidence → `income_replacement_ratio.p10`

## Component: TrajectoryChart

**Location**: `app/src/components/TrajectoryChart.tsx`

**Props**:
- `personas: PersonaSimulationResult[]` — simulation results for all personas
- `confidenceLevel: ConfidenceLevel` — determines which percentile line and band to display
- `retirementAge: number` — for marking retirement age on the chart

**Responsibilities**:
- Render a Recharts `ComposedChart` wrapped in `ResponsiveContainer`
- For each persona: one `<Line>` for the central estimate and one `<Area>` for the confidence band
- Each persona gets a distinct color from a predefined palette
- Confidence bands are rendered as semi-transparent filled areas
- X-axis: age (union of all persona age ranges)
- Y-axis: projected balance (formatted as currency with abbreviations: $100K, $1.2M)
- `<Legend>` identifying each persona by name and color
- `<Tooltip>` showing persona name, age, and balance on hover
- Vertical reference line at retirement age

**Confidence band mapping**:
- 50% confidence: line = p50, band = p25–p75
- 75% confidence: line = p25, band = p10–p50
- 90% confidence: line = p10, no band

## Component: ResultsSummaryTable

**Location**: `app/src/components/ResultsSummaryTable.tsx`

**Props**:
- `personas: PersonaSimulationResult[]` — simulation results for all personas
- `confidenceLevel: ConfidenceLevel` — determines which percentile values to display in the table

**Responsibilities**:
- Render an HTML `<table>` with Tailwind styling
- One row per persona, sorted by persona name
- Seven columns: Persona Name, Projected Balance, Annual Income, Income Replacement Ratio, Probability of Success, Employer Contributions, Employee Contributions
- Format monetary values as currency (e.g., "$620,000")
- Format ratios as percentages with one decimal (e.g., "61.4%")
- Format probability of success as percentage with no decimals (e.g., "87%")

**Column-to-field mapping**:

| Column | Field | Varies with Confidence |
|--------|-------|----------------------|
| Persona Name | `persona_name` | No |
| Projected Balance | `retirement_balance[percentile]` | Yes |
| Annual Income | `total_retirement_income[percentile]` | Yes |
| Income Replacement Ratio | `income_replacement_ratio[percentile]` | Yes |
| Probability of Success | `probability_of_success` | No |
| Employer Contributions | `total_employer_contributions` | No |
| Employee Contributions | `total_employee_contributions` | No |

**Percentile field selection** (same as IncomeReplacementChart):
- 50% confidence → p50
- 75% confidence → p25
- 90% confidence → p10

## Formatting Conventions

| Data Type | Format | Example |
|-----------|--------|---------|
| Currency | `$X,XXX` or `$X.XM` (chart axis only) | `$620,000` (table), `$620K` (axis) |
| Percentage | `X.X%` (1 decimal in table) | `61.4%` |
| Probability | `X%` (0 decimals) | `87%` |
| Age | Integer | `35` |
