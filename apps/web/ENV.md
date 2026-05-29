# Environment variables

**Do not use `apps/web/.env.local`.** All keys are loaded from the repository root:

```
career-support/.env
```

Next.js reads this via `loadEnvConfig` in `next.config.ts`. Copy `.env.example` at the repo root and restart `pnpm dev` after changes.
