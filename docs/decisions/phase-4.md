# Phase 4 — Browser Extension

## Decisions

1. **Bearer token auth** — Extension uses hashed tokens in `extension_tokens`, not cookies. Avoids third-party cookie issues and works from any job board origin.
2. **Service role on capture API** — `/api/extension/capture` uses `SUPABASE_SERVICE_ROLE_KEY` after token lookup. RLS still applies to user-owned rows via explicit `user_id` on insert.
3. **Site-specific scrapers + generic fallback** — LinkedIn, Greenhouse, Lever, Workday, Ashby, SmartRecruiters selectors with generic `og:` / `h1` fallback.
4. **Page-dump fallback** — When structured scrape is missing or thin (`description` &lt; 200 chars and `low` confidence), content script merges `main`/`article`/`body` `innerText` into the capture payload (`source: page_dump`). Popup offers **Use page content** for manual retry.
5. **Capture API parity** — `/api/extension/capture` merges AI-parsed fields like web `createJob`, uses `normalizeLocations`, URL dedup (reuse job + skip duplicate application), and surfaces application insert errors.
6. **esbuild IIFE bundle** — MV3 content script as IIFE; service worker as ESM per manifest.
7. **Popup smart capture** — MV3 popup (portable across Chromium browsers) is the primary review surface. Flow: scrape → `POST /api/extension/preview` → edit minor fields (title, company, term, priority) → save with `skip_ai_parse: true`. **Review on web** saves with `needs_review` and opens the capture inbox; **Edit on web** opens `/applications?addUrl=…#add` without saving.
8. **Shared preview builder** — `buildCapturePreview` (from `mergeCaptureFields` + `parseJobDescription`) is the single server path for web `JobPreviewCard`, extension preview, and extension save. Web `runParseAndPreviewJob` delegates to it.
9. **Web capture review inbox** — Extension quick-save can set `applications.needs_review = true`. `/applications` exposes a **Needs review** filter, `CaptureReviewPanel`, and `markApplicationReviewed` action. Overview ranks a `capture_review` action when count > 0.
10. **Profile fit hints** — `deriveCaptureFitHint` compares draft `job_type` / cohort to `profiles.target_roles`. Display-only on preview surfaces; returned as `fit_hint` on web parse preview.

## Trade-offs

- Scrapers break when ATS sites redesign DOM — mitigated by page-dump auto-fallback, manual paste, and re-scrape button.
- `host_permissions: <all_urls>` is broad — required for arbitrary job boards.
