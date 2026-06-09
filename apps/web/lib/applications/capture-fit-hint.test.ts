import { describe, expect, it } from "vitest";
import { deriveCaptureFitHint } from "./capture-fit-hint";

describe("deriveCaptureFitHint", () => {
  it("returns null when target roles are empty", () => {
    expect(
      deriveCaptureFitHint({
        target_roles: [],
        title: "Software Engineer Intern",
        job_type: "internship",
      })
    ).toBeNull();
  });

  it("detects title match against target roles", () => {
    expect(
      deriveCaptureFitHint({
        target_roles: ["Summer 2026 Software Engineer Intern"],
        title: "Software Engineer Intern",
        job_type: "internship",
        role_season: "summer",
        role_year: 2026,
      })
    ).toBe("Matches your targets (Summer '26)");
  });

  it("flags internship when targets lean full-time", () => {
    expect(
      deriveCaptureFitHint({
        target_roles: ["New Grad Software Engineer", "Full-time SWE"],
        title: "Summer Intern",
        job_type: "internship",
      })
    ).toBe("Internship role — your targets lean full-time");
  });

  it("detects cohort alignment without title match", () => {
    expect(
      deriveCaptureFitHint({
        target_roles: ["Fall 2026 SWE intern"],
        title: "Backend Engineer",
        job_type: "internship",
        role_season: "fall",
        role_year: 2026,
      })
    ).toBe("Cohort Fall '26 aligns with your targets");
  });

  it("suggests review when role is outside targets", () => {
    expect(
      deriveCaptureFitHint({
        target_roles: ["Product Manager"],
        title: "Data Analyst",
        job_type: "full_time",
      })
    ).toBe("Outside your stated target roles — still worth a look");
  });
});
