
---
name: HireVault orchestrated build loop
overview: Continue (do not nuke) the ~75-80% complete HireVault codebase, and finish the core career-prep loop via Builder-vs-Adversarial-Tester orchestration.
todos:
  - id: baseline-commit
    content: Commit the 39 uncommitted refinement-iteration-1 files on round2 as a clean baseline checkpoint; confirm pnpm quality:check passes as the starting gate.
    status: in_progress
  - id: supabase-automation
    content: "Automate the backend: supabase init + link, forward-only `db push` migration flow via a denylisted wrapper, optional Supabase branch DB for the loop, and a read-only Supabase MCP for the Tester."
    status: pending
  - id: build-harness
    content: "Build packages/orchestrator: @cursor/sdk Builder+Tester loop driver (local runtime), verdict.json schema + driver state machine, max-iteration/cost guards, orchestration/log.jsonl observability, orchestration/config.json (per-role model)."
    status: pending
  - id: author-role-prompts
    content: Author orchestration/prompts/builder.md and orchestration/prompts/tester.md.
    status: pending
  - id: author-milestone-specs
    content: Write orchestration/milestones/m1-m5 specs + per-milestone acceptance rubrics.
    status: pending
  - id: prototype-loop
    content: Prototype the first Builder<->Tester loop in-session via Task subagents on M1.
    status: pending
  - id: run-m1-profile
    content: Run M1 Profile fidelity through the harness until Tester certifies PASS.
    status: pending
  - id: run-m2-jobcapture
    content: Run M2 Frictionless job capture + save to PASS.
    status: pending
  - id: run-m3-resume
    content: Run M3 Resume tailoring quality to PASS.
    status: pending
  - id: run-m4-pdf
    content: Run M4 Real PDF + pluggable ResumeRenderer to PASS.
    status: pending
  - id: run-m5-interview
    content: Run M5 Interview prep depth to PASS.
    status: pending
  - id: final-report
    content: Consolidate reports/implementation-notes.html, final HTML iteration report, mistake-tracker.
    status: pending
isProject: false
---

# HireVault — Orchestrated Build Loop (Iteration 2)

> Human-readable companion: [reports/plan-iteration-2.html](../reports/plan-iteration-2.html)

See the full plan body in the workspace copy; implementation follows section 8 execution order.
