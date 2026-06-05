import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fanOutCoursesFromEducation,
  normalizeParsedResume,
  normalizeParsedResumeFromText,
} from "./normalize-parsed-resume";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures", "resume_ref-plain.txt"),
  "utf8"
);

describe("fanOutCoursesFromEducation", () => {
  it("creates course rows from education relevant_courses", () => {
    const courses = fanOutCoursesFromEducation([
      {
        institution: "CMU",
        relevant_courses: ["Intro to ML(10301)", "Algorithms(15210)"],
      },
    ]);
    expect(courses).toHaveLength(2);
    expect(courses[0].institution).toBe("CMU");
  });
});

describe("normalizeParsedResume", () => {
  it("backfills leadership when AI returns empty", () => {
    const out = normalizeParsedResume(FIXTURE, {
      experiences: [{ company: "Co", title: "Dev" }],
    });
    expect(out.leadership?.length).toBe(2);
    expect(out.experiences?.length).toBeGreaterThanOrEqual(3);
  });

  it("fans out courses from merged education", () => {
    const out = normalizeParsedResumeFromText(FIXTURE);
    expect(out.courses?.length).toBeGreaterThanOrEqual(5);
    expect(out.skills?.length).toBeGreaterThanOrEqual(10);
    expect(out.full_name).toBe("Abdoul Ndiongue");
  });
});
