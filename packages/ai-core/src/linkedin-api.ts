import { linkedInImportSchema, type LinkedInImport } from "./schemas";

/** Raw payload assembled from one or more LinkedIn API responses. */
export interface LinkedInApiPayload {
  userinfo?: Record<string, unknown>;
  identityMe?: Record<string, unknown>;
}

type MultiLocaleString =
  | string
  | { localized?: Record<string, string>; preferredLocale?: { language?: string; country?: string } };

function pickLocalized(value: MultiLocaleString | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  const localized = value.localized;
  if (!localized || typeof localized !== "object") return null;
  const entries = Object.values(localized).filter((v): v is string => typeof v === "string");
  return entries[0]?.trim() || null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const yearMonth = raw.match(/^(\d{4})-(\d{2})$/);
  if (yearMonth) return `${yearMonth[1]}-${yearMonth[2]}-01`;
  const yearOnly = raw.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01-01`;
  return null;
}

function memberProfileUrl(payload: LinkedInApiPayload): string | null {
  const identityUrl = payload.identityMe?.profileUrl;
  if (typeof identityUrl === "string" && identityUrl.trim()) return identityUrl.trim();

  const vanity = payload.identityMe?.vanityName;
  if (typeof vanity === "string" && vanity.trim()) {
    return `https://www.linkedin.com/in/${vanity.trim()}`;
  }

  const sub = payload.userinfo?.sub;
  if (typeof sub === "string" && sub.trim()) {
    return `https://www.linkedin.com/in/${sub.trim()}`;
  }

  return null;
}

function mapCurrentExperience(payload: LinkedInApiPayload): LinkedInImport["experiences"] {
  const position =
    payload.identityMe?.primaryCurrentPosition ??
    payload.identityMe?.mostRecentPosition ??
    payload.identityMe?.currentPosition;

  if (!position || typeof position !== "object") return undefined;

  const pos = position as Record<string, unknown>;
  const company =
    pickLocalized(pos.companyName as MultiLocaleString) ??
    pickLocalized(pos.organizationName as MultiLocaleString);
  const title = pickLocalized(pos.title as MultiLocaleString);

  if (!company || !title) return undefined;

  const startDate =
    normalizeDate(pos.startDate) ??
    normalizeDate(
      typeof pos.start === "object" && pos.start
        ? `${(pos.start as { year?: number }).year ?? ""}-${String((pos.start as { month?: number }).month ?? 1).padStart(2, "0")}-01`
        : null
    );

  return [
    {
      company,
      title,
      location: pickLocalized(pos.locationName as MultiLocaleString) ?? undefined,
      start_date: startDate ?? undefined,
      is_current: pos.endDate == null && pos.end == null,
      bullet_points: [],
    },
  ];
}

function mapEducation(payload: LinkedInApiPayload): LinkedInImport["education"] {
  const edu =
    payload.identityMe?.mostRecentEducation ?? payload.identityMe?.primaryEducation;

  if (!edu || typeof edu !== "object") return undefined;

  const row = edu as Record<string, unknown>;
  const institution = pickLocalized(row.schoolName as MultiLocaleString);
  if (!institution) return undefined;

  return [
    {
      institution,
      degree: pickLocalized(row.degreeName as MultiLocaleString) ?? undefined,
      field_of_study: pickLocalized(row.fieldOfStudy as MultiLocaleString) ?? undefined,
      start_date: normalizeDate(row.startDate) ?? undefined,
      expected_graduation: normalizeDate(row.endDate) ?? undefined,
    },
  ];
}

/**
 * Map LinkedIn API responses to the shared LinkedInImport schema.
 * Handles partial payloads when Plus-tier scopes are unavailable.
 */
export function mapLinkedInApiToImport(payload: LinkedInApiPayload): LinkedInImport {
  const headline =
    pickLocalized(payload.identityMe?.headline as MultiLocaleString) ??
    (typeof payload.identityMe?.headline === "string"
      ? payload.identityMe.headline
      : null);

  const summary =
    pickLocalized(payload.identityMe?.summary as MultiLocaleString) ??
    (typeof payload.identityMe?.summary === "string" ? payload.identityMe.summary : null);

  const location =
    pickLocalized(payload.identityMe?.location as MultiLocaleString) ??
    (typeof payload.userinfo?.locale === "string" ? payload.userinfo.locale : null);

  const mapped: LinkedInImport = {
    headline: headline ?? undefined,
    summary: summary ?? undefined,
    location: location ?? undefined,
    linkedin_url: memberProfileUrl(payload) ?? undefined,
    experiences: mapCurrentExperience(payload),
    education: mapEducation(payload),
    projects: undefined,
    skills: undefined,
  };

  const parsed = linkedInImportSchema.safeParse(mapped);
  if (!parsed.success) {
    return {
      linkedin_url: mapped.linkedin_url,
    };
  }
  return parsed.data;
}

/** True when at least one importable field is present. */
export function linkedInImportHasContent(data: LinkedInImport): boolean {
  return Boolean(
    data.headline?.trim() ||
      data.summary?.trim() ||
      data.location?.trim() ||
      data.linkedin_url?.trim() ||
      (data.experiences?.length ?? 0) > 0 ||
      (data.education?.length ?? 0) > 0 ||
      (data.projects?.length ?? 0) > 0 ||
      (data.skills?.length ?? 0) > 0
  );
}
