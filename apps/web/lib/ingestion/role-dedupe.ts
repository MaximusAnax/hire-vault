import type { ParsedExperience, ParsedLeadership } from "@hirevault/ai-core";
import { normalizeDateForHash } from "./date-normalize";

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Strip trailing "City, ST" glued or spaced onto organization/company text. */
export function detachLocationFromOrg(
  org: string,
  existingLocation?: string | null
): { org: string; location: string | null } {
  const trimmed = org.trim();
  if (!trimmed) return { org: trimmed, location: existingLocation ?? null };

  const stateSuffix = trimmed.match(/^(.*),\s*([A-Z]{2})$/);
  if (stateSuffix) {
    const beforeState = stateSuffix[1].trim();
    const state = stateSuffix[2];

    const spacedCity = beforeState.match(/^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/);
    if (spacedCity) {
      return {
        org: spacedCity[1].trim(),
        location: existingLocation ?? `${spacedCity[2]}, ${state}`,
      };
    }

    const gluedCity = beforeState.match(/^(.+?)([A-Z][a-z]{3,})$/);
    if (gluedCity) {
      return {
        org: gluedCity[1].trim(),
        location: existingLocation ?? `${gluedCity[2]}, ${state}`,
      };
    }
  }

  return { org: trimmed, location: existingLocation ?? null };
}

function normalizeOrgKey(org: string, location?: string | null): string {
  const { org: stripped } = detachLocationFromOrg(org, location);
  return norm(stripped)
    .replace(/\s*[-–—]\s*/g, " - ")
    .replace(/[^\w\s.-]/g, "");
}

function titlesLikelySame(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return na === nb;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const wordsA = na.split(/\s+/).filter((w) => w.length > 2);
  const wordsB = nb.split(/\s+/).filter((w) => w.length > 2);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const shared = wordsA.filter((w) => wordsB.includes(w));
  if (shared.length >= Math.min(wordsA.length, wordsB.length)) return true;

  return wordsA[0] === wordsB[0];
}

function orgsLikelySame(
  a: { org: string; location?: string | null },
  b: { org: string; location?: string | null }
): boolean {
  const ka = normalizeOrgKey(a.org, a.location);
  const kb = normalizeOrgKey(b.org, b.location);
  if (ka === kb) return true;
  if (ka.includes(kb) || kb.includes(ka)) return true;
  return false;
}

function datesLikelySame(
  a: string | null | undefined,
  b: string | null | undefined,
  options?: { relaxMissing?: boolean }
): boolean {
  const da = normalizeDateForHash(a ?? null);
  const db = normalizeDateForHash(b ?? null);
  if (!da && !db) return true;
  if (options?.relaxMissing && (!da || !db)) return true;
  return da === db;
}

function scoreBullets(bullets: string[] | null | undefined): number {
  return (bullets ?? []).reduce((sum, b) => sum + b.trim().length, 0);
}

function pickLonger(a: string | null | undefined, b: string | null | undefined): string {
  const sa = (a ?? "").trim();
  const sb = (b ?? "").trim();
  if (!sa) return sb;
  if (!sb) return sa;
  return sa.length >= sb.length ? sa : sb;
}

/** Drop near-duplicate bullets; keep the longer when one is a prefix of another. */
export function dedupeBulletTexts(bullets: string[]): string[] {
  const trimmed = bullets.map((b) => b.trim()).filter(Boolean);
  const out: string[] = [];

  for (const bullet of trimmed) {
    const lower = bullet.toLowerCase();
    const existingIdx = out.findIndex((prev) => {
      const pl = prev.toLowerCase();
      return pl === lower || pl.startsWith(lower) || lower.startsWith(pl);
    });
    if (existingIdx === -1) {
      out.push(bullet);
      continue;
    }
    if (bullet.length > out[existingIdx].length) {
      out[existingIdx] = bullet;
    }
  }

  return out;
}

