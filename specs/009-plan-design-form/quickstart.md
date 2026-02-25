# Quickstart: Plan Design Configuration Form

**Branch**: `009-plan-design-form`

## Prerequisites

- Node.js (for Vite dev server)
- Python 3.12 (for backend API)

## Running the Application

### Backend API

```bash
cd src
uvicorn api.main:app --reload --port 8000
```

### Frontend Dev Server

```bash
cd app
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` with the Vite dev proxy forwarding `/api` requests to `localhost:8000`.

## Key Files to Modify

| File | Purpose |
| ---- | ------- |
| `app/src/components/PlanDesignForm.tsx` | Main form component (551 lines, scaffold exists) |
| `app/src/utils/plan-design-summary.ts` | Existing summary utility (extend for contribution calc) |
| `app/src/pages/ScenarioCreatePage.tsx` | Create scenario page (embed form) |
| `app/src/pages/ScenarioEditPage.tsx` | Edit scenario page (embed form) |
| `app/src/types/plan-design.ts` | TypeScript type definitions |

## Development Flow

1. Start backend + frontend dev servers
2. Navigate to a workspace → Scenarios → "New Scenario"
3. The plan design form renders below the scenario name/description fields
4. Modify `PlanDesignForm.tsx` — Vite HMR updates the browser instantly

## Validation Testing

To test core tier overlap detection and cross-field validation:
1. Add 2+ core tiers with overlapping age ranges
2. Enable auto-enrollment then set escalation cap below enroll rate
3. Verify inline error messages appear in real time
