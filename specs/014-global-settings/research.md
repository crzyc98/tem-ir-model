# Research: Global Settings Page

**Feature**: 014-global-settings
**Date**: 2026-02-25

---

## Decision 1: Config File Format (YAML)

**Decision**: YAML for `~/.retiremodel/global_defaults.yaml`, parsed with `pyyaml`.

**Rationale**: The spec explicitly requires YAML. `pyyaml>=6.0` is already in `api/requirements.txt`, so zero new dependencies are introduced. YAML is human-readable, which is appropriate for a config file that an advanced user might want to inspect or manually edit. `yaml.safe_load` / `yaml.safe_dump` provide safe parsing with no code execution risk.

**Alternatives considered**:
- **JSON**: Already used for workspace/scenario storage. YAML is more config-friendly (comments, cleaner number formatting).
- **TOML**: Would require a new dependency (`tomllib` is stdlib 3.11+ read-only; write would need `tomli-w`).
- **SQLite**: Massively over-engineered for a single config record.

---

## Decision 2: GlobalDefaults Model — Separate from Assumptions

**Decision**: Create a new `api/models/global_defaults.py` with a `GlobalDefaults` Pydantic model that is structurally independent of `Assumptions`. The fields that map to `Assumptions` are duplicated deliberately.

**Rationale**: GlobalDefaults and workspace `Assumptions` are different concepts — GlobalDefaults is an app-level template; `Assumptions` is a per-workspace record. Keeping them separate means:
- GlobalDefaults can evolve independently (e.g., add simulation-config fields that have no `Assumptions` counterpart)
- No accidental leakage of workspace fields into app config
- Validation constraints can differ (e.g., GlobalDefaults has a mode selector; `Assumptions` has a `float | None` field)

When `create_workspace()` runs, it explicitly maps GlobalDefaults → Assumptions fields — a deliberate translation layer.

**Alternatives considered**:
- **Embed GlobalDefaults inside Assumptions**: Would pollute the workspace model with app-level concepts.
- **Reuse Assumptions as GlobalDefaults**: Assumptions has workspace-specific fields (asset class returns, stochastic std devs) not relevant to global defaults. Mixing them causes confusion about what's configurable globally vs. per-workspace.

---

## Decision 3: Salary Growth Rate Field Mapping

**Decision**: The spec's "Salary Growth Rate (default inflation + 1.5% = 4.0%)" maps to `salary_real_growth_rate` in the `Assumptions` model (the real growth component). GlobalDefaults stores it as the real component (1.5%) and the UI displays it with a label clarifying it is the real (inflation-adjusted) component.

**Rationale**: The `Assumptions` model already distinguishes:
- `wage_growth_rate` (3% nominal): stochastic simulation parameter for Monte Carlo wage draws
- `salary_real_growth_rate` (1.5% real): policy rate for projecting the final salary used in the income-replacement denominator

The spec's "salary growth rate" is clearly the latter (the user annotated it as "inflation + 1.5%"), which is `salary_real_growth_rate`. The stochastic `wage_growth_rate` is a simulation parameter not intended for global pre-configuration.

GlobalDefaults stores `salary_real_growth_rate: float = 0.015` (the real component). The UI shows it with a tooltip or helper text explaining the relationship to nominal rate.

**Alternatives considered**:
- **Expose as nominal 4.0%**: Would require storing and converting, adding complexity.
- **Expose `wage_growth_rate` instead**: Wrong field — that's the stochastic simulation parameter, not the salary projection rate.

---

## Decision 4: SS Taxable Maximum — Add to Assumptions

**Decision**: Add `ss_taxable_max: float = Field(default=176_100, gt=0)` to the `Assumptions` model. The GlobalDefaults system default for this field is set to the spec's stated value ($184,500). The `ss_taxable_max` in `Assumptions` is available for per-workspace configuration and can be surfaced by the SS estimator in future iterations.

**Rationale**: The spec requires exposing SS taxable maximum as an IRS limit in global settings, meaning it must flow into new workspace `Assumptions`. The current `Assumptions` model lacks this field. Adding it with Pydantic's default behavior (`extra="ignore"` is not set, but the field has a default) means existing workspace JSON files load cleanly — the field defaults to the model-level value when absent from the file.

The `ss_estimator` service currently uses internal historical tables for the SS taxable max by year. Adding the field to Assumptions does not change the ss_estimator's behavior; it is additive only.

**Alternatives considered**:
- **Keep ss_taxable_max only in GlobalDefaults, not Assumptions**: The spec requirement is that it flows into new workspaces as an editable value, so Assumptions needs it.
- **Use ss_estimator's internal constant**: The ss_estimator's lookup is historical/backward-looking. A workspace config field for the current-year limit is needed for forward projections.

---

## Decision 5: Age Validation Ranges

