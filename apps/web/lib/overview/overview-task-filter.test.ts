import { describe, expect, it } from "vitest";
import type { ApplicationWithJob } from "@hirevault/types";
import { filterApplicationsByOverviewTask } from "./overview-task-filter";

function makeApp(overrides: Partial<ApplicationWithJob> = {}): ApplicationWithJob {
  return {
    id: "app-1",
    user_id: "user-1",
    job_id: "job-1",
    status: "saved",
    applied_date: null,
    last_updated: "2026-06-01",
    notes: [],
    priority: 3,
    referral_contact: null,
    needs_review: false,
    capture_source: null,
    created_at: "2026-06-01",
    updated_at: "2026-06-01",
    job: {
      id: "job-1",
      user_id: "user-1",
      title: "Engineer",
      company: "Acme",
      location: null,
      locations: [],
      url: null,
      description_raw: null,
      description_parsed: null,
      required_qualifications: [],
      preferred_qualifications: [],
      tech_stack: [],
      salary_range: null,
      job_type: null,
      role_season: null,
      role_year: null,
      scraped_at: null,
      created_at: "2026-06-01",
      updated_at: "2026-06-01",
    },
    ...overrides,
  };
}

describe("filterApplicationsByOverviewTask", () => {
  it("filters tailor task to apps without resume", () => {
    const apps = [makeApp({ id: "a1" }), makeApp({ id: "a2" })];
    const signals = {
      a1: {
        hasResume: false,
        keywordGaps: [],
        atsScore: null,
        hasPdf: false,
        pendingTechSuggestions: 0,
        generatedAt: null,
      },
      a2: {
        hasResume: true,
        keywordGaps: [],
        atsScore: 80,
        hasPdf: true,
        pendingTechSuggestions: 0,
        generatedAt: "2026-06-01",
      },
    };

    const result = filterApplicationsByOverviewTask(apps, "tailor", signals, {});
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("filters saved task to saved applications with jobs", () => {
    const apps = [
      makeApp({ id: "saved", status: "saved" }),
      makeApp({ id: "applied", status: "applied" }),
    ];

    const result = filterApplicationsByOverviewTask(apps, "saved", {}, {});
    expect(result.map((a) => a.id)).toEqual(["saved"]);
  });
});
