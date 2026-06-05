# Database and migrations

Migrations live in `packages/supabase/migrations/` — **source of truth in git**.

## One-time setup

Set `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` in the repository root `.env` (see `.env.example`), then:

```bash
# Install CLI: https://supabase.com/docs/guides/cli

supabase link --project-ref <your-project-ref>
```

## Agent-safe commands

Use the wrapper only (denylists destructive ops like `db reset`):

```bash
pnpm db migration new my_change_name
pnpm db db push
pnpm db migration list
pnpm db db diff
pnpm db branches list
```

Implementation: `scripts/db.sh`

## Symlink for CLI

If the CLI expects `supabase/migrations` at repo root:

```bash
ln -sf ../packages/supabase/migrations supabase/migrations
```

## Tester DB access

Configure read-only Supabase MCP in `.mcp.json` (OAuth at connect). Tester may `SELECT` and run advisors — never mutate production.

## Schema overview

Core tables: `profiles`, `experiences`, `education`, `leadership`, `jobs`, `applications`, `tailored_resumes`, `interview_questions`, `extension_tokens`.

See [decisions/README.md](../decisions/README.md) and migration files for evolution history.
