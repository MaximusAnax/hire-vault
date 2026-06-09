import type { ParsedResume, LinkedInImport } from "@hirevault/ai-core";
import type {
  MergeStrategy,
  PreviewSectionCounts,
  PreviewSummary,
  ProfileSection,
  ProfileSource,
  SectionUpsertAction,
  SectionUpsertPlan,
} from "@hirevault/types";
import { buildProfileHeaderUpdate } from "./apply-parsed";
import { planSectionUpsert, type MergeExistingRow } from "./merge-core";

export interface PreviewParsedOptions {
  mergeStrategy?: MergeStrategy;
}

function emptyCounts(): PreviewSectionCounts {
  return { insert: 0, update: 0, skip: 0, conflict: 0 };
}

function bumpCount(counts: PreviewSectionCounts, action: SectionUpsertAction): void {
  if (action === "insert") counts.insert += 1;
  else if (action === "update") counts.update += 1;
  else if (action === "skip") counts.skip += 1;
  else counts.conflict += 1;
}

function isParsedResume(parsed: ParsedResume | LinkedInImport): parsed is ParsedResume {
  return "leadership" in parsed || "full_name" in parsed || "courses" in parsed;
}

/** Dry-run import merge — same planSectionUpsert path as applyParsedProfile, no DB writes. */
export async function previewParsedProfile(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profileId: string,
  parsed: ParsedResume | LinkedInImport,
  source: ProfileSource,
  options?: PreviewParsedOptions
): Promise<PreviewSummary> {
  const strategy = options?.mergeStrategy ?? "newest_wins";
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

  const profileHeaderUpdate = buildProfileHeaderUpdate(
    (existingProfile ?? { source: "manual" }) as Record<string, unknown>,
    incomingHeader,
    source
  );

  const headerChangedFields = Object.keys(profileHeaderUpdate).filter(
    (key) => key !== "raw_resume_data" && key !== "source"
  );

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

  const bySection: PreviewSummary["bySection"] = {};
  const totals = emptyCounts();
  const plans: SectionUpsertPlan[] = [];

  for (const { section, items } of sections) {
    if (!items?.length) continue;
    const sectionPlans = planSectionUpsert(section, items, existingMap[section], strategy);
    const sectionCounts = emptyCounts();
    for (const plan of sectionPlans) {
      bumpCount(sectionCounts, plan.action);
      bumpCount(totals, plan.action);
      plans.push(plan);
    }
    bySection[section] = sectionCounts;
  }

  return {
    bySection,
    totals,
    plans,
    profileHeader:
      headerChangedFields.length > 0
        ? { changedFields: headerChangedFields, update: profileHeaderUpdate }
        : undefined,
  };
}
