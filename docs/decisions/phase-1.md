# Phase 1 Architecture Decisions

## Monorepo: Turborepo + pnpm

**Decision:** Turborepo with pnpm workspaces.

**Why:** Shared `@hirevault/types` across web and extension prevents schema drift; turbo caches build/lint tasks.

**Alternatives rejected:** npm workspaces only (no task orchestration); Nx (heavier for a 2-app MVP).

## Backend: Supabase

**Decision:** Supabase PostgreSQL + Auth + RLS; no custom API server in Phase 1.

**Why:** Auth, DB, and future Storage/Edge Functions in one platform; RLS enforces multi-tenant security at the database.

**Alternatives rejected:** Custom Express API (more ops); Firebase (weaker relational model for applications pipeline).

## Auth: Google OAuth + @supabase/ssr

**Decision:** Supabase Auth with Google provider; cookie sessions via `@supabase/ssr`; Next.js middleware for route protection.

**Why:** Official Next.js 15 pattern; HTTP-only cookies safer than localStorage JWT.

**Alternatives rejected:** NextAuth (extra layer); magic link only (worse UX for career app).

## Profile model

**Decision:** One `profiles` row per `auth.users`; section tables (`experiences`, `education`, etc.) with `profile_id` FK; `courses` as separate table (not only `education.relevant_courses`).

**Why:** Phase 1 CRUD scope explicitly includes courses; normalized tables simplify RLS via `user_owns_profile()`.

## Design system

**Decision:** shadcn/ui (new-york), zinc dark base, violet primary + blue accent; Inter + JetBrains Mono; cmdk command palette; framer-motion sidebar width.

**Why:** Matches Linear-inspired plan; copy-paste components, full control, no runtime CSS-in-JS bundle bloat.

## State

**Decision:** TanStack Query provider (minimal defaults); Zustand for UI-only state (command palette, sidebar).

**Why:** Server Components + Server Actions own profile data; client store only for ephemeral UI.

## Extension

**Decision:** MV3 manifest + placeholder popup/background/content scripts only.

**Why:** Phase 1 scope is scaffold; job capture is Phase 4.

## Migrations

**Decision:** Single initial migration file `20260521041500_initial_schema.sql` with full ER schema (including Phase 3+ tables).

**Why:** One apply gets RLS correct from day one; empty tables cost nothing; avoids migration churn later.

## Build without Supabase linked

**Decision:** Placeholder env fallbacks for compile-time; real OAuth requires root `.env` (loaded via `next.config.ts` → repo root).

**Why:** `pnpm quality:check` can run in CI before secrets exist.

## Supabase client typing

**Decision:** Web app uses untyped `createBrowserClient` / `createServerClient`; domain types live in `@hirevault/types` for app code.

**Why:** Hand-written `Database` generic did not satisfy supabase-js v2 inference (resolved to `never`). Phase 2 can add `supabase gen types typescript`.

**Alternatives rejected:** `any` casts everywhere; blocking Phase 1 on codegen.
