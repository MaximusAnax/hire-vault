import { describe, expect, it } from "vitest";
import { buildResumeDocument, escapeLatex } from "./latex";

describe("escapeLatex", () => {
  it("escapes special characters", () => {
    expect(escapeLatex("C++ & AWS")).toBe("C++ \\& AWS");
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
