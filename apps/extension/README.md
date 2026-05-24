# HireVault Chrome Extension

Manifest V3 extension for one-click job capture.

## Build

```bash
pnpm --filter @hirevault/extension build
```

Load unpacked from `apps/extension/dist` in `chrome://extensions`.

## Setup

1. Run the web app (`pnpm dev`).
2. In **Settings → Chrome extension**, generate a token.
3. Paste app URL (`http://localhost:3000`) and token in the extension popup.
4. Visit a job posting (LinkedIn, Greenhouse, Lever, Workday, etc.) and click **Save to HireVault**.

Use **Manual paste** when scraping fails.
