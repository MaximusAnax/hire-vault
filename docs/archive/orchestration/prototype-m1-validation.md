# M1 loop prototype (in-session validation)

Validated the Builder↔Tester **verdict contract** without headless SDK (no `CURSOR_API_KEY` in CI sandbox):

1. **Builder role** — milestone spec `orchestration/milestones/m1.md` + `prompts/builder.md` (implementation-notes directive).
2. **Tester role** — rubric in same milestone file + `prompts/tester.md` (PASS only if gates + checks + zero blocker/major).
3. **Driver** — `packages/orchestrator` loads config, runs `pnpm quality:check` gates, expects `orchestration/verdicts/m1-iterN.json`.
4. **Evidence** — `apps/web/lib/ingestion/dedup.test.ts`, existing `summary.test.ts`, profile row components on `/profile`.

**Result:** M1 acceptance checks satisfied in `orchestration/verdicts/m1-pass.json`. Headless SDK loop: `CURSOR_API_KEY=… pnpm --filter @hirevault/orchestrator loop -- --milestone m1`.
