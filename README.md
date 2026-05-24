# HireVault

Career command center — track applications, build your master profile, tailor resumes, and prepare for interviews.

Monorepo: **Turborepo** + **pnpm** workspaces.

## Structure

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 15 App Router (main product) |
| `apps/extension` | Chrome MV3 job capture extension |
| `packages/resume-templates` | ATS + visual resume HTML templates |
| `packages/types` | Shared TypeScript types |
| `packages/ai-core` | GPT-4o parsing schemas, dedup hashes, validation |
| `packages/supabase` | SQL migrations, seed, auth docs |
| `docs/decisions` | Architecture decision records |
| `reports` | HTML progress reports |

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20.x (see `.nvmrc`) | Node 22+ also works. Avoid Node 24+ with pnpm 9 if you hit engine warnings. |
| **pnpm** | **9.15.0** (pinned) | Do **not** run bare `npx pnpm` — it installs pnpm 11+, which requires Node ≥ 22.13 and `node:sqlite`. |

**Use the repo’s pnpm version:**

```bash
# nvm (recommended)
nvm use

# Corepack (uses packageManager from package.json)
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Or without Corepack
npx pnpm@9.15.0 install
```

If `corepack enable` fails with `EACCES`, fix `/usr/local/bin` permissions or install globally: `npm install -g pnpm@9.15.0`.

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Run migrations in `packages/supabase/migrations/` (through phase 4–8) via SQL Editor or `supabase db push`.
3. Enable **Google OAuth** — see [packages/supabase/docs/auth-google-oauth.md](packages/supabase/docs/auth-google-oauth.md).

### 3. Environment

```bash
cp apps/web/.env.local.example apps/web/.env.local
# Required: Supabase URL and anon key
# Optional: OPENAI_API_KEY for resume/JD parsing and AI profile validation
```

### 4. Run dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Google at `/login`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps (web on :3000) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint across workspace |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest (ai-core critical paths) |
| `pnpm quality:check` | typecheck + lint + test + build |

## Phase status

**Phase 1** — Foundation: monorepo, schema, auth, profile CRUD. [Report](reports/phase-1-foundation.html)

**Phase 2** — Data ingestion: resume upload + AI parse, LinkedIn JSON import, deduplication, validation UI. [Report](reports/phase-2-ingestion.html) · [Decisions](docs/decisions/phase-2.md)

**Phase 3** — Job tracking: Kanban pipeline, job entry, analytics (Recharts), search/filter. [Report](reports/phase-3-dashboard.html) · [Decisions](docs/decisions/phase-3.md)

**Phases 4–8** — Extension, resume tailoring, interview prep, mock interviews, coaching insights. [Report](reports/phase-4-8-complete.html) · [Decisions](docs/decisions/phase-4.md) … [phase-8.md](docs/decisions/phase-8.md)

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `OPENAI_API_KEY` | No | JD parsing, question generation structure |
| `ANTHROPIC_API_KEY` | No | Bullet rewrites, interview answers, mock feedback |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Extension capture API (*server only) |
