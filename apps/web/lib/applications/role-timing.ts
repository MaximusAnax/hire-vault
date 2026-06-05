import type { RoleSeason } from "@hirevault/types";

export const ROLE_SEASONS: readonly RoleSeason[] = [
  "spring",
  "summer",
  "fall",
  "winter",
] as const;

export const ROLE_SEASON_LABELS: Record<RoleSeason, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

/** Sort internships / cohorts chronologically within a year. */
export const COHORT_YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028, 2029, 2030] as const;

export const ROLE_SEASON_ORDER: Record<RoleSeason, number> = {
  winter: 0,
  spring: 1,
  summer: 2,
  fall: 3,
};

const SEASON_WORD = "(spring|summer|fall|winter|autumn)";
const YEAR_FRAGMENT = "(\\d{2,4})";

export function normalizeRoleSeason(raw: string | null | undefined): RoleSeason | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === "autumn") return "fall";
  if (ROLE_SEASONS.includes(s as RoleSeason)) return s as RoleSeason;
  return null;
}

export function expandRoleYear(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return null;
  if (n >= 2000 && n <= 2100) return n;
  if (n >= 0 && n <= 99) return n >= 50 ? 1900 + n : 2000 + n;
  return null;
}

export function formatRoleTimingLabel(
  season: RoleSeason | null | undefined,
  year: number | null | undefined
): string | null {
  if (!season || !year) return null;
  const yy = String(year).slice(-2);
  return `${ROLE_SEASON_LABELS[season]} '${yy}`;
}

export interface ParsedRoleTiming {
  role_season: RoleSeason | null;
  role_year: number | null;
}

/** Parse "Fall 2026", "(Summer '27)", etc. from free text. */
export function parseRoleTimingFromText(text: string): ParsedRoleTiming | null {
  const t = text.trim();
  if (!t) return null;

  const paren = new RegExp(
    `\\(\\s*${SEASON_WORD}\\s+${YEAR_FRAGMENT}\\s*\\)`,
    "i"
  ).exec(t);
  if (paren) {
    return {
      role_season: normalizeRoleSeason(paren[1]),
      role_year: expandRoleYear(paren[2]),
    };
  }

  const inline = new RegExp(
    `\\b${SEASON_WORD}\\s*['']?\\s*${YEAR_FRAGMENT}\\b`,
    "i"
  ).exec(t);
  if (inline) {
    return {
      role_season: normalizeRoleSeason(inline[1]),
      role_year: expandRoleYear(inline[2]),
    };
  }

  return null;
}

/** Infer timing from title; optionally strip trailing "(Fall 2026)" for a cleaner title. */
export function extractRoleTimingFromTitle(title: string): {
  title: string;
  role_season: RoleSeason | null;
  role_year: number | null;
} {
  const trimmed = title.trim();
  const trailingParen = new RegExp(
    `\\s*\\(\\s*${SEASON_WORD}\\s+${YEAR_FRAGMENT}\\s*\\)\\s*$`,
    "i"
  );
  const m = trailingParen.exec(trimmed);
  if (m) {
    return {
      title: trimmed.replace(trailingParen, "").trim() || trimmed,
      role_season: normalizeRoleSeason(m[1]),
      role_year: expandRoleYear(m[2]),
    };
  }
  const parsed = parseRoleTimingFromText(trimmed);
  if (parsed?.role_season && parsed.role_year) {
    return { title: trimmed, ...parsed };
  }
  return { title: trimmed, role_season: null, role_year: null };
}

export function resolveRoleTiming(input: {
  title: string;
  role_season?: RoleSeason | string | null;
  role_year?: number | string | null;
}): {
  title: string;
  role_season: RoleSeason | null;
  role_year: number | null;
} {
  const fromTitle = extractRoleTimingFromTitle(input.title);
  const explicitSeason = normalizeRoleSeason(
    typeof input.role_season === "string" ? input.role_season : input.role_season ?? null
  );
  const explicitYear = expandRoleYear(input.role_year ?? null);

  return {
    title: fromTitle.title,
    role_season: explicitSeason ?? fromTitle.role_season,
    role_year: explicitYear ?? fromTitle.role_year,
  };
}

export function roleTimingSortKey(
  season: RoleSeason | null | undefined,
  year: number | null | undefined
): number {
  if (!season || !year) return Number.MAX_SAFE_INTEGER;
  return year * 10 + ROLE_SEASON_ORDER[season];
}
