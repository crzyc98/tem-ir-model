# Quickstart: React Frontend Shell

**Feature**: 007-frontend-shell | **Date**: 2026-02-24

## Prerequisites

- Node.js 18+ (for Vite dev server)
- Python 3.12 + virtual environment (for backend API)
- Backend dependencies installed (`pip install -r api/requirements.txt`)
- Frontend dependencies installed (`cd app && npm install`)

## Running the Application

### 1. Start the Backend API

```bash
cd /Users/nicholasamaral/Developer/tem-ir-model
source .venv/bin/activate
uvicorn api.main:app --reload --port 8000
```

The backend serves at `http://localhost:8000`. Verify with:
```bash
curl http://localhost:8000/api/v1/health
# → {"status":"healthy","version":"0.1.0"}
```

### 2. Start the Frontend Dev Server

In a separate terminal:
```bash
cd /Users/nicholasamaral/Developer/tem-ir-model/app
npm run dev
```

The frontend serves at `http://localhost:5173`. The Vite proxy forwards `/api/*` requests to the backend.

### 3. Verify

1. Open `http://localhost:5173` in your browser
2. The sidebar should show navigation items and a workspace selector
3. If the backend has workspaces, they appear in the workspace dropdown
4. If no workspaces exist, a "create workspace" prompt appears
5. Click each nav item to verify routing and active state

## Development Workflow

### File Structure

```
app/src/
├── App.tsx                    # Routes definition
├── components/
│   ├── Layout.tsx             # Shell layout (sidebar + header + outlet)
│   ├── Sidebar.tsx            # Navigation + workspace selector
│   └── WorkspaceSelector.tsx  # Workspace dropdown
├── pages/
│   ├── DashboardPage.tsx
│   ├── PersonaModelingPage.tsx
│   ├── PlanComparisonPage.tsx
│   ├── ScenariosPage.tsx
│   ├── SettingsPage.tsx
│   └── NotFoundPage.tsx
├── services/
│   └── api.ts                 # Backend API client
└── types/
    └── workspace.ts           # TypeScript interfaces
```

### Type Checking

```bash
cd app && npx tsc -b
```

### Building for Production

```bash
cd app && npm run build
```

Output goes to `app/dist/`.

## Creating Test Data

To create a workspace via the API (so the workspace selector has data):

```bash
curl -X POST http://localhost:8000/api/v1/workspaces \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Acme Corp", "name": "Q2 2025 Analysis"}'
```
