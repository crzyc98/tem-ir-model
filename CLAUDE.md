# tem-ir-model Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-24

## Active Technologies
- Python 3.12 + FastAPI 0.115.6, Pydantic 2.10.4, uvicorn 0.34.0 (002-workspace-management)
- JSON files on local filesystem (`{base_path}/workspaces/{workspace_id}/workspace.json`) (002-workspace-management)
- JSON files on local filesystem (`{base_path}/workspaces/{workspace_id}/scenarios/{scenario_id}.json`) (003-scenario-management)
- Python 3.12 + FastAPI 0.115.6, Pydantic 2.10.4, uvicorn 0.34.0, NumPy >= 1.26 (existing) (004-simulation-engine)
- Compute-and-return — no result persistence. Only side effect: update `scenario.last_run_at` timestamp. (004-simulation-engine)
- Python 3.12 (existing) + FastAPI 0.115.6, Pydantic 2.10.4, NumPy >= 1.26 (all existing — no new dependencies) (005-withdrawal-strategy)
- N/A — compute-and-return model; no new persistence (005-withdrawal-strategy)
- N/A — compute-and-return model; SSA reference data (AWI, taxable maximums, bend points) embedded as Python constants (006-social-security-estimator)
- TypeScript 5.8.2 / React 19 / Vite 6.2 + react-router-dom 7.1, lucide-react 0.469, tailwindcss 3.4.17, @tailwindcss/forms 0.5.9, recharts 2.15 (existing, not needed for shell) (007-frontend-shell)
- N/A (frontend only; consumes backend REST API) (007-frontend-shell)
- TypeScript 5.8.2 / React 19 / Vite 6.2 (existing) + react-router-dom 7.1, lucide-react 0.469, tailwindcss 3.4.17, @tailwindcss/forms 0.5.9 (all existing — no new dependencies) (008-workspace-management-ui)
- N/A — frontend only; consumes backend REST API via Vite dev proxy (`/api` → `localhost:8000`) (008-workspace-management-ui)
- TypeScript 5.8.2 / React 19 + react-router-dom 7.1, lucide-react 0.469, tailwindcss 3.4.17, @tailwindcss/forms 0.5.9 (009-plan-design-form)
- Python 3.12 (backend), TypeScript 5.8.2 / React 19 (frontend) + FastAPI 0.115.6, Pydantic 2.10.4 (backend); react-router-dom 7.1, tailwindcss 3.4.17, recharts 2.15, lucide-react 0.469, @tailwindcss/forms 0.5.9 (frontend) (010-persona-gallery)
- JSON files on local filesystem (`~/.retiremodel/workspaces/{workspace_id}/workspace.json`) (010-persona-gallery)
- Python 3.12 (backend), TypeScript 5.8.2 / React 19 (frontend) + FastAPI 0.115.6, Pydantic 2.10.4, NumPy >= 1.26 (backend); react-router-dom 7.1, recharts 2.15, tailwindcss 3.4.17, lucide-react 0.469 (frontend — all existing) (011-results-dashboard)
- N/A — compute-and-return model; no result persistence (011-results-dashboard)
- Python 3.12 (backend), TypeScript 5.8.2 (frontend) + FastAPI 0.115.6, Pydantic 2.10.4, openpyxl ≥3.1 (new), React 19, Vite 6.2 (012-excel-export)
- JSON files on local filesystem (existing; read-only for this feature — no new persistence) (012-excel-export)
- Python 3.12 (backend), TypeScript 5.8.2 (frontend) + FastAPI 0.115.6, Pydantic 2.10.4 (backend); React 19, react-router-dom 7.1, Tailwind CSS 3.4, lucide-react 0.469 (frontend) (013-workspace-export-import)
- JSON files on local filesystem at `~/.retiremodel/workspaces/{id}/` (existing) (013-workspace-export-import)
- Python 3.12 (backend), TypeScript 5.8.2 (frontend) + FastAPI 0.115.6, Pydantic 2.10.4, pyyaml ≥6.0 (already present); React 19, Tailwind CSS 3.4, lucide-react 0.469 (all existing) (014-global-settings)
- `~/.retiremodel/global_defaults.yaml` (new file, same base path as existing workspace store) (014-global-settings)

- Python 3.12 + Pydantic 2.10.4, FastAPI 0.115.6 (existing) (001-core-data-models)

## Project Structure

```text
src/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

Python 3.12: Follow standard conventions

## Recent Changes
- 014-global-settings: Added Python 3.12 (backend), TypeScript 5.8.2 (frontend) + FastAPI 0.115.6, Pydantic 2.10.4, pyyaml ≥6.0 (already present); React 19, Tailwind CSS 3.4, lucide-react 0.469 (all existing)
- 013-workspace-export-import: Added Python 3.12 (backend), TypeScript 5.8.2 (frontend) + FastAPI 0.115.6, Pydantic 2.10.4 (backend); React 19, react-router-dom 7.1, Tailwind CSS 3.4, lucide-react 0.469 (frontend)
- 012-excel-export: Added Python 3.12 (backend), TypeScript 5.8.2 (frontend) + FastAPI 0.115.6, Pydantic 2.10.4, openpyxl ≥3.1 (new), React 19, Vite 6.2


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
