import { describe, expect, it } from "vitest";
import {
  extractRoleTimingFromTitle,
  formatRoleTimingLabel,
  parseRoleTimingFromText,
  resolveRoleTiming,
} from "./role-timing";

describe("parseRoleTimingFromText", () => {
  it("parses parenthetical Fall 2026", () => {
    expect(parseRoleTimingFromText("(Fall 2026)")).toEqual({
      role_season: "fall",
      role_year: 2026,
    });
  });

  it("parses Summer '27", () => {
    expect(parseRoleTimingFromText("Summer '27")).toEqual({
      role_season: "summer",
      role_year: 2027,
    });
  });
});

describe("extractRoleTimingFromTitle", () => {
  it("strips trailing cohort from intern titles", () => {
    const out = extractRoleTimingFromTitle(
      "Software Engineering Intern (Fall 2026)"
    );
    expect(out.title).toBe("Software Engineering Intern");
    expect(out.role_season).toBe("fall");
    expect(out.role_year).toBe(2026);
  });
});

describe("formatRoleTimingLabel", () => {
  it("formats short year", () => {
    expect(formatRoleTimingLabel("fall", 2026)).toBe("Fall '26");
  });
});

describe("resolveRoleTiming", () => {
  it("prefers explicit fields over title", () => {
    expect(
      resolveRoleTiming({
        title: "Intern (Fall 2026)",
        role_season: "summer",
        role_year: 2027,
      })
    ).toEqual({
      title: "Intern",
      role_season: "summer",
      role_year: 2027,
    });
  });
});
