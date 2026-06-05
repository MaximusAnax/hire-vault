"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildResumeStoragePaths,
  formatPipelineClearSummary,
  formatProfileClearSummary,
  type DevDataSummary,
} from "./reset-helpers";

function devResetAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_DATA_RESET === "1"
  );
}

const REVALIDATE_PATHS = [
  "/overview",
  "/profile",
  "/profile/import",
  "/applications",
  "/resumes",
  "/interviews",
  "/settings",
] as const;

type DevActionResult = {
  success?: boolean;
  error?: string;
  summary?: string;
  removedFiles?: number;
};

function revalidateDevPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

async function requireDevAuth() {
  if (!devResetAllowed()) {
    return { error: "Developer tools are disabled in production." } as const;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" } as const;
  return { supabase, user } as const;
}

async function getProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return profile?.id ?? null;
}

async function countForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) return 0;
  return count ?? 0;
}

async function countForProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  profileId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId);
  if (error) return 0;
  return count ?? 0;
}

async function listResumeStorageFileCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const { data: resumeFiles } = await supabase.storage.from("resumes").list(userId, {
    limit: 500,
  });
  return resumeFiles?.filter((f) => f.name && !f.name.endsWith("/")).length ?? 0;
}

async function removeUserResumeStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ removedFiles: number; error?: string }> {
  const { data: resumeFiles } = await supabase.storage.from("resumes").list(userId, {
    limit: 500,
  });
  const storagePaths = buildResumeStoragePaths(
    userId,
    resumeFiles?.map((f) => f.name) ?? []
  );
  if (storagePaths.length === 0) return { removedFiles: 0 };
  const { error: storageError } = await supabase.storage.from("resumes").remove(storagePaths);
  if (storageError) {
    return { removedFiles: 0, error: storageError.message };
  }
  return { removedFiles: storagePaths.length };
}

export async function isDevDataResetAvailable(): Promise<boolean> {
  return devResetAllowed();
}

export async function getDevDataSummary(): Promise<DevDataSummary | null> {
  if (!devResetAllowed()) return null;

  const auth = await requireDevAuth();
  if ("error" in auth) return null;
  const { supabase, user } = auth;

  const profileId = await getProfileId(supabase, user.id);

  const [
    experiences,
    education,
    leadership,
    skills,
    courses,
    projects,
    jobs,
    applications,
    tailored_resumes,
    company_research,
    interview_questions,
    extension_tokens,
    resume_storage_files,
  ] = await Promise.all([
    profileId ? countForProfile(supabase, "experiences", profileId) : 0,
    profileId ? countForProfile(supabase, "education", profileId) : 0,
    profileId ? countForProfile(supabase, "leadership", profileId) : 0,
    profileId ? countForProfile(supabase, "skills", profileId) : 0,
    profileId ? countForProfile(supabase, "courses", profileId) : 0,
    profileId ? countForProfile(supabase, "projects", profileId) : 0,
    countForUser(supabase, "jobs", user.id),
    countForUser(supabase, "applications", user.id),
    countForUser(supabase, "tailored_resumes", user.id),
    countForUser(supabase, "company_research", user.id),
    countForUser(supabase, "interview_questions", user.id),
    countForUser(supabase, "extension_tokens", user.id),
    listResumeStorageFileCount(supabase, user.id),
  ]);

  let ingestion_runs = 0;
  let dedup_conflicts = 0;
  let dedup_conflicts_pending = 0;

  if (profileId) {
    ingestion_runs = await countForProfile(supabase, "ingestion_runs", profileId);
    dedup_conflicts = await countForProfile(supabase, "dedup_conflicts", profileId);
    const { count } = await supabase
      .from("dedup_conflicts")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("resolution", "pending");
    dedup_conflicts_pending = count ?? 0;
  }

  return {
    profile: { experiences, education, leadership, skills, courses, projects },
    pipeline: { jobs, applications, tailored_resumes, company_research },
    import: { ingestion_runs, dedup_conflicts, dedup_conflicts_pending },
    other: { interview_questions, extension_tokens, resume_storage_files },
  };
}

export async function clearPipelineData(): Promise<DevActionResult> {
  const auth = await requireDevAuth();
  if ("error" in auth) return { error: auth.error };
  const { supabase, user } = auth;

  const before = {
    applications: await countForUser(supabase, "applications", user.id),
    jobs: await countForUser(supabase, "jobs", user.id),
    tailored_resumes: await countForUser(supabase, "tailored_resumes", user.id),
    company_research: await countForUser(supabase, "company_research", user.id),
  };

  const { error: resumesError } = await supabase
    .from("tailored_resumes")
    .delete()
    .eq("user_id", user.id);
  if (resumesError) return { error: resumesError.message };

  const { error: applicationsError } = await supabase
    .from("applications")
    .delete()
    .eq("user_id", user.id);
  if (applicationsError) return { error: applicationsError.message };

  const { error: jobsError } = await supabase.from("jobs").delete().eq("user_id", user.id);
  if (jobsError) return { error: jobsError.message };

  const { error: researchError } = await supabase
    .from("company_research")
    .delete()
    .eq("user_id", user.id);
  if (researchError) return { error: researchError.message };

  revalidateDevPaths();
  return { success: true, summary: formatPipelineClearSummary(before) };
}

