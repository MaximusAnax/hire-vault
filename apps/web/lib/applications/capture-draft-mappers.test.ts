import { describe, expect, it } from "vitest";
import type { ApplicationWithJob, CaptureDraft } from "@hirevault/types";
import {
  applicationToFields,
  captureDraftToFields,
  fieldsToCaptureDraft,
  fieldsToCreateJobFormData,
  parsePreviewToFields,
} from "./capture-draft-mappers";

const sampleDraft: CaptureDraft = {
  title: "Software Engineering Intern",
  company: "Gemini",
  url: "https://example.com/job",
  description_raw: "Fall 2026 intern role",
  job_type: "internship",
  role_season: "fall",
  role_year: 2026,
  locations: ["New York, NY", "Remote"],
  tech_stack: ["Python"],
  required_qualifications: ["BS CS"],
  preferred_qualifications: [],
  salary_range: "$45/hr",
  priority: 4,
};

describe("captureDraftToFields / fieldsToCaptureDraft", () => {
  it("round-trips core job fields", () => {
    const fields = captureDraftToFields(sampleDraft, { status: "saved" });
    expect(fields.role_season).toBe("fall");
    expect(fields.role_year).toBe("2026");
    expect(fields.salary_range).toBe("$45/hr");

    const back = fieldsToCaptureDraft(fields);
    expect(back.title).toBe(sampleDraft.title);
    expect(back.role_season).toBe("fall");
    expect(back.role_year).toBe(2026);
    expect(back.salary_range).toBe("$45/hr");
  });

  it("uses empty strings for unset selects", () => {
    const fields = captureDraftToFields({
      ...sampleDraft,
      job_type: null,
      role_season: null,
      role_year: null,
    });
    expect(fields.job_type).toBe("");
    expect(fields.role_season).toBe("");
    expect(fields.role_year).toBe("");
  });

  it("preserves scrape metadata via meta argument", () => {
    const fields = captureDraftToFields(sampleDraft);
    const back = fieldsToCaptureDraft(fields, {
      scrape_source: "greenhouse",
      confidence: "high",
      degraded: true,
      warning: "Partial parse",
    });
    expect(back.scrape_source).toBe("greenhouse");
    expect(back.confidence).toBe("high");
    expect(back.degraded).toBe(true);
    expect(back.warning).toBe("Partial parse");
  });
});

describe("parsePreviewToFields", () => {
  it("maps preview result into form fields", () => {
    const fields = parsePreviewToFields({
      description_raw: "JD text",
      source: "url",
      url: "https://boards.greenhouse.io/x",
      scrapeSource: "greenhouse",
      parsed: {
        title: "Intern (Fall 2026)",
        company: "Acme",
        job_type: "internship",
        role_season: "fall",
        role_year: 2026,
        tech_stack: ["Go"],
        salary_range: "$50/hr",
      },
      locations: ["Remote"],
    });
    expect(fields.title).toBe("Intern");
    expect(fields.company).toBe("Acme");
    expect(fields.role_season).toBe("fall");
    expect(fields.salary_range).toBe("$50/hr");
    expect(fields.status).toBe("saved");
  });
});

describe("applicationToFields", () => {
  it("maps application + job into form fields", () => {
    const app: ApplicationWithJob = {
      id: "a1",
      user_id: "u1",
      job_id: "j1",
      status: "saved",
      applied_date: null,
      last_updated: "2026-01-01T00:00:00Z",
      notes: [],
      priority: 2,
      referral_contact: null,
      needs_review: true,
      capture_source: "extension",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      job: {
        id: "j1",
        user_id: "u1",
        title: "PM Intern (Summer 2027)",
        company: "Co",
        job_type: "internship",
        role_season: "summer",
        role_year: 2027,
        locations: ["SF"],
        tech_stack: [],
        required_qualifications: [],
        preferred_qualifications: [],
        salary_range: null,
        description_raw: "desc",
        description_parsed: null,
        url: null,
        location: null,
        scraped_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    };

    const fields = applicationToFields(app);
    expect(fields.title).toBe("PM Intern");
    expect(fields.role_season).toBe("summer");
    expect(fields.status).toBe("saved");
    expect(fields.priority).toBe(2);
  });
});

describe("fieldsToCreateJobFormData", () => {
  it("builds form entries for createJobAndApplicationFromPreview", () => {
    const fields = captureDraftToFields(sampleDraft, { status: "applied" });
    const fd = fieldsToCreateJobFormData(fields);
    expect(fd.get("title")).toBe(sampleDraft.title);
    expect(fd.get("status")).toBe("applied");
    expect(fd.get("salary_range")).toBe("$45/hr");
    expect(fd.getAll("locations")).toEqual(["New York, NY", "Remote"]);
  });
});
