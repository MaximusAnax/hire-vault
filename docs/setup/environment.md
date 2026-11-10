# Environment variables

**Do not use `apps/web/.env.local`.** All keys load from the repository root:

```
<repo-root>/.env
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
| `OPENAI_API_KEY` | JD parsing, resume structured extraction (primary experience parser) |
| `RESUME_IMPORT_POLISH` | Set `1` to run Haiku bullet polish after GPT resume parse (default off) |
| `ANTHROPIC_API_KEY` | Bullet rewrites, interview answers |
| `LATEX_COMPILER` | Path to `pdflatex` for resume PDF export |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth app client ID (profile import) |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth app secret (server only) |
| `LINKEDIN_REDIRECT_URI` | OAuth callback; defaults to `{NEXT_PUBLIC_APP_URL}/api/linkedin/callback` |
| `LINKEDIN_TOKEN_ENCRYPTION_KEY` | Optional AES key for stored LinkedIn tokens; defaults to client secret |
| `LINKEDIN_OAUTH_INCLUDE_PLUS_SCOPES` | Set `1` only after LinkedIn approves Plus products; default is OIDC only |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI (migrations) |
| `SUPABASE_DB_PASSWORD` | Supabase CLI (migrations) |

LinkedIn OAuth setup: [auth-linkedin-oauth.md](./auth-linkedin-oauth.md).

See also [STATE.md](../STATE.md) for product-level env notes.