export async function clearProfileData(): Promise<DevActionResult> {
  const auth = await requireDevAuth();
  if ("error" in auth) return { error: auth.error };
  const { supabase, user } = auth;

  const profileId = await getProfileId(supabase, user.id);
  if (!profileId) {
    return { error: "Profile not found." };
  }

  const sectionCounts = await Promise.all([
    countForProfile(supabase, "experiences", profileId),
    countForProfile(supabase, "education", profileId),
    countForProfile(supabase, "leadership", profileId),
    countForProfile(supabase, "skills", profileId),
    countForProfile(supabase, "courses", profileId),
    countForProfile(supabase, "projects", profileId),
  ]);
  const sectionsTotal = sectionCounts.reduce((a, b) => a + b, 0);

  for (const table of [
    "experiences",
    "education",
    "leadership",
    "skills",
    "courses",
    "projects",
  ] as const) {
    const { error } = await supabase.from(table).delete().eq("profile_id", profileId);
    if (error) return { error: error.message };
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      full_name: null,
      email: null,
      headline: null,
      location: null,
      phone: null,
      linkedin_url: null,
      github_url: null,
      portfolio_url: null,
      target_roles: [],
      technical_skills_tex: null,
      raw_resume_data: null,
      source: "manual",
    })
    .eq("id", profileId);
  if (profileUpdateError) return { error: profileUpdateError.message };

  const storage = await removeUserResumeStorage(supabase, user.id);
  if (storage.error) {
    return { error: `Profile cleared but storage cleanup failed: ${storage.error}` };
  }

  revalidateDevPaths();
  return {
    success: true,
    summary: formatProfileClearSummary({
      sections: sectionsTotal,
      storageFiles: storage.removedFiles,
    }),
    removedFiles: storage.removedFiles,
  };
}

export async function clearImportHistory(): Promise<DevActionResult> {
  const auth = await requireDevAuth();
  if ("error" in auth) return { error: auth.error };
  const { supabase, user } = auth;

  const profileId = await getProfileId(supabase, user.id);
  if (!profileId) return { error: "Profile not found." };

  const runs = await countForProfile(supabase, "ingestion_runs", profileId);
  const conflicts = await countForProfile(supabase, "dedup_conflicts", profileId);

  const { error: runsError } = await supabase
    .from("ingestion_runs")
    .delete()
    .eq("profile_id", profileId);
  if (runsError) return { error: runsError.message };

  const { error: conflictsError } = await supabase
    .from("dedup_conflicts")
    .delete()
    .eq("profile_id", profileId);
  if (conflictsError) return { error: conflictsError.message };

  revalidateDevPaths();
  const parts: string[] = [];
  if (runs) parts.push(`${runs} import run(s)`);
  if (conflicts) parts.push(`${conflicts} merge conflict(s)`);
  return {
    success: true,
    summary: parts.length
      ? `Removed ${parts.join(" and ")}.`
      : "Import history was already empty.",
  };
}

export async function clearInterviewPrepData(): Promise<DevActionResult> {
  const auth = await requireDevAuth();
  if ("error" in auth) return { error: auth.error };
  const { supabase, user } = auth;

  const before = await countForUser(supabase, "interview_questions", user.id);

  const { error: questionsError } = await supabase
    .from("interview_questions")
    .delete()
    .eq("user_id", user.id);
  if (questionsError) return { error: questionsError.message };

  revalidateDevPaths();
  return {
    success: true,
    summary: before
      ? `Removed ${before} interview question(s).`
      : "Interview prep was already empty.",
  };
}

/** Wipes all app data for the signed-in user (keeps auth account). Dev only. */
export async function clearAllUserData(): Promise<DevActionResult> {
  const auth = await requireDevAuth();
  if ("error" in auth) return { error: auth.error };
  const { supabase, user } = auth;

  const pipeline = await clearPipelineData();
  if (pipeline.error) return pipeline;

  const interview = await clearInterviewPrepData();
  if (interview.error) return interview;

  const { error: tokensError } = await supabase
    .from("extension_tokens")
    .delete()
    .eq("user_id", user.id);
  if (tokensError) return { error: tokensError.message };

  const importHistory = await clearImportHistory();
  if (importHistory.error) return importHistory;

  // Profiles have no DELETE RLS policy — reset in place instead of delete+insert.
  const profile = await clearProfileData();
  if (profile.error) return profile;

  revalidateDevPaths();
  return {
    success: true,
    summary: "All user data cleared. Profile reset to empty defaults.",
    removedFiles: profile.removedFiles,
  };
}
