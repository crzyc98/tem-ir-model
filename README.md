# RetireModel

Retirement plan income replacement modeling tool. Enables plan sponsors, consultants, and analysts to simulate retirement outcomes for hypothetical employees under various plan designs using Monte Carlo simulation.

## Prerequisites

- Python 3.12+
- Node.js 18+

## Quick Start

### Backend API

```bash
python -m venv .venv
source .venv/bin/activate
uv pip install -r api/requirements.txt
uvicorn api.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/api/v1/health`

### Frontend

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` requests to the backend.

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
```

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

## Tech Stack

**Backend:** Python 3.12, FastAPI, Pydantic, NumPy

**Frontend:** TypeScript 5.8, React 19, Vite 6, Tailwind CSS 3.4, react-router-dom 7, Lucide React, Recharts
