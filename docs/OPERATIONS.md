# Operations

Maintainer notes for quality gates and incident follow-up.

## Quality gate

```bash
pnpm quality:check
```

Runs: typecheck → lint → test → build across the monorepo.

## Postmortem template

When a bug ships past gates, add an entry to the mistake tracker (see archive) and note prevention in code or docs.

```markdown
### [Date] — [Short title]
- **Symptom:**
- **Root cause:**
- **Fix:**
- **Should have caught:**
- **Prevention added:**
```

## Recurring patterns (from archive)

- **Empty-state regressions:** List/workspace components must render entry points when parent data is empty or filtered to another scope.
- **Cross-scope leakage:** Child lists must filter by parent selection (e.g. interview questions by `jobId`).

Full log: [archive/reports/mistake-tracker.md](archive/reports/mistake-tracker.md)

## Database changes

Never run `db reset` in automation. Use `pnpm db migration new` + `pnpm db db push`. See [setup/database.md](setup/database.md).
