# RetireModel

Retirement plan income replacement modeling tool. Enables plan sponsors, consultants, and analysts to simulate retirement outcomes for hypothetical employees under various plan designs using Monte Carlo simulation.

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
