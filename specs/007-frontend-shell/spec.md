# Feature Specification: React Frontend Shell

**Feature Branch**: `007-frontend-shell`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Build the React frontend shell following this design system: Tailwind CSS via CDN, Roboto font from Google Fonts, light gray background (bg-gray-50), white cards with rounded-xl shadow-sm border border-gray-100, fixed sidebar (w-64) with nav items and collapsible dropdowns, top header bar, primary brand color #00853F, Lucide React icons. Include a workspace selector dropdown in the sidebar header, navigation for Dashboard, Persona Modeling, Plan Comparison, Scenarios, and Settings pages. All pages are placeholder stubs for now. Clean enterprise SaaS aesthetic, no flashy animations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Application Shell and Navigation (Priority: P1)

A user opens the application and sees a professional enterprise interface with a fixed sidebar on the left and a top header bar. The sidebar contains the application logo/name, navigation links for all main sections (Dashboard, Persona Modeling, Plan Comparison, Scenarios, Settings), and collapsible nav groups. The user clicks on any navigation item and the corresponding page loads in the main content area. The active page is visually highlighted in the sidebar.

**Why this priority**: The application shell is the foundational UI that all other features depend on. Without navigation and layout, no other page can be accessed or demonstrated.

**Independent Test**: Can be fully tested by launching the app, verifying the sidebar renders with all navigation items, clicking each nav item, and confirming the correct page loads with the active state highlighted. Delivers a navigable application framework.

**Acceptance Scenarios**:

