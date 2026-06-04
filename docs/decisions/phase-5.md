# Phase 5 — AI Resume Tailoring

## Decisions

1. **GPT-4o for JD parse, Claude for bullets** — Matches plan: structured extraction vs writing quality.
2. **Rule-based experience matching first** — Keyword overlap scoring is fast, testable, and works offline; Claude rewrites top-matched roles only.
3. **LaTeX PDF export (sb2nov / resume_ref.tex)** — `@hirevault/resume-templates` builds TeX from profile + tailored bullets and compiles with `pdflatex` (or `LATEX_COMPILER`). HTML templates and Chromium/Puppeteer PDF paths were removed.
4. **Version per application** — `tailored_resumes.version` increments per `application_id`; `label` shows job title + version.
5. **Fixed export sections (v1)** — Heading, Education, Experience, Technical Skills (raw LaTeX lines on profile), Leadership. Projects/Courses stay in profile UI but are omitted from PDF until role-aware prioritization exists.

## Trade-offs

- ATS score is keyword-density heuristic, not a real ATS vendor simulation.
- LaTeX compile requires TeX on the host (local dev first; serverless deploy needs a worker or container later).
