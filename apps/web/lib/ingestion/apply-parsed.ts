import type { ParsedResume, LinkedInImport } from "@hirevault/ai-core";
import type {
  MergeStrategy,
  ProfileSection,
  ProfileSource,
  SectionUpsertPlan,
} from "@hirevault/types";
import { planSectionUpsert, type MergeExistingRow } from "./merge-core";
import { sanitizeReviewedPlans } from "./plan-review";

export type ApplyStats = {
  inserted: number;
  merged: number;
  skipped: number;
  conflicts: { section: ProfileSection; existingId: string; incoming: Record<string, unknown> }[];
};

export interface ApplyParsedOptions {
  mergeStrategy?: MergeStrategy;
}

const PROFILE_HEADER_FIELDS = [
  "headline",
  "full_name",
  "email",
  "location",
  "linkedin_url",
  "github_url",
  "portfolio_url",
  "phone",
] as const;

const IMPORT_SOURCES = new Set<ProfileSource>(["resume_upload", "linkedin"]);

function isEmptyValue(value: unknown): boolean {
  return value == null || value === "";
}

/** Only overwrite empty fields or fields on import-sourced profiles; never clobber manual edits. */
export function buildProfileHeaderUpdate(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  source: ProfileSource
): Record<string, unknown> {
  const importSourcedProfile = IMPORT_SOURCES.has(existing.source as ProfileSource);
  const update: Record<string, unknown> = {
    raw_resume_data: incoming.raw_resume_data,
    source,
  };

  for (const field of PROFILE_HEADER_FIELDS) {
    const existingVal = existing[field];
    const incomingVal = incoming[field];
    if (isEmptyValue(incomingVal)) continue;

    if (isEmptyValue(existingVal) || importSourcedProfile) {
      update[field] = incomingVal;
    }
  }

  return update;
}

async function executeSectionPlans(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profileId: string,
  section: ProfileSection,
  plans: ReturnType<typeof planSectionUpsert>,
  source: ProfileSource
): Promise<ApplyStats> {
  const stats: ApplyStats = { inserted: 0, merged: 0, skipped: 0, conflicts: [] };
  const table = section;

  for (const plan of plans) {
    if (plan.action === "insert") {
      const { source_hash: sourceHash, ...row } = plan.incoming;
      const { error } = await supabase.from(table).insert({
        profile_id: profileId,
        ...row,
        source,
        source_hash: sourceHash,
      });
      if (!error) stats.inserted++;
      else stats.skipped++;
      continue;
    }

    if (plan.action === "update" && plan.existingId && plan.merged) {
      const { error } = await supabase
        .from(table)
        .update({ ...plan.merged, source })
        .eq("id", plan.existingId);
      if (!error) stats.merged++;
      else stats.skipped++;
      continue;
    }

    if (plan.action === "conflict" && plan.existingId) {
      stats.conflicts.push({
        section,
        existingId: plan.existingId,
        incoming: plan.incoming,
      });
      stats.skipped++;
      continue;
    }

    if (plan.action === "skip") {
      stats.skipped++;
    }
  }

  return stats;
}

function isParsedResume(parsed: ParsedResume | LinkedInImport): parsed is ParsedResume {
  return "leadership" in parsed || "full_name" in parsed || "courses" in parsed;
}

async function applyProfileHeader(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profileId: string,
  parsed: ParsedResume | LinkedInImport,
  source: ProfileSource
): Promise<boolean> {
  const resume = isParsedResume(parsed) ? parsed : null;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  const incomingHeader: Record<string, unknown> = {
    headline: parsed.headline ?? resume?.full_name ?? null,
    full_name: resume?.full_name ?? parsed.headline ?? null,
    email: resume?.email ?? null,
    location: parsed.location ?? null,
    linkedin_url: parsed.linkedin_url ?? null,
    github_url: resume?.github_url ?? null,
    portfolio_url: resume?.portfolio_url ?? null,
    phone: resume?.phone ?? null,
    raw_resume_data: parsed as unknown as Record<string, unknown>,
  };

  const profileFields = buildProfileHeaderUpdate(
    (existingProfile ?? { source: "manual" }) as Record<string, unknown>,
    incomingHeader,
    source
  );

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileFields)
    .eq("id", profileId);

  return !profileError;
}

