# Research: Workspace Management

**Feature**: 002-workspace-management
**Date**: 2026-02-24

## Research Topics

### 1. File-Based Persistence Strategy

**Decision**: Store each workspace as a single `workspace.json` file inside `{base_path}/workspaces/{workspace_id}/` directory.

**Rationale**: The workspace directory structure naturally accommodates future scenario files and other workspace-level artifacts. A single JSON file per workspace keeps reads atomic and avoids partial-write corruption risks. Pydantic's built-in `model_dump_json()` and `model_validate_json()` provide zero-dependency serialization.

**Alternatives considered**:
- SQLite per workspace: Adds dependency, overkill for single-entity storage at this scale
- Single JSON file for all workspaces: No isolation, corruption risk affects all workspaces, poor scalability
- YAML storage: Adds PyYAML dependency for persistence (already available but JSON is native to Pydantic)

### 2. Configurable Base Path

**Decision**: Accept `base_path` as a constructor parameter on the storage layer, defaulting to `Path.home() / ".retiremodel"`. The FastAPI app passes the configured path at startup.

**Rationale**: Constructor injection is the simplest approach. It avoids environment variable coupling, keeps tests clean (pass a temp directory), and aligns with the existing `WORKSPACES_DIR` pattern in `api/main.py`.

**Alternatives considered**:
- Environment variable (`RETIREMODEL_DATA_DIR`): Additional indirection; can be added later if needed
- Global settings object: Over-engineering for a single configurable value
- Pydantic Settings: Good pattern but adds complexity for one field; defer to when more settings exist

### 3. Deep Merge for Configuration Inheritance

**Decision**: Implement a recursive deep-merge utility that operates on Pydantic model instances. For each field: if both base and override have nested BaseModel values, recurse; otherwise, override value wins. `None` override fields mean "no override" (inherit from base).

**Rationale**: Pydantic models are structured — we can use `model_fields` to iterate and check types. The Assumptions model has nested `AssetClassReturn` sub-models, so recursion is necessary. Using `None` as the sentinel for "not overridden" aligns with the existing `Scenario.overrides: Assumptions | None` pattern.

**Alternatives considered**:
- Dictionary-based merge (`dict | dict`): Loses type safety and validation; requires re-validation after merge
- `model_copy(update=...)`: Only handles top-level fields; doesn't recurse into nested models
- Third-party deep merge library (deepmerge): Adds unnecessary dependency for a well-scoped problem

**Implementation approach**:
1. Convert the override `Assumptions` to a dict, excluding fields that are `None` (unset)
2. Convert the base `Assumptions` to a dict
3. Recursive dict merge: for nested dicts, recurse; for scalars, override wins
4. Validate the merged dict back into an `Assumptions` model

However, since all `Assumptions` fields have defaults and none are `Optional`, a field-level approach is cleaner:
- The `Scenario.overrides` is `Assumptions | None` — when `None`, use workspace base directly
- When overrides is set, it's a full `Assumptions` instance with defaults for non-overridden fields

**Problem**: The current `Assumptions` model has no way to distinguish "explicitly set to default" from "not set" — all fields have defaults. We need a way to represent partial overrides.

**Resolution**: Create an `AssumptionsOverride` model where all fields are `Optional[T] = None`. When resolving config: iterate fields, use override value if not `None`, otherwise use base value. For nested `AssetClassReturn` fields, apply the same logic recursively with an `AssetClassReturnOverride` model.

### 4. Partial Update Strategy (PATCH)

**Decision**: Accept a partial update payload where only provided fields are applied. Use Pydantic's `model_dump(exclude_unset=True)` to identify which fields the client explicitly sent.

**Rationale**: This is the standard FastAPI pattern for PATCH endpoints. Pydantic tracks which fields were explicitly set vs. defaulted, making it trivial to implement partial updates.

**Alternatives considered**:
- PUT (full replacement): Requires client to send entire workspace; error-prone for large objects
- JSON Patch (RFC 6902): Too complex for this use case; better suited for document editing
- Custom merge payload: Non-standard; harder for API consumers

### 5. Layered Architecture

**Decision**: Three layers — Router (HTTP) → Service (business logic) → Store (filesystem I/O).

**Rationale**: The router handles request/response mapping and validation. The service handles defaults population, timestamp management, and deep-merge logic. The store handles raw file operations. This keeps each layer testable in isolation and matches common FastAPI project patterns.

**Alternatives considered**:
- Router + Store only (no service): Mixes business logic into routes; harder to test
- Repository pattern with abstract interface: Over-engineering for file-based storage with no plans to swap backends
- Direct file operations in router: Violates separation of concerns; untestable

### 6. Error Handling

**Decision**: Use custom exception classes (`WorkspaceNotFoundError`, `StorageError`) raised by the service/store layers. The router catches these and maps to appropriate HTTP status codes (404, 500).

**Rationale**: Custom exceptions keep the service layer HTTP-agnostic and testable. FastAPI's exception handlers or simple try/except in route functions provide clean HTTP mapping.

**Alternatives considered**:
- HTTPException in service layer: Couples service to HTTP; prevents reuse from CLI or other contexts
- Return result objects (Result/Either pattern): Over-engineering for Python; try/except is idiomatic
