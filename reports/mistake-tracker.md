# HireVault Mistake Tracker

Cumulative log of bugs found after delivery. Phase 1 starts with no entries.

| Date | Feature | Category | Severity | Caught by gates? | Notes |
|------|---------|----------|----------|------------------|-------|
| 2026-05-21 | Extension job-detector | TypeScript | Low | Yes (typecheck) | Used `.then()` on sync scrape return |
| 2026-05-21 | Insights queries | Lint | Low | Yes (build) | Unused destructured mockSessions variable |

## Recurring patterns

_None yet. If any category reaches 3+, add a systemic fix (lint rule, test, or process)._

## Postmortem template

```markdown
### [Date] — [Short title]
- **Symptom:**
- **Root cause:**
- **Fix:**
- **Should have caught:**
- **Prevention added:**
```
