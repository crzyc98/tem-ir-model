# Contract: Model Exports

**Feature Branch**: `001-core-data-models`
**Date**: 2026-02-24

## Public API Surface

The `api.models` package exports the following types and functions. This contract defines what downstream features (workspace CRUD, scenario CRUD, simulation engine, API routers, frontend JSON Schema) depend on.

### Import Path

```python
from api.models import <name>
```

### Exported Types

| Export Name | Kind | Source Module |
|---|---|---|
| `AssetClassReturn` | BaseModel | `api.models.asset_class_return` |
| `MatchTier` | BaseModel | `api.models.match_tier` |
| `ImmediateVesting` | BaseModel | `api.models.vesting` |
| `CliffVesting` | BaseModel | `api.models.vesting` |
| `GradedVesting` | BaseModel | `api.models.vesting` |
| `VestingSchedule` | Type alias (Annotated Union) | `api.models.vesting` |
| `CoreContributionTier` | BaseModel | `api.models.core_contribution_tier` |
| `PlanDesign` | BaseModel | `api.models.plan_design` |
| `TargetDateAllocation` | BaseModel | `api.models.asset_allocation` |
| `CustomAllocation` | BaseModel | `api.models.asset_allocation` |
| `AssetAllocation` | Type alias (Annotated Union) | `api.models.asset_allocation` |
| `Persona` | BaseModel | `api.models.persona` |
| `Assumptions` | BaseModel | `api.models.assumptions` |
| `MonteCarloConfig` | BaseModel | `api.models.monte_carlo_config` |
| `Workspace` | BaseModel | `api.models.workspace` |
| `Scenario` | BaseModel | `api.models.scenario` |

### Exported Functions

| Export Name | Signature | Source Module |
|---|---|---|
| `default_personas` | `() -> list[Persona]` | `api.models.defaults` |

### Serialization Contract

All BaseModel types support:

```python
# JSON string serialization
json_str: str = instance.model_dump_json()

# JSON string deserialization
instance: Model = Model.model_validate_json(json_str)

# Dict serialization
data: dict = instance.model_dump()

# Dict deserialization
instance: Model = Model.model_validate(data)

# JSON Schema export (for BaseModel subclasses)
schema: dict = Model.model_json_schema()

# JSON Schema export (for type aliases like VestingSchedule, AssetAllocation)
from pydantic import TypeAdapter
schema: dict = TypeAdapter(VestingSchedule).json_schema()
```

### UUID Fields

Models with `id: UUID` fields (`Workspace`, `Scenario`, `Persona`):
- Auto-generate a UUID4 when not provided
- Accept an explicit UUID on creation (for deserialization)
- Serialize to string in JSON mode (e.g., `"a1b2c3d4-..."`)
- Deserialize from string in JSON mode

### Timestamp Fields

Models with `created_at` / `updated_at` fields (`Workspace`, `Scenario`):
- Auto-populate with `datetime.now(UTC)` when not provided
- Accept an explicit datetime on creation (for deserialization)
- Serialize to ISO 8601 string in JSON mode
- `updated_at` is NOT auto-refreshed by the model — the service layer is responsible for updating it

### Discriminated Union Wire Format

**VestingSchedule** — the `type` field determines the variant:

```json
// Immediate
{"type": "immediate"}

// Cliff
{"type": "cliff", "years": 3}

// Graded
{"type": "graded", "schedule": {"1": 0.0, "2": 0.20, "3": 0.40, "4": 0.60, "5": 0.80, "6": 1.0}}
```

**AssetAllocation** — the `type` field determines the variant:

```json
// Target Date
{"type": "target_date", "target_date_vintage": 2065}

// Custom
{"type": "custom", "stock_pct": 0.60, "bond_pct": 0.30, "cash_pct": 0.10}
```

### Validation Error Format

All validation errors are raised as `pydantic.ValidationError` with the standard Pydantic v2 error structure:

```python
from pydantic import ValidationError

try:
    Persona(name="Bad", label="X", age=10, ...)
except ValidationError as e:
    errors = e.errors()
    # Each error: {"type": "...", "loc": ("field_name",), "msg": "...", "input": ...}
```

Cross-field validation errors (model validators) use `type: "value_error"` and include descriptive messages.
