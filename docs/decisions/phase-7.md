# Phase 7 — Mock Interviews

> **Historical — superseded.** Mock interviews were removed in the lean recruitment pass. The `mock_sessions` table was dropped. Current interview prep is question-bank only — see [phase-6.md](phase-6.md) and [PRODUCT.md](../PRODUCT.md).

## Decisions

1. **Turn-based conversation_log JSON** — Stores interviewer/candidate turns with timestamps; no WebRTC.
2. **Claude evaluation JSON** — STAR/specificity scores in `feedback_json`; numeric `score` for trends.
3. **Session types** — behavioral | technical | mixed drives question generation tone.
4. **Role from job or freeform** — `role_title` on session when job selected.

## Trade-offs

- Text-only mock (no voice) — faster to ship; voice can layer on Web Speech API later.
- Scoring without Anthropic returns static coaching text.
