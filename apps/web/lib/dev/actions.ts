"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

/** Wipes all app data for the signed-in user (keeps auth account). Dev only. */
export async function clearAllUserData() {
  if (!devResetAllowed()) {
    return { error: "Clear user data is disabled in production." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileId = profile?.id;

  const { data: resumeFiles } = await supabase.storage.from("resumes").list(user.id, {
    limit: 500,
  });

  const storagePaths =
    resumeFiles?.map((f) => `${user.id}/${f.name}`).filter((p) => !p.endsWith("/")) ?? [];

  const { error: applicationsError } = await supabase
    .from("applications")
    .delete()
    .eq("user_id", user.id);
  if (applicationsError) return { error: applicationsError.message };

  const { error: jobsError } = await supabase.from("jobs").delete().eq("user_id", user.id);
  if (jobsError) return { error: jobsError.message };

  const { error: mockError } = await supabase.from("mock_sessions").delete().eq("user_id", user.id);
  if (mockError) return { error: mockError.message };

  const { error: tokensError } = await supabase
    .from("extension_tokens")
    .delete()
    .eq("user_id", user.id);
  if (tokensError) return { error: tokensError.message };

  const { error: researchError } = await supabase
    .from("company_research")
    .delete()
    .eq("user_id", user.id);
  if (researchError) return { error: researchError.message };

  const { error: resumesError } = await supabase
    .from("tailored_resumes")
    .delete()
    .eq("user_id", user.id);
  if (resumesError) return { error: resumesError.message };

  if (profileId) {
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
  }

  const { error: profileDeleteError } = await supabase
    .from("profiles")
    .delete()
    .eq("user_id", user.id);
  if (profileDeleteError) return { error: profileDeleteError.message };

  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: user.id,
    source: "manual",
  });

  if (profileError) {
    return { error: profileError.message };
  }

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from("resumes").remove(storagePaths);
    if (storageError) {
      return {
        error: `Database cleared but storage cleanup failed: ${storageError.message}`,
      };
    }
  }

  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }

  return {
    success: true,
    removedFiles: storagePaths.length,
  };
}

export async function isDevDataResetAvailable(): Promise<boolean> {
  return devResetAllowed();
}
