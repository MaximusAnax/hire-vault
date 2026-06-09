"use server";

import { revalidatePath } from "next/cache";
import {
  parseResumeText,
  parseLinkedInJson,
  polishLinkedInImportBullets,
  validateProfileData,
  validateProfileLocally,
  mapLinkedInApiToImport,
  linkedInImportHasContent,
  type LinkedInImport,
} from "@hirevault/ai-core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isLinkedInOAuthConfigured } from "@/lib/linkedin/config";
import {
  fetchLinkedInMemberData,
  refreshLinkedInToken,
} from "@/lib/linkedin/client";
import { getLinkedInConnectionWithTokens } from "@/lib/linkedin/queries";
import {
  decryptLinkedInToken,
  encryptLinkedInToken,
} from "@/lib/linkedin/token-crypto";
import { createClient } from "@/lib/supabase/server";
import { requireProfileId, getProfileForUser } from "@/lib/profile/get-profile";
import { getTailoringReadiness } from "@/lib/profile/readiness";
import { extractResumeText } from "./extract-text";
import { applyParsedProfile, applyReviewedPlans, queueDedupConflicts } from "./apply-parsed";
import {
  countImportSections,
  normalizeParsedResume,
  normalizeParsedResumeFromText,
} from "./normalize-parsed-resume";
import { previewParsedProfile } from "./preview-parsed";
import type {
  DedupResolution,
  MergeStrategy,
  PreviewSummary,
  ProfileSection,
  ProfileSource,
  SectionUpsertPlan,
} from "@hirevault/types";
import type { ParsedResume } from "@hirevault/ai-core";

function revalidateIngestion() {
  revalidatePath("/profile/import");
  revalidatePath("/profile");
}

type IngestionApplyResult = {
  success: true;
  runId?: string;
  inserted: number;
  merged: number;
  conflicts: number;
  awaitingConfirm?: boolean;
  preview?: PreviewSummary;
  sectionCounts?: ReturnType<typeof countImportSections>;
  degraded?: boolean;
};

type ConfirmIngestionOptions = {
  mergeStrategy?: MergeStrategy;
  reviewedPlans?: SectionUpsertPlan[];
};

async function finalizeIngestionRun(
  supabase: SupabaseClient,
  runId: string,
  profileId: string,
  parsed: ParsedResume | LinkedInImport,
  source: ProfileSource,
  options?: ConfirmIngestionOptions
) {
  const stats = options?.reviewedPlans
    ? await applyReviewedPlans(supabase, profileId, parsed, source, options.reviewedPlans)
    : await applyParsedProfile(supabase, profileId, parsed, source, options);
  await queueDedupConflicts(supabase, profileId, stats.conflicts, source);

  await supabase
    .from("ingestion_runs")
    .update({
      status: "completed",
      parsed_data: parsed as unknown as Record<string, unknown>,
      preview_summary: null,
      items_inserted: stats.inserted,
      items_merged: stats.merged,
      items_skipped: stats.skipped,
    })
    .eq("id", runId);

  return stats;
}

export async function parseLinkedInForPreview(
  supabase: SupabaseClient,
  profileId: string,
  userId: string,
  parsed: LinkedInImport,
  options?: ConfirmIngestionOptions
) {
  const preview = await previewParsedProfile(supabase, profileId, parsed, "linkedin", options);

  const { data: run, error } = await supabase
    .from("ingestion_runs")
    .insert({
      profile_id: profileId,
      user_id: userId,
      source: "linkedin",
      status: "awaiting_confirm",
      parsed_data: parsed,
      preview_summary: preview,
    })
    .select("id")
    .single();

  if (error || !run) {
    throw new Error(error?.message ?? "Failed to create ingestion run");
  }

  return { runId: run.id, preview };
}

