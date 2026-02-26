# Research: Workspace Export and Import

**Feature**: 013-workspace-export-import
**Date**: 2026-02-25

---

## Decision 1: Archive Format

**Decision**: ZIP archive using Python's standard-library `zipfile` module, with an internal `manifest.json` and separate JSON files mirroring the existing filesystem layout.

**Rationale**: The existing storage layer serializes workspaces and scenarios as individual JSON files. A ZIP archive is the simplest format that groups them portably with zero new dependencies — `zipfile` is part of Python's standard library. It is also human-inspectable and already associated with the app's file-download patterns (feature 012 used `io.BytesIO` for binary streaming, same technique applies here). JSON content within the archive aligns perfectly with existing Pydantic `model_dump_json()` serialization.

**Alternatives considered**:
- **tar.gz**: More Unix-idiomatic, but less cross-platform friendly for end users who may inspect or share the file on Windows.
- **Single JSON file**: Simpler, but bloats for large scenarios; makes forward-compatibility (ignoring unknown keys) harder to manage per-entity.
- **Custom binary format**: Adds complexity with no benefit over ZIP.

---

## Decision 2: Archive Internal Layout

**Decision**:
```
{workspace_name}_export.zip
├── manifest.json          # format version, export metadata
├── workspace.json         # full Workspace object (same JSON as filesystem)
└── scenarios/
    ├── {scenario_id}.json # full Scenario object per scenario
    └── ...
```

**Rationale**: Mirrors the on-disk storage layout exactly (`workspace.json` + `scenarios/{id}.json`). This means export is essentially a structured copy operation and import is the reverse. Using the same serialization format (Pydantic JSON) means zero transformation layer — re-validation on import is handled by the existing Pydantic models.

**Alternatives considered**:
- **Single flattened JSON**: Would require a new schema and transform; unnecessary given existing per-file layout.
- **Including comparisons**: Comparisons are derived (results of comparing scenarios) and depend on scenario IDs. Including them adds complexity without clear user value; excluded from scope.

---

## Decision 3: Import API Flow (Conflict Resolution)

**Decision**: Stateless two-pass pattern:
1. `POST /api/v1/workspaces/import` (multipart, no conflict params) → 201 on success; 409 with conflict details if name conflicts.
2. Frontend shows conflict dialog. User selects action.
3. Frontend re-uploads the same file with query params: `?on_conflict=rename&new_name=...`, `?on_conflict=replace`, or `?on_conflict=skip` → 201/200 accordingly.

**Rationale**: A stateless design requires no server-side temporary storage, tokens, or sessions. The uploaded ZIP is typically small (< 1 MB for a typical workspace) so re-uploading is negligible. This follows the principle of least complexity — no new storage concepts, no tokens that expire, no separate resolution endpoint. The pattern is idiomatic REST: conflict = 409, conflict params = query params on re-submit.

**Alternatives considered**:
- **Server-side import token**: Upload once, get token, resolve separately. Cleaner for large files but adds server state and cleanup logic. Not warranted at this scale.
- **All-in-one with conflict mode in initial request**: Requires frontend to pre-declare conflict handling before knowing whether a conflict exists. Not user-friendly.
- **Pre-validation endpoint** (dry run): `POST /api/v1/workspaces/import/validate` returns conflict info, then user re-uploads. Same re-upload cost but adds an extra endpoint. Not worth it.

---

## Decision 4: Export Endpoint Method

**Decision**: `GET /api/v1/workspaces/{workspace_id}/export` returns a `StreamingResponse` ZIP file.

**Rationale**: Export reads data and produces output — no side effects, no request body. `GET` is semantically correct. This follows the existing Excel export as a model, except Excel uses `POST` because simulation results are passed in the body. For workspace export, all data is on the server, so `GET` is clean. The response uses `StreamingResponse(io.BytesIO(zip_bytes), ...)` matching the Excel pattern exactly.

**Alternatives considered**:
- **POST for export**: Only warranted when a request body is needed. Not the case here.

---

## Decision 5: Format Version and Compatibility

**Decision**: `manifest.json` includes `"format_version": "1"`. On import, the system checks that `format_version == "1"`. Unknown top-level keys in `workspace.json` or scenario files are ignored by Pydantic's default behavior (`model_config = ConfigDict(extra="ignore")`). Missing required fields cause a `ValidationError`, which results in a 422 import rejection.

**Rationale**: Simple version check is the minimum viable compatibility guard. Pydantic already handles extra fields gracefully. If a future version bumps format_version to "2", old archives will be rejected with a clear message rather than silently corrupted. This is conservative but safe for a v1 implementation.

---

## Decision 6: New Workspace ID on Import

**Decision**: On import, all workspace and scenario IDs from the archive are discarded. New UUIDs are generated for the workspace and all scenarios.

**Rationale**: UUIDs in the archive reflect the source instance. If a user imports the same archive twice, the second import must not collide with the first. Generating fresh IDs treats each import as a brand-new workspace, consistent with the "import creates an independent copy" assumption in the spec. Scenario `workspace_id` fields are rewritten to the new workspace UUID.

---

## Decision 7: Frontend File Upload Pattern

**Decision**: `<input type="file" accept=".zip">` inside `ImportWorkspaceModal.tsx`, submitted via `fetch()` with `FormData`. No third-party file upload library needed.

**Rationale**: The existing codebase uses plain `fetch()` throughout `api.ts`. FormData handles multipart encoding natively. The project has no file upload today; adding a library for a single use case would be over-engineering.

---

## Decision 8: Dependencies

**Decision**: No new dependencies required for this feature.

**Backend**: `zipfile` (stdlib), `io` (stdlib) — already imported elsewhere.
**Frontend**: No new packages. `FormData` is native to browsers.
