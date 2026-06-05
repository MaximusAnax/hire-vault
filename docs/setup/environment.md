# Environment variables

**Do not use `apps/web/.env.local`.** All keys load from the repository root:

```
career-support/.env
```

Next.js reads this via `loadEnvConfig` in `apps/web/next.config.ts`. Copy `.env.example` at the repo root and restart `pnpm dev` after changes.

## Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Extension capture API (server only) |

## Optional

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | JD parsing, structured AI output |
| `ANTHROPIC_API_KEY` | Bullet rewrites, interview answers |
| `LATEX_COMPILER` | Path to `pdflatex` for resume PDF export |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI (migrations) |
| `SUPABASE_DB_PASSWORD` | Supabase CLI (migrations) |

See also [STATE.md](../STATE.md) for product-level env notes.
