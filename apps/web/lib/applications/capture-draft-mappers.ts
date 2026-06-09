import type { ApplicationWithJob, CaptureDraft, JobType, RoleSeason } from "@hirevault/types";
import type { ParseAndPreviewJobResult } from "./preview";
import { resolveRoleTiming } from "./role-timing";

/** Controlled form state for {@link CaptureDraftFieldsEditor} — string sentinels for empty selects. */
export interface CaptureDraftFields {
  title: string;
  company: string;
  url: string;
  job_type: JobType | "";
  role_season: RoleSeason | "";
  role_year: string;
  /** Application pipeline status (web save only — not on CaptureDraft). */
  status: string;
  priority: number | null;
  locations: string[];
  tech_stack: string[];
  required_qualifications: string[];
  preferred_qualifications: string[];
  salary_range: string;
  description_raw: string;
}

export interface CaptureDraftFieldsOptions {
  status?: string;
}

export interface CaptureDraftMeta {
  scrape_source?: string;
  confidence?: CaptureDraft["confidence"];
  degraded?: boolean;
  warning?: string;
}

function jobLocations(job: ApplicationWithJob["job"]): string[] {
  if ((job?.locations?.length ?? 0) > 0) return job!.locations;
  if (job?.location) return [job.location];
  return [];
}

/** CaptureDraft → form fields (applies resolveRoleTiming for display). */
export function captureDraftToFields(
  draft: CaptureDraft,
  options: CaptureDraftFieldsOptions = {}
): CaptureDraftFields {
  const timing = resolveRoleTiming({
    title: draft.title,
    role_season: draft.role_season,
    role_year: draft.role_year,
  });

  return {
    title: timing.title,
    company: draft.company,
    url: draft.url ?? "",
    job_type: draft.job_type ?? "",
    role_season: timing.role_season ?? "",
    role_year: timing.role_year != null ? String(timing.role_year) : "",
    status: options.status ?? "saved",
    priority: draft.priority,
    locations: [...draft.locations],
    tech_stack: [...draft.tech_stack],
    required_qualifications: [...draft.required_qualifications],
    preferred_qualifications: [...draft.preferred_qualifications],
    salary_range: draft.salary_range ?? "",
    description_raw: draft.description_raw,
  };
}

/** Form fields → CaptureDraft (applies resolveRoleTiming + trim defaults). */
export function fieldsToCaptureDraft(
  fields: CaptureDraftFields,
  meta?: CaptureDraftMeta
): CaptureDraft {
  const timing = resolveRoleTiming({
    title: fields.title,
    role_season: fields.role_season || null,
    role_year: fields.role_year || null,
  });

  return {
    title: timing.title.trim() || "Untitled role",
    company: fields.company.trim() || "Unknown company",
    url: fields.url.trim() || undefined,
    description_raw: fields.description_raw,
    job_type: fields.job_type || null,
    role_season: timing.role_season,
    role_year: timing.role_year,
    locations: fields.locations,
    tech_stack: fields.tech_stack,
    required_qualifications: fields.required_qualifications,
    preferred_qualifications: fields.preferred_qualifications,
    salary_range: fields.salary_range.trim() || null,
    priority: fields.priority,
    scrape_source: meta?.scrape_source ?? undefined,
    confidence: meta?.confidence,
    degraded: meta?.degraded,
    warning: meta?.warning,
  };
}

/** Smart-capture preview → form fields. */
export function parsePreviewToFields(preview: ParseAndPreviewJobResult): CaptureDraftFields {
  const draft: CaptureDraft = {
    title: preview.parsed.title ?? "",
    company: preview.parsed.company ?? "",
    url: preview.url,
    description_raw: preview.description_raw,
    job_type: preview.parsed.job_type ?? null,
    role_season: preview.parsed.role_season ?? null,
    role_year: preview.parsed.role_year ?? null,
    locations: preview.locations,
    tech_stack: preview.parsed.tech_stack ?? [],
    required_qualifications: preview.parsed.required_qualifications ?? [],
    preferred_qualifications: preview.parsed.preferred_qualifications ?? [],
    salary_range: preview.parsed.salary_range ?? null,
    priority: null,
    scrape_source: preview.scrapeSource,
    degraded: preview.degraded,
    warning: preview.warning,
  };
  return captureDraftToFields(draft, { status: "saved" });
}

/** Saved application row → form fields for review/edit surfaces. */
export function applicationToFields(app: ApplicationWithJob): CaptureDraftFields {
  const job = app.job;
  const draft: CaptureDraft = {
    title: job?.title ?? "",
    company: job?.company ?? "",
    url: job?.url ?? undefined,
    description_raw: job?.description_raw ?? "",
    job_type: job?.job_type ?? null,
    role_season: job?.role_season ?? null,
    role_year: job?.role_year ?? null,
    locations: jobLocations(job),
    tech_stack: job?.tech_stack ?? [],
    required_qualifications: job?.required_qualifications ?? [],
    preferred_qualifications: job?.preferred_qualifications ?? [],
    salary_range: job?.salary_range ?? null,
    priority: app.priority,
  };
  return captureDraftToFields(draft, { status: app.status });
}

/** Form fields → FormData for {@link createJobAndApplicationFromPreview}. */
export function fieldsToCreateJobFormData(fields: CaptureDraftFields): FormData {
  const fd = new FormData();
  fd.set("title", fields.title || "Untitled role");
  fd.set("company", fields.company || "Unknown company");
  for (const loc of fields.locations) fd.append("locations", loc);
  if (fields.url) fd.set("url", fields.url);
  if (fields.job_type) fd.set("job_type", fields.job_type);
  if (fields.role_season) fd.set("role_season", fields.role_season);
  if (fields.role_year) fd.set("role_year", fields.role_year);
  fd.set("status", fields.status);
  if (fields.priority != null) fd.set("priority", String(fields.priority));
  fd.set("description_raw", fields.description_raw);
  if (fields.salary_range.trim()) fd.set("salary_range", fields.salary_range.trim());
  for (const t of fields.tech_stack) fd.append("tech_stack", t);
  for (const q of fields.required_qualifications) fd.append("required_qualifications", q);
  for (const q of fields.preferred_qualifications) fd.append("preferred_qualifications", q);
  return fd;
}
