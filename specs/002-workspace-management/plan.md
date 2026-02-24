# Implementation Plan: Workspace Management

**Branch**: `002-workspace-management` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-workspace-management/spec.md`

## Summary

Build the persistence and REST API layer for workspace CRUD operations on top of the existing Pydantic data models from feature 001. Workspaces are stored as JSON files under a configurable base path (default `~/.retiremodel/workspaces/{workspace_id}/`). New workspaces auto-populate with 8 default personas. A deep-merge utility resolves scenario assumption overrides against the workspace base configuration. FastAPI endpoints expose create, list, get, update, and delete operations under `/api/v1/workspaces`.

## Technical Context

**Language/Version**: Python 3.12
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4, uvicorn 0.34.0
**Storage**: JSON files on local filesystem (`{base_path}/workspaces/{workspace_id}/workspace.json`)
**Testing**: pytest >= 8.0
**Target Platform**: Local server (macOS/Linux)
**Project Type**: Web service (REST API)
**Performance Goals**: CRUD operations < 5s; list 100 workspaces < 2s
**Constraints**: Single-user access; no file locking; no database
**Scale/Scope**: Up to 100 workspaces per installation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution file found. Gate passes by default — no constraints to evaluate.

## Project Structure

### Documentation (this feature)

```text
specs/002-workspace-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (REST API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
api/
├── models/              # Existing Pydantic models (feature 001)
│   ├── __init__.py
│   ├── workspace.py
│   ├── scenario.py
│   ├── assumptions.py
│   ├── defaults.py
│   └── ...
├── services/            # NEW — business logic layer
│   ├── __init__.py
│   ├── workspace_service.py    # Workspace CRUD orchestration
│   └── config_resolver.py      # Deep-merge configuration inheritance
├── storage/             # NEW — filesystem persistence layer
│   ├── __init__.py
│   └── workspace_store.py      # JSON file read/write operations
├── routers/             # Existing router package
│   ├── health.py        # Existing health check
│   └── workspaces.py   # NEW — workspace REST endpoints
└── main.py              # Existing app entry point (updated for configurable path + new router)

tests/
├── models/              # Existing model tests (feature 001)
├── services/            # NEW — service layer tests
│   ├── conftest.py
│   ├── test_workspace_service.py
│   └── test_config_resolver.py
├── storage/             # NEW — storage layer tests
│   ├── conftest.py
│   └── test_workspace_store.py
├── routers/             # NEW — API endpoint tests
│   ├── conftest.py
│   └── test_workspaces_router.py
└── conftest.py          # Existing root conftest
```

**Structure Decision**: Extends the existing `api/` package with `services/` and `storage/` sub-packages. This introduces a thin layered architecture (router → service → storage) that keeps concerns separated without over-engineering. The router handles HTTP, the service handles business logic (defaults, timestamps, validation), and the storage handles filesystem I/O. This matches the established pattern of `api/models/` and `api/routers/` from feature 001.

## Complexity Tracking

No constitution violations to justify.
