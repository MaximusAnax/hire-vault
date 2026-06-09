import type {
  PreviewSectionCounts,
  PreviewSummary,
  ProfileSection,
  SectionUpsertPlan,
} from "@hirevault/types";
import { computeSourceHash } from "./dedup";
import { normalizeDateForHash } from "./date-normalize";

const BULLET_SECTIONS = new Set<ProfileSection>(["experiences", "leadership", "projects"]);

function normalizeRowDates(row: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...row };
  for (const field of [
    "start_date",
    "end_date",
    "expected_graduation",
    "completion_date",
  ] as const) {
    if (field in normalized) {
      normalized[field] = normalizeDateForHash(normalized[field] as string | null);
    }
  }
  return normalized;
}

function prepareRow(section: ProfileSection, row: Record<string, unknown>): Record<string, unknown> {
  if (section === "skills") {
    return { ...row, category: row.category ?? "tool" };
  }
  if (section === "experiences" || section === "leadership") {
    return {
      ...row,
      bullet_points: row.bullet_points ?? [],
      is_current: row.is_current ?? false,
    };
  }
  if (section === "education") {
    return { ...row, relevant_courses: row.relevant_courses ?? [] };
  }
  if (section === "projects") {
    return { ...row, bullet_points: row.bullet_points ?? [] };
  }
  return row;
}

export function getEditableRow(plan: SectionUpsertPlan): Record<string, unknown> {
  if (plan.action === "update") {
    return { ...(plan.merged ?? plan.incoming) };
  }
  return { ...plan.incoming };
}

export function setEditableRow(
  plan: SectionUpsertPlan,
  row: Record<string, unknown>
): SectionUpsertPlan {
  if (plan.action === "update") {
    return { ...plan, merged: row, incoming: row };
  }
  return { ...plan, incoming: row };
}

export function refreshPlanHashes(plan: SectionUpsertPlan): SectionUpsertPlan {
  if (plan.action === "skip" || plan.action === "conflict") {
    return plan;
  }

  const row = plan.action === "update" ? (plan.merged ?? plan.incoming) : plan.incoming;
  const prepared = prepareRow(plan.section, normalizeRowDates(row));
  const hash = computeSourceHash(plan.section, prepared);

  if (plan.action === "insert") {
    return { ...plan, incoming: { ...prepared, source_hash: hash } };
  }

  return { ...plan, merged: prepared, incoming: prepared };
}

export function sanitizeReviewedPlans(plans: SectionUpsertPlan[]): SectionUpsertPlan[] {
  return plans
    .filter((plan) => plan.action !== "skip")
    .map((plan) => refreshPlanHashes(plan));
}

export function computePreviewTotals(plans: SectionUpsertPlan[]): PreviewSectionCounts {
  const totals: PreviewSectionCounts = { insert: 0, update: 0, skip: 0, conflict: 0 };
  for (const plan of plans) {
    totals[plan.action]++;
  }
  return totals;
}

export function withUpdatedTotals(preview: PreviewSummary, plans: SectionUpsertPlan[]): PreviewSummary {
  const totals = computePreviewTotals(plans);
  const bySection: PreviewSummary["bySection"] = {};

  for (const plan of plans) {
    const sectionCounts = bySection[plan.section] ?? {
      insert: 0,
      update: 0,
      skip: 0,
      conflict: 0,
    };
    sectionCounts[plan.action]++;
    bySection[plan.section] = sectionCounts;
  }

  return { ...preview, plans, totals, bySection };
}

export function bulletsToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map(String).join("\n");
}

export function textToBullets(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function isPlanEditable(plan: SectionUpsertPlan): boolean {
  return plan.action === "insert" || plan.action === "update" || plan.action === "conflict";
}

export function formatPlanRow(section: ProfileSection, row: Record<string, unknown> | undefined): string {
  if (!row) return "—";

  if (section === "experiences") {
    return [
      `${row.title ?? "—"} at ${row.company ?? "—"}`,
      ...((row.bullet_points as string[] | undefined) ?? []).slice(0, 3).map((b) => `• ${b}`),
    ].join("\n");
  }

  if (section === "leadership") {
    return [
      `${row.title ?? "—"} · ${row.organization ?? "—"}`,
      ...((row.bullet_points as string[] | undefined) ?? []).slice(0, 3).map((b) => `• ${b}`),
    ].join("\n");
  }

  if (section === "skills") {
    return String(row.name ?? "—");
  }

  if (section === "education") {
    const degreeLine = [row.degree, row.field_of_study]
      .filter((part) => typeof part === "string" && part.trim())
      .join(" in ");
    return `${degreeLine || "—"} · ${row.institution ?? "—"}`;
  }

  if (section === "projects") {
    return [row.name ?? "—", row.description ? String(row.description) : null]
      .filter(Boolean)
      .join("\n");
  }

  if (section === "courses") {
    const institution = row.institution ? ` · ${row.institution}` : "";
    return `${row.name ?? "—"}${institution}`;
  }

  return JSON.stringify(row, null, 2);
}

export { BULLET_SECTIONS };
