# Google OAuth Setup (Supabase Auth)

## Supabase Dashboard

1. Open your project → **Authentication** → **Providers** → **Google**.
2. Enable Google provider.
3. Copy the **Callback URL** (e.g. `https://<project-ref>.supabase.co/auth/v1/callback`).

## Google Cloud Console

1. Create or select a project at [Google Cloud Console](https://console.cloud.google.com/).
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. Authorized redirect URIs: paste the Supabase callback URL.
5. Copy **Client ID** and **Client Secret** into Supabase Google provider settings.

## Site URL & Redirects (Supabase)

1. **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:3000` (dev) or production URL
   - **Redirect URLs**: add `http://localhost:3000/auth/callback`

## Environment Variables (apps/web)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## App Flow

- Login: `/login` → `signInWithOAuth({ provider: 'google' })`
- Callback: `/auth/callback` exchanges code for session (cookie via `@supabase/ssr`)
- Protected routes: middleware redirects unauthenticated users to `/login`
