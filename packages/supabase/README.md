# Supabase migrations (HireVault)

Migrations live in `packages/supabase/migrations/` and are the **source of truth in git**.

## One-time setup

```bash
# Install CLI: https://supabase.com/docs/guides/cli
export SUPABASE_ACCESS_TOKEN=...
export SUPABASE_DB_PASSWORD=...

supabase link --project-ref vnybrxanwlklbtcuizxw
# Preview branch for the agent loop (locked decision):
pnpm db branches create hirevault-loop
```

## Agent-safe commands (wrapper only)

```bash
pnpm db migration new my_change_name
pnpm db db push
pnpm db migration list
pnpm db db diff
pnpm db branches list
```

The wrapper `scripts/db.sh` **denylists** `db reset` and other destructive ops unless you override manually.

## Symlink for CLI

If the CLI expects `supabase/migrations`, link from repo root:

```bash
ln -sf ../packages/supabase/migrations supabase/migrations
```

## Tester DB access

Configure read-only Supabase MCP in `.mcp.json` (OAuth at connect). Tester may `SELECT` and run advisors — never mutate production.
