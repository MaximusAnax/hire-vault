# Phase 5 — AI Resume Tailoring

## Decisions

1. **GPT-4o for JD parse, Claude for bullets** — Matches plan: structured extraction vs writing quality.
2. **Rule-based experience matching first** — Keyword overlap scoring is fast, testable, and works offline; Claude rewrites top-matched roles only.
3. **HTML templates + print PDF** — `@hirevault/resume-templates` renders preview HTML; user prints to PDF from browser (no React-PDF dep) for simpler deploy.
4. **Version per application** — `tailored_resumes.version` increments per `application_id`; `label` shows job title + version.

## Trade-offs

- ATS score is keyword-density heuristic, not a real ATS vendor simulation.
- PDF export is print-based, not pixel-perfect LaTeX.