async function ingestLinkedInParsed(
  supabase: SupabaseClient,
  profileId: string,
  userId: string,
  parsed: LinkedInImport,
  applyImmediately?: boolean
): Promise<IngestionApplyResult> {
  if (applyImmediately) {
    const { data: run } = await supabase
      .from("ingestion_runs")
      .insert({
        profile_id: profileId,
        user_id: userId,
        source: "linkedin",
        status: "processing",
        parsed_data: parsed,
      })
      .select("id")
      .single();

    if (!run) return { success: true, inserted: 0, merged: 0, conflicts: 0 };

    const stats = await finalizeIngestionRun(
      supabase,
      run.id,
      profileId,
      parsed,
      "linkedin"
    );

    return {
      success: true,
      runId: run.id,
      inserted: stats.inserted,
      merged: stats.merged,
      conflicts: stats.conflicts.length,
    };
  }

  const result = await parseLinkedInForPreview(supabase, profileId, userId, parsed);
  return {
    success: true,
    runId: result.runId,
    inserted: result.preview.totals.insert,
    merged: result.preview.totals.update,
    conflicts: result.preview.totals.conflict,
    awaitingConfirm: true,
    preview: result.preview,
  };
}

export async function confirmIngestionRun(
  runId: string,
  options?: ConfirmIngestionOptions
): Promise<
  | { error: string }
  | { success: true; inserted: number; merged: number; conflicts: number }
> {
  const supabase = await createClient();
  const profileId = await requireProfileId();

  const { data: run, error } = await supabase
    .from("ingestion_runs")
    .select("*")
    .eq("id", runId)
    .eq("profile_id", profileId)
    .single();

  if (error || !run) return { error: "Import run not found" };
  if (run.status !== "awaiting_confirm") {
    return { error: "This import is not awaiting confirmation" };
  }
  if (!run.parsed_data) return { error: "Import has no parsed data" };

  const source = run.source as ProfileSource;
  const parsed = run.parsed_data as ParsedResume | LinkedInImport;
  const stats = await finalizeIngestionRun(
    supabase,
    runId,
    profileId,
    parsed,
    source,
    options
  );

  revalidateIngestion();
  return {
    success: true as const,
    inserted: stats.inserted,
    merged: stats.merged,
    conflicts: stats.conflicts.length,
  };
}

export async function cancelIngestionRun(runId: string) {
  const supabase = await createClient();
  const profileId = await requireProfileId();

  const { data: run, error } = await supabase
    .from("ingestion_runs")
    .select("id, status")
    .eq("id", runId)
    .eq("profile_id", profileId)
    .single();

  if (error || !run) return { error: "Import run not found" };
  if (run.status !== "awaiting_confirm") {
    return { error: "Only pending previews can be cancelled" };
  }

  await supabase
    .from("ingestion_runs")
    .update({ status: "cancelled", preview_summary: null })
    .eq("id", runId);

  revalidateIngestion();
  return { success: true as const };
}

