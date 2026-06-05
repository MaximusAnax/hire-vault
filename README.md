# HireVault

Career command center — track applications, build your master profile, tailor resumes, and prepare for interviews.

**Documentation hub:** [docs/README.md](docs/README.md) · **Agents:** [AGENTS.md](AGENTS.md)

Monorepo: **Turborepo** + **pnpm** workspaces.

## Structure

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 15 App Router (main product) |
| `apps/extension` | Chrome MV3 job capture extension |
| `packages/resume-templates` | LaTeX resume templates + PDF compile |
| `packages/types` | Shared TypeScript types |
| `packages/ai-core` | GPT-4o parsing schemas, dedup hashes, validation |
| `packages/supabase` | SQL migrations, seed |
| `packages/orchestrator` | Agent build-loop driver (archived) |
| `docs/` | Product, state, navigation, setup, decisions |

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20.x (see `.nvmrc`) | Node 22+ also works. Avoid Node 24+ with pnpm 9 if you hit engine warnings. |
| **pnpm** | **9.15.0** (pinned) | Do **not** run bare `npx pnpm` — it installs pnpm 11+, which requires Node ≥ 22.13 and `node:sqlite`. |

**Use the repo’s pnpm version:**

```bash
nvm use
corepack enable
corepack prepare pnpm@9.15.0 --activate
# Or: npx pnpm@9.15.0 install
```

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Apply migrations in `packages/supabase/migrations/` via SQL Editor or `pnpm db db push`.
3. Enable **Google OAuth** — [docs/setup/auth-google-oauth.md](docs/setup/auth-google-oauth.md).

### 3. Environment

All secrets live in a **single file at the repo root**:

```bash
cp .env.example .env
```

See [docs/setup/environment.md](docs/setup/environment.md).

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
| `pnpm test` | Vitest |
| `pnpm quality:check` | typecheck + lint + test + build |

## Project state

Shipped features, routes, and known gaps: [docs/STATE.md](docs/STATE.md)

Architecture decisions: [docs/decisions/](docs/decisions/)

Historical phase reports: [docs/archive/reports/](docs/archive/README.md)
