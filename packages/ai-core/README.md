# @hirevault/ai-core

AI parsing, resume scoring, and interview generation for HireVault.

## Modules

| File | Purpose |
|------|---------|
| `parse.ts` | Job description parsing (OpenAI) |
| `write.ts` | Bullet rewrites (Anthropic) |
| `resume.ts` | Experience–JD matching, ATS heuristic |
| `interviews.ts` | Question bank generation |
| `schemas.ts` | Zod schemas (`ResumeContent`, JD parse types) |
| `hash.ts` | Dedup hashes for ingestion |

## Usage

Consumed by `apps/web` server actions. Requires `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` in repo root `.env`.

```bash
pnpm --filter @hirevault/ai-core test
```

See [docs/NAVIGATION.md](../../docs/NAVIGATION.md) and [docs/decisions/phase-5.md](../../docs/decisions/phase-5.md).
