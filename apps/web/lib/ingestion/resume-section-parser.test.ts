import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseDateRange,
  parseResumeSections,
  splitCourseList,
} from "./resume-section-parser";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures", "resume_ref-plain.txt"),
  "utf8"
);

describe("parseDateRange", () => {
  it("parses present range", () => {
    expect(parseDateRange("May 2026 -- Present")).toEqual({
      start_date: "2026-05-01",
      end_date: null,
      is_current: true,
    });
  });
});

describe("splitCourseList", () => {
  it("splits coursework with parenthetical codes", () => {
    const list = splitCourseList(
      "Intro to Machine Learning(10301), Generative Artificial Intelligence(10423)"
    );
    expect(list).toHaveLength(2);
    expect(list[0]).toContain("Machine Learning");
  });
});

describe("parseResumeSections", () => {
  it("parses header contact from resume_ref fixture", () => {
    const parsed = parseResumeSections(FIXTURE);
    expect(parsed.full_name).toBe("Abdoul Ndiongue");
    expect(parsed.email).toBe("andiongu@andrew.cmu.edu");
    expect(parsed.phone).toContain("929");
    expect(parsed.linkedin_url).toContain("linkedin.com");
    expect(parsed.github_url).toContain("github.com");
  });

  it("parses education with coursework", () => {
    const parsed = parseResumeSections(FIXTURE);
    expect(parsed.education?.[0]?.institution).toContain("Carnegie Mellon");
    expect(parsed.education?.[0]?.relevant_courses?.length).toBeGreaterThanOrEqual(5);
  });

  it("parses three experiences", () => {
    const parsed = parseResumeSections(FIXTURE);
    expect(parsed.experiences?.length).toBe(3);
    expect(parsed.experiences?.[1]?.company).toContain("Microsoft");
  });

  it("parses leadership entries", () => {
    const parsed = parseResumeSections(FIXTURE);
    expect(parsed.leadership?.length).toBe(2);
    const orgs = parsed.leadership!.map((l) => l.organization.toLowerCase());
    expect(orgs.some((o) => o.includes("fraternity") || o.includes("inter"))).toBe(true);
    expect(orgs.some((o) => o.includes("colorstack"))).toBe(true);
  });

  it("parses technical skills including PyTorch and Python", () => {
    const parsed = parseResumeSections(FIXTURE);
    const names = parsed.skills!.map((s) => s.name.toLowerCase());
    expect(names.some((n) => n.includes("pytorch"))).toBe(true);
    expect(names.some((n) => n.includes("python"))).toBe(true);
    expect(names.some((n) => n.includes("aws"))).toBe(true);
    expect(parsed.skills!.length).toBeGreaterThanOrEqual(10);
  });
});
