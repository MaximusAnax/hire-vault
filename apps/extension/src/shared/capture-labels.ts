import type { CaptureDraft, JobType, RoleSeason } from "./types";

export const ROLE_SEASON_LABELS: Record<RoleSeason, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-time",
  internship: "Internship",
  contract: "Contract",
};

export const COHORT_YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028, 2029, 2030] as const;

export function formatTermBadge(
  season: RoleSeason | null | undefined,
  year: number | null | undefined
): string | null {
  if (!season && year == null) return null;
  const seasonLabel = season ? ROLE_SEASON_LABELS[season] : "";
  const yearLabel = year != null ? `'${String(year).slice(-2)}` : "";
  return [seasonLabel, yearLabel].filter(Boolean).join(" ");
}

export function jobTypeLabel(jobType: JobType | null | undefined): string {
  if (!jobType) return "—";
  return JOB_TYPE_LABELS[jobType] ?? jobType;
}

export function locationsSummary(locations: string[]): string {
  if (!locations.length) return "—";
  if (locations.length <= 2) return locations.join(" · ");
  return `${locations.slice(0, 2).join(" · ")} +${locations.length - 2}`;
}

export function listFromMultiline(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function multilineFromList(values: string[]): string {
  return values.join("\n");
}

export function clampPriority(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
}

/** Fields edited inline in the extension popup (web handles the rest). */
export interface PopupMinorFields {
  title: string;
  company: string;
  job_type: string;
  role_season: string;
  role_year: string;
  priority: number;
}

/** Apply popup minor edits onto a preview draft without wiping AI-parsed arrays. */
export function mergePopupMinorEdits(base: CaptureDraft, minor: PopupMinorFields): CaptureDraft {
  const roleYear = minor.role_year.trim();
  return {
    ...base,
    title: minor.title.trim() || base.title,
    company: minor.company.trim() || base.company,
    job_type: (minor.job_type as JobType) || base.job_type,
    role_season: (minor.role_season as RoleSeason) || base.role_season,
    role_year: roleYear ? Number(roleYear) : base.role_year,
    priority: clampPriority(minor.priority),
  };
}

/** Side panel DOM form values (multiline lists). Mirrors web CaptureDraftFields shape. */
export interface ExtensionCaptureFormValues {
  title: string;
  company: string;
  url: string;
  description_raw: string;
  job_type: string;
  role_season: string;
  role_year: string;
  locations: string;
  tech_stack: string;
  required_qualifications: string;
  preferred_qualifications: string;
  salary_range: string;
  priority: number;
  scrape_source?: string;
  confidence?: CaptureDraft["confidence"];
}

/** CaptureDraft → extension form values (multiline lists). */
export function captureDraftToExtensionForm(
  draft: CaptureDraft,
  priority = draft.priority ?? 3
): ExtensionCaptureFormValues {
  return {
    title: draft.title,
    company: draft.company,
    url: draft.url ?? "",
    description_raw: draft.description_raw,
    job_type: draft.job_type ?? "",
    role_season: draft.role_season ?? "",
    role_year: draft.role_year != null ? String(draft.role_year) : "",
    locations: multilineFromList(draft.locations),
    tech_stack: multilineFromList(draft.tech_stack),
    required_qualifications: multilineFromList(draft.required_qualifications),
    preferred_qualifications: multilineFromList(draft.preferred_qualifications),
    salary_range: draft.salary_range ?? "",
    priority: clampPriority(priority),
    scrape_source: draft.scrape_source,
    confidence: draft.confidence,
  };
}

/** Side panel form values → CaptureDraft. */
export function extensionFormToCaptureDraft(fields: ExtensionCaptureFormValues): CaptureDraft {
  const roleYear = fields.role_year.trim();
  return {
    title: fields.title.trim() || "Untitled role",
    company: fields.company.trim() || "Unknown company",
    url: fields.url.trim() || undefined,
    description_raw: fields.description_raw,
    job_type: (fields.job_type as JobType) || null,
    role_season: (fields.role_season as RoleSeason) || null,
    role_year: roleYear ? Number(roleYear) : null,
    locations: listFromMultiline(fields.locations),
    tech_stack: listFromMultiline(fields.tech_stack),
    required_qualifications: listFromMultiline(fields.required_qualifications),
    preferred_qualifications: listFromMultiline(fields.preferred_qualifications),
    salary_range: fields.salary_range.trim() || null,
    priority: clampPriority(fields.priority),
    scrape_source: fields.scrape_source,
    confidence: fields.confidence,
  };
}

/** @deprecated Use extensionFormToCaptureDraft */
export const draftFromForm = extensionFormToCaptureDraft;
