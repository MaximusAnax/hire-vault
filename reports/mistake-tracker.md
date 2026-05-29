# HireVault Mistake Tracker

Cumulative log of bugs found after delivery. Phase 1 starts with no entries.

| Date | Feature | Category | Severity | Caught by gates? | Notes |
|------|---------|----------|----------|------------------|-------|
| 2026-05-21 | Extension job-detector | TypeScript | Low | Yes (typecheck) | Used `.then()` on sync scrape return |
| 2026-05-21 | Insights queries | Lint | Low | Yes (build) | Unused destructured mockSessions variable |
| 2026-05-24 | Resumes empty-state | Functional | Medium | No | Workspace early-returned when `resumes.length === 0`, hiding the Jobs panel and stranding new users. Fixed in Phase C; prevention measure: Phase E added scrape.ts fixture tests + interview bank unit test, plus a UX rule that empty-state branches must always render entry points. |
| 2026-05-24 | Interview bank cross-job leakage | Functional | Medium | No | Question bank rendered every user question regardless of selected `jobId`, leaking other roles' prep into the current view. Fixed in Phase D by filtering on `jobId` and hiding the bank entirely when no role is selected; prevention measure: Phase E added scrape.ts fixture tests + interview bank unit test (`buildExistingQuestionsBlock`). |

## Recurring patterns

- **Empty-state regressions (2)**: Two of the four logged bugs are "the right data isn't shown when the parent collection is empty / filtered." Going forward, every list component should have a Vitest or Storybook case for `data = []` and `data = [items from another scope]`.

## Postmortem template

```markdown
### [Date] — [Short title]
- **Symptom:**
- **Root cause:**
- **Fix:**
- **Should have caught:**
- **Prevention added:**
```
