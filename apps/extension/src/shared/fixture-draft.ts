import type { CaptureDraft, ScrapedJob } from "./types";

/** Realistic intern posting — local dev fallback when preview API is unavailable. */
export const FIXTURE_CAPTURE_DRAFT: CaptureDraft = {
  title: "Software Engineering Intern",
  company: "Acme Corp",
  url: "https://boards.greenhouse.io/acme/jobs/123",
  description_raw:
    "Acme is hiring Software Engineering Interns for Fall 2026. You will build features in Python and TypeScript.",
  job_type: "internship",
  role_season: "fall",
  role_year: 2026,
  locations: ["San Francisco, CA", "Remote"],
  tech_stack: ["Python", "TypeScript", "React"],
  required_qualifications: ["Currently pursuing BS in Computer Science"],
  preferred_qualifications: ["Prior internship experience"],
  salary_range: "$45/hr – $55/hr",
  priority: 3,
  scrape_source: "greenhouse",
  confidence: "high",
};

export function buildFallbackDraft(scraped: ScrapedJob): CaptureDraft {
  const locations =
    scraped.locations?.length
      ? scraped.locations
      : scraped.location?.trim()
        ? [scraped.location.trim()]
        : FIXTURE_CAPTURE_DRAFT.locations;

  return {
    ...FIXTURE_CAPTURE_DRAFT,
    title: scraped.title?.trim() || FIXTURE_CAPTURE_DRAFT.title,
    company: scraped.company?.trim() || FIXTURE_CAPTURE_DRAFT.company,
    url: scraped.url?.trim() || FIXTURE_CAPTURE_DRAFT.url,
    description_raw: scraped.description?.trim() || FIXTURE_CAPTURE_DRAFT.description_raw,
    locations,
    scrape_source: scraped.source ?? FIXTURE_CAPTURE_DRAFT.scrape_source,
    confidence: scraped.confidence ?? FIXTURE_CAPTURE_DRAFT.confidence,
    degraded: true,
    warning: "Preview API unavailable — showing fixture-enriched draft. Edit before saving.",
  };
}
