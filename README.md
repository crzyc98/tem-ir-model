  # PlanAlign Retirement Modeler

  PlanAlign is a retirement plan design analysis tool built for **plan sponsors, benefits consultants, and analysts** who need to evaluate how their defined contribution plan design affects employee retirement outcomes.

  ## What It Does

  Most retirement readiness questions come down to one core question: *will employees have enough income in retirement?* PlanAlign answers that question by modeling projected retirement income replacement rates — the percentage of pre-retirement income that a retiree can sustain — across a realistic range of market and longevity scenarios.

  **Key capabilities:**

  - **Compare plan designs side-by-side** — Model your current plan alongside alternative designs (e.g., changing the employer match formula, adding an auto-escalation feature, adjusting vesting schedules) to see how each design affects projected retirement income replacement rates.
  - **Simulate diverse employee populations** — Use built-in persona templates representing different employee archetypes (early-career, mid-career, near-retirement) or define custom profiles by age, salary, savings rate, and years to retirement.
  - **Stress-test outcomes with Monte Carlo simulation** — Run thousands of market return scenarios to understand the distribution of potential outcomes, not just a single optimistic projection. See median, 25th-percentile, and 75th-percentile results.
  - **Factor in Social Security** — Estimated Social Security benefits are incorporated into income replacement calculations using SSA bend-point formulas, giving a realistic picture of total retirement income.
  - **Model withdrawal strategies** — Evaluate how different withdrawal approaches (fixed percentage, dynamic spending rules) affect portfolio longevity and income sustainability.
  - **Export results** — Download scenario results to Excel for further analysis or client presentations.

  ## Who It's For

  | Role | How PlanAlign Helps |
  |------|---------------------|
  | **Plan sponsors** | Understand whether your current plan design produces adequate retirement outcomes for your workforce, and evaluate design changes before implementation. |
  | **Benefits consultants** | Quickly model and compare plan design alternatives for clients with quantitative, scenario-based evidence. |
  | **HR / Finance teams** | Assess the cost-benefit tradeoff of plan design changes (e.g., increased match) against the improvement in projected employee retirement readiness. |

  ## Typical Workflow

  1. **Create a workspace** for a client or plan.
  2. **Define scenarios** — each scenario represents a plan design (current or proposed) paired with an employee profile.
  3. **Run simulations** — Monte Carlo engine projects outcomes across thousands of market return paths.
  4. **Review the Results Dashboard** — compare income replacement rates, shortfall probabilities, and portfolio survival rates across scenarios.
  5. **Export** results to Excel for reporting or further analysis.

## Prerequisites

- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

## Quick Start

### macOS / Linux

**1. Install uv** (if not already installed):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**2. Create a virtual environment and install dependencies:**

```bash
uv venv
source .venv/bin/activate
uv pip install -r api/requirements.txt
uv pip install -e .
```

**3. Install frontend dependencies:**

```bash
cd app && npm install && cd ..
```

**4. Start both servers:**

```bash
ir-model start
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` requests to the backend.

---

### Windows

**1. Install uv** (if not already installed — run in PowerShell):

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**2. Create a virtual environment and install dependencies:**

```powershell
uv venv
.venv\Scripts\activate
uv pip install -r api/requirements.txt
uv pip install -e .
```

**3. Install frontend dependencies:**

```powershell
cd app; npm install; cd ..
```

**4. Start both servers:**

```powershell
ir-model start
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` requests to the backend.

---

## CLI Reference

The `ir-model` CLI is installed as part of the package (`uv pip install -e .`).

```
Usage: ir-model [COMMAND] [OPTIONS]
```

### Commands

| Command | Description |
|---------|-------------|
| `ir-model start` | Start both the API and frontend dev servers |
| `ir-model api` | Start only the FastAPI backend |
| `ir-model ui` | Start only the Vite frontend |

### `ir-model start`

```
Options:
  --api-only        Start only the FastAPI backend
  --ui-only         Start only the Vite frontend
  --port INTEGER    API port (default: 8000)
  --ui-port INTEGER Frontend port (default: 5173)
```

**Examples:**

```bash
# Start everything (default)
ir-model start

# Start API on a custom port
ir-model start --port 8080

# Start only the backend
ir-model start --api-only
# or shorthand:
ir-model api

# Start only the frontend
ir-model start --ui-only
# or shorthand:
ir-model ui
```

Press `Ctrl-C` to stop all running servers.

---

## Project Structure

```
api/                  # FastAPI backend
  models/             # Pydantic data models
  routers/            # API route handlers
  services/           # Business logic (simulation, withdrawal, social security)
  storage/            # JSON file-based persistence
app/                  # React frontend (Vite + TypeScript + Tailwind CSS)
  src/
    components/       # Layout, Sidebar, WorkspaceSelector
    pages/            # Route-level page components
    services/         # API client
    types/            # Shared TypeScript interfaces
tests/                # Python test suite
specs/                # Feature specifications
cli.py                # ir-model CLI entry point
```

Data is stored at `~/.retiremodel/` by default.

---

## Development

### Backend

```bash
# Run tests
pytest

# Lint
ruff check .
```

### Frontend

```bash
cd app

# Type check
npx tsc -b

# Production build
npm run build
```

### Verify the API is running

```bash
curl http://localhost:8000/api/v1/health
```

---

## Tech Stack

**Backend:** Python 3.12, FastAPI, Pydantic, NumPy, uv

**Frontend:** TypeScript 5.8, React 19, Vite 6, Tailwind CSS 3.4, react-router-dom 7, Lucide React, Recharts