export async function applyReviewedPlans(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profileId: string,
  parsed: ParsedResume | LinkedInImport,
  source: ProfileSource,
  reviewedPlans: SectionUpsertPlan[]
): Promise<ApplyStats & { profileUpdated: boolean }> {
  const totals: ApplyStats & { profileUpdated: boolean } = {
    inserted: 0,
    merged: 0,
    skipped: 0,
    conflicts: [],
    profileUpdated: false,
  };

  totals.profileUpdated = await applyProfileHeader(supabase, profileId, parsed, source);

  const plans = sanitizeReviewedPlans(reviewedPlans);
  const bySection = new Map<ProfileSection, SectionUpsertPlan[]>();

  for (const plan of plans) {
    const sectionPlans = bySection.get(plan.section) ?? [];
    sectionPlans.push(plan);
    bySection.set(plan.section, sectionPlans);
  }

  for (const [section, sectionPlans] of bySection) {
    const result = await executeSectionPlans(supabase, profileId, section, sectionPlans, source);
    totals.inserted += result.inserted;
    totals.merged += result.merged;
    totals.skipped += result.skipped;
    totals.conflicts.push(...result.conflicts);
  }

  return totals;
}

export async function applyParsedProfile(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profileId: string,
  parsed: ParsedResume | LinkedInImport,
  source: ProfileSource,
  options?: ApplyParsedOptions
): Promise<ApplyStats & { profileUpdated: boolean }> {
  const strategy = options?.mergeStrategy ?? "newest_wins";
  const totals: ApplyStats & { profileUpdated: boolean } = {
    inserted: 0,
    merged: 0,
    skipped: 0,
    conflicts: [],
    profileUpdated: false,
  };

  const resume = isParsedResume(parsed) ? parsed : null;

  totals.profileUpdated = await applyProfileHeader(supabase, profileId, parsed, source);

  const [exp, edu, proj, skills, courses, leadership] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", profileId),
    supabase.from("education").select("*").eq("profile_id", profileId),
    supabase.from("projects").select("*").eq("profile_id", profileId),
    supabase.from("skills").select("*").eq("profile_id", profileId),
    supabase.from("courses").select("*").eq("profile_id", profileId),
    supabase.from("leadership").select("*").eq("profile_id", profileId),
  ]);

  const sections: { section: ProfileSection; items: Record<string, unknown>[] | undefined }[] = [
    { section: "experiences", items: parsed.experiences as Record<string, unknown>[] | undefined },
    { section: "education", items: parsed.education as Record<string, unknown>[] | undefined },
    { section: "leadership", items: resume?.leadership as Record<string, unknown>[] | undefined },
    { section: "projects", items: parsed.projects as Record<string, unknown>[] | undefined },
    { section: "skills", items: parsed.skills as Record<string, unknown>[] | undefined },
    {
      section: "courses",
      items: resume?.courses as Record<string, unknown>[] | undefined,
    },
  ];

  const existingMap: Record<ProfileSection, MergeExistingRow[]> = {
    experiences: (exp.data ?? []) as MergeExistingRow[],
    education: (edu.data ?? []) as MergeExistingRow[],
    projects: (proj.data ?? []) as MergeExistingRow[],
    skills: (skills.data ?? []) as MergeExistingRow[],
    courses: (courses.data ?? []) as MergeExistingRow[],
    leadership: (leadership.data ?? []) as MergeExistingRow[],
  };

  for (const { section, items } of sections) {
    if (!items?.length) continue;
    const plans = planSectionUpsert(section, items, existingMap[section], strategy);
    const result = await executeSectionPlans(supabase, profileId, section, plans, source);
    totals.inserted += result.inserted;
    totals.merged += result.merged;
    totals.skipped += result.skipped;
    totals.conflicts.push(...result.conflicts);
  }

  return totals;
}

/** Skip insert when a pending conflict already exists for the same profile row. */
export async function queueDedupConflicts(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profileId: string,
  conflicts: ApplyStats["conflicts"],
  source: ProfileSource
): Promise<number> {
  let queued = 0;

  for (const conflict of conflicts) {
    const { data: pending } = await supabase
      .from("dedup_conflicts")
      .select("id")
      .eq("profile_id", profileId)
      .eq("existing_id", conflict.existingId)
      .eq("resolution", "pending")
      .maybeSingle();

    if (pending) continue;

    const { error } = await supabase.from("dedup_conflicts").insert({
      profile_id: profileId,
      section: conflict.section,
      existing_id: conflict.existingId,
      incoming_data: conflict.incoming,
      source,
    });
    if (!error) queued++;
  }

  return queued;
}
