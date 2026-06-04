import { describe, expect, it } from "vitest";
import { mergeExtensionCaptureFields } from "./merge-capture-fields";

describe("mergeExtensionCaptureFields", () => {
  it("fills weak company from parsed JD", () => {
    const merged = mergeExtensionCaptureFields(
      { title: "Dev", company: "Unknown company", description: "x".repeat(80) },
      {
        title: "Software Engineer",
        company: "Stripe",
        locations: ["Remote", "SF"],
        tech_stack: ["TypeScript"],
        required_qualifications: [],
        preferred_qualifications: [],
      }
    );
    expect(merged.company).toBe("Stripe");
    expect(merged.locations).toEqual(["Remote", "SF"]);
    expect(merged.tech_stack).toEqual(["TypeScript"]);
  });

  it("infers cohort timing and internship from intern title", () => {
    const merged = mergeExtensionCaptureFields(
      {
        title: "Software Engineering Intern (Fall 2026)",
        company: "Gemini",
        description: "x".repeat(80),
      },
      null
    );
    expect(merged.title).toBe("Software Engineering Intern");
    expect(merged.role_season).toBe("fall");
    expect(merged.role_year).toBe(2026);
    expect(merged.job_type).toBe("internship");
  });

  it("parses Greenhouse page-title company noise", () => {
    const merged = mergeExtensionCaptureFields(
      {
        title: "Software Engineering Intern (Fall 2026)",
        company: "Job Application for Software Engineering Intern (Fall 2026) at Gemini",
        description: "x".repeat(80),
      },
      { title: "Intern", company: "Gemini", locations: [], tech_stack: [], required_qualifications: [], preferred_qualifications: [] }
    );
    expect(merged.title).toBe("Software Engineering Intern");
    expect(merged.company).toBe("Gemini");
    expect(merged.role_season).toBe("fall");
    expect(merged.role_year).toBe(2026);
  });

  it("dedupes locations case-insensitively", () => {
    const merged = mergeExtensionCaptureFields(
      { title: "Role", company: "Co", locations: ["remote", "Remote"] },
      null
    );
    expect(merged.locations).toEqual(["remote"]);
  });
});
