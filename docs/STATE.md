# Project state

Living snapshot of what is shipped. Update when nav, env, or major flows change.

*Last aligned with: lean recruitment + applications list view + resumes index/builder split.*

## App routes (`apps/web`)

| Route | Purpose |
|-------|---------|
| `/overview` | Pipeline stats, recent applications, quick links |
| `/profile` | Master profile CRUD |
| `/profile/import` | Resume upload, LinkedIn JSON |
| `/applications` | Pipeline (`?view=board` default, `?view=list`) |
| `/resumes` | Index (no `application` param) or builder (`?application=&version=`) |
| `/interviews` | Prep per job (`?job=`) |
| `/settings` | Extension tokens, dev tools, OAuth doc link |
| `/login` | Google OAuth |

`/jobs` redirects to `/applications` (legacy).

## Extension (`apps/extension`)

- MV3 content script scrapes job boards → bearer token → `POST /api/extension/capture`
- Creates/updates `jobs` + `applications` for the authenticated user

## Environment (repo root `.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Extension capture API |
| `OPENAI_API_KEY` | No | JD parse, question structure |
| `ANTHROPIC_API_KEY` | No | Bullet rewrite, interview answers |
| `LATEX_COMPILER` | No | Override `pdflatex` path |

\* Server only; never expose to client.

## Known gaps / trade-offs

- **PDF export** requires `pdflatex` on the host (local dev first)
- **ATS score** is keyword-density heuristic, not vendor ATS simulation
- **Extension scrapers** break on DOM changes — page-dump fallback + manual paste
- **Company research** in interview prep is a minimal stub

## Quality gate

```bash
pnpm quality:check   # typecheck + lint + test + build
```

## Phase history

Detailed build reports are archived: [archive/reports/](archive/README.md).

Active decision records: [decisions/README.md](decisions/README.md).