export async function uploadAndParseResume(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profileId = await requireProfileId();
  const file = formData.get("resume") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (file.size > 10 * 1024 * 1024) return { error: "File exceeds 10MB limit" };

  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (!allowed.includes(file.type)) {
    return { error: "Only PDF, DOCX, or plain text files are supported" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { data: run, error: runError } = await supabase
    .from("ingestion_runs")
    .insert({
      profile_id: profileId,
      user_id: user.id,
      source: "resume_upload",
      status: "processing",
      file_name: file.name,
      storage_path: storagePath,
    })
    .select("id")
    .single();

  if (runError || !run) return { error: runError?.message ?? "Failed to create ingestion run" };

  await supabase.storage.from("resumes").upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  const { text, error: extractError } = await extractResumeText(buffer, file.type);
  if (extractError || !text) {
    await supabase
      .from("ingestion_runs")
      .update({ status: "failed", error_message: extractError ?? "Could not extract text" })
      .eq("id", run.id);
    return { error: extractError ?? "Could not extract text from file" };
  }

  const { data: parsedAi, error: parseError, degraded } = await parseResumeText(text);

  const normalized = parsedAi
    ? normalizeParsedResume(text, parsedAi)
    : normalizeParsedResumeFromText(text);

  const hasContent =
    (normalized.experiences?.length ?? 0) > 0 ||
    (normalized.education?.length ?? 0) > 0 ||
    (normalized.leadership?.length ?? 0) > 0 ||
    (normalized.skills?.length ?? 0) > 0 ||
    (normalized.courses?.length ?? 0) > 0 ||
    Boolean(normalized.full_name);

  if (!hasContent) {
    await supabase
      .from("ingestion_runs")
      .update({
        status: "failed",
        raw_text: text.slice(0, 50000),
        error_message: parseError ?? "Could not extract profile data from resume",
      })
      .eq("id", run.id);
    return {
      error: parseError ?? "Could not extract profile data from resume",
      degraded,
      hint: degraded ? "Set OPENAI_API_KEY for AI parsing" : undefined,
    };
  }

  const sectionCounts = countImportSections(normalized);
  const applyImmediately = formData.get("apply_immediately") === "on";

  if (applyImmediately) {
    const stats = await finalizeIngestionRun(
      supabase,
      run.id,
      profileId,
      normalized,
      "resume_upload"
    );

    await supabase
      .from("ingestion_runs")
      .update({ raw_text: text.slice(0, 50000) })
      .eq("id", run.id);

    revalidateIngestion();
    return {
      success: true,
      runId: run.id,
      inserted: stats.inserted,
      merged: stats.merged,
      conflicts: stats.conflicts.length,
      degraded,
      sectionCounts,
    };
  }

  const preview = await previewParsedProfile(
    supabase,
    profileId,
    normalized,
    "resume_upload"
  );

  await supabase
    .from("ingestion_runs")
    .update({
      status: "awaiting_confirm",
      raw_text: text.slice(0, 50000),
      parsed_data: normalized,
      preview_summary: preview,
    })
    .eq("id", run.id);

  revalidateIngestion();
  return {
    success: true,
    runId: run.id,
    inserted: preview.totals.insert,
    merged: preview.totals.update,
    conflicts: preview.totals.conflict,
    awaitingConfirm: true,
    preview,
    degraded,
    sectionCounts,
  };
}

export async function importLinkedInJson(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profileId = await requireProfileId();
  const jsonText = (formData.get("linkedin_json") as string)?.trim();
  const linkedinUrl = (formData.get("linkedin_url") as string)?.trim();

  if (!jsonText) {
    return { error: "Paste LinkedIn export JSON in the Advanced section." };
  }

  const { data: parsedRaw, error: parseError } = parseLinkedInJson(jsonText);
  if (!parsedRaw) return { error: parseError ?? "Invalid JSON" };

  const parsed = await polishLinkedInImportBullets(parsedRaw);
  if (linkedinUrl) parsed.linkedin_url = linkedinUrl;

  const applyImmediately = formData.get("apply_immediately") === "on";
  const result = await ingestLinkedInParsed(
    supabase,
    profileId,
    user.id,
    parsed,
    applyImmediately
  );
  revalidateIngestion();
  return result;
}

export async function syncLinkedInProfile(formData?: FormData) {
  if (!isLinkedInOAuthConfigured()) {
    return { error: "LinkedIn OAuth is not configured on this server." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profileId = await requireProfileId();
  const connection = await getLinkedInConnectionWithTokens(profileId);
  if (!connection) {
    return { error: "Connect LinkedIn first, then sync your profile." };
  }

  let accessToken = decryptLinkedInToken(connection.access_token_enc);
  const expiresAt = new Date(connection.expires_at).getTime();
  const needsRefresh = expiresAt - Date.now() < 60_000;

  if (needsRefresh) {
    if (!connection.refresh_token_enc) {
      return { error: "LinkedIn session expired. Reconnect LinkedIn to continue." };
    }
    try {
      const refreshed = await refreshLinkedInToken(
        decryptLinkedInToken(connection.refresh_token_enc)
      );
      accessToken = refreshed.access_token;
      const { error: updateError } = await supabase
        .from("linkedin_connections")
        .update({
          access_token_enc: encryptLinkedInToken(refreshed.access_token),
          refresh_token_enc: refreshed.refresh_token
            ? encryptLinkedInToken(refreshed.refresh_token)
            : connection.refresh_token_enc,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("profile_id", profileId);
      if (updateError) return { error: updateError.message };
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Could not refresh LinkedIn token. Reconnect and try again.",
      };
    }
  }

  let apiPayload;
  try {
    apiPayload = await fetchLinkedInMemberData(accessToken);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to fetch LinkedIn profile data.",
    };
  }

  const mapped = mapLinkedInApiToImport(apiPayload);
  if (!linkedInImportHasContent(mapped)) {
    return {
      error:
        "LinkedIn returned limited profile data. Your app may need additional API products, or paste JSON under Advanced.",
      degraded: true,
    };
  }

  const parsed = await polishLinkedInImportBullets(mapped);
  const applyImmediately = formData?.get("apply_immediately") === "on";
  const result = await ingestLinkedInParsed(
    supabase,
    profileId,
    user.id,
    parsed,
    applyImmediately
  );
  revalidateIngestion();
  return result;
}

export async function resolveDedupConflict(
  conflictId: string,
  resolution: DedupResolution
) {
  const supabase = await createClient();
  const profileId = await requireProfileId();

  const { data: conflict, error } = await supabase
    .from("dedup_conflicts")
    .select("*")
    .eq("id", conflictId)
    .eq("profile_id", profileId)
    .single();

  if (error || !conflict) return { error: "Conflict not found" };

  const section = conflict.section as ProfileSection;
  const incoming = conflict.incoming_data as Record<string, unknown>;

  if (resolution === "keep_existing") {
    await supabase
      .from("dedup_conflicts")
      .update({ resolution: "keep_existing" })
      .eq("id", conflictId);
    revalidateIngestion();
    return { success: true };
  }

  if (resolution === "use_incoming") {
    const { error: updateError } = await supabase
      .from(section)
      .update({ ...incoming, source: conflict.source })
      .eq("id", conflict.existing_id);
    if (updateError) return { error: updateError.message };
    await supabase
      .from("dedup_conflicts")
      .update({ resolution: "use_incoming" })
      .eq("id", conflictId);
    revalidateIngestion();
    return { success: true };
  }

  if (resolution === "merged") {
    const { data: existing } = await supabase
      .from(section)
      .select("*")
      .eq("id", conflict.existing_id)
      .single();
    if (!existing) return { error: "Existing record not found" };

    const bullets = [
      ...new Set([
        ...((existing as { bullet_points?: string[] }).bullet_points ?? []),
        ...((incoming.bullet_points as string[]) ?? []),
      ]),
    ];
    const { error: updateError } = await supabase
      .from(section)
      .update({
        ...incoming,
        bullet_points: bullets.length ? bullets : undefined,
        source: conflict.source,
      })
      .eq("id", conflict.existing_id);
    if (updateError) return { error: updateError.message };
    await supabase
      .from("dedup_conflicts")
      .update({ resolution: "merged" })
      .eq("id", conflictId);
    revalidateIngestion();
    return { success: true };
  }

  return { error: "Invalid resolution" };
}

export async function getProfileValidation() {
  const supabase = await createClient();
  const profile = await getProfileForUser();
  if (!profile) return { error: "Profile not found" };

  const profileId = profile.id;
  const [exp, edu, lead, proj, skills] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", profileId),
    supabase.from("education").select("*").eq("profile_id", profileId),
    supabase.from("leadership").select("id").eq("profile_id", profileId),
    supabase.from("projects").select("id").eq("profile_id", profileId),
    supabase.from("skills").select("*").eq("profile_id", profileId),
  ]);

  const payload = {
    profile,
    experiences: exp.data ?? [],
    education: edu.data ?? [],
    projects: proj.data ?? [],
    skills: skills.data ?? [],
  };

  const local = validateProfileLocally({
    full_name: profile.full_name,
    target_roles: profile.target_roles,
    experiences: (exp.data ?? []) as { bullet_points?: string[] }[],
    skills: (skills.data ?? []) as { name: string }[],
    leadershipCount: lead.data?.length ?? 0,
    projectsCount: proj.data?.length ?? 0,
  });

  const { data: aiResult, degraded } = await validateProfileData(JSON.stringify(payload));

  return {
    validation: aiResult ?? local,
    degraded,
  };
}

export async function fetchTailoringReadiness() {
  const profile = await getProfileForUser();
  if (!profile) return { error: "Profile not found" as const };
  const readiness = await getTailoringReadiness(profile.id);
  return { readiness };
}
