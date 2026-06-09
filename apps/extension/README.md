# HireVault Chrome Extension

Manifest V3 extension for job capture into Applications (Chromium popup — portable across Chrome, Arc, Edge, Opera).

**Product context:** [docs/PRODUCT.md](../../docs/PRODUCT.md) · **Code map:** [docs/NAVIGATION.md](../../docs/NAVIGATION.md#extension-capture)

## Build

```bash
pnpm --filter @hirevault/extension build
pnpm --filter @hirevault/extension test
```

Load unpacked from `apps/extension/dist` in `chrome://extensions`.

## Setup

1. Run the web app (`pnpm dev`).
2. In **Settings → Chrome extension**, generate a token.
3. Paste app URL (`http://localhost:3000`) and token in the extension popup settings.
4. Visit a job posting and click **Capture from page**.

## Popup flow

1. **Capture from page** — scrape → AI preview → edit title, company, term, priority.
2. **Save to HireVault** — polished save (`skip_ai_parse`).
3. **Review on web** — save with `needs_review`, open Applications review panel.
4. **Edit on web** — open `/applications?addUrl=…` for full JobPreviewCard (no save yet).
5. **Paste job manually** — when capture fails on restricted tabs.

## Manual E2E checklist

1. [ ] Generate token in Settings; set App URL + token in popup.
2. [ ] **Greenhouse** job → Capture → preview shows title/term → Save → tile on `/applications`.
3. [ ] **Review on web** → appears in Needs review panel → Mark reviewed.
4. [ ] **Edit on web** → full preview on web, no duplicate until user saves.
5. [ ] Save from popup without web → quals/tech still on job row.
6. [ ] Invalid token → error in popup (401).
7. [ ] Save same URL twice → one job row updated; no duplicate application.

## Troubleshooting

- **Capture failed**: Use **Paste job manually** in popup.
- **Content script not injected**: Reload the job tab, then capture again.
- **401 on sync**: Regenerate token in Settings and update popup.
