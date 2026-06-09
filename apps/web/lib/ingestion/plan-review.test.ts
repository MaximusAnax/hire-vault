import { describe, expect, it } from "vitest";
import {
  computePreviewTotals,
  getEditableRow,
  refreshPlanHashes,
  sanitizeReviewedPlans,
  setEditableRow,
  textToBullets,
} from "./plan-review";
import type { SectionUpsertPlan } from "@hirevault/types";

describe("plan-review", () => {
  it("updates editable row for insert and update plans", () => {
    const insert: SectionUpsertPlan = {
      action: "insert",
      section: "skills",
      incoming: { name: "TypeScript" },
    };
    const updatedInsert = setEditableRow(insert, { name: "TypeScript 5" });
    expect(getEditableRow(updatedInsert).name).toBe("TypeScript 5");

    const update: SectionUpsertPlan = {
      action: "update",
      section: "experiences",
      incoming: { title: "Intern", company: "Acme" },
      merged: { title: "Intern", company: "Acme", bullet_points: ["Built APIs"] },
      existingId: "exp-1",
    };
    const updatedUpdate = setEditableRow(update, {
      title: "Software Engineer Intern",
      company: "Acme",
      bullet_points: ["Built APIs", "Shipped features"],
    });
    expect(getEditableRow(updatedUpdate).title).toBe("Software Engineer Intern");
    expect((getEditableRow(updatedUpdate).bullet_points as string[]).length).toBe(2);
  });

  it("recomputes source_hash after edits", () => {
    const plan: SectionUpsertPlan = {
      action: "insert",
      section: "skills",
      incoming: { name: "React", source_hash: "old" },
    };
    const refreshed = refreshPlanHashes(setEditableRow(plan, { name: "React 19" }));
    expect(refreshed.incoming.source_hash).toBeTruthy();
    expect(refreshed.incoming.source_hash).not.toBe("old");
  });

  it("drops skip plans and recomputes totals", () => {
    const plans: SectionUpsertPlan[] = [
      { action: "insert", section: "skills", incoming: { name: "Go" } },
      { action: "skip", section: "skills", incoming: { name: "Python" } },
      { action: "conflict", section: "experiences", incoming: { title: "Dev", company: "X" }, existingId: "1" },
    ];

    const sanitized = sanitizeReviewedPlans(plans);
    expect(sanitized).toHaveLength(2);
    expect(computePreviewTotals(sanitized)).toEqual({
      insert: 1,
      update: 0,
      skip: 0,
      conflict: 1,
    });
  });

  it("parses bullet text", () => {
    expect(textToBullets("  first\n\nsecond  ")).toEqual(["first", "second"]);
  });
});
