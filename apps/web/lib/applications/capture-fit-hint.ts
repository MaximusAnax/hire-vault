import type { JobType, RoleSeason } from "@hirevault/types";
import { ROLE_SEASON_LABELS } from "./role-timing";

export interface CaptureFitHintInput {
  target_roles: string[];
  title?: string | null;
  job_type?: JobType | string | null;
  role_season?: RoleSeason | string | null;
  role_year?: number | null;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function targetRolesText(targetRoles: string[]): string {
  return normalizeText(targetRoles.filter(Boolean).join(" "));
}

function titleMatchesTargets(title: string, targetRoles: string[]): boolean {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) return false;
  return targetRoles.some((role) => {
    const needle = normalizeText(role);
    if (!needle) return false;
    return normalizedTitle.includes(needle) || needle.includes(normalizedTitle);
  });
}

function targetsMentionInternship(targetRoles: string[]): boolean {
  const blob = targetRolesText(targetRoles);
  return /\bintern(ship)?\b/.test(blob);
}

function targetsMentionFullTime(targetRoles: string[]): boolean {
  const blob = targetRolesText(targetRoles);
  return /\bfull[- ]?time\b|\bnew[- ]?grad\b|\bentry[- ]?level\b/.test(blob);
}

function cohortLabel(season: RoleSeason | string | null | undefined, year: number | null | undefined): string | null {
  if (!season || year == null) return null;
  const label = ROLE_SEASON_LABELS[season as RoleSeason];
  if (!label) return null;
  const shortYear = year % 100;
  return `${label} '${String(shortYear).padStart(2, "0")}`;
}

function targetsMentionCohort(
  targetRoles: string[],
  season: RoleSeason | string | null | undefined,
  year: number | null | undefined
): boolean {
  const cohort = cohortLabel(season, year);
  if (!cohort) return false;
  const blob = targetRolesText(targetRoles);
  const seasonWord = season ? normalizeText(String(season)) : "";
  const yearStr = year != null ? String(year) : "";
  const shortYear = year != null ? String(year % 100).padStart(2, "0") : "";
  return (
    blob.includes(normalizeText(cohort)) ||
    Boolean(
      seasonWord &&
        blob.includes(seasonWord) &&
        (blob.includes(yearStr) || blob.includes(shortYear))
    )
  );
}

/**
 * Single-line profile-fit hint for capture preview surfaces. Display-only — never blocks save.
 */
export function deriveCaptureFitHint(input: CaptureFitHintInput): string | null {
  const targetRoles = input.target_roles.map((r) => r.trim()).filter(Boolean);
  if (targetRoles.length === 0) return null;

  const title = (input.title ?? "").trim();
  const jobType = input.job_type ?? null;
  const cohort = cohortLabel(input.role_season, input.role_year ?? null);

  if (title && titleMatchesTargets(title, targetRoles)) {
    if (cohort && targetsMentionCohort(targetRoles, input.role_season, input.role_year ?? null)) {
      return `Matches your targets (${cohort})`;
    }
    return "Matches your target roles";
  }

  if (jobType === "internship" && targetsMentionFullTime(targetRoles) && !targetsMentionInternship(targetRoles)) {
    return "Internship role — your targets lean full-time";
  }

  if (jobType === "full_time" && targetsMentionInternship(targetRoles) && !targetsMentionFullTime(targetRoles)) {
    return "Full-time role — your targets lean internship";
  }

  if (cohort && targetsMentionCohort(targetRoles, input.role_season, input.role_year ?? null)) {
    return `Cohort ${cohort} aligns with your targets`;
  }

  if (title) {
    return "Outside your stated target roles — still worth a look";
  }

  return null;
}
