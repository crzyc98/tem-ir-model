# Tasks: React Frontend Shell

**Input**: Design documents from `/specs/007-frontend-shell/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test framework is configured for the frontend. Tests are not included. Validation is via TypeScript compilation (`tsc -b`) and manual visual inspection.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `app/src/` (existing Vite + React project)
- All paths relative to repository root `/Users/nicholasamaral/Developer/tem-ir-model/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the directory structure and shared type definitions needed by all user stories

- [X] T001 Create directory structure: `app/src/components/`, `app/src/pages/`, `app/src/services/`, `app/src/types/`
- [X] T002 [P] Create shared TypeScript types in `app/src/types/workspace.ts` — define `WorkspaceSummary` interface (id, name, client_name, created_at, updated_at), `LayoutContext` interface (activeWorkspace, setActiveWorkspace, workspaces), and `HealthStatus` interface (status, version)
- [X] T003 [P] Create shared TypeScript nav types in `app/src/types/navigation.ts` — define `NavItem` interface (label, icon as LucideIcon, to?, end?, children?: NavItem[]) for both direct links and collapsible groups

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the API service layer and extract the existing DashboardPage — MUST be complete before user story work begins

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create API service module in `app/src/services/api.ts` — implement `listWorkspaces(): Promise<WorkspaceSummary[]>` and `getHealthStatus(): Promise<HealthStatus>` using `fetch()` with `/api/v1/` prefix. Throw descriptive errors on network failure or non-2xx responses. Import types from `../types/workspace`
- [X] T005 Extract DashboardPage from `app/src/App.tsx` into `app/src/pages/DashboardPage.tsx` — move the `DashboardPage` function component (health check logic, lines 37-113 of current App.tsx) into its own file. Update it to import `getHealthStatus` from `../services/api` and `HealthStatus` from `../types/workspace` instead of inline fetch. Keep the health check card styling (rounded-xl, border-gray-100, shadow-sm)

**Checkpoint**: API service and extracted Dashboard page ready for integration

---

## Phase 3: User Story 1 — Application Shell and Navigation (Priority: P1) MVP

**Goal**: Deliver a navigable application shell with fixed sidebar, top header bar, collapsible nav groups, and client-side routing to all 5 pages + 404

