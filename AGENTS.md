# HireVault — agent guide

**Cursor rules:** `.cursor/rules/` — always-on bootstrap + scoped rules for web, extension, database, packages. You can speak naturally (“fix the applications list empty state”); rules map intent → files and docs without pasting paths every time.

**Docs hub:** [docs/README.md](docs/README.md)

## Read order (on demand — rules above cover most starts)

1. [docs/PRODUCT.md](docs/PRODUCT.md) — in/out of scope (skim before new features)
2. [docs/NAVIGATION.md](docs/NAVIGATION.md) — code map when rules aren’t enough
3. [docs/STATE.md](docs/STATE.md) — routes, env, gaps (when shipping or debugging config)
4. [docs/decisions/](docs/decisions/) — phase ADR for the domain you’re touching (Active only)

## Product loop (lean recruitment)

1. **Capture** — Chrome extension or paste URL/JD on Applications
2. **Track** — Kanban or list pipeline per application
3. **Tailor** — Resume builder per application (`/resumes?application=<id>`)
4. **Prep** — Interview questions per job (`/interviews?job=<id>`)

## Do

- Use `lib/{domain}/queries.ts` for reads and `actions.ts` for mutations (`"use server"`)
- Load env from repo root `.env` only — see [docs/setup/environment.md](docs/setup/environment.md)
- Put schema changes in `packages/supabase/migrations/`
- Link Applications → Resumes via `resumeBuilderUrl()` in `apps/web/lib/resumes/urls.ts`

## Don't

- Reintroduce removed features (mock interviews, coaching insights, pitch/summary engine) without an explicit ADR
- Use `apps/web/.env.local`
- Run destructive DB commands (`db reset`) via automation — `scripts/db.sh` denylists them
- Add marketing copy to UI when a single action line suffices

## Commands

```bash
pnpm dev              # web on :3000
pnpm quality:check    # typecheck + lint + test + build
pnpm db db push         # apply migrations (wrapper)
```
