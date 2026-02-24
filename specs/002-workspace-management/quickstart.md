# Quickstart: Workspace Management

**Feature**: 002-workspace-management

## Prerequisites

- Python 3.12+
- Feature 001 models in place (`api/models/`)
- Dependencies installed: `pip install -r api/requirements.txt`

## Run the API

```bash
uvicorn api.main:app --reload
```

Server starts at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

## Create a Workspace

```bash
curl -X POST http://localhost:8000/api/v1/workspaces \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Acme Corp"}'
```

Returns the full workspace with UUID, default assumptions, 8 default personas, and timestamps.

## List Workspaces

```bash
curl http://localhost:8000/api/v1/workspaces
```

Returns summary list with IDs, client names, and timestamps.

## Get a Workspace

```bash
curl http://localhost:8000/api/v1/workspaces/{workspace_id}
```

## Update a Workspace

```bash
curl -X PATCH http://localhost:8000/api/v1/workspaces/{workspace_id} \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Acme Corporation", "base_config": {"inflation_rate": 0.03}}'
```

Only provided fields are updated. Nested objects are deep-merged.

## Delete a Workspace

```bash
curl -X DELETE http://localhost:8000/api/v1/workspaces/{workspace_id}
```

Returns 204 No Content. Removes workspace directory and all contents from disk.

## Run Tests

```bash
pytest tests/services/ tests/storage/ tests/routers/ -v
```

## Key Files

| File | Purpose |
|------|---------|
| `api/services/workspace_service.py` | Business logic: defaults, timestamps, CRUD orchestration |
| `api/services/config_resolver.py` | Deep-merge utility for configuration inheritance |
| `api/storage/workspace_store.py` | JSON file persistence (read/write/delete) |
| `api/routers/workspaces.py` | REST endpoint handlers |
| `api/models/assumptions_override.py` | Partial override models for deep-merge |
