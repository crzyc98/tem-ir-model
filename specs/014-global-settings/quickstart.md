# Quickstart: Global Settings

**Feature**: 014-global-settings
**Date**: 2026-02-25

---

## Running the Backend

No new dependencies required — `pyyaml>=6.0` is already in `api/requirements.txt`.

```bash
cd /Users/nicholasamaral/Developer/tem-ir-model
uvicorn api.main:app --reload
```

---

## curl Examples

### Get current global defaults

```bash
curl http://localhost:8000/api/v1/global-settings
```

### Save updated defaults

```bash
curl -X PUT http://localhost:8000/api/v1/global-settings \
  -H "Content-Type: application/json" \
  -d '{
    "inflation_rate": 0.03,
    "salary_real_growth_rate": 0.015,
    "comp_limit": 360000,
    "deferral_limit": 24500,
    "additions_limit": 72000,
    "catchup_limit": 8000,
    "super_catchup_limit": 11250,
    "ss_taxable_max": 184500,
    "target_replacement_ratio_mode": "lookup_table",
    "target_replacement_ratio_override": null,
    "retirement_age": 67,
    "planning_age": 93,
    "ss_claiming_age": 67
  }'
```

### Save with flat replacement ratio override

```bash
curl -X PUT http://localhost:8000/api/v1/global-settings \
  -H "Content-Type: application/json" \
  -d '{
    "inflation_rate": 0.025,
    "salary_real_growth_rate": 0.015,
    "comp_limit": 360000,
    "deferral_limit": 24500,
    "additions_limit": 72000,
    "catchup_limit": 8000,
    "super_catchup_limit": 11250,
    "ss_taxable_max": 184500,
    "target_replacement_ratio_mode": "flat_percentage",
    "target_replacement_ratio_override": 0.80,
    "retirement_age": 67,
    "planning_age": 93,
    "ss_claiming_age": 67
  }'
```

### Restore system defaults

```bash
curl -X POST http://localhost:8000/api/v1/global-settings/restore
```

---

## Config File Location

```
~/.retiremodel/global_defaults.yaml
```

The file is created when the user saves global settings for the first time. If the file is absent, the system silently uses hardcoded defaults.

**Example YAML file after one save**:
```yaml
additions_limit: 72000.0
catchup_limit: 8000.0
comp_limit: 360000.0
deferral_limit: 24500.0
inflation_rate: 0.025
planning_age: 93
retirement_age: 67
salary_real_growth_rate: 0.015
ss_claiming_age: 67
ss_taxable_max: 184500.0
super_catchup_limit: 11250.0
target_replacement_ratio_mode: lookup_table
target_replacement_ratio_override: null
```

---

## Key Patterns

### Loading GlobalDefaults in a FastAPI Router

```python
from api.storage.global_defaults_store import GlobalDefaultsStore
from api.models.global_defaults import GlobalDefaults

def _get_defaults_store(request: Request) -> GlobalDefaultsStore:
    return request.app.state.global_defaults_store

@router.get("", response_model=GlobalDefaults)
async def get_global_settings(request: Request) -> GlobalDefaults:
    store = _get_defaults_store(request)
    return store.load()
```

### Seeding a New Workspace from GlobalDefaults

```python
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
    ...
```

### Frontend — Fetching and Saving

```typescript
// api.ts additions

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

## Frontend Navigation

The Global Settings page lives at `/global-settings` and is accessible from the sidebar. It does **not** require an active workspace — it is a standalone app-level page. The sidebar entry sits alongside the existing "Settings" link under a new "App" section (or alongside Settings if no section header is desired).

---

## Testing the Full Flow

1. Start backend: `uvicorn api.main:app --reload`
2. Start frontend: `cd app && npm run dev`
3. Navigate to `http://localhost:5173/global-settings`
4. Change inflation rate to 3.0%, click Save → verify `~/.retiremodel/global_defaults.yaml` updated
5. Go to Dashboard → New Workspace → verify new workspace `base_config.inflation_rate = 0.03`
6. Return to Global Settings → click "Restore System Defaults" → confirm → verify all fields reset to spec defaults
7. Create another workspace → verify `inflation_rate = 0.025` again
