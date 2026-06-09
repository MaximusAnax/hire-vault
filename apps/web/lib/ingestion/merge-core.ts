import type {
  MergeStrategy,
  ProfileSection,
  ProfileSource,
  SectionUpsertAction,
  SectionUpsertPlan,
} from "@hirevault/types";
import { computeSourceHash, mergeRecords } from "./dedup";
import { normalizeDateForHash } from "./date-normalize";
import { coalesceExperiences, coalesceLeadership } from "./role-dedupe";
import type { ParsedExperience, ParsedLeadership } from "@hirevault/ai-core";

export { normalizeDateForHash };

export type { MergeStrategy, SectionUpsertAction, SectionUpsertPlan };

/** Existing profile row used for merge planning (preview + apply). */
export interface MergeExistingRow {
  id: string;
  source_hash: string | null;
  source: ProfileSource;
  [key: string]: unknown;
}

export interface PlanSectionUpsertOptions {
  /** When true (default), conservative merge conflicts on bullet diffs for experience/leadership. */
  conflictOnBulletDiff?: boolean;
}

const BULLET_SECTIONS = new Set<ProfileSection>(["experiences", "leadership"]);

const ROW_META_KEYS = new Set([
  "id",
  "profile_id",
  "source",
  "source_hash",
  "created_at",
  "updated_at",
]);

function normalizeItemDates(item: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...item };
  if ("start_date" in normalized) {
    normalized.start_date = normalizeDateForHash(normalized.start_date as string | null);
  }
  if ("end_date" in normalized) {
    normalized.end_date = normalizeDateForHash(normalized.end_date as string | null);
  }
  if ("expected_graduation" in normalized) {
    normalized.expected_graduation = normalizeDateForHash(
      normalized.expected_graduation as string | null
    );
  }
  if ("completion_date" in normalized) {
    normalized.completion_date = normalizeDateForHash(
      normalized.completion_date as string | null
    );
  }
  return normalized;
}

/** Conservative fills empty scalars and unions arrays; newest_wins replaces scalars and arrays. */
export function mergeRecordsWithStrategy(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  strategy: MergeStrategy
): Record<string, unknown> {
  if (strategy === "conservative") {
    return mergeRecords(existing, incoming);
  }

  const merged = { ...existing };
  for (const [key, val] of Object.entries(incoming)) {
    if (val === null || val === undefined) continue;
    if (Array.isArray(val)) {
      merged[key] = val;
    } else if (val !== "") {
      merged[key] = val;
    }
  }
  return merged;
}

function prepareRow(section: ProfileSection, item: Record<string, unknown>): Record<string, unknown> {
  if (section === "skills") {
    return { ...item, category: item.category ?? "tool" };
  }
  if (section === "experiences" || section === "leadership") {
    return {
      ...item,
      bullet_points: item.bullet_points ?? [],
      is_current: item.is_current ?? false,
    };
  }
  if (section === "education") {
    return { ...item, relevant_courses: item.relevant_courses ?? [] };
  }
  return item;
}

function bulletsDiffer(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): boolean {
  return (
    JSON.stringify(existing.bullet_points ?? []) !== JSON.stringify(incoming.bullet_points ?? [])
  );
}

function mergeWouldChange(
  existing: Record<string, unknown>,
  merged: Record<string, unknown>
): boolean {
  for (const key of Object.keys(merged)) {
    if (ROW_META_KEYS.has(key)) continue;
    if (JSON.stringify(existing[key]) !== JSON.stringify(merged[key])) {
      return true;
    }
  }
  return false;
}

function coalesceIncomingSection(
  section: ProfileSection,
  items: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (section === "experiences") {
    return (coalesceExperiences(items as ParsedExperience[]) ?? []) as Record<string, unknown>[];
  }
  if (section === "leadership") {
    return (coalesceLeadership(items as ParsedLeadership[]) ?? []) as Record<string, unknown>[];
  }
  return items;
}

export function planSectionUpsert(
  section: ProfileSection,
  items: Record<string, unknown>[],
  existingRows: MergeExistingRow[],
  strategy: MergeStrategy,
  options?: PlanSectionUpsertOptions
): SectionUpsertPlan[] {
  const conflictOnBulletDiff = options?.conflictOnBulletDiff ?? true;
  const plans: SectionUpsertPlan[] = [];
  const coalesced = coalesceIncomingSection(section, items);

  for (const rawItem of coalesced) {
    const prepared = prepareRow(section, normalizeItemDates(rawItem));
    const hash = computeSourceHash(section, prepared);
    const match = existingRows.find((row) => row.source_hash === hash);

    if (!match) {
      plans.push({
        action: "insert",
        section,
        incoming: { ...prepared, source_hash: hash },
      });
      continue;
    }

    const existingSnapshot = { ...match };
    const planBase = {
      section,
      incoming: prepared,
      existingId: match.id,
      existing: existingSnapshot,
    };

    if (match.source === "manual") {
      plans.push({ ...planBase, action: "conflict" });
      continue;
    }

    const bulletDiff =
      BULLET_SECTIONS.has(section) && bulletsDiffer(existingSnapshot, prepared);

    if (strategy === "conservative" && conflictOnBulletDiff && bulletDiff) {
      plans.push({ ...planBase, action: "conflict" });
      continue;
    }

    const merged = mergeRecordsWithStrategy(existingSnapshot, prepared, strategy);
    if (!mergeWouldChange(existingSnapshot, merged)) {
      plans.push({ ...planBase, action: "skip" });
      continue;
    }

    plans.push({
      ...planBase,
      action: "update",
      merged,
    });
  }

  return plans;
}
