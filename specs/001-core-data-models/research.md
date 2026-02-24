# Research: Core Pydantic Data Models

**Feature Branch**: `001-core-data-models`
**Date**: 2026-02-24

## R1: Pydantic v2 Discriminated Unions

**Decision**: Use separate models per variant with `Literal` type fields and `Annotated[Union[...], Field(discriminator='type')]` for VestingSchedule and AssetAllocation.

**Rationale**: This is the canonical Pydantic v2 pattern. Each variant is its own `BaseModel` with a `type` field constrained to a `Literal`. The parent field uses `Annotated[Union[...], Field(discriminator='type')]`. This approach:
- Enforces required fields structurally (CliffVesting *requires* `years`, GradedVesting *requires* `schedule`) — no cross-field validator needed
- Produces clean JSON Schema (`oneOf` with `discriminator` metadata) for FR-012
- Generates accurate error messages that name the variant

**Alternatives considered**:
- Single model with optional fields + model_validator: Requires `Optional` on every variant-specific field, manual enforcement of conditional requirements, and produces less informative JSON Schema. Rejected for more code and worse developer experience.

## R2: Cross-Field Validation

**Decision**: Use `@model_validator(mode='after')` returning `Self` for all cross-field validations.

**Rationale**: In Pydantic v2.10, `mode='after'` receives the fully constructed model instance with all fields already parsed and typed. This is the cleanest pattern for:
- `planning_age > retirement_age` (FR-013)
- `auto_escalation_cap >= auto_enroll_rate` when both enabled (FR-014)
- `stock_pct + bond_pct + cash_pct == 1.0` within tolerance (FR-004)
- CoreContributionTier overlap detection (FR-016)

**Alternatives considered**:
- `mode='before'` validators: Operate on raw dicts before field parsing — harder to work with, no type safety. Rejected.
- `@field_validator`: Cannot access other fields. Not suitable for cross-field checks.

## R3: UUID and Timestamp Auto-Generation

**Decision**: Use `Field(default_factory=uuid4)` with `UUID` type for IDs. Use `Field(default_factory=_utc_now)` with a named helper function for timestamps.

**Rationale**:
- `default_factory=uuid4` (not `lambda: uuid4()`) — `uuid4` is already a callable returning `UUID`. Pydantic serializes UUIDs to strings in JSON automatically.
- Extract timestamp factory into `_utc_now()` named function for testability (can be mocked) and to avoid lambda serialization issues.
- Use `datetime.now(UTC)` (Python 3.12 pattern), not deprecated `datetime.utcnow()`.
- `updated_at` refresh is handled at the service layer, not in the model.

**Alternatives considered**:
- `default=uuid4()`: Evaluated once at class definition time — every instance would share the same UUID. Incorrect.
- Lambda factories: Work but harder to mock in tests and can cause pickling issues.

## R4: CoreContributionTier Overlap Detection

**Decision**: Pairwise comparison of tiers. Two tiers overlap if they overlap on every dimension where both have non-null bounds. Use `[min, max)` half-open interval math.

**Rationale**: The algorithm must handle compound eligibility (age + service) with nullable bounds:
- `min=None` → negative infinity (unbounded lower)
- `max=None` → positive infinity (unbounded upper)
- Two half-open intervals `[a, b)` and `[c, d)` overlap iff `a < d AND c < b`
- Tiers with no shared active dimensions are considered non-overlapping (targeting disjoint populations)

Place individual tier validation (at least one dimension non-null, bounds ordering) on `CoreContributionTier` model. Place inter-tier overlap validation on `PlanDesign` via model_validator.

**Alternatives considered**:
- Interval tree data structure: Over-engineered for max 5 tiers. O(n^2) pairwise comparison is sufficient and simpler.
- Validating all dimensions independently: Would incorrectly flag tiers that overlap on age but not service. The compound check (overlap on ALL shared dimensions) is the correct semantic.

## R5: JSON Schema Export

**Decision**: Use `Model.model_json_schema()` for BaseModel classes and `TypeAdapter(T).json_schema()` for discriminated union type aliases.

**Rationale**: Discriminated union type aliases (VestingSchedule, AssetAllocation) are `Annotated` types, not `BaseModel` subclasses. They require `TypeAdapter` for standalone schema export. When used as fields on parent models, their schemas are automatically included via `$ref` and `$defs`.

**Alternatives considered**:
- Manual schema construction: Unnecessary — Pydantic generates valid, feature-complete JSON Schema automatically.

## R6: Testing Setup

**Decision**: Use pytest with `--import-mode=importlib`, `pythonpath=["."]` in `pyproject.toml`. Tests in top-level `tests/` directory mirroring source structure. Use `jsonschema` for schema validation tests.

**Rationale**:
- `pythonpath=["."]` allows `from api.models import ...` without installing as editable package
- `importlib` mode is the modern pytest recommendation for new projects
- One test file per model (or logical group), organized by behavior: instantiation, validation, serialization
- `jsonschema.Draft202012Validator.check_schema()` validates generated schemas against the official metaschema
- `pytest.raises(ValidationError)` + `.errors()` for asserting on specific field locations, error types, and messages

**Alternatives considered**:
- polyfactory for auto-generating valid test instances: Useful for fuzz-testing but not needed for acceptance tests with specific expected values. Can be added later.
- pytest-pydantic plugin: Does not exist. No official plugin available.

## R7: Module Structure

**Decision**: Place models in `api/models/` as a Python package with one module per logical model group. Export all public types from `api/models/__init__.py`.

**Rationale**: The existing project uses `api/` as the top-level Python package. Models are consumed by routers and services within the same package. A `models/` subpackage keeps the namespace clean and allows individual model files to stay focused.

**Alternatives considered**:
- Single `models.py` file: Would become too large given 10+ models with validators. Rejected for maintainability.
- Separate `schemas/` package: Non-standard naming for Pydantic projects. `models/` is the convention.
