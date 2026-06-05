import { parseJobDescription, type ParsedJobDescription } from "@hirevault/ai-core";
import { fetchJobFromUrl, isLikelyUrl } from "./scrape";
import { normalizeLocations } from "./locations";

export interface ParseAndPreviewJobResult {
  description_raw: string;
  source: "url" | "text";
  url?: string;
  scrapeSource?: "greenhouse" | "lever" | "ashby" | "workday" | "generic";
  parsed: ParsedJobDescription;
  locations: string[];
  degraded?: boolean;
  warning?: string;
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

export async function runParseAndPreviewJob(
  input: string
): Promise<ParseAndPreviewJobResult | ParseAndPreviewJobBlocked | ParseAndPreviewJobError> {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { error: "Paste a job URL or job description first." };

  let descriptionText = "";
  let source: "url" | "text" = "text";
  let url: string | undefined;
  let scrapeSource: ParseAndPreviewJobResult["scrapeSource"];
  let scrapedTitle: string | null = null;
  let scrapedCompany: string | null = null;
  let scrapedLocation: string | null = null;

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
    scrapedTitle = scraped.title;
    scrapedCompany = scraped.company;
    scrapedLocation = scraped.location;
  } else {
    descriptionText = trimmed;
  }

  if (descriptionText.length < 60) {
    return { error: "That looks too short to parse — paste the full JD or a longer link." };
  }

  const ai = await parseJobDescription(descriptionText);
  const parsed: ParsedJobDescription = ai.data ?? {};

  if (!parsed.title && scrapedTitle) parsed.title = scrapedTitle;
  if (!parsed.company && scrapedCompany) parsed.company = scrapedCompany;
  if (!parsed.location && scrapedLocation) parsed.location = scrapedLocation;

  const aiLocations = normalizeLocations(parsed.locations);
  const scrapedLocations = normalizeLocations(scrapedLocation);
  const legacyLocations = normalizeLocations(parsed.location);
  const locations = aiLocations.length
    ? aiLocations
    : scrapedLocations.length
      ? scrapedLocations
      : legacyLocations;

  return {
    description_raw: descriptionText,
    source,
    url,
    scrapeSource,
    parsed,
    locations,
    degraded: ai.degraded,
    warning: ai.error,
  };
}
