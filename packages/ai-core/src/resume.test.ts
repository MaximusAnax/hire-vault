import { describe, expect, it } from "vitest";
import { computeAtsScore, scoreExperiencesAgainstJd } from "./resume";

describe("scoreExperiencesAgainstJd", () => {
  it("scores higher when bullets mention JD keywords", () => {
    const matches = scoreExperiencesAgainstJd(
      [
        {
          id: "1",
          company: "Acme",
          title: "Engineer",
          bullet_points: ["Built React dashboards with TypeScript"],
          technologies: ["React", "TypeScript"],
        },
      ],
      {
        tech_stack: ["react", "typescript"],
        required_qualifications: [],
        preferred_qualifications: [],
      },
      null
    );
    expect(matches[0].score).toBeGreaterThan(0);
    expect(matches[0].matchedKeywords.length).toBeGreaterThan(0);
  });
});

describe("computeAtsScore", () => {
  it("returns gaps for missing keywords", () => {
    const result = computeAtsScore(
      {
        summary: "Software engineer",
        experiences: [{ bullet_points: ["Led team"] }],
      },
      ["kubernetes", "python"]
    );
    expect(result.keywordGaps).toContain("kubernetes");
    expect(result.score).toBeLessThan(100);
  });
});
