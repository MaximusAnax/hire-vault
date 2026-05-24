# Phase 2 Architecture Decisions

## AI package: `@hirevault/ai-core`

**Decision:** Shared package for Zod schemas, hash functions, prompts, and OpenAI parse/validate calls.

**Why:** Same parsing logic can be reused in Edge Functions later; keeps Server Actions thin.

**Alternatives rejected:** Inline prompts in `apps/web` only (duplication risk); Anthropic for parsing (plan specifies GPT-4o for structured extraction).

## Resume parsing: GPT-4o + pdf-parse/mammoth

**Decision:** Extract text server-side with `pdf-parse` / `mammoth`, then `gpt-4o` with JSON schema response format.

**Why:** Reliable structured output; text extraction avoids sending binary to the model.

**Alternatives rejected:** Claude for parsing (weaker JSON adherence per project plan); client-side PDF.js only (heavier bundle).

## Graceful degradation without `OPENAI_API_KEY`

**Decision:** Upload still stores file; parsing returns clear error; local rule-based validation always available.

**Why:** `pnpm quality:check` and local dev work without secrets.

## LinkedIn: JSON paste MVP

**Decision:** Paste structured JSON + optional profile URL; document that OAuth requires LinkedIn API app credentials.

**Why:** LinkedIn restricted API access makes full OAuth infeasible without user-provided client id/secret; JSON paste is testable immediately.

**Alternatives rejected:** Scraping profile URL (ToS/legal risk, brittle); blocking import until OAuth (delays MVP).

## Deduplication: SHA-256 `source_hash` + conflict queue

**Decision:** DB triggers compute hash on insert/update; app-level merge on import; substantive bullet diffs create `dedup_conflicts` rows for UI resolution.

**Why:** Aligns with plan; triggers keep manual edits hashed; conflicts only when merge is ambiguous.

**Alternatives rejected:** Fuzzy string match (complex, false positives); silent overwrite (data loss).

## Storage: private `resumes` bucket

**Decision:** Path `{user_id}/{timestamp}-filename`; RLS on `storage.objects` by folder prefix.

**Why:** User isolation; files available for re-parse audit later.

## Ingestion UI: `/profile/import`

**Decision:** Dedicated import page with upload, LinkedIn JSON, conflicts, validation score.

**Why:** Keeps profile tabs focused on CRUD; import is a multi-step workflow.

## Inline edit: experience rows only (Phase 2 scope)

**Decision:** `ExperienceRow` client component with expand-in-place edit; other sections remain add/delete.

**Why:** Phase 2 asked to enhance forms where gaps exist; experiences benefit most from bullet editing.
