# Implementation Plan: Global Settings Page

**Branch**: `014-global-settings` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-global-settings/spec.md`

---

## Summary

Add a Global Settings page that stores application-wide defaults for economic assumptions, IRS limits, replacement ratio mode, and simulation configuration. Defaults are persisted to `~/.retiremodel/global_defaults.yaml` (YAML, already a dependency) and used to seed new workspaces. No new dependencies required.

---

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8.2 (frontend)
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4, pyyaml ≥6.0 (already present); React 19, Tailwind CSS 3.4, lucide-react 0.469 (all existing)
**Storage**: `~/.retiremodel/global_defaults.yaml` (new file, same base path as existing workspace store)
**Testing**: pytest (backend)
**Target Platform**: Local web application (macOS/Linux); browser-based frontend
**Project Type**: Web application (FastAPI backend + React frontend)
**Performance Goals**: GET/PUT complete in < 500ms (file I/O only; no compute)
**Constraints**: No new dependencies; no retroactive modification of existing workspaces; falls back to hardcoded defaults if YAML file missing or corrupted
**Scale/Scope**: Single config record, single user, < 1KB on disk

---

## Constitution Check

No constitution file found at `.specify/memory/constitution.md`. Proceeding based on observed project conventions:

- **No new dependencies**: `pyyaml>=6.0` is already in `api/requirements.txt`. Zero additions. ✅
- **Compute-and-return model preserved**: Global settings endpoints are pure I/O (read YAML / write YAML). No simulation execution. ✅
- **Consistent storage patterns**: `GlobalDefaultsStore` follows the same `load()` / `save()` structure as `WorkspaceStore`. ✅
- **Consistent API patterns**: New router follows the same structure as `api/routers/workspaces.py` (dependency from `request.app.state`, APIRouter prefix). ✅
- **Consistent frontend patterns**: `GlobalSettingsPage` follows `SettingsPage.tsx` patterns (dirty-state tracking, save button, inline error, no activeWorkspace dependency for GET/PUT). ✅
- **Additive model change**: Adding `ss_taxable_max` to `Assumptions` with a default value is backward-compatible — existing workspace JSON loads cleanly. ✅

---

## Project Structure

### Documentation (this feature)

```text
specs/014-global-settings/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Architecture decisions (Phase 0)
├── data-model.md        # Entity shapes, API request/response (Phase 1)
├── quickstart.md        # Developer setup and curl examples (Phase 1)
├── contracts/
│   └── api.md           # Full REST API contract (Phase 1)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
api/
├── main.py                              # + GlobalDefaultsStore init + global_settings router
├── models/
│   ├── global_defaults.py               # NEW: GlobalDefaults model + SYSTEM_DEFAULTS
│   └── assumptions.py                   # + ss_taxable_max field (additive)
├── storage/
│   └── global_defaults_store.py         # NEW: YAML read/write/reset
├── routers/
│   └── global_settings.py               # NEW: GET / PUT / POST restore endpoints
└── services/
    └── workspace_service.py             # + global_defaults param on create_workspace()

app/src/
├── types/
│   └── global-settings.ts               # NEW: GlobalSettings TS type + SYSTEM_DEFAULTS
├── services/
│   └── api.ts                           # + getGlobalSettings() / saveGlobalSettings() / restoreGlobalSettings()
├── pages/
│   └── GlobalSettingsPage.tsx           # NEW: two-section settings form
├── components/
│   └── Sidebar.tsx                      # + Global Settings nav link
└── App.tsx                              # + /global-settings route

