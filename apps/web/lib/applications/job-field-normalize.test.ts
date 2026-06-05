import { describe, expect, it } from "vitest";
import { normalizeJobTitleCompany, parseJobApplicationPhrase } from "./job-field-normalize";

describe("parseJobApplicationPhrase", () => {
  it("parses Greenhouse-style page title", () => {
    expect(
      parseJobApplicationPhrase(
        "Job Application for Software Engineering Intern (Fall 2026) at Gemini"
      )
    ).toEqual({
      title: "Software Engineering Intern (Fall 2026)",
      company: "Gemini",
    });
  });
});

describe("normalizeJobTitleCompany", () => {
  it("fixes company field that contains the full phrase", () => {
    const out = normalizeJobTitleCompany(
      "Software Engineering Intern (Fall 2026)",
      "Job Application for Software Engineering Intern (Fall 2026) at Gemini",
      { title: "Intern", company: "Gemini" }
    );
    expect(out.title).toBe("Software Engineering Intern (Fall 2026)");
    expect(out.company).toBe("Gemini");
  });
});
