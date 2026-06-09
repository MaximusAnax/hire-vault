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
    expect(out.experiences?.length).toBe(1);
    expect(out.experiences?.[0].company).toBe("Co");
  });

  it("does not merge deterministic experiences when AI returned experiences", () => {
    const out = normalizeParsedResume(FIXTURE, {
      experiences: [
        {
          company: "Only AI Co",
          title: "Only Role",
          start_date: "2024-01-01",
          bullet_points: ["AI bullet"],
        },
      ],
    });
    expect(out.experiences?.length).toBe(1);
    expect(out.experiences?.[0].company).toBe("Only AI Co");
    expect(out.experiences?.[0].bullet_points).toEqual(["AI bullet"]);
  });

  it("keeps three unique AI experiences from fixture-shaped mock without det pollution", () => {
    const det = normalizeParsedResumeFromText(FIXTURE);
    const aiExperiences = det.experiences ?? [];
    expect(aiExperiences.length).toBeGreaterThanOrEqual(3);

    const out = normalizeParsedResume(FIXTURE, {
      experiences: aiExperiences.slice(0, 3),
    });

    expect(out.experiences?.length).toBe(3);
    expect(out.experiences?.some((e) => e.title === "Student")).toBe(false);
  });

  it("backfills field_of_study from deterministic when AI only has degree type", () => {
    const out = normalizeParsedResume(FIXTURE, {
      education: [{ institution: "Carnegie Mellon University", degree: "BS" }],
    });
    expect(out.education?.[0].field_of_study?.toLowerCase()).toContain("artificial intelligence");
    expect(out.education?.[0].degree).toBe("BS");
  });

  it("splits major from combined degree string", () => {
    const out = normalizeParsedResume("Header", {
      education: [
        {
          institution: "Carnegie Mellon University",
          degree: "BS in Artificial Intelligence",
        },
      ],
    });
    expect(out.education?.[0].degree).toBe("BS");
    expect(out.education?.[0].field_of_study).toBe("Artificial Intelligence");
  });

  it("fans out courses from merged education", () => {
    const out = normalizeParsedResumeFromText(FIXTURE);
    expect(out.courses?.length).toBeGreaterThanOrEqual(5);
    expect(out.skills?.length).toBeGreaterThanOrEqual(10);
    expect(out.full_name).toBe("Abdoul Ndiongue");
  });

  it("coalesces near-duplicate roles when title/company differ slightly", () => {
    const out = normalizeParsedResume("Abdoul Ndiongue\nabdoul@example.com", {
      experiences: [
        {
          company: "Machine Learning Department - CMU",
          title: "Student Researcher",
          start_date: "2024-05-01",
          is_current: true,
          bullet_points: ["Full bullet one.", "Full bullet two."],
        },
        {
          company: "Machine Learning Department - CMUPittsburgh, PA",
          title: "Student",
          start_date: "2024-05-01",
          is_current: true,
          bullet_points: ["Full bullet", "one."],
        },
      ],
    });

    const cmuRoles = out.experiences?.filter((e) =>
      e.company.toLowerCase().includes("machine learning department")
    );
    expect(cmuRoles?.length).toBe(1);
    expect(cmuRoles?.[0].title).toContain("Student");
  });

});
