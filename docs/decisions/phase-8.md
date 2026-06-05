# Phase 8 — Coaching & Insights

> **Historical — superseded.** The deterministic insights engine and coaching hub were removed in the lean recruitment pass. Overview now shows pipeline analytics only. See [PRODUCT.md](../PRODUCT.md).

## Decisions

1. **Deterministic insights engine** — Profile strength and strategy rules in `ai-core/insights.ts` for predictable overview cards without extra API calls.
2. **Skill gaps from saved jobs** — Aggregates `jobs.tech_stack` frequency vs profile skills.
3. **Mock score trend on overview** — Recharts line chart from `mock_sessions.score`.
4. **Overview as coaching hub** — Insights panel above existing pipeline analytics.

## Trade-offs

- Strategies are heuristic rules, not personalized ML.
- Interview trend needs mock sessions with scores populated.