**Independent Test**: Launch the app at localhost:5173, verify the sidebar renders with Dashboard, Modeling (collapsible group containing Persona Modeling and Plan Comparison), Scenarios, and Settings nav items. Click each nav item and confirm the correct page loads with active state highlighted in brand color (#00853F). Expand/collapse the Modeling group. Navigate to a non-existent URL and verify the 404 page appears.

### Implementation for User Story 1

- [X] T006 [P] [US1] Create Sidebar component in `app/src/components/Sidebar.tsx` — render a fixed `w-64` sidebar with: brand header area (logo "R" box + "RetireModel" text using brand-500 color), navigation items from a `navItems` config array using the `NavItem` type from `../types/navigation`. Implement collapsible groups: Dashboard (top-level, path `/dashboard`), Modeling group header (collapsible, contains Persona Modeling at `/personas` and Plan Comparison at `/plans`), Scenarios (top-level, path `/scenarios`), Settings (top-level, path `/settings`). Use `NavLink` from react-router-dom with `isActive` styling (active: `bg-brand-50 text-brand-600`, inactive: `text-gray-600 hover:bg-gray-50`). Collapsible groups use `useState<boolean>` defaulting to expanded, with `ChevronDown`/`ChevronRight` icons from lucide-react. Sidebar footer shows version "v0.1.0". Accept `children` prop for workspace selector slot in header area. Icons: LayoutDashboard, Users, GitCompare, FolderOpen, Settings from lucide-react
- [X] T007 [P] [US1] Create Layout component in `app/src/components/Layout.tsx` — render the app shell structure: Sidebar component on the left, a top header bar (`h-14`, white bg, border-b, shadow-sm) with title "Retirement Income Modeling" spanning the main content width, and a main content area (`bg-gray-50 p-6`) with `<Outlet />` from react-router-dom. Pass `LayoutContext` via Outlet context. For this phase, set `activeWorkspace` to `null` and `workspaces` to empty array (workspace integration comes in US2). Import Sidebar from `./Sidebar`
- [X] T008 [US1] Refactor routing in `app/src/App.tsx` — replace the entire current App component. Import `Layout` from `./components/Layout`, all page components from `./pages/`, and `NotFoundPage`. Use `<Routes>` with a parent `<Route element={<Layout />}>` wrapping child routes: `/` redirects to `/dashboard`, `/dashboard` renders `DashboardPage`, `/personas` renders `PersonaModelingPage`, `/plans` renders `PlanComparisonPage`, `/scenarios` renders `ScenariosPage`, `/settings` renders `SettingsPage`, `*` renders `NotFoundPage`. Remove all inline component definitions (PlaceholderPage, DashboardPage, navItems, App shell)

**Checkpoint**: At this point, the app should render a sidebar with collapsible nav, header bar, and route between all pages. Workspace selector area is empty (placeholder slot in sidebar).

---

## Phase 4: User Story 2 — Workspace Selector (Priority: P2)

**Goal**: Deliver a workspace selector dropdown in the sidebar that fetches workspaces from the backend API, displays them in a dropdown, and allows switching between workspaces

**Independent Test**: Start the backend API (`uvicorn api.main:app --port 8000`), create at least 2 workspaces via `curl -X POST .../api/v1/workspaces`, then open localhost:5173. Verify the workspace selector shows the first workspace name. Click to open the dropdown, verify all workspaces are listed. Select a different workspace and verify the selector updates. Test error state by stopping the backend and reloading — verify error message with retry button appears. Test empty state by deleting all workspaces.

### Implementation for User Story 2

- [X] T009 [US2] Create WorkspaceSelector component in `app/src/components/WorkspaceSelector.tsx` — accept props: `workspaces: WorkspaceSummary[]`, `activeWorkspace: WorkspaceSummary | null`, `onSelect: (ws: WorkspaceSummary) => void`, `isLoading: boolean`, `error: string | null`, `onRetry: () => void`. Render a button showing the active workspace name (or "Select Workspace" if null) with a `ChevronDown` icon. On click, toggle a dropdown panel listing all workspaces with name and client_name. Clicking a workspace calls `onSelect` and closes the dropdown. Close dropdown when clicking outside (use `useRef` + `useEffect` click-outside handler). Loading state: show a spinner (`Loader2` icon from lucide-react, animate-spin). Error state: show red error text with a "Retry" button that calls `onRetry`. Empty state (0 workspaces): show "No workspaces found" text. Style: dropdown has `bg-white rounded-xl shadow-lg border border-gray-200` positioning, active workspace highlighted with `bg-brand-50`
- [X] T010 [US2] Add workspace state management to Layout in `app/src/components/Layout.tsx` — import `listWorkspaces` from `../services/api` and `WorkspaceSummary` from `../types/workspace`. Add state: `workspaces: WorkspaceSummary[]` (default `[]`), `activeWorkspace: WorkspaceSummary | null` (default `null`), `isLoading: boolean` (default `true`), `error: string | null` (default `null`). In `useEffect` on mount, call `listWorkspaces()`, on success set workspaces and activeWorkspace to first item, on failure set error message. Implement `handleRetry` to re-call `listWorkspaces`. Update `LayoutContext` outlet context to pass real workspace data. If loading and no workspaces, show a centered loading spinner. If error and no workspaces, show a centered error with retry button
- [X] T011 [US2] Integrate WorkspaceSelector into Sidebar in `app/src/components/Sidebar.tsx` — accept new props: `workspaces`, `activeWorkspace`, `onWorkspaceSelect`, `isWorkspaceLoading`, `workspaceError`, `onWorkspaceRetry`. Render `<WorkspaceSelector>` in the sidebar header area (between the brand area and the nav items), passing through all workspace props. Import WorkspaceSelector from `./WorkspaceSelector`
- [X] T012 [US2] Wire workspace props from Layout to Sidebar in `app/src/components/Layout.tsx` — pass workspace state (workspaces, activeWorkspace, isLoading, error) and handlers (setActiveWorkspace, handleRetry) as props to the Sidebar component

**Checkpoint**: At this point, the workspace selector fetches from the API, shows loading/error/empty/loaded states, and allows switching workspaces. All previous navigation still works.

---

## Phase 5: User Story 3 — Placeholder Page Content (Priority: P3)

**Goal**: Deliver enriched placeholder pages for all 5 sections with unique titles, descriptions, and consistent design system card styling. Add a 404 Not Found page.

**Independent Test**: Navigate to each of the 5 pages and verify each shows a unique title, descriptive text about the page's future purpose, and a relevant Lucide icon — all within a white card with rounded-xl, shadow-sm, border border-gray-100 on bg-gray-50 background. Navigate to `/nonexistent` and verify the 404 page appears with a link back to Dashboard.

### Implementation for User Story 3

- [X] T013 [P] [US3] Create PersonaModelingPage in `app/src/pages/PersonaModelingPage.tsx` — render a card (white bg, rounded-xl, shadow-sm, border border-gray-100) with the `Users` icon from lucide-react, title "Persona Modeling", and description "Define and manage employee personas for your retirement income analysis. Configure demographics, compensation, and career trajectories."
- [X] T014 [P] [US3] Create PlanComparisonPage in `app/src/pages/PlanComparisonPage.tsx` — render a card with the `GitCompare` icon, title "Plan Comparison", and description "Compare retirement plan designs side by side. Analyze contribution structures, vesting schedules, and projected outcomes across scenarios."
- [X] T015 [P] [US3] Create ScenariosPage in `app/src/pages/ScenariosPage.tsx` — render a card with the `FolderOpen` icon, title "Scenarios", and description "Create and manage simulation scenarios. Configure assumptions, run Monte Carlo simulations, and review projected retirement outcomes."
- [X] T016 [P] [US3] Create SettingsPage in `app/src/pages/SettingsPage.tsx` — render a card with the `Settings` icon, title "Settings", and description "Configure workspace preferences, manage base assumptions, and adjust system-wide defaults for your retirement modeling analysis."
- [X] T017 [P] [US3] Create NotFoundPage in `app/src/pages/NotFoundPage.tsx` — render a centered card with the `AlertTriangle` icon from lucide-react, title "Page Not Found", description "The page you're looking for doesn't exist.", and a `<Link to="/dashboard">` styled as a brand-colored button ("Back to Dashboard"). Use same card styling (rounded-xl, shadow-sm, border border-gray-100)
- [X] T018 [US3] Enrich DashboardPage in `app/src/pages/DashboardPage.tsx` — update the existing dashboard header card description from "Welcome to RetireModel. Your retirement planning command center." to "Overview of your retirement income modeling workspace. Monitor simulation status, recent activity, and key metrics." Keep the health check card below it. Ensure the workspace context is accessible via `useOutletContext<LayoutContext>()` and display the active workspace name in the header if available (e.g., "Dashboard — {workspace.name}")

**Checkpoint**: All 5 pages show enriched placeholders with consistent card styling. 404 page works for unknown routes.

---

## Phase 6: User Story 4 — Design System Consistency & Polish

**Purpose**: Cross-cutting design system audit and final verification

- [X] T019 Verify Tailwind brand color usage across all components — audit `app/src/components/Sidebar.tsx`, `app/src/components/WorkspaceSelector.tsx`, and all page files. Ensure active nav items use `bg-brand-50 text-brand-600` (not hardcoded hex). Ensure primary buttons use `bg-brand-500 hover:bg-brand-600 text-white`. Ensure no hardcoded `#00853F` appears in component code (use Tailwind's `brand-*` classes instead)
- [X] T020 Verify no flashy animations exist — audit all component files for animation classes. Only permitted: `transition-colors` for hover states, `animate-spin` for loading spinners. Remove any `animate-fadeIn`, `animate-pulse` (except loading skeletons), or other decorative animations
- [X] T021 Verify Roboto font applies globally — confirm `app/index.html` includes the Google Fonts Roboto link, confirm `app/tailwind.config.js` has `fontFamily: { sans: ['Roboto', ...] }`, and confirm `app/index.html` body has `font-sans` class
- [X] T022 Run TypeScript compilation check — execute `cd app && npx tsc -b` and fix any type errors. Ensure all imports resolve, no unused variables, and strict mode passes
- [X] T023 Run quickstart.md validation — follow the steps in `specs/007-frontend-shell/quickstart.md` end-to-end: start backend, start frontend, create a test workspace, verify workspace selector loads it, navigate all pages, verify 404 page

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (directory structure + types must exist)
- **US1 (Phase 3)**: Depends on Phase 2 (needs extracted DashboardPage and types)
- **US2 (Phase 4)**: Depends on Phase 3 (needs Layout and Sidebar to exist to integrate into)
- **US3 (Phase 5)**: Depends on Phase 3 (needs routing in App.tsx to reference page components)
- **Polish (Phase 6)**: Depends on Phases 3, 4, and 5 (all components must exist to audit)

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational phase. The navigation shell is the foundation for all other stories.
- **User Story 2 (P2)**: Requires US1 (needs Layout and Sidebar components to integrate the workspace selector into).
- **User Story 3 (P3)**: Requires US1 (needs routing configured in App.tsx). Can run in parallel with US2 since page files are independent.
- **User Story 4 (P4)**: Requires US1, US2, US3 (audit requires all components to exist).

### Within Each User Story

- Models/types before components
- Components before integration/wiring
- Integration before validation

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel (different files)
- **Phase 2**: T004 and T005 can run in parallel (different files)
- **Phase 3**: T006 and T007 can run in parallel (different files), then T008 depends on both
- **Phase 4**: T009 → T010 → T011 → T012 (sequential — each builds on prior)
- **Phase 5**: T013, T014, T015, T016, T017 can ALL run in parallel (all different files), then T018 is independent
- **Phase 6**: T019, T020, T021 can run in parallel (different audit scopes), then T022, T023 sequential

---

## Parallel Example: User Story 3 (Maximum Parallelism)

```
# Launch all 5 placeholder pages in parallel (all different files):
Task: T013 "Create PersonaModelingPage in app/src/pages/PersonaModelingPage.tsx"
Task: T014 "Create PlanComparisonPage in app/src/pages/PlanComparisonPage.tsx"
Task: T015 "Create ScenariosPage in app/src/pages/ScenariosPage.tsx"
Task: T016 "Create SettingsPage in app/src/pages/SettingsPage.tsx"
Task: T017 "Create NotFoundPage in app/src/pages/NotFoundPage.tsx"

# Then enrich Dashboard (separate file, depends on LayoutContext from US2):
Task: T018 "Enrich DashboardPage in app/src/pages/DashboardPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: User Story 1 (T006-T008)
4. **STOP and VALIDATE**: Launch app, verify sidebar renders, nav works, collapsible groups toggle, routes load placeholder pages
5. This delivers a navigable app shell — the most critical foundation

### Incremental Delivery

1. Setup + Foundational → Directory structure and API service ready
2. User Story 1 → Navigable shell with sidebar, header, routing (MVP!)
3. User Story 2 → Workspace selector with API integration (context switching)
4. User Story 3 → Enriched placeholder pages with descriptions (complete shell)
5. User Story 4 → Design system polish and validation (production-ready)
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- No new npm dependencies required — all packages already installed
- Existing `app/src/App.tsx` (207 lines) will be significantly refactored in T008 — the inline components are extracted into separate files in earlier tasks
- The sister app (PlanAlign) in `examples/` provides reference implementations for Layout, Sidebar, WorkspaceSelector, and page patterns
- Commit after each phase completion for clean rollback points
