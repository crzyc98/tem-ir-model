# Quickstart: Core Pydantic Data Models

**Feature Branch**: `001-core-data-models`

## Setup

```bash
# Ensure you're on the feature branch
git checkout 001-core-data-models

# Activate the virtual environment
source .venv/bin/activate

# Install dependencies (if not already)
pip install -r api/requirements.txt
```

## Usage

### Import models

```python
from api.models import (
    Workspace,
    Scenario,
    PlanDesign,
    MatchTier,
    ImmediateVesting,
    CliffVesting,
    GradedVesting,
    CoreContributionTier,
    TargetDateAllocation,
    CustomAllocation,
    Persona,
    Assumptions,
    AssetClassReturn,
    MonteCarloConfig,
    default_personas,
)
```

### Create a PlanDesign

```python
plan = PlanDesign(
    name="Standard 401(k)",
    match_tiers=[
        MatchTier(match_rate=1.0, on_first_pct=0.03),
        MatchTier(match_rate=0.5, on_first_pct=0.02),
    ],
    match_vesting=CliffVesting(years=3),
    core_contribution_pct=0.03,
    core_vesting=GradedVesting(schedule={1: 0.0, 2: 0.20, 3: 0.40, 4: 0.60, 5: 0.80, 6: 1.0}),
    auto_enroll_rate=0.06,
    auto_escalation_cap=0.10,
)
```

### Create a Persona

```python
persona = Persona(
    name="Jordan",
    label="Early Career Entry-Level",
    age=25,
    tenure_years=1,
    salary=40_000,
    deferral_rate=0.03,
    current_balance=2_000,
    allocation=TargetDateAllocation(target_date_vintage=2065),
)
# UUID auto-generated:
print(persona.id)  # e.g., UUID('a1b2c3d4-...')
```

### Use default personas

```python
personas = default_personas()
for p in personas:
    print(f"{p.name}: age {p.age}, ${p.salary:,.0f}")
```

### Create a Workspace

```python
workspace = Workspace(
    name="Dana-Farber 2026 Review",
    client_name="Dana-Farber",
    personas=default_personas(),
)
# Timestamps auto-populated:
print(workspace.created_at)
```

### JSON serialization

```python
# Model → JSON string
json_str = workspace.model_dump_json(indent=2)

# JSON string → Model
restored = Workspace.model_validate_json(json_str)

# JSON Schema export
schema = Workspace.model_json_schema()
```

### Validation errors

```python
from pydantic import ValidationError

try:
    Persona(
        name="Invalid", label="Bad", age=10, tenure_years=0,
        salary=-1, deferral_rate=1.5, current_balance=-100,
        allocation=TargetDateAllocation(target_date_vintage=2065),
    )
except ValidationError as e:
    print(e)
    # Reports all validation errors at once
```

## Running tests

```bash
pytest tests/ -v
```

## File locations

| File | Purpose |
|------|---------|
| `api/models/__init__.py` | Public API — all exports |
| `api/models/base.py` | Shared utilities (timestamp factory) |
| `api/models/asset_class_return.py` | AssetClassReturn model |
| `api/models/match_tier.py` | MatchTier model |
| `api/models/vesting.py` | VestingSchedule discriminated union |
| `api/models/core_contribution_tier.py` | CoreContributionTier model |
| `api/models/plan_design.py` | PlanDesign model |
| `api/models/asset_allocation.py` | AssetAllocation discriminated union |
| `api/models/persona.py` | Persona model |
| `api/models/assumptions.py` | Assumptions model |
| `api/models/monte_carlo_config.py` | MonteCarloConfig model |
| `api/models/workspace.py` | Workspace model |
| `api/models/scenario.py` | Scenario model |
| `api/models/defaults.py` | default_personas() factory |
| `tests/models/` | All model tests |
