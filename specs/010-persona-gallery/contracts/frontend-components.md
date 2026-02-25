# UI Component Contract: Persona Gallery

**Branch**: `010-persona-gallery` | **Date**: 2026-02-24

## Component Hierarchy

```
PersonaModelingPage (page)
├── Gallery Header
│   ├── Title + persona count (e.g., "8 of 12")
│   ├── "Add Persona" button (disabled at 12)
│   └── "Reset to Defaults" button
├── Warning Banner (conditional)
│   └── "No active personas — simulations require at least one active persona"
├── PersonaGallery (grid container)
│   └── PersonaCard[] (1–12 cards)
│       ├── Display Mode
│       │   ├── Name + Label
│       │   ├── Age, Salary, Deferral Rate, Current Balance
│       │   ├── Allocation summary (e.g., "TDF 2055" or "60/30/10")
│       │   ├── Social Security badge (on/off)
│       │   ├── Hidden badge (if hidden)
│       │   └── Action menu (Edit, Hide/Unhide, Delete)
│       └── Edit Mode
│           ├── Name input
│           ├── Label input
│           ├── Age input (number, 18–80)
│           ├── Salary input (currency, >= 0)
│           ├── Deferral Rate input (%, 0–100)
│           ├── Current Balance input (currency, >= 0)
│           ├── Social Security toggle
│           ├── AllocationEditor
│           │   ├── Mode toggle (Target-Date Fund / Custom)
│           │   ├── Target-Date: vintage year dropdown (2025–2070, 5-year steps)
│           │   └── Custom: stock/bond/cash % inputs + AllocationDonutChart
│           ├── Validation errors (inline, per-field)
│           ├── Save button (disabled when validation errors present)
│           └── Cancel button
└── ConfirmDialog (reuse existing component)
    └── Used for: Delete persona, Reset to defaults
```

## Component: PersonaModelingPage

**Location**: `app/src/pages/PersonaModelingPage.tsx` (replace existing stub)

**Responsibilities**:
- Load workspace data (including personas) via `getWorkspace(workspaceId)`
- Manage personas state array locally
- Handle save (PATCH workspace with updated personas)
- Handle add (append new persona with defaults, open in edit mode)
- Handle delete (remove from array, save)
- Handle hide/unhide (toggle `hidden` flag, save)
- Handle reset (call reset endpoint, refresh state)
- Pass personas and callbacks to PersonaGallery

**State**:
- `personas: Persona[]` — local working copy of the workspace personas
- `editingPersonaId: string | null` — which card is in edit mode (only one at a time)
- `loading: boolean` — initial data load state
- `saving: boolean` — save-in-progress state

## Component: PersonaGallery

**Location**: `app/src/components/PersonaGallery.tsx` (new)

**Props**:
- `personas: Persona[]`
- `editingPersonaId: string | null`
- `onEdit: (personaId: string) => void`
- `onSave: (persona: Persona) => void`
- `onCancel: () => void`
- `onDelete: (personaId: string) => void`
- `onToggleHidden: (personaId: string) => void`
- `saving: boolean`

**Responsibilities**:
- Render responsive grid of PersonaCard components
- Grid layout: 1 column on mobile, 2 on medium, 3 on large screens

## Component: PersonaCard

**Location**: `app/src/components/PersonaCard.tsx` (new)

**Props**:
- `persona: Persona`
- `isEditing: boolean`
- `onEdit: () => void`
- `onSave: (persona: Persona) => void`
- `onCancel: () => void`
- `onDelete: () => void`
- `onToggleHidden: () => void`
- `saving: boolean`

**Responsibilities**:
- Display mode: render persona summary with formatted values (currency for salary/balance, percentage for deferral rate)
- Edit mode: render form fields with real-time validation
- Visual distinction for hidden personas (reduced opacity, "Hidden" badge)
- Action menu for edit, hide/unhide, delete

**Display mode layout**:
```
┌────────────────────────────────┐
│ [Name]            [⋮ actions]  │
│ [Label]           [Hidden?]    │
│                                │
│ Age: 25     Salary: $40,000    │
│ Deferral: 3%  Balance: $2,000  │
│                                │
│ TDF 2065        [SS: ✓]       │
└────────────────────────────────┘
```

**Edit mode layout**:
```
┌────────────────────────────────┐
│ Name: [___________]            │
│ Label: [___________]           │
│                                │
│ Age: [__]   Salary: [$______]  │
│ Deferral: [__]%  Bal: [$____]  │
│                                │
│ ○ Target-Date Fund             │
│   Vintage: [2065 ▾]           │
│ ● Custom Split                 │
│   Stock [60]% Bond [30]%       │
│   Cash [10]%                   │
│   [====DONUT CHART====]       │
│                                │
│ Social Security: [toggle]      │
│                                │
│ [Cancel]            [Save]     │
└────────────────────────────────┘
```

## Component: AllocationEditor

**Location**: `app/src/components/AllocationEditor.tsx` (new)

**Props**:
- `allocation: AssetAllocation`
- `onChange: (allocation: AssetAllocation) => void`
- `errors: string[]`

**Responsibilities**:
- Toggle between target-date and custom modes
- Target-date mode: dropdown with vintage years (2025, 2030, 2035, ... 2070)
- Custom mode: three percentage inputs + live donut chart
- Validate custom percentages sum to 100%
- Report validation errors up to parent

## Component: AllocationDonutChart

**Location**: `app/src/components/AllocationDonutChart.tsx` (new)

**Props**:
- `stockPct: number`
- `bondPct: number`
- `cashPct: number`

**Responsibilities**:
- Render a donut chart (recharts PieChart with innerRadius)
- Three segments: Stock (blue), Bond (green), Cash (amber)
- Legend with percentages
- Compact size suitable for inline card display (~150x150px)
- Updates in real time as props change

## Formatting Conventions

| Field           | Display Format        | Example       |
|-----------------|-----------------------|---------------|
| Salary          | Currency, no decimals | $40,000       |
| Current Balance | Currency, no decimals | $2,000        |
| Deferral Rate   | Percentage            | 3%            |
| Age             | Integer               | 25            |
| Allocation (TDF)| "TDF" + year          | TDF 2065      |
| Allocation (Custom)| Ratio format       | 60 / 30 / 10  |
| Social Security | Check/X icon          | ✓ or ✗        |
