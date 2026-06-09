# LinkedIn OAuth Setup (Profile Import)

LinkedIn OAuth lets users connect their account on `/profile/import` and sync profile data into the existing ingestion pipeline. JSON paste remains available under **Advanced** when OAuth is unavailable or returns limited fields.

## LinkedIn Developer Portal

1. Create or open an app at [LinkedIn Developers](https://www.linkedin.com/developers/apps).
2. Under **Auth** → **OAuth 2.0 settings**, add your redirect URI:
   - Dev: `http://localhost:3000/api/linkedin/callback`
   - Prod: `https://<your-domain>/api/linkedin/callback`
3. Request products as needed:
   - **Sign In with LinkedIn using OpenID Connect** — required (`openid`, `profile`, `email`)
   - **Profile Details API** (Plus tier) — optional; only after approval, set `LINKEDIN_OAUTH_INCLUDE_PLUS_SCOPES=1` in `.env` for richer sync fields
4. Copy **Client ID** and **Client Secret**.

## Environment Variables

Add to repository root `.env` (see [environment.md](./environment.md)):

```env
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/linkedin/callback
# Optional — defaults to LINKEDIN_CLIENT_SECRET for AES-256-GCM token encryption
# LINKEDIN_TOKEN_ENCRYPTION_KEY=
```

`LINKEDIN_REDIRECT_URI` is optional when `NEXT_PUBLIC_APP_URL` is set; the app derives `{APP_URL}/api/linkedin/callback`.

Restart `pnpm dev` after changes.

## App Flow

1. User clicks **Connect LinkedIn** → `GET /api/linkedin/auth` (stores CSRF state cookie, redirects to LinkedIn)
2. LinkedIn redirects to `GET /api/linkedin/callback` with authorization code
3. Server exchanges code, encrypts tokens, upserts `linkedin_connections` row (RLS: own profile only)
4. User clicks **Sync profile** → `syncLinkedInProfile()` fetches API data, maps to `LinkedInImport`, runs ingestion (preview gate when S1 ships; direct apply fallback today)

## API Field Coverage

| Tier | Typical fields |
|------|------------------|
| OpenID (`userinfo`) | Member ID, locale, profile URL hint |
| Plus (`identityMe`) | Headline, current position, most recent education |

If sync returns limited data, users can still paste JSON under **Advanced**.

## Database

Migration `20260610120000_linkedin_connections.sql` creates `linkedin_connections` with encrypted token columns and RLS via `user_owns_profile(profile_id)`.

Apply with:

```bash
pnpm db db push
```

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Connect button hidden | All three env vars set (`CLIENT_ID`, `CLIENT_SECRET`, redirect URI) |
| `state_mismatch` | Cookie blocked; retry connect in same browser session |
| `token_exchange_failed` | Redirect URI matches LinkedIn app settings exactly |
| `unauthorized_scope` or generic “connection failed” | Plus scopes requested without product approval — remove `LINKEDIN_OAUTH_INCLUDE_PLUS_SCOPES` or approve products |
| Sync returns sparse data | LinkedIn product tier / scopes; use JSON fallback |
| `storage_failed` | Run `pnpm db db push` for `linkedin_connections` migration |
