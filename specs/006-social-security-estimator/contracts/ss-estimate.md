# API Contract: Social Security Estimate Endpoint

**Feature**: 006-social-security-estimator
**Endpoint**: `POST /api/v1/workspaces/{workspace_id}/ss-estimate`
**Change type**: New endpoint

## Request

```json
{
  "persona_ids": ["uuid1", "uuid2"]
}
```

All fields are optional. If `persona_ids` is omitted or empty, estimates are computed for all personas in the workspace.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `persona_ids` | list[UUID] | No | Filter to specific personas. Defaults to all. |

## Response

### SSEstimateResponse

```json
{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
  "estimates": [
    {
      "persona_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "persona_name": "Sarah",
      "claiming_age": 67,
      "monthly_benefit_today": 2450.00,
      "annual_benefit_today": 29400.00,
      "pia_monthly": 2450.00,
      "claiming_adjustment_factor": 1.0,
      "aime": 8500
    },
    {
      "persona_id": "8a1b2c3d-4e5f-6789-abcd-ef0123456789",
      "persona_name": "Jordan",
      "claiming_age": 62,
      "monthly_benefit_today": 1120.00,
      "annual_benefit_today": 13440.00,
      "pia_monthly": 1600.00,
      "claiming_adjustment_factor": 0.7,
      "aime": 3200
    }
  ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `workspace_id` | UUID | Workspace these personas belong to |
| `estimates` | list | One entry per requested persona |
| `persona_id` | UUID | Persona identifier |
| `persona_name` | str | Persona display name |
| `claiming_age` | int | SS claiming age used (from persona's `ss_claiming_age`) |
| `monthly_benefit_today` | float | Estimated monthly benefit in today's dollars |
| `annual_benefit_today` | float | Annualized benefit (`floor(monthly) * 12`) |
| `pia_monthly` | float | Primary Insurance Amount (monthly) at FRA |
| `claiming_adjustment_factor` | float | Multiplier applied to PIA for early/delayed claiming |
| `aime` | int | Average Indexed Monthly Earnings (whole dollars) |

### Error Responses

| Status | Condition |
|--------|-----------|
| 404 | Workspace not found |
| 404 | Persona ID not found in workspace |
| 422 | Invalid persona_ids format |

## Notes

- All dollar amounts in **today's dollars** (real/constant purchasing power)
- Personas with `include_social_security = false` are still estimated if explicitly requested (the toggle only affects simulation integration, not standalone estimation)
- Uses workspace `base_config` assumptions (inflation_rate, wage_growth_rate) and `MonteCarloConfig.retirement_age`
- Deterministic: same inputs always produce same outputs
