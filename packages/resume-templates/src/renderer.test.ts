import { describe, expect, it } from "vitest";
import { LatexRenderer } from "./renderer";
import type { ResumeContent } from "@hirevault/ai-core";

const sample: ResumeContent = {
  headline: "Engineer",
  experiences: [],
  skills: [],
};

describe("ResumeRenderer", () => {
  it("LatexRenderer stub throws with clear message", async () => {
    const r = new LatexRenderer();
    await expect(r.renderToPdf(sample, "ats")).rejects.toThrow(/LatexRenderer/);
  });
});
