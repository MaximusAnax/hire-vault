# HireVault Chrome Extension

Manifest V3 extension for one-click job capture into Applications.

## Build

```bash
pnpm --filter @hirevault/extension build
pnpm --filter @hirevault/extension test
```

Load unpacked from `apps/extension/dist` in `chrome://extensions`.

## Setup

1. Run the web app (`pnpm dev`).
2. In **Settings → Chrome extension**, generate a token.
3. Paste app URL (`http://localhost:3000`) and token in the extension popup.
4. Visit a job posting (LinkedIn, Greenhouse, Lever, Workday, Ashby, SmartRecruiters, etc.) and click **Save to HireVault**.

## Popup

1. **Capture from page** — structured scrape, then full-page text if needed (injects the content script if the tab was opened before the extension loaded).
2. **Save to HireVault** — syncs to Applications.
3. **Paste job manually** — collapsed section; opens automatically only when capture fails.

## Manual E2E checklist

1. [ ] Generate token in Settings; set App URL + token in popup.
2. [ ] **Greenhouse** job → structured scrape → Save → job appears on `/applications`.
3. [ ] Obscure page / broken DOM → auto page dump → description populated after save.
4. [ ] **Use page content** on LinkedIn job → full JD text in preview → Save works.
5. [ ] Navigate to another job on same SPA (LinkedIn) without full reload → Re-scrape shows new role.
6. [ ] `chrome://` tab → clear message (no scrape).
7. [ ] Invalid token → error shown in popup (401).
8. [ ] Save same URL twice → one job row updated; no duplicate application.
9. [ ] **Open in HireVault** link after save opens Applications.

## Troubleshooting

- **Scrape failed**: Click **Use page content** or **Manual paste**.
- **Content script not injected**: Reload the job tab, then open the popup again.
- **401 on sync**: Regenerate token in Settings and update popup.
