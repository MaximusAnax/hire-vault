import type { ParsedResume, LinkedInImport } from "@hirevault/ai-core";
import type { ProfileSource, ProfileSection } from "@hirevault/types";
import { computeSourceHash, mergeRecords, type ExistingRow } from "./dedup";

type ApplyStats = {
  inserted: number;
  merged: number;
  skipped: number;
  conflicts: { section: ProfileSection; existingId: string; incoming: Record<string, unknown> }[];
};

async function upsertSection(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profileId: string,
  section: ProfileSection,
  items: Record<string, unknown>[],
  source: ProfileSource,
  existing: ExistingRow[]
): Promise<ApplyStats> {
  const stats: ApplyStats = { inserted: 0, merged: 0, skipped: 0, conflicts: [] };
  const table = section;

  for (const item of items) {
    const hash = computeSourceHash(section, item);
    const match = existing.find((r) => r.source_hash === hash);

    if (!match) {
      const { error } = await supabase.from(table).insert({
        profile_id: profileId,
        ...item,
        source,
        source_hash: hash,
      });
      if (!error) stats.inserted++;
      else stats.skipped++;
      continue;
    }

    const { data: row } = await supabase.from(table).select("*").eq("id", match.id).single();
    if (!row) {
      stats.skipped++;
      continue;
    }

    const merged = mergeRecords(row as Record<string, unknown>, item);
    const hasSubstantiveDiff =
      section === "experiences" &&
      JSON.stringify((row as { bullet_points?: string[] }).bullet_points ?? []) !==
        JSON.stringify((item.bullet_points as string[]) ?? []);

    if (hasSubstantiveDiff) {
      stats.conflicts.push({ section, existingId: match.id, incoming: item });
      stats.skipped++;
      continue;
    }

    const { error } = await supabase
      .from(table)
      .update({ ...merged, source })
      .eq("id", match.id);
    if (!error) stats.merged++;
    else stats.skipped++;
  }

  return stats;
}

export async function applyParsedProfile(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profileId: string,
  parsed: ParsedResume | LinkedInImport,
  source: ProfileSource
): Promise<ApplyStats & { profileUpdated: boolean }> {
  const totals: ApplyStats & { profileUpdated: boolean } = {
    inserted: 0,
    merged: 0,
    skipped: 0,
    conflicts: [],
    profileUpdated: false,
  };

  const profileFields = {
    headline: parsed.headline ?? null,
    summary: parsed.summary ?? null,
    location: parsed.location ?? null,
    linkedin_url: "linkedin_url" in parsed ? parsed.linkedin_url ?? null : null,
    github_url: "github_url" in parsed ? (parsed as ParsedResume).github_url ?? null : null,
    portfolio_url:
      "portfolio_url" in parsed ? (parsed as ParsedResume).portfolio_url ?? null : null,
    phone: "phone" in parsed ? (parsed as ParsedResume).phone ?? null : null,
    source,
    raw_resume_data: parsed as unknown as Record<string, unknown>,
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileFields)
    .eq("id", profileId);
  totals.profileUpdated = !profileError;

  const [exp, edu, proj, skills, courses] = await Promise.all([
    supabase.from("experiences").select("id, source_hash").eq("profile_id", profileId),
    supabase.from("education").select("id, source_hash").eq("profile_id", profileId),
    supabase.from("projects").select("id, source_hash").eq("profile_id", profileId),
    supabase.from("skills").select("id, source_hash").eq("profile_id", profileId),
    supabase.from("courses").select("id, source_hash").eq("profile_id", profileId),
  ]);

  const sections: { section: ProfileSection; items: Record<string, unknown>[] | undefined }[] = [
    { section: "experiences", items: parsed.experiences as Record<string, unknown>[] | undefined },
    { section: "education", items: parsed.education as Record<string, unknown>[] | undefined },
    { section: "projects", items: parsed.projects as Record<string, unknown>[] | undefined },
    { section: "skills", items: parsed.skills as Record<string, unknown>[] | undefined },
    {
      section: "courses",
      items: ("courses" in parsed ? parsed.courses : undefined) as
        | Record<string, unknown>[]
        | undefined,
    },
  ];

  const existingMap: Record<ProfileSection, ExistingRow[]> = {
    experiences: (exp.data ?? []) as ExistingRow[],
    education: (edu.data ?? []) as ExistingRow[],
    projects: (proj.data ?? []) as ExistingRow[],
    skills: (skills.data ?? []) as ExistingRow[],
    courses: (courses.data ?? []) as ExistingRow[],
  };

  for (const { section, items } of sections) {
    if (!items?.length) continue;
    const result = await upsertSection(
      supabase,
      profileId,
      section,
      items,
      source,
      existingMap[section]
    );
    totals.inserted += result.inserted;
    totals.merged += result.merged;
    totals.skipped += result.skipped;
    totals.conflicts.push(...result.conflicts);
  }

  return totals;
}
