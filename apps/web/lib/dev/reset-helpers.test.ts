import { describe, expect, it } from "vitest";
import {
  buildResumeStoragePaths,
  EMPTY_DEV_DATA_SUMMARY,
  formatPipelineClearSummary,
  formatProfileClearSummary,
  PIPELINE_DELETE_ORDER,
  PROFILE_SECTION_TABLES,
  type DevDataSummary,
} from "./reset-helpers";

describe("buildResumeStoragePaths", () => {
  it("prefixes file names with user id", () => {
    expect(buildResumeStoragePaths("user-1", ["resume.pdf", "draft.docx"])).toEqual([
      "user-1/resume.pdf",
      "user-1/draft.docx",
    ]);
  });

  it("drops empty names and directory placeholders", () => {
    expect(buildResumeStoragePaths("user-1", ["", "folder/", "ok.pdf"])).toEqual([
      "user-1/ok.pdf",
    ]);
  });
});

describe("formatPipelineClearSummary", () => {
  it("lists removed pipeline entities", () => {
    expect(
      formatPipelineClearSummary({
        applications: 12,
        jobs: 8,
        tailored_resumes: 2,
        company_research: 0,
      })
    ).toBe("Removed 12 application(s), 8 job(s), 2 tailored resume(s).");
  });

  it("handles empty pipeline", () => {
    expect(
      formatPipelineClearSummary({
        applications: 0,
        jobs: 0,
        tailored_resumes: 0,
        company_research: 0,
      })
    ).toBe("Pipeline was already empty.");
  });
});

describe("formatProfileClearSummary", () => {
  it("combines section and storage counts", () => {
    expect(formatProfileClearSummary({ sections: 24, storageFiles: 3 })).toBe(
      "Cleared profile data (24 profile section row(s), 3 storage file(s))."
    );
  });

  it("handles scalar-only reset", () => {
    expect(formatProfileClearSummary({ sections: 0, storageFiles: 0 })).toBe(
      "Profile scalars reset; no section rows to delete."
    );
  });
});

describe("reset plan constants", () => {
  it("documents pipeline delete order", () => {
    expect(PIPELINE_DELETE_ORDER).toEqual([
      "tailored_resumes",
      "applications",
      "jobs",
      "company_research",
    ]);
  });

  it("documents profile section tables", () => {
    expect(PROFILE_SECTION_TABLES).toEqual([
      "experiences",
      "education",
      "leadership",
      "skills",
      "courses",
      "projects",
    ]);
  });
});

describe("DevDataSummary shape", () => {
  it("EMPTY_DEV_DATA_SUMMARY has zero counts in all groups", () => {
    const summary: DevDataSummary = EMPTY_DEV_DATA_SUMMARY;
    expect(Object.values(summary.profile).every((n) => n === 0)).toBe(true);
    expect(Object.values(summary.pipeline).every((n) => n === 0)).toBe(true);
    expect(Object.values(summary.import).every((n) => n === 0)).toBe(true);
    expect(Object.values(summary.other).every((n) => n === 0)).toBe(true);
  });
});
