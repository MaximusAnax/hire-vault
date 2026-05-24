# Phase 6 — Interview Preparation

## Decisions

1. **Questions tied to `job_id`** — Reuses jobs table; RLS via job ownership.
2. **Claude for personalized + refined answers** — Profile JSON passed as context; degrades to guidance text without API key.
3. **Flashcard practice UI** — Client-side index + self-rating 1–5 stored on `interview_questions`.
4. **Company research stub** — `company_research` table caches stub summary until external API is configured.

## Trade-offs

- Generated questions without OpenAI may use static fallbacks.
- Technical topics derived from regex + tech_stack, not full curriculum generation.
