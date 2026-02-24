# tem-ir-model Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-24

## Active Technologies
- Python 3.12 + FastAPI 0.115.6, Pydantic 2.10.4, uvicorn 0.34.0 (002-workspace-management)
- JSON files on local filesystem (`{base_path}/workspaces/{workspace_id}/workspace.json`) (002-workspace-management)
- JSON files on local filesystem (`{base_path}/workspaces/{workspace_id}/scenarios/{scenario_id}.json`) (003-scenario-management)

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
- 003-scenario-management: Added Python 3.12 + FastAPI 0.115.6, Pydantic 2.10.4, uvicorn 0.34.0
- 002-workspace-management: Added Python 3.12 + FastAPI 0.115.6, Pydantic 2.10.4, uvicorn 0.34.0

- 001-core-data-models: Added Python 3.12 + Pydantic 2.10.4, FastAPI 0.115.6 (existing)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
