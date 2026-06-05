# Product

## Vision

**HireVault** is a career command center: one place to capture job opportunities, track applications, maintain a master profile, tailor resumes per role, and prepare for interviews.

## Lean recruitment loop

```mermaid
flowchart LR
  capture[Capture job]
  track[Track application]
  tailor[Tailor resume]
  prep[Prep interviews]
  capture --> track --> tailor --> prep
```

| Step | Surface | Primary action |
|------|---------|----------------|
| Capture | Chrome extension, Applications add form | Save job + description to pipeline |
| Track | Applications board/list | Move status, edit role metadata, priority |
| Tailor | Resumes builder | Rewrite bullets for JD, export LaTeX PDF |
| Prep | Interview prep | Generate questions, practice answers |

**Connected flow:** Every application row/card links to `/resumes?application=<id>`. Resumes index lists all roles; builder mode focuses on one application at a time.

## In scope (current product)

- Google OAuth sign-in
- Master profile (experience, education, leadership, projects, courses, LaTeX skills block)
- Applications pipeline (kanban default, list alternate, filters)
- Chrome MV3 extension job capture
- AI resume tailoring + keyword-match estimate + PDF export
- Interview question bank per job

## Out of scope (removed — do not re-add without ADR)

| Feature | Removed in | Notes |
|---------|------------|-------|
| Mock interviews | Lean recruitment | `mock_sessions` table dropped |
| Coaching insights panel | Lean recruitment | Deterministic insights engine removed from overview |
| Pitch / hybrid summary | Lean recruitment | Profile uses target roles + LaTeX skills instead |
| Standalone `/jobs` route | Lean recruitment | Merged into Applications |
| HTML/Chromium resume PDF | Phase 5 | LaTeX + `pdflatex` only |

Historical ADRs for removed features: [decisions/phase-7.md](decisions/phase-7.md), [decisions/phase-8.md](decisions/phase-8.md).

## AI usage (summary)

- **OpenAI (GPT-4o):** JD parsing, structured extraction
- **Anthropic (Claude):** Bullet rewrites, interview answer personalization
- **Heuristic (no API):** ATS keyword match, experience–JD scoring

See [decisions/phase-5.md](decisions/phase-5.md) for resume tailoring details.
