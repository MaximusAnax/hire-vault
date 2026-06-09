import type { ParsedJobDescription } from "@hirevault/ai-core";
import type { JobType } from "@hirevault/types";
import { normalizeJobTitleCompany } from "@/lib/applications/job-field-normalize";
import { normalizeLocations } from "@/lib/applications/locations";
import { resolveRoleTiming } from "@/lib/applications/role-timing";

const WEAK_COMPANIES = new Set(
  ["unknown company", "unknown", "company", "untitled"].map((s) => s.toLowerCase())
);

export interface ExtensionJobInput {
  title?: string;
  company?: string;
  location?: string;
  locations?: string[];
  url?: string;
  description?: string;
  confidence?: "high" | "medium" | "low";
}

const DOM_TITLE_CHROME_PATTERNS = [
  /job application for/i,
  /^apply for\b/i,
  /^careers at\b/i,
  /\|\s*linkedin$/i,
];

function isDomTitleChrome(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  return DOM_TITLE_CHROME_PATTERNS.some((re) => re.test(t));
}

function preferMoreSpecificTitle(a: string, b: string): string {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al.includes(bl) && a.length > b.length) return a;
  if (bl.includes(al) && b.length > a.length) return b;
  return a.length >= b.length ? a : b;
}

function pickMergedTitle(
  clientTitle: string,
  parsedTitle: string,
  confidence?: ExtensionJobInput["confidence"]
): string {
  const client = clientTitle.trim();
  const parsed = parsedTitle.trim();
  const domIsChrome = isDomTitleChrome(client);
  const lowConfidence = confidence === "low";

  if ((domIsChrome || lowConfidence) && parsed.length >= 3) {
    return parsed;
  }

  if (client.length < 3) {
    return parsed.length >= 3 ? parsed : client || "Untitled role";
  }

  if (parsed.length < 3) {
    return client;
  }

  return preferMoreSpecificTitle(client, parsed);
}

export function mergeExtensionCaptureFields(
  job: ExtensionJobInput,
  parsed: ParsedJobDescription | null
) {
  const clientTitle = (job.title ?? "").trim();
  const clientCompany = (job.company ?? "").trim();
  const parsedTitle = (parsed?.title ?? "").trim();
  const parsedCompany = (parsed?.company ?? "").trim();

  let title = pickMergedTitle(clientTitle, parsedTitle, job.confidence);

  let company =
    clientCompany && !WEAK_COMPANIES.has(clientCompany.toLowerCase())
      ? clientCompany
      : parsedCompany && !WEAK_COMPANIES.has(parsedCompany.toLowerCase())
        ? parsedCompany
        : clientCompany || "Unknown company";

  const normalized = normalizeJobTitleCompany(title, company, parsed);
  title = normalized.title;
  company =
    normalized.company && !WEAK_COMPANIES.has(normalized.company.toLowerCase())
      ? normalized.company
      : company;

  const timing = resolveRoleTiming({
    title,
    role_season: parsed?.role_season,
    role_year: parsed?.role_year,
  });
  title = timing.title;

  let job_type: JobType | null = parsed?.job_type ?? null;
  if (!job_type && /\bintern(ship)?\b/i.test(title)) {
    job_type = "internship";
  }

  const clientLocs = normalizeLocations(job.locations);
  const singleLoc = (job.location ?? "").trim();
  const aiLocs = normalizeLocations(parsed?.locations);
  const parsedSingle = (parsed?.location ?? "").toString().trim();
  const locations = clientLocs.length
    ? clientLocs
    : singleLoc
      ? normalizeLocations([singleLoc])
      : aiLocs.length
        ? aiLocs
        : parsedSingle
          ? [parsedSingle]
          : [];

  return {
    title,
    company,
    locations,
    primaryLocation: locations[0] ?? null,
    tech_stack: parsed?.tech_stack ?? [],
    required_qualifications: parsed?.required_qualifications ?? [],
    preferred_qualifications: parsed?.preferred_qualifications ?? [],
    salary_range: parsed?.salary_range ?? null,
    job_type,
    role_season: timing.role_season,
    role_year: timing.role_year,
    parsed,
  };
}