tests/
└── test_global_settings.py              # NEW: backend unit + integration tests
```

**Structure Decision**: Same web application layout as all prior features. Purely additive — no existing files are restructured, only targeted edits.

---

## Phase 0: Research

**Status**: Complete. See [research.md](research.md).

**Decisions summary**:

| Decision | Choice |
|----------|--------|
| Config format | YAML via `pyyaml` (already a dependency) |
| GlobalDefaults model | Separate model, not reusing Assumptions |
| Salary growth field | `salary_real_growth_rate` (real component = 1.5%) |
| SS taxable max | Add `ss_taxable_max` to `Assumptions` model (additive, backward-compatible) |
| Age validation ranges | Match existing MonteCarloConfig constraints (ge=55/le=70 for retirement_age, etc.) |
| SS claiming age application | Apply global default to all default personas on workspace creation |
| API design | GET + PUT + POST /restore under `/api/v1/global-settings` |
| WorkspaceService | Accepts optional `GlobalDefaults` param; router injects from `app.state` |
| Num simulations display | Hardcoded constant 250 in frontend; not in GlobalDefaults |

---

## Phase 1: Design

**Status**: Complete.

- **Data model**: [data-model.md](data-model.md)
- **API contracts**: [contracts/api.md](contracts/api.md)
- **Quickstart**: [quickstart.md](quickstart.md)

---

## Implementation Steps

### Step 1: New model — `api/models/global_defaults.py`

**New file**. Defines the `GlobalDefaults` Pydantic model and the `SYSTEM_DEFAULTS` dict.

```python
from typing import Literal
from pydantic import BaseModel, Field, model_validator
from typing import Self

SYSTEM_DEFAULTS = {
    "inflation_rate": 0.025,
    "salary_real_growth_rate": 0.015,
    "comp_limit": 360_000.0,
    "deferral_limit": 24_500.0,
    "additions_limit": 72_000.0,
    "catchup_limit": 8_000.0,
    "super_catchup_limit": 11_250.0,
    "ss_taxable_max": 184_500.0,
    "target_replacement_ratio_mode": "lookup_table",
    "target_replacement_ratio_override": None,
    "retirement_age": 67,
    "planning_age": 93,
    "ss_claiming_age": 67,
}

class GlobalDefaults(BaseModel):
    inflation_rate: float = Field(default=0.025, ge=0.0, le=0.2)
    salary_real_growth_rate: float = Field(default=0.015, ge=0.0, le=0.2)
    comp_limit: float = Field(default=360_000, gt=0)
    deferral_limit: float = Field(default=24_500, gt=0)
    additions_limit: float = Field(default=72_000, gt=0)
    catchup_limit: float = Field(default=8_000, gt=0)
    super_catchup_limit: float = Field(default=11_250, gt=0)
    ss_taxable_max: float = Field(default=184_500, gt=0)
    target_replacement_ratio_mode: Literal["lookup_table", "flat_percentage"] = "lookup_table"
    target_replacement_ratio_override: float | None = Field(default=None, ge=0.0, le=1.0)
    retirement_age: int = Field(default=67, ge=55, le=70)
    planning_age: int = Field(default=93, ge=85, le=100)
    ss_claiming_age: int = Field(default=67, ge=62, le=70)

    @model_validator(mode="after")
    def validate_planning_gt_retirement(self) -> Self:
        if self.planning_age <= self.retirement_age:
            raise ValueError(
                f"planning_age ({self.planning_age}) must be greater than retirement_age ({self.retirement_age})"
            )
        return self

    @model_validator(mode="after")
    def validate_flat_percentage_override(self) -> Self:
        if self.target_replacement_ratio_mode == "flat_percentage" and self.target_replacement_ratio_override is None:
            raise ValueError(
                "target_replacement_ratio_override is required when mode is flat_percentage"
            )
        return self
```

---

### Step 2: Update `api/models/assumptions.py`

Add one field (additive, backward-compatible):

```python
ss_taxable_max: float = Field(default=176_100, gt=0)  # SS wage base
```

Place after `comp_limit` in the IRS limits block. Update the docstring comment to include the new field.

---

### Step 3: New storage — `api/storage/global_defaults_store.py`

**New file**. Read/write/reset the YAML config.

```python
import yaml
from pathlib import Path
from api.models.global_defaults import GlobalDefaults

