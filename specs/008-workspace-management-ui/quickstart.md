# Quickstart: Workspace Management UI

**Branch**: `008-workspace-management-ui` | **Date**: 2026-02-24

## Prerequisites

- Node.js 18+ and npm
- Python 3.12+ with pip (for the backend API)

## Start the Backend

```bash
cd src
pip install -e ".[dev]"
uvicorn api.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/api/v1/health` → `{"status": "healthy", "version": "0.1.0"}`

## Start the Frontend

```bash
cd app
npm install
npm run dev
```

Opens at `http://localhost:5173`. The Vite proxy forwards `/api/*` to `localhost:8000`.

## Manual Verification Flow

1. **Dashboard**: Navigate to `/dashboard` — should see workspace cards (or empty state)
2. **Create workspace**: Click "New Workspace" → enter client name → submit → card appears
3. **Click workspace card**: Navigates to `/scenarios` with workspace selected
4. **Create scenario**: Click "New Scenario" → fill plan design form → submit → card appears
5. **Edit scenario**: Click scenario card → modify plan design → save → card updates
6. **Duplicate scenario**: Click duplicate action on a card → copy appears
7. **Delete scenario**: Click delete action → confirm → card removed
8. **Settings**: Navigate to `/settings` → edit assumptions and personas → save
9. **Delete workspace**: On dashboard, click delete on a workspace card → confirm → card removed

## Seed Data (optional)

Create a workspace with scenarios via the API for testing:

```bash
# Create workspace
curl -X POST http://localhost:8000/api/v1/workspaces \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Acme Corp"}'

# Note the workspace ID from response, then create scenarios
curl -X POST http://localhost:8000/api/v1/workspaces/{WORKSPACE_ID}/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Base Plan",
    "plan_design": {
      "name": "Base Plan",
      "match_tiers": [{"match_rate": 1.0, "on_first_pct": 0.06}],
      "auto_enroll_rate": 0.06,
      "auto_escalation_cap": 0.10
    }
  }'

curl -X POST http://localhost:8000/api/v1/workspaces/{WORKSPACE_ID}/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Enhanced Match",
    "plan_design": {
      "name": "Enhanced Match",
      "match_tiers": [
        {"match_rate": 1.0, "on_first_pct": 0.04},
        {"match_rate": 0.5, "on_first_pct": 0.02}
      ],
      "core_contribution_pct": 0.03,
      "auto_enroll_rate": 0.08,
      "auto_escalation_cap": 0.15
    }
  }'
```

## Run Linting

```bash
cd app
npx tsc --noEmit        # TypeScript type checking
```

## Key Files

| File                              | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `app/src/App.tsx`                 | Route definitions                                |
| `app/src/components/Layout.tsx`   | Shell layout, workspace state, context provider  |
| `app/src/services/api.ts`        | All backend API calls                            |
| `app/src/types/`                  | TypeScript interfaces mirroring backend models   |
| `app/src/pages/DashboardPage.tsx` | Workspace card grid                              |
| `app/src/pages/ScenariosPage.tsx` | Scenario card list with CRUD actions             |
| `app/src/pages/ScenarioCreatePage.tsx` | Full-page scenario creation form            |
| `app/src/pages/ScenarioEditPage.tsx`   | Full-page scenario edit form                |
| `app/src/pages/SettingsPage.tsx`  | Base assumptions + persona editing               |
| `app/src/components/PlanDesignForm.tsx` | Reusable plan design form component         |
| `app/src/utils/plan-design-summary.ts` | Human-readable plan design formatter        |
