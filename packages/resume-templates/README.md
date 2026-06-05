# @hirevault/resume-templates

LaTeX resume rendering and PDF compilation for tailored exports.

## Key files

| Path | Purpose |
|------|---------|
| `src/latex.ts` | Build TeX from profile + tailored `ResumeContent` |
| `src/index.ts` | `renderResumePdf()` — runs `pdflatex` |
| `templates/resume-preamble.tex` | sb2nov layout |
| `templates/resume_ref.tex` | Reference template copy |

## Requirements

`pdflatex` on the host (or set `LATEX_COMPILER` in `.env`).

Used by `apps/web/lib/resumes/actions.ts` → `exportResumePdf`.

See [docs/decisions/phase-5.md](../../docs/decisions/phase-5.md).
