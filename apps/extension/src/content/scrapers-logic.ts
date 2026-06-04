import type { ScrapedJob } from "../shared/types";

export const PAGE_DUMP_MIN_DESCRIPTION = 200;

const WEAK_COMPANIES = new Set(
  ["unknown", "unknown company", "company", "untitled"].map((s) => s.toLowerCase())
);

export function stripDocumentTitle(raw: string): string {
  const t = raw.trim();
  const parts = t.split(/\s*[|\-–—]\s*/);
  return (parts[0] ?? t).trim();
}

export function needsPageDumpFallback(job: ScrapedJob | null): boolean {
  if (!job) return true;
  return job.description.length < PAGE_DUMP_MIN_DESCRIPTION && job.confidence === "low";
}

export function isWeakCompany(company: string): boolean {
  const c = company.trim().toLowerCase();
  return !c || WEAK_COMPANIES.has(c);
}

/** Merge structured scrape with full-page text; prefer longer description. */
export function mergeWithPageDump(structured: ScrapedJob, dump: ScrapedJob): ScrapedJob {
  const useDumpDesc = dump.description.length > structured.description.length;
  const merged: ScrapedJob = {
    title: structured.title?.trim() || dump.title,
    company: isWeakCompany(structured.company) ? dump.company : structured.company,
    location: structured.location || dump.location,
    url: structured.url || dump.url,
    description: useDumpDesc ? dump.description : structured.description,
    source: useDumpDesc || needsPageDumpFallback(structured) ? "page_dump" : structured.source,
    confidence: useDumpDesc || needsPageDumpFallback(structured) ? "low" : structured.confidence,
  };
  return merged;
}

export function applyPageDumpFallback(
  structured: ScrapedJob | null,
  dump: ScrapedJob
): ScrapedJob | null {
  if (!needsPageDumpFallback(structured)) return structured;
  if (!structured) {
    return dump.title.trim().length >= 3 ? dump : null;
  }
  return mergeWithPageDump(structured, dump);
}

export function scrapeModeLabel(job: ScrapedJob): string {
  if (job.source === "manual_paste") return "Manual paste";
  if (job.source === "page_dump") return "Page content (full text)";
  return "Structured scrape";
}