function mergeExperiencePair(a: ParsedExperience, b: ParsedExperience): ParsedExperience {
  const bulletsFirst = scoreBullets(a.bullet_points) >= scoreBullets(b.bullet_points);
  const primary = bulletsFirst ? a : b;
  const secondary = bulletsFirst ? b : a;

  const companyA = detachLocationFromOrg(a.company, a.location);
  const companyB = detachLocationFromOrg(b.company, b.location);

  const company = pickLonger(companyA.org, companyB.org);
  const location =
    pickLonger(companyA.location, companyB.location) ||
    companyA.location ||
    companyB.location ||
    null;

  const title = pickLonger(a.title, b.title);
  const primaryScore = scoreBullets(primary.bullet_points);
  const secondaryScore = scoreBullets(secondary.bullet_points);
  const bullet_points =
    primaryScore >= secondaryScore
      ? dedupeBulletTexts(primary.bullet_points ?? [])
      : dedupeBulletTexts([
          ...(primary.bullet_points ?? []),
          ...(secondary.bullet_points ?? []),
        ]);

  return {
    ...primary,
    ...secondary,
    company,
    title,
    location,
    start_date: primary.start_date ?? secondary.start_date ?? null,
    end_date: primary.end_date ?? secondary.end_date ?? null,
    is_current: primary.is_current || secondary.is_current,
    bullet_points,
    technologies: [
      ...new Set([...(primary.technologies ?? []), ...(secondary.technologies ?? [])]),
    ],
  };
}

function mergeLeadershipPair(a: ParsedLeadership, b: ParsedLeadership): ParsedLeadership {
  const bulletsFirst = scoreBullets(a.bullet_points) >= scoreBullets(b.bullet_points);
  const primary = bulletsFirst ? a : b;
  const secondary = bulletsFirst ? b : a;

  const orgA = detachLocationFromOrg(a.organization, a.location);
  const orgB = detachLocationFromOrg(b.organization, b.location);

  return {
    ...primary,
    ...secondary,
    organization: pickLonger(orgA.org, orgB.org),
    title: pickLonger(a.title, b.title),
    location: orgA.location ?? orgB.location ?? null,
    start_date: primary.start_date ?? secondary.start_date ?? null,
    end_date: primary.end_date ?? secondary.end_date ?? null,
    is_current: primary.is_current || secondary.is_current,
    bullet_points: dedupeBulletTexts([
      ...(a.bullet_points ?? []),
      ...(b.bullet_points ?? []),
    ]),
  };
}

function experiencesAreDuplicates(a: ParsedExperience, b: ParsedExperience): boolean {
  if (
    !orgsLikelySame({ org: a.company, location: a.location }, { org: b.company, location: b.location })
  ) {
    return false;
  }
  if (!titlesLikelySame(a.title, b.title)) return false;
  return datesLikelySame(a.start_date, b.start_date, { relaxMissing: true });
}

function leadershipAreDuplicates(a: ParsedLeadership, b: ParsedLeadership): boolean {
  if (
    !orgsLikelySame(
      { org: a.organization, location: a.location },
      { org: b.organization, location: b.location }
    )
  ) {
    return false;
  }
  if (!titlesLikelySame(a.title, b.title)) return false;
  return datesLikelySame(a.start_date, b.start_date, { relaxMissing: true });
}

function coalesceRoles<T>(
  items: T[],
  isDuplicate: (a: T, b: T) => boolean,
  merge: (a: T, b: T) => T
): T[] {
  const out: T[] = [];
  for (const item of items) {
    const idx = out.findIndex((existing) => isDuplicate(existing, item));
    if (idx === -1) {
      out.push(item);
    } else {
      out[idx] = merge(out[idx], item);
    }
  }
  return out;
}

/** Merge near-duplicate experience rows from AI + deterministic (or double AI) parses. */
export function coalesceExperiences(
  experiences: ParsedExperience[] | undefined
): ParsedExperience[] | undefined {
  if (!experiences?.length) return experiences;
  return coalesceRoles(experiences, experiencesAreDuplicates, mergeExperiencePair);
}

/** Merge near-duplicate leadership rows. */
export function coalesceLeadership(
  leadership: ParsedLeadership[] | undefined
): ParsedLeadership[] | undefined {
  if (!leadership?.length) return leadership;
  return coalesceRoles(leadership, leadershipAreDuplicates, mergeLeadershipPair);
}
