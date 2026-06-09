import type { ParsedJobDescription } from "@hirevault/ai-core";
import { buildCapturePreview, type CaptureDraft } from "./capture-preview";
import { fetchJobFromUrl, isLikelyUrl } from "./scrape";

export interface ParseAndPreviewJobResult {
  description_raw: string;
  source: "url" | "text";
  url?: string;
  scrapeSource?: "greenhouse" | "lever" | "ashby" | "workday" | "generic";
  parsed: ParsedJobDescription;
  locations: string[];
  degraded?: boolean;
  warning?: string;
  /** Profile-fit hint from deriveCaptureFitHint (display-only). */
  fit_hint?: string;
}

export interface ParseAndPreviewJobBlocked {
  blocked: true;
  url: string;
  fallbackHint: string;
  status?: number;
}

export interface ParseAndPreviewJobError {
  error: string;
}

function toPreviewParsed(
  draft: CaptureDraft,
  parsed: ParsedJobDescription | null
): ParsedJobDescription {
  return {
    ...parsed,
    title: draft.title,
    company: draft.company,
    job_type: draft.job_type,
    role_season: draft.role_season,
    role_year: draft.role_year,
    locations: draft.locations,
    tech_stack: draft.tech_stack,
    required_qualifications: draft.required_qualifications,
    preferred_qualifications: draft.preferred_qualifications,
    salary_range: draft.salary_range,
  };
}

export async function runParseAndPreviewJob(
  input: string
): Promise<ParseAndPreviewJobResult | ParseAndPreviewJobBlocked | ParseAndPreviewJobError> {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { error: "Paste a job URL or job description first." };

  let descriptionText = "";
  let source: "url" | "text" = "text";
  let url: string | undefined;
  let scrapeSource: ParseAndPreviewJobResult["scrapeSource"];
  let scrapedTitle: string | undefined;
  let scrapedCompany: string | undefined;
  let scrapedLocation: string | undefined;

  if (isLikelyUrl(trimmed)) {
    source = "url";
    url = trimmed;
    const scraped = await fetchJobFromUrl(trimmed);
    if ("blocked" in scraped && scraped.blocked) {
      return {
        blocked: true,
        url: scraped.url,
        fallbackHint: scraped.fallbackHint,
        status: scraped.status,
      };
    }
    descriptionText = scraped.text;
    scrapeSource = scraped.source;
    scrapedTitle = scraped.title ?? undefined;
    scrapedCompany = scraped.company ?? undefined;
    scrapedLocation = scraped.location ?? undefined;
  } else {
    descriptionText = trimmed;
  }

  const preview = await buildCapturePreview({
    description: descriptionText,
    url,
    scrapedTitle,
    scrapedCompany,
    scrapedLocation,
    scrapeSource,
  });

  if ("error" in preview) {
    return { error: preview.error };
  }

  const { draft, parsed } = preview;

  return {
    description_raw: draft.description_raw,
    source,
    url,
    scrapeSource,
    parsed: toPreviewParsed(draft, parsed),
    locations: draft.locations,
    degraded: draft.degraded,
    warning: draft.warning,
  };
}