1. **Given** the user opens the application, **When** the page loads, **Then** they see a fixed sidebar (w-64) on the left with nav items for Dashboard, Persona Modeling, Plan Comparison, Scenarios, and Settings, a top header bar, and a light gray main content area.
2. **Given** the user is on the Dashboard page, **When** they click "Scenarios" in the sidebar, **Then** the Scenarios placeholder page loads in the main content area and the "Scenarios" nav item becomes visually active (highlighted with the brand color #00853F).
3. **Given** the user is viewing any page, **When** they look at the sidebar, **Then** exactly one nav item is highlighted as active, matching the current page.
4. **Given** the sidebar has a collapsible nav group (e.g., "Analytics" containing sub-items), **When** the user clicks the group header, **Then** the sub-items expand or collapse with a chevron indicator toggling direction.

---

### User Story 2 - Workspace Selector (Priority: P2)

A user needs to switch between different workspaces. In the sidebar header area, they see a workspace selector dropdown showing the currently active workspace name. When they click it, a dropdown appears listing all available workspaces fetched from the existing backend API. The user selects a different workspace and the application context switches to that workspace.

**Why this priority**: Workspace selection is a critical global context that determines what data all other pages display. It must work before any data-driven pages can function, but the shell navigation (P1) must exist first.

**Independent Test**: Can be fully tested by launching the app, verifying the workspace selector appears in the sidebar, clicking to open the dropdown, confirming workspaces are listed from the API, selecting a different workspace, and verifying the selected workspace name updates in the selector.

**Acceptance Scenarios**:

1. **Given** the application loads, **When** the workspace API returns a list of workspaces, **Then** the workspace selector in the sidebar displays the first workspace as the active selection.
2. **Given** the workspace selector is closed, **When** the user clicks on it, **Then** a dropdown appears listing all available workspaces with their names and descriptions.
3. **Given** the workspace dropdown is open, **When** the user selects a different workspace, **Then** the dropdown closes, the selector displays the newly selected workspace name, and the application context updates to the selected workspace.
4. **Given** the workspace dropdown is open, **When** the user clicks outside the dropdown, **Then** the dropdown closes without changing the selection.
5. **Given** the backend API is unreachable, **When** the application loads, **Then** the workspace selector displays an error state with a retry option.

---

### User Story 3 - Placeholder Page Content (Priority: P3)

A user navigates to any of the five main pages (Dashboard, Persona Modeling, Plan Comparison, Scenarios, Settings) and sees a placeholder indicating that page's purpose. Each placeholder clearly communicates the page name and a brief description of what will eventually be built there, using the design system's card styling.

**Why this priority**: Placeholder pages complete the shell experience and provide clear indication of the application's planned scope. They depend on the navigation shell (P1) being in place.

**Independent Test**: Can be fully tested by navigating to each of the five pages and verifying each displays a distinct placeholder with the page name, a brief description, and consistent card styling (white background, rounded-xl, shadow-sm, border border-gray-100).

**Acceptance Scenarios**:

1. **Given** the user navigates to the Dashboard page, **When** the page loads, **Then** they see a placeholder card with the title "Dashboard" and a description like "Overview of your retirement income modeling workspace."
2. **Given** the user navigates to each of the five pages (Dashboard, Persona Modeling, Plan Comparison, Scenarios, Settings), **When** each page loads, **Then** each displays a unique title and description within a consistently styled card component.
3. **Given** the user is on any placeholder page, **When** they view the content area, **Then** the page uses the design system styling: white card with rounded-xl corners, shadow-sm, border border-gray-100, on a bg-gray-50 background.

---

### User Story 4 - Design System Consistency (Priority: P4)

A user interacts with the application and perceives a cohesive, professional enterprise SaaS interface. All UI elements follow the defined design system: Roboto font family, #00853F brand color for active/primary elements, Tailwind CSS utility classes, Lucide React icons, light gray background, white cards with consistent border styling. No flashy animations are present.

**Why this priority**: Design consistency ensures professional appearance and brand alignment, but is a cross-cutting quality concern that refines work done in P1-P3 rather than delivering standalone functionality.

**Independent Test**: Can be fully tested by visually inspecting all pages and UI elements, verifying font family is Roboto, primary color is #00853F, icons are from Lucide React, cards use the specified styling, and no flashy animations exist (only subtle transitions for hover states and dropdown open/close).

**Acceptance Scenarios**:

1. **Given** any page in the application, **When** the user inspects the typography, **Then** the Roboto font family is applied to all text elements.
2. **Given** the sidebar navigation, **When** a nav item is active or hovered, **Then** the brand color #00853F is used for highlighting.
3. **Given** any card element in the application, **When** rendered, **Then** it uses white background, rounded-xl corners, shadow-sm, and border border-gray-100.
4. **Given** the user interacts with any element (hover, click, dropdown), **When** transitions occur, **Then** only subtle, functional transitions are used (no flashy, decorative animations).

---

### Edge Cases

- What happens when the workspace API returns an empty list (no workspaces exist)? The application displays a prompt to create the first workspace.
- What happens when the workspace API is slow to respond? A loading spinner or skeleton state is shown in the workspace selector area.
- What happens when the user resizes the browser window to a narrow width? The layout remains usable, with the sidebar maintaining its fixed width and the content area adjusting.
- What happens when a user navigates directly to a URL for a page that does not exist? A "Not Found" page is displayed with navigation back to Dashboard.
- What happens when the browser's back/forward buttons are used? Navigation state stays in sync with the sidebar's active item highlighting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST render a fixed-position sidebar (w-64) on the left side of the viewport containing navigation items.
- **FR-002**: The sidebar MUST include navigation links for: Dashboard, Persona Modeling, Plan Comparison, Scenarios, and Settings.
- **FR-003**: The currently active navigation item MUST be visually distinguished using the brand color (#00853F) as a background or accent.
- **FR-004**: The sidebar MUST support collapsible navigation groups with expand/collapse toggle (e.g., a group header that reveals sub-items when clicked).
- **FR-005**: The application MUST render a top header bar spanning the width of the main content area.
- **FR-006**: The application MUST include a workspace selector dropdown in the sidebar header area.
- **FR-007**: The workspace selector MUST fetch the list of available workspaces from the existing backend workspace list API on application load.
- **FR-008**: The workspace selector MUST display the currently active workspace name and allow switching to a different workspace from the dropdown.
- **FR-009**: The main content area MUST display the page content corresponding to the active navigation item.
- **FR-010**: Each of the five main pages (Dashboard, Persona Modeling, Plan Comparison, Scenarios, Settings) MUST render a placeholder stub indicating the page name and purpose.
- **FR-011**: The application MUST use client-side routing so that each page has a distinct URL path and browser navigation (back/forward) works correctly.
- **FR-012**: The application MUST display a "Not Found" page for unrecognized URL paths, with a link back to the Dashboard.
- **FR-013**: The application MUST use the Roboto font family loaded from Google Fonts.
- **FR-014**: The application MUST use Tailwind CSS for styling.
- **FR-015**: The application MUST use Lucide React for iconography throughout the interface.
- **FR-016**: The application MUST use #00853F as the primary brand color for active states, primary buttons, and brand accents.
- **FR-017**: All card components MUST use white background, rounded-xl corners, shadow-sm, and border border-gray-100.
- **FR-018**: The application MUST NOT include flashy or decorative animations; only subtle, functional transitions (e.g., hover states, dropdown open/close) are permitted.
- **FR-019**: The application MUST display a loading state (spinner or skeleton) while workspace data is being fetched from the API.
- **FR-020**: The application MUST display an error state with a retry option if the workspace API call fails.
- **FR-021**: The application MUST display a "create first workspace" prompt when no workspaces exist.

### Key Entities

- **Workspace**: A named container representing a project context. Has a name, description, and unique identifier. The workspace selector displays these and the active workspace determines the global context for all page content.
- **Navigation Item**: A sidebar entry representing a page destination. Has a label, icon, URL path, and optional grouping for collapsible sections.
- **Page Stub**: A placeholder component for a future feature page. Has a title, description, and consistent card styling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate between all five main pages (Dashboard, Persona Modeling, Plan Comparison, Scenarios, Settings) within 1 click from any page.
- **SC-002**: The workspace selector successfully loads and displays workspaces from the backend API within 2 seconds of application launch.
- **SC-003**: 100% of pages render correctly using the defined design system (Roboto font, #00853F brand color, specified card styling, Lucide icons).
- **SC-004**: Users can switch between workspaces in 2 clicks or fewer (click to open dropdown, click to select).
- **SC-005**: Browser back/forward navigation correctly updates both the displayed page and the sidebar's active item highlighting 100% of the time.
- **SC-006**: The application shell loads and becomes interactive within 3 seconds on a standard broadband connection.

## Assumptions

- The existing backend workspace list API (`GET /api/v1/workspaces`) is available and returns workspace data in the documented format.
- The application will be served as a single-page application (SPA) with client-side routing.
- No user authentication is required for this shell (authentication will be a separate future feature).
- The application targets modern evergreen browsers (Chrome, Firefox, Safari, Edge latest versions).
- Tailwind CSS will be loaded via CDN for rapid development; a build-step integration may come in a future iteration.
- The frontend development server will proxy API requests to the backend running on a local port.
