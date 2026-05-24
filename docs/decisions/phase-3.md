# Phase 3 Architecture Decisions

## Kanban: native HTML5 drag-drop + status select

**Decision:** Columns for pipeline statuses; cards draggable between columns; each card also has accessible `<select>` for status.

**Why:** No extra DnD library; keyboard/screen-reader users can change status without drag.

**Alternatives rejected:** `@dnd-kit` (dependency + complexity for MVP); click-only status (worse UX for power users).

## Job + application creation: combined form

**Decision:** `createApplication` creates `jobs` row when `job_id` absent; JD paste triggers light GPT-4o parse when key present.

**Why:** Matches “manual add + paste JD” requirement; one form for common path.

## Analytics: Recharts on overview + applications

**Decision:** Bar chart (pipeline counts), pie chart (distribution), stat cards for response/offer rates and 30d velocity.

**Why:** Plan specifies Recharts; server-computed stats keep charts simple.

**Alternatives rejected:** Server-rendered SVG only (less interactive tooltips).

## Filters: URL search params

**Decision:** `ApplicationFilters` syncs company, status, priority, job type, sort to query string; server page reads params.

**Why:** Shareable filtered views; no client global store needed.

## Notes: `application_notes` table + denormalized `applications.notes`

**Decision:** Insert note row, then refresh `applications.notes` text array for quick display on cards.

**Why:** Schema already has both; cards read array without extra join.

## Jobs page: library view + shared add form

**Decision:** List all jobs with delete; reuse `AddApplicationForm` for entry (creates job + optional application).

**Why:** Separates job library from pipeline while reusing parsing logic.

## Query layer: `lib/applications/queries.ts`

**Decision:** Server-only helpers for filtered lists and aggregate stats.

**Why:** Keeps page components thin; RLS enforced via user-scoped Supabase client.
