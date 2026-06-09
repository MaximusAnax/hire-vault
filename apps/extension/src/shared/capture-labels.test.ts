import { describe, expect, it } from "vitest";
import {
  captureDraftToExtensionForm,
  draftFromForm,
  extensionFormToCaptureDraft,
  formatTermBadge,
  jobTypeLabel,
  listFromMultiline,
  locationsSummary,
  mergePopupMinorEdits,
} from "./capture-labels";

describe("formatTermBadge", () => {
  it("formats Fall 2026 as Fall '26", () => {
    expect(formatTermBadge("fall", 2026)).toBe("Fall '26");
  });
});

describe("locationsSummary", () => {
  it("joins up to two locations", () => {
    expect(locationsSummary(["SF", "Remote"])).toBe("SF · Remote");
  });

  it("truncates long lists", () => {
    expect(locationsSummary(["A", "B", "C"])).toBe("A · B +1");
  });
});

describe("mergePopupMinorEdits", () => {
  it("updates minor fields without wiping parsed arrays", () => {
    const base = {
      title: "Old Title",
      company: "Old Co",
      url: "https://example.com/job",
      description_raw: "long jd",
      job_type: "internship" as const,
      role_season: "summer" as const,
      role_year: 2027,
      locations: ["NYC", "Remote"],
      tech_stack: ["Python"],
      required_qualifications: ["BS CS"],
      preferred_qualifications: ["ML"],
      salary_range: "$50/hr",
      priority: 3,
    };
    const merged = mergePopupMinorEdits(base, {
      title: "Software Engineering Intern",
      company: "Gemini",
      job_type: "internship",
      role_season: "fall",
      role_year: "2026",
      priority: 5,
    });
    expect(merged.title).toBe("Software Engineering Intern");
    expect(merged.role_season).toBe("fall");
    expect(merged.role_year).toBe(2026);
    expect(merged.tech_stack).toEqual(["Python"]);
    expect(merged.required_qualifications).toEqual(["BS CS"]);
    expect(merged.description_raw).toBe("long jd");
  });
});

describe("extensionFormToCaptureDraft", () => {
  it("maps multiline lists and priority", () => {
    const draft = extensionFormToCaptureDraft({
      title: "Intern",
      company: "Acme",
      url: "https://example.com",
      description_raw: "desc",
      job_type: "internship",
      role_season: "summer",
      role_year: "2027",
      locations: "NYC\nRemote",
      tech_stack: "Python",
      required_qualifications: "BS CS",
      preferred_qualifications: "",
      salary_range: "$50/hr",
      priority: 4,
    });
    expect(draft.locations).toEqual(["NYC", "Remote"]);
    expect(draft.priority).toBe(4);
    expect(draft.role_year).toBe(2027);
  });
});

describe("captureDraftToExtensionForm", () => {
  it("round-trips with extensionFormToCaptureDraft", () => {
    const draft = extensionFormToCaptureDraft({
      title: "Intern",
      company: "Acme",
      url: "https://example.com",
      description_raw: "desc",
      job_type: "internship",
      role_season: "summer",
      role_year: "2027",
      locations: "NYC\nRemote",
      tech_stack: "Python",
      required_qualifications: "BS CS",
      preferred_qualifications: "",
      salary_range: "$50/hr",
      priority: 4,
    });
    const form = captureDraftToExtensionForm(draft, 4);
    expect(form.locations).toBe("NYC\nRemote");
    expect(extensionFormToCaptureDraft(form).role_year).toBe(2027);
  });
});

describe("draftFromForm alias", () => {
  it("delegates to extensionFormToCaptureDraft", () => {
    expect(draftFromForm).toBe(extensionFormToCaptureDraft);
  });
});

describe("listFromMultiline", () => {
  it("strips empty lines", () => {
    expect(listFromMultiline("a\n\n b \n")).toEqual(["a", "b"]);
  });
});

describe("jobTypeLabel", () => {
  it("returns label for internship", () => {
    expect(jobTypeLabel("internship")).toBe("Internship");
  });
});
