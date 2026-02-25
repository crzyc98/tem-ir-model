# Data Model: Persona Gallery

**Branch**: `010-persona-gallery` | **Date**: 2026-02-24

## Entity: Persona (modified)

Existing entity in `api/models/persona.py`. One new field added.

| Field                  | Type             | Constraints                            | Notes                                |
|------------------------|------------------|----------------------------------------|--------------------------------------|
| id                     | UUID             | Auto-generated                         | Existing — unique identifier         |
| name                   | string           | Required                               | Existing — display name              |
| label                  | string           | Required                               | Existing — e.g., "Early Career"      |
| age                    | integer          | 18–80                                  | Existing                             |
| tenure_years           | integer          | 0–60                                   | Existing                             |
| salary                 | float            | >= 0                                   | Existing (change: relax gt=0 to ge=0)|
| deferral_rate          | float            | 0.0–1.0                                | Existing                             |
| current_balance        | float            | >= 0                                   | Existing                             |
| allocation             | AssetAllocation  | Discriminated union                    | Existing                             |
| include_social_security| boolean          | Default: true                          | Existing                             |
| ss_claiming_age        | integer          | 62–70, default: 67                     | Existing                             |
| **hidden**             | **boolean**      | **Default: false**                     | **NEW — excludes from simulations**  |

### Changes from existing model

1. **New field `hidden`**: `bool = False`. Controls whether the persona is included in simulation runs. Backward-compatible — existing JSON without this field will default to `False`.
2. **Salary constraint relaxed**: Change from `gt=0` to `ge=0` to support $0 salary (spec edge case: modeling unpaid participants).

## Entity: AssetAllocation (unchanged)

Discriminated union — no changes needed.

### TargetDateAllocation

| Field              | Type    | Constraints          | Notes                      |
|--------------------|---------|----------------------|----------------------------|
| type               | literal | "target_date"        | Discriminator              |
| target_date_vintage| integer | >= current year      | 5-year increments in UI    |

### CustomAllocation

| Field     | Type  | Constraints           | Notes                          |
|-----------|-------|-----------------------|--------------------------------|
| type      | literal| "custom"             | Discriminator                  |
| stock_pct | float | 0.0–1.0              | Fraction of portfolio          |
| bond_pct  | float | 0.0–1.0              | Fraction of portfolio          |
| cash_pct  | float | 0.0–1.0              | Fraction of portfolio          |

**Validation**: `stock_pct + bond_pct + cash_pct` must equal 1.0 (±0.01 tolerance).

## Entity: Workspace (unchanged structure)

| Field            | Type              | Notes                                            |
|------------------|-------------------|--------------------------------------------------|
| id               | UUID              | Existing                                         |
| name             | string            | Existing                                         |
| client_name      | string            | Existing                                         |
| personas         | list[Persona]     | Existing — max 12 (new validation)               |
| base_config      | Assumptions       | Existing                                         |
| monte_carlo_config| MonteCarloConfig | Existing                                         |
| created_at       | datetime          | Existing                                         |
| updated_at       | datetime          | Existing                                         |

### Changes from existing model

1. **New validation**: `len(personas) <= 12` enforced on updates.

## Entity: WorkspaceUpdate (API schema — modified)

Existing schema in `api/routers/workspaces.py`. One new field added.

| Field       | Type                  | Notes                                   |
|-------------|-----------------------|-----------------------------------------|
| name        | string (optional)     | Existing                                |
| client_name | string (optional)     | Existing                                |
| base_config | AssumptionsOverride (optional) | Existing                         |
| **personas**| **list[Persona] (optional)** | **NEW — full replacement of personas list** |

### Behavior

When `personas` is provided in a PATCH request:
- The entire personas list is replaced (not merged)
- Each persona is validated (age, salary, deferral_rate, etc.)
- Total count must be <= 12
- `updated_at` is refreshed

## State Transitions

### Persona Visibility

```
Active (hidden=false) ←→ Hidden (hidden=true)
       ↓                       ↓
   [Delete]                [Delete]
       ↓                       ↓
    Removed                 Removed
```

### Persona Set Lifecycle

```
Default Set (8 personas)
       ↓ [user edits/adds/deletes/hides]
Modified Set (1–12 personas)
       ↓ [Reset to Defaults]
Default Set (8 personas)
```

## Relationships

```
Workspace 1 ──────────── * Persona (max 12)
                              │
                              ├── 1 AssetAllocation
                              │      ├── TargetDateAllocation
                              │      └── CustomAllocation
                              │
                              └── hidden: bool (active/inactive)
```
