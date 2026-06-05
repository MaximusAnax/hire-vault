import { describe, expect, it } from "vitest";
import { buildResumeDocument, escapeLatex, skillsToTechnicalSkillsTex } from "./latex";

describe("escapeLatex", () => {
  it("escapes special characters", () => {
    expect(escapeLatex("C++ & AWS")).toBe("C++ \\& AWS");
  });
});

describe("skillsToTechnicalSkillsTex", () => {
  it("groups skills by category for LaTeX export", () => {
    const tex = skillsToTechnicalSkillsTex([
      { name: "Python", category: "language" },
      { name: "PyTorch", category: "framework" },
    ]);
    expect(tex).toContain("\\textbf{Languages}{: Python.}");
    expect(tex).toContain("PyTorch");
  });
});

describe("buildResumeDocument", () => {
  it("includes heading and document end", () => {
    const tex = buildResumeDocument({
      header: {
        full_name: "Jane Doe",
        email: "jane@example.com",
      },
      technical_skills_tex: String.raw`     \textbf{Languages}{: Python}`,
      education: [],
      experiences: [],
      leadership: [],
    });
    expect(tex).toContain("\\begin{document}");
    expect(tex).toContain("Jane Doe");
    expect(tex).toContain("\\end{document}");
  });
});
