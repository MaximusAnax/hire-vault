# Phase 4 — Browser Extension

## Decisions

1. **Bearer token auth** — Extension uses hashed tokens in `extension_tokens`, not cookies. Avoids third-party cookie issues and works from any job board origin.
2. **Service role on capture API** — `/api/extension/capture` uses `SUPABASE_SERVICE_ROLE_KEY` after token lookup. RLS still applies to user-owned rows via explicit `user_id` on insert.
3. **Site-specific scrapers + generic fallback** — LinkedIn, Greenhouse, Lever, Workday, Ashby, SmartRecruiters selectors with generic `og:` / `h1` fallback.
4. **Page-dump fallback** — When structured scrape is missing or thin (`description` &lt; 200 chars and `low` confidence), content script merges `main`/`article`/`body` `innerText` into the capture payload (`source: page_dump`). Popup offers **Use page content** for manual retry.
5. **Capture API parity** — `/api/extension/capture` merges AI-parsed fields like web `createJob`, uses `normalizeLocations`, URL dedup (reuse job + skip duplicate application), and surfaces application insert errors.
6. **esbuild IIFE bundle** — MV3 content script as IIFE; service worker as ESM per manifest.

## Trade-offs

- Scrapers break when ATS sites redesign DOM — mitigated by page-dump auto-fallback, manual paste, and re-scrape button.
- `host_permissions: <all_urls>` is broad — required for arbitrary job boards.
