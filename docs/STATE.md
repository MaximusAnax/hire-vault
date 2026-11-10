# Project state

Living snapshot of what is shipped. Update when nav, env, or major flows change.

*Last aligned with: Profile & Overview Evolution (S0–S7) — import preview gate, action queue, LinkedIn OAuth.*

## App routes (`apps/web`)

| Route | Purpose |
|-------|---------|
| `/overview` | **Action queue** (ranked next steps), weekly velocity vs goal, import health badge, pipeline stats |
| `/profile` | Master profile CRUD, tailoring-readiness banner, campus-friendly section order |
| `/profile/import` | Resume upload / LinkedIn (JSON or OAuth sync) → **preview** → confirm apply |
| `/applications` | Pipeline (`?view=board` default, `?view=list`); **Needs review** filter (`?needsReview=1`) + capture review panel; extension handoff `?addUrl=` → add form preview (`#add`) |
| `/resumes` | Index (no `application` param) or builder (`?application=<id>`) |
| `/interviews` | Prep per job (`?job=`) |
| `/settings` | Extension tokens, **weekly application goal**, dev tools, OAuth doc link |
| `/login` | Google OAuth |

| API route | Purpose |
|-----------|---------|
| `/api/linkedin/auth` | Start LinkedIn OAuth (profile import) |
| `/api/linkedin/callback` | OAuth callback; stores encrypted tokens in `linkedin_connections` |

`/jobs` redirects to `/applications` (legacy).

## Major flows (Profile & Overview)

### Import preview gate

1. Upload resume or LinkedIn payload → parse only; `ingestion_runs.status = awaiting_confirm` with `preview_summary` JSON.
2. **Resume experiences:** GPT-4o is primary when `OPENAI_API_KEY` is set; deterministic line parser is not merged into AI experience rows (degraded path only). Optional `RESUME_IMPORT_POLISH=1` enables Haiku bullet polish after parse (default off).
3. User reviews bucket counts / conflicts in import preview UI → **Apply import** runs `confirmIngestionRun` (default merge: `newest_wins` via shared `merge-core`).
3. Manual-sourced rows are never auto-overwritten; dedup conflicts queue for side-by-side resolution.

### Overview command center

- `deriveOverviewActions()` ranks actions (screening prep, untailored resumes, import conflicts, capture review inbox, skill nudges from JD keywords).
- Weekly velocity widget reads `profiles.weekly_application_goal` (editable in Settings).

### LinkedIn OAuth (optional)

- Requires env vars below; JSON paste on `/profile/import` remains fallback when OAuth is not configured.

## Extension (`apps/extension`)

- MV3 popup: scrape → preview API → minor inline edits → save (or hand off to web)
- **Save** — `POST /api/extension/capture` with `skip_ai_parse: true`
- **Review on web** — same save with `needs_review: true` → opens Applications review panel
- **Edit on web** — opens `/applications?addUrl=<job-url>#add` (full `JobPreviewCard`, no extension save)

| API route | Purpose |
|-----------|---------|
| `/api/extension/capture` | Bearer auth; insert/update job + application |
| `/api/extension/preview` | Bearer auth; `CaptureDraft` preview, no DB write |

## Environment (repo root `.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Extension capture API |
| `OPENAI_API_KEY` | No | JD parse, question structure |
| `ANTHROPIC_API_KEY` | No | Bullet rewrite, interview answers |
| `LATEX_COMPILER` | No | Override `pdflatex` path |
| `LINKEDIN_CLIENT_ID` | No | LinkedIn OAuth (profile import) |
| `LINKEDIN_CLIENT_SECRET` | No | LinkedIn OAuth app secret (server only) |
| `LINKEDIN_REDIRECT_URI` | No | Defaults to `{NEXT_PUBLIC_APP_URL}/api/linkedin/callback` |
| `LINKEDIN_TOKEN_ENCRYPTION_KEY` | No | AES key for stored tokens; defaults to client secret |

\* Server only; never expose to client.

Setup detail: [setup/auth-linkedin-oauth.md](setup/auth-linkedin-oauth.md), [setup/environment.md](setup/environment.md).

## Database migrations (apply locally)

Run from repo root after pull:

```bash
pnpm db db push
```

| Migration | Purpose |
|-----------|---------|
| `20260609120000_profile_overview_foundation.sql` | `ingestion_runs` preview statuses + `preview_summary`; `profiles.weekly_application_goal` |
| `20260610120000_linkedin_connections.sql` | OAuth token storage + RLS |
| `20260611120000_application_capture_review.sql` | `applications.needs_review`, `capture_source` |

(Other recent migrations may exist in the same branch — push applies all pending.)

## Known gaps / trade-offs

- **PDF export** requires `pdflatex` on the host (local dev first); in-app preview uses the same compile path
- **LaTeX override** optional per application resume; cleared when structured content is saved (after confirm)
- **ATS score** is keyword-density heuristic, not vendor ATS simulation
- **Extension scrapers** break on DOM changes — page-dump fallback + manual paste
- **Company research** in interview prep is a minimal stub
- **LinkedIn OAuth** depends on LinkedIn app approval and member API scopes; sync uses same preview gate as upload
- **Apply immediately** fast-path checkbox (plan optional) may not be wired — preview is default
- **Empty-profile onboarding** deep-link from Overview → Import is best-effort; verify copy in manual QA

## Quality gate

```bash
pnpm quality:check   # typecheck + lint + test + build
```

## Phase history

Detailed build reports are archived: [archive/reports/](archive/README.md).

Active decision records: [decisions/README.md](decisions/README.md).

Ideation: [ideas/profile-overview-evolution.md](ideas/profile-overview-evolution.md).
