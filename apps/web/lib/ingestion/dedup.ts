import {
  hashCourse,
  hashEducation,
  hashExperience,
  hashProject,
  hashSkill,
} from "@hirevault/ai-core";
import type { ProfileSection } from "@hirevault/types";

export function computeSourceHash(
  section: ProfileSection,
  data: Record<string, unknown>
): string {
  switch (section) {
    case "experiences":
      return hashExperience({
        company: String(data.company ?? ""),
        title: String(data.title ?? ""),
        start_date: (data.start_date as string) ?? null,
      });
    case "education":
      return hashEducation({
        institution: String(data.institution ?? ""),
        degree: (data.degree as string) ?? null,
        start_date: (data.start_date as string) ?? null,
      });
    case "projects":
      return hashProject({ name: String(data.name ?? "") });
    case "skills":
      return hashSkill({ name: String(data.name ?? "") });
    case "courses":
      return hashCourse({
        name: String(data.name ?? ""),
        institution: (data.institution as string) ?? null,
      });
    default:
      return "";
  }
}

export interface ExistingRow {
  id: string;
  source_hash: string | null;
}

export type DedupOutcome =
  | { action: "insert"; data: Record<string, unknown> }
  | { action: "merge"; existingId: string; merged: Record<string, unknown> }
  | { action: "conflict"; existingId: string; incoming: Record<string, unknown> };

/** Union merge: combine arrays, prefer non-empty incoming for scalars when existing empty */
export function mergeRecords(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...existing };
  for (const [key, val] of Object.entries(incoming)) {
    const prev = merged[key];
    if (Array.isArray(val) && Array.isArray(prev)) {
      const set = new Set([...prev.map(String), ...val.map(String)]);
      merged[key] = [...set];
    } else if (
      (prev === null || prev === undefined || prev === "") &&
      val !== null &&
      val !== undefined &&
      val !== ""
    ) {
      merged[key] = val;
    } else if (typeof val === "string" && typeof prev === "string" && val.length > prev.length) {
      merged[key] = val;
    }
  }
  return merged;
}

export function resolveDedup(
  section: ProfileSection,
  incoming: Record<string, unknown>,
  existingRows: ExistingRow[],
  options?: { conflictOnBulletDiff?: boolean }
): DedupOutcome {
  const hash = computeSourceHash(section, incoming);
  const match = existingRows.find((r) => r.source_hash === hash);
  if (!match) {
    return { action: "insert", data: { ...incoming, source_hash: hash } };
  }

  const conflictOnBullets = options?.conflictOnBulletDiff ?? true;
  if (conflictOnBullets && section === "experiences") {
    return {
      action: "conflict",
      existingId: match.id,
      incoming,
    };
  }

  return {
    action: "merge",
    existingId: match.id,
    merged: incoming,
  };
}
