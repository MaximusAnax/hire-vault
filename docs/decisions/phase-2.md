# Phase 2 Architecture Decisions

## AI package: `@hirevault/ai-core`

**Decision:** Shared package for Zod schemas, hash functions, prompts, and OpenAI parse/validate calls.

**Why:** Same parsing logic can be reused in Edge Functions later; keeps Server Actions thin.

**Alternatives rejected:** Inline prompts in `apps/web` only (duplication risk); Anthropic for parsing (plan specifies GPT-4o for structured extraction).

## Resume parsing: GPT-4o + pdf-parse/mammoth

**Decision:** Extract text server-side with `pdf-parse` / `mammoth`, then `gpt-4o` with JSON schema response format.

**Why:** Reliable structured output; text extraction avoids sending binary to the model.

**Alternatives rejected:** Claude for parsing (weaker JSON adherence per project plan); client-side PDF.js only (heavier bundle).

## Resume normalize: AI-primary experiences (no dual-parser merge)

**Decision:** When GPT returns `experiences` or `leadership`, use those rows only (`pickExperiences` / `pickLeadership` in `normalize-parsed-resume.ts`). The deterministic section parser (`resume-section-parser.ts`) is used for **degraded** imports (no API key) and to **backfill** scalars, skills, education, and courses — not to re-parse the same experience blocks alongside GPT.

**Why:** Merging AI + deterministic experience lists produced duplicate preview rows (good GPT bullets + broken line-parser rows). GPT quality is strictly better for role layout; deterministic merge was the root cause.

**Alternatives rejected:** Fuzzy post-merge coalesce only (fragile on date/title drift); deterministic-only (poor bullets on wrapped lines).

## Import-time bullet polish (opt-in)

**Decision:** `polishParsedResumeBullets` (Claude Haiku) runs only when `RESUME_IMPORT_POLISH=1`. Default off after GPT parse; tailoring still polishes bullets at rewrite time.

**Why:** GPT structured output is sufficient at import; per-role Haiku calls add cost and latency without fixing duplicate-parser issues.

## Graceful degradation without `OPENAI_API_KEY`

**Decision:** Upload still stores file; parsing returns clear error; local rule-based validation always available.

**Why:** `pnpm quality:check` and local dev work without secrets.

## LinkedIn: OAuth primary, JSON paste fallback

**Decision:** When `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, and redirect URI are configured, `/profile/import` shows **Connect LinkedIn** as the primary path. Tokens are stored encrypted in `linkedin_connections`; sync maps LinkedIn API responses to `LinkedInImport` and feeds the same ingestion pipeline as JSON paste (preview gate when S1 ships).

**Why:** Official API avoids ToS risk of scraping; JSON paste remains for dev, limited API tiers, and power users with full exports.

**Alternatives rejected:** OAuth-only (blocks dev without LinkedIn app); scraping profile URL (ToS/legal risk, brittle).

**Historical:** JSON paste MVP shipped first while LinkedIn API access was gated; see [auth-linkedin-oauth.md](../setup/auth-linkedin-oauth.md).

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