class GlobalDefaultsStore:
    def __init__(self, base_path: Path) -> None:
        self._path = base_path / "global_defaults.yaml"

    def load(self) -> GlobalDefaults:
        """Load from YAML. Falls back to system defaults on missing or corrupted file."""
        if not self._path.exists():
            return GlobalDefaults()
        try:
            data = yaml.safe_load(self._path.read_text()) or {}
            return GlobalDefaults.model_validate(data)
        except Exception:
            return GlobalDefaults()

    def save(self, defaults: GlobalDefaults) -> GlobalDefaults:
        """Persist to YAML. Returns the saved record."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            yaml.safe_dump(defaults.model_dump(), default_flow_style=False, allow_unicode=True)
        )
        return defaults

    def reset(self) -> GlobalDefaults:
        """Delete YAML file and return system defaults."""
        if self._path.exists():
            self._path.unlink()
        return GlobalDefaults()
```

---

### Step 4: New router — `api/routers/global_settings.py`

**New file**. Three endpoints.

```python
from fastapi import APIRouter, Request
from api.models.global_defaults import GlobalDefaults
from api.storage.global_defaults_store import GlobalDefaultsStore

router = APIRouter(tags=["global-settings"])

def _get_store(request: Request) -> GlobalDefaultsStore:
    return request.app.state.global_defaults_store

@router.get("", response_model=GlobalDefaults)
async def get_global_settings(request: Request) -> GlobalDefaults:
    return _get_store(request).load()

@router.put("", response_model=GlobalDefaults)
async def save_global_settings(body: GlobalDefaults, request: Request) -> GlobalDefaults:
    return _get_store(request).save(body)

@router.post("/restore", response_model=GlobalDefaults)
async def restore_global_settings(request: Request) -> GlobalDefaults:
    return _get_store(request).reset()
```

---

### Step 5: Update `api/main.py`

Two additions:

1. Import and instantiate `GlobalDefaultsStore`:
```python
from api.storage.global_defaults_store import GlobalDefaultsStore
from api.routers.global_settings import router as global_settings_router

def create_app(base_path: Path | None = None) -> FastAPI:
    bp = base_path or DEFAULT_BASE_PATH
    store = WorkspaceStore(bp)
    defaults_store = GlobalDefaultsStore(bp)
    ...
    application.state.workspace_store = store
    application.state.global_defaults_store = defaults_store
```

2. Include the router:
```python
api_router.include_router(global_settings_router, prefix="/global-settings")
```

---

### Step 6: Update `api/services/workspace_service.py`

Modify `create_workspace()` to accept and use `GlobalDefaults`:

```python
from api.models.global_defaults import GlobalDefaults
from api.models.monte_carlo_config import MonteCarloConfig

def create_workspace(
    self,
    client_name: str,
    name: str | None = None,
    global_defaults: GlobalDefaults | None = None,
) -> Workspace:
    d = global_defaults or GlobalDefaults()
    base_config = Assumptions(
        inflation_rate=d.inflation_rate,
        salary_real_growth_rate=d.salary_real_growth_rate,
        comp_limit=d.comp_limit,
        deferral_limit=d.deferral_limit,
        additions_limit=d.additions_limit,
        catchup_limit=d.catchup_limit,
        super_catchup_limit=d.super_catchup_limit,
        ss_taxable_max=d.ss_taxable_max,
        target_replacement_ratio_override=(
            d.target_replacement_ratio_override
            if d.target_replacement_ratio_mode == "flat_percentage"
            else None
        ),
    )
    monte_carlo_config = MonteCarloConfig(
        retirement_age=d.retirement_age,
        planning_age=d.planning_age,
    )
    personas = [
        p.model_copy(update={"ss_claiming_age": d.ss_claiming_age})
        for p in default_personas()
    ]
    now = _utc_now()
    workspace = Workspace(
        name=name or client_name,
        client_name=client_name,
        base_config=base_config,
        monte_carlo_config=monte_carlo_config,
        personas=personas,
        created_at=now,
        updated_at=now,
    )
    self._store.save(workspace)
    return workspace
```

---

### Step 7: Update `api/routers/workspaces.py`

Pass `GlobalDefaults` from app state into `create_workspace()`:

```python
@router.post("", status_code=201, response_model=Workspace)
async def create_workspace(body: WorkspaceCreate, request: Request) -> Workspace:
    service = _get_service(request)
    defaults_store: GlobalDefaultsStore = request.app.state.global_defaults_store
    global_defaults = defaults_store.load()
    return service.create_workspace(
        client_name=body.client_name,
        name=body.name,
        global_defaults=global_defaults,
    )
```

Also add: `from api.storage.global_defaults_store import GlobalDefaultsStore`

---

### Step 8: New TypeScript types — `app/src/types/global-settings.ts`

**New file**:

```typescript
export type ReplacementRatioMode = 'lookup_table' | 'flat_percentage'

export interface GlobalSettings {
  inflation_rate: number
  salary_real_growth_rate: number
  comp_limit: number
  deferral_limit: number
  additions_limit: number
  catchup_limit: number
  super_catchup_limit: number
  ss_taxable_max: number
  target_replacement_ratio_mode: ReplacementRatioMode
  target_replacement_ratio_override: number | null
  retirement_age: number
  planning_age: number
  ss_claiming_age: number
}

export const SYSTEM_DEFAULTS: GlobalSettings = {
  inflation_rate: 0.025,
  salary_real_growth_rate: 0.015,
  comp_limit: 360000,
  deferral_limit: 24500,
  additions_limit: 72000,
  catchup_limit: 8000,
  super_catchup_limit: 11250,
  ss_taxable_max: 184500,
  target_replacement_ratio_mode: 'lookup_table',
  target_replacement_ratio_override: null,
  retirement_age: 67,
  planning_age: 93,
  ss_claiming_age: 67,
}

export const NUM_SIMULATIONS = 250 // fixed by scenario matrix architecture
```

---

### Step 9: Update `app/src/services/api.ts`

Add three functions at the end of the file:

```typescript
import type { GlobalSettings } from '../types/global-settings'

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const res = await fetch('/api/v1/global-settings')
  if (!res.ok) throw new Error(`Failed to load global settings: ${res.status}`)
  return res.json()
}

export async function saveGlobalSettings(settings: GlobalSettings): Promise<GlobalSettings> {
  const res = await fetch('/api/v1/global-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!res.ok) throw new Error(`Failed to save global settings: ${res.status}`)
  return res.json()
}

export async function restoreGlobalSettings(): Promise<GlobalSettings> {
  const res = await fetch('/api/v1/global-settings/restore', { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to restore defaults: ${res.status}`)
  return res.json()
}
```

---

### Step 10: New page — `app/src/pages/GlobalSettingsPage.tsx`

**New file**. Follows `SettingsPage.tsx` patterns but is workspace-independent.

**Structure**:
- Header: "Global Settings" + "Save Changes" button (disabled when clean) + "Restore System Defaults" button
- Section 1: "Economic & IRS Assumptions"
  - Sub-section "Economic": Inflation Rate (%), Salary Real Growth Rate (%)
  - Sub-section "IRS Limits": 6 currency inputs (comp, deferral, additions, catchup, super catchup, SS taxable max)
  - Sub-section "Target Replacement Ratio": radio selector (lookup_table | flat_percentage) + conditional flat % input
- Section 2: "Simulation Configuration"
  - Three editable integer inputs: Retirement Age, Planning Age, SS Claiming Age
  - Read-only display: "Number of Simulations: 250 (fixed by scenario matrix architecture)"
- Save confirmation toast (3s)
- "Restore System Defaults" button opens a `ConfirmDialog` before calling `restoreGlobalSettings()`

**State**:
```typescript
const [settings, setSettings] = useState<GlobalSettings | null>(null)
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState(false)
const [isDirty, setIsDirty] = useState(false)
const [saved, setSaved] = useState(false)
const [error, setError] = useState<string | null>(null)
const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
```

**Key behaviors**:
- `useEffect` on mount: calls `getGlobalSettings()` to populate form
- `handleSave()`: calls `saveGlobalSettings(settings)`, shows 3s success indicator
- `handleRestore()`: opens confirm dialog → on confirm, calls `restoreGlobalSettings()` → sets state to returned system defaults
- `target_replacement_ratio_mode` radio changes: if switching to `flat_percentage` and override is null, initialize override to 0.8
- No `useBlocker` (this is a simpler flow than SettingsPage — save explicitly, no unsaved-changes blocker required; can add as enhancement)

---

### Step 11: Update `app/src/App.tsx`

Add the import and route:

```typescript
import GlobalSettingsPage from './pages/GlobalSettingsPage'

// Inside <Route element={<Layout />}>:
<Route path="/global-settings" element={<GlobalSettingsPage />} />
```

---

### Step 12: Update `app/src/components/Sidebar.tsx`

Add a new nav entry. Place "Global Settings" after the existing "Settings" link:

```typescript
import { ..., Globe } from 'lucide-react'

// In navEntries array, after the Settings entry:
{ kind: 'link', label: 'Global Settings', icon: Globe, to: '/global-settings' },
```

---

## Test Plan

### Backend unit tests — `tests/test_global_settings.py`

| Test | Description |
|------|-------------|
| `test_load_returns_defaults_when_no_file` | GlobalDefaultsStore.load() with no file returns GlobalDefaults() |
| `test_save_and_reload` | Save a modified GlobalDefaults; reload; verify all fields match |
| `test_reset_deletes_file_and_returns_defaults` | After save, reset() deletes file; load() returns defaults |
| `test_corrupted_yaml_falls_back_to_defaults` | Write invalid YAML to file; load() returns GlobalDefaults() |
| `test_get_endpoint_returns_200` | GET /api/v1/global-settings → 200 with valid shape |
| `test_put_endpoint_saves` | PUT with modified inflation_rate → 200; verify file written |
| `test_put_invalid_planning_age_lte_retirement` | PUT with planning_age=67, retirement_age=67 → 422 |
| `test_put_flat_mode_without_override` | PUT with mode=flat_percentage, override=null → 422 |
| `test_restore_endpoint` | POST /restore → 200 with system defaults; file deleted |
| `test_create_workspace_uses_global_defaults` | Set inflation_rate=0.03, create workspace; verify workspace.base_config.inflation_rate=0.03 |
| `test_create_workspace_applies_ss_claiming_age` | Set ss_claiming_age=65, create workspace; verify all personas have ss_claiming_age=65 |
| `test_create_workspace_flat_ratio_mode` | Set mode=flat_percentage, override=0.75; create workspace; verify target_replacement_ratio_override=0.75 |
| `test_create_workspace_lookup_mode_clears_override` | Set mode=lookup_table; create workspace; verify target_replacement_ratio_override=None |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Existing workspace files lack `ss_taxable_max` | Pydantic field default (176_100) applies when field absent from JSON — no migration needed |
| GlobalDefaults model constraints (retirement_age le=70) differ from spec's suggested range (50-85) | Constraints match MonteCarloConfig to prevent downstream validation errors; noted in research.md |
| User saves salary_real_growth_rate=0 (lower than inflation) | No hard error — this is a valid real rate (nominal could still be positive); UI may show an informational note |
| File system race on concurrent saves (two browser tabs) | Single-user local tool; last-write-wins via `write_text()` is acceptable per spec assumption |
| `restore` during unsaved edits could confuse user | Restore uses a confirmation dialog before executing; after restore, form state is replaced with returned system defaults |