**Decision**: GlobalDefaults uses the same validation constraints as the existing models it maps to:
- `retirement_age`: ge=55, le=70 (matches `MonteCarloConfig`)
- `planning_age`: ge=85, le=100 (matches `MonteCarloConfig`)
- `ss_claiming_age`: ge=62, le=70 (matches per-persona `ss_claiming_age` field in `Persona`)

**Rationale**: If GlobalDefaults allowed retirement_age=75 but `MonteCarloConfig` only accepts up to 70, workspace creation would silently fail validation or clip the value. Matching constraints prevents this. The spec's suggested ranges (50–120 for planning/retirement) are intentionally wider, but narrowing to match existing model constraints avoids breaking downstream validation.

**Note**: The spec's stated default "planning age 93" is within the `MonteCarloConfig` constraint (ge=85, le=100). All spec defaults are within the tighter model constraints.

---

## Decision 6: SS Claiming Age as Per-Persona Default

**Decision**: The global default `ss_claiming_age` is applied to each default persona when creating a new workspace. Concretely, `create_workspace()` applies `ss_claiming_age` from GlobalDefaults to every persona produced by `default_personas()`.

**Rationale**: The `ss_claiming_age` field lives on `Persona`, not on `MonteCarloConfig`. There is no workspace-level SS claiming age override. Applying the global default to all default personas on workspace creation is the correct translation. Each persona's `ss_claiming_age` can be individually edited after workspace creation.

**Alternatives considered**:
- **Add `ss_claiming_age` to `MonteCarloConfig`**: Would require a model change and a new concept of workspace-level SS age override. Persona-level granularity is already established.
- **Only apply to newly created (non-default) personas**: The spec says "default 67" for new workspaces, implying all initial personas get the default.

---

## Decision 7: Backend API Design (REST)

**Decision**: Three endpoints under `/api/v1/global-settings`:
- `GET /api/v1/global-settings` — return current saved GlobalDefaults (or system defaults if file missing)
- `PUT /api/v1/global-settings` — save full updated GlobalDefaults, return saved record
- `POST /api/v1/global-settings/restore` — delete config file, return system defaults

**Rationale**: `GET`/`PUT` are semantically correct for a single global resource. `PUT` (not `PATCH`) is appropriate since the page always submits all fields. A dedicated `POST /restore` endpoint cleanly separates the "restore" side-effect from a normal save. This pattern is consistent with other single-record config endpoints.

**Alternatives considered**:
- **PATCH instead of PUT**: Makes sense if partial saves were needed. The global settings page submits all fields at once, so PUT is cleaner.
- **DELETE for restore**: DELETE semantically means remove the resource; `POST /restore` clearly communicates the action.

---

## Decision 8: WorkspaceService Integration

**Decision**: `WorkspaceService.create_workspace()` gains an optional `global_defaults: GlobalDefaults | None = None` parameter. The router endpoint loads the `GlobalDefaultsStore` from `request.app.state` and passes the loaded defaults to the service. If no defaults file exists, `GlobalDefaultsStore.load()` returns `GlobalDefaults()` (hardcoded defaults), so `create_workspace()` always receives a valid defaults object.

**Rationale**: Passing defaults into the service (rather than having the service load them directly) keeps the service testable without a filesystem. It also maintains the existing dependency-injection pattern where stores are accessed from `request.app.state`, not instantiated inside services.

---

## Decision 9: System Defaults Constant

**Decision**: The hardcoded system defaults are defined as `SYSTEM_DEFAULTS: dict` in `api/models/global_defaults.py` and mirrored as a TypeScript `SYSTEM_DEFAULTS` const in `app/src/types/global-settings.ts`. These are the source of truth for the "Restore System Defaults" behavior.

The backend's `GlobalDefaults()` (no args) produces system defaults via Pydantic field defaults. `GlobalDefaultsStore.reset()` simply deletes the YAML file, then `load()` returns `GlobalDefaults()`.

**System defaults (as specified in the spec)**:
- `inflation_rate`: 0.025 (2.5%)
- `salary_real_growth_rate`: 0.015 (1.5% real → ~4.0% nominal at 2.5% inflation)
- `comp_limit`: 360,000
- `deferral_limit`: 24,500
- `additions_limit`: 72,000
- `catchup_limit`: 8,000
- `super_catchup_limit`: 11,250
- `ss_taxable_max`: 184,500
- `target_replacement_ratio_mode`: "lookup_table"
- `target_replacement_ratio_override`: null
- `retirement_age`: 67
- `planning_age`: 93
- `ss_claiming_age`: 67

---

## Decision 10: Number of Simulations Read-Only Display

**Decision**: The "Number of Simulations: 250" field is displayed as a read-only informational element on the frontend. The value 250 is hardcoded in the frontend component. It is not stored in GlobalDefaults and has no backend API representation.

**Rationale**: The simulation count is determined by the scenario matrix architecture (fixed-size pre-computed Monte Carlo matrices). Exposing it as a config option would require major simulation engine changes. Displaying it as a read-only informational field gives users transparency about the architecture without implying it is configurable. The spec explicitly states this constraint.
