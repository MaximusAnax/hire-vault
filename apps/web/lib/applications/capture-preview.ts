import { parseJobDescription, type ParsedJobDescription } from "@hirevault/ai-core";
import type { CaptureDraft, CaptureScrapeConfidence } from "@hirevault/types";
export type { CaptureDraft, CaptureDraftSaveOptions } from "@hirevault/types";
import {
  mergeExtensionCaptureFields,
  type ExtensionJobInput,
} from "@/lib/extension/merge-capture-fields";

/** Minimum JD length before calling AI parse — matches extension capture route. */
export const AI_PARSE_MIN_CHARS = 60;

export interface BuildCapturePreviewInput {
  description: string;
  url?: string;
  scrapedTitle?: string;
  scrapedCompany?: string;
  scrapedLocation?: string;
  scrapedLocations?: string[];
  scrapeSource?: string;
  confidence?: CaptureScrapeConfidence;
}

export interface CapturePreviewResult {
  draft: CaptureDraft;
  parsed: ParsedJobDescription | null;
}

export interface CapturePreviewError {
  error: string;
}

function enrichParsedFromScrape(
  parsed: ParsedJobDescription | null,
  input: BuildCapturePreviewInput
): ParsedJobDescription | null {
  if (!parsed) return null;
  if (!parsed.title && input.scrapedTitle) parsed.title = input.scrapedTitle;
  if (!parsed.company && input.scrapedCompany) parsed.company = input.scrapedCompany;
  if (!parsed.location && input.scrapedLocation) parsed.location = input.scrapedLocation;
  return parsed;
}

function mergedToCaptureDraft(
  merged: ReturnType<typeof mergeExtensionCaptureFields>,
  input: BuildCapturePreviewInput,
  meta?: { degraded?: boolean; warning?: string }
): CaptureDraft {
  return {
    title: merged.title,
    company: merged.company,
    url: input.url,
    description_raw: input.description,
    job_type: merged.job_type,
    role_season: merged.role_season,
    role_year: merged.role_year,
    locations: merged.locations,
    tech_stack: merged.tech_stack,
    required_qualifications: merged.required_qualifications,
    preferred_qualifications: merged.preferred_qualifications,
    salary_range: merged.salary_range,
    priority: null,
    scrape_source: input.scrapeSource,
    confidence: input.confidence,
    degraded: meta?.degraded,
    warning: meta?.warning,
  };
}

/** Shared parse + merge pipeline for web preview, extension preview API, and extension save. */
export async function buildCapturePreview(
  input: BuildCapturePreviewInput
): Promise<CapturePreviewResult | CapturePreviewError> {
  const description = (input.description ?? "").trim();
  if (description.length < AI_PARSE_MIN_CHARS) {
    return {
      error: "That looks too short to parse — paste the full JD or a longer link.",
    };
  }

  const ai = await parseJobDescription(description);
  const parsed = enrichParsedFromScrape(ai.data ?? null, input);

  const jobInput: ExtensionJobInput = {
    title: input.scrapedTitle,
    company: input.scrapedCompany,
    location: input.scrapedLocation,
    locations: input.scrapedLocations,
    url: input.url,
    description,
    confidence: input.confidence,
  };

  const merged = mergeExtensionCaptureFields(jobInput, parsed);
  const draft = mergedToCaptureDraft(merged, { ...input, description }, {
    degraded: ai.degraded,
    warning: ai.error,
  });

  return { draft, parsed };
}
