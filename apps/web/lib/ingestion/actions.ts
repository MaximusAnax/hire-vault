"use server";

import { revalidatePath } from "next/cache";
import {
  parseResumeText,
  parseLinkedInJson,
  polishLinkedInImportBullets,
  validateProfileData,
  validateProfileLocally,
} from "@hirevault/ai-core";
import { createClient } from "@/lib/supabase/server";
import { requireProfileId, getProfileForUser } from "@/lib/profile/get-profile";
import { extractResumeText } from "./extract-text";
import { applyParsedProfile } from "./apply-parsed";
import {
  countImportSections,
  normalizeParsedResume,
  normalizeParsedResumeFromText,
} from "./normalize-parsed-resume";
import type { DedupResolution, ProfileSection } from "@hirevault/types";

function revalidateIngestion() {
  revalidatePath("/profile/import");
  revalidatePath("/profile");
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
  const stats = await applyParsedProfile(supabase, profileId, normalized, "resume_upload");

  for (const c of stats.conflicts) {
    await supabase.from("dedup_conflicts").insert({
      profile_id: profileId,
      section: c.section,
      existing_id: c.existingId,
      incoming_data: c.incoming,
      source: "resume_upload",
    });
  }

  await supabase
    .from("ingestion_runs")
    .update({
      status: "completed",
      raw_text: text.slice(0, 50000),
      parsed_data: normalized,
      items_inserted: stats.inserted,
      items_merged: stats.merged,
      items_skipped: stats.skipped,
    })
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
    return {
      error:
        "Paste LinkedIn export JSON. Full OAuth import requires LinkedIn API credentials (not configured).",
    };
  }

  const { data: parsedRaw, error: parseError } = parseLinkedInJson(jsonText);
  if (!parsedRaw) return { error: parseError ?? "Invalid JSON" };

  // Polish import bullets — manual create/update paths remain untouched.
  const parsed = await polishLinkedInImportBullets(parsedRaw);

  if (linkedinUrl) parsed.linkedin_url = linkedinUrl;

  const { data: run } = await supabase
    .from("ingestion_runs")
    .insert({
      profile_id: profileId,
      user_id: user.id,
      source: "linkedin",
      status: "processing",
    })
    .select("id")
    .single();

  const stats = await applyParsedProfile(supabase, profileId, parsed, "linkedin");

  for (const c of stats.conflicts) {
    await supabase.from("dedup_conflicts").insert({
      profile_id: profileId,
      section: c.section,
      existing_id: c.existingId,
      incoming_data: c.incoming,
      source: "linkedin",
    });
  }

  if (run) {
    await supabase
      .from("ingestion_runs")
      .update({
        status: "completed",
        parsed_data: parsed,
        items_inserted: stats.inserted,
        items_merged: stats.merged,
        items_skipped: stats.skipped,
      })
      .eq("id", run.id);
  }

  revalidateIngestion();
  return {
    success: true,
    inserted: stats.inserted,
    merged: stats.merged,
    conflicts: stats.conflicts.length,
  };
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
  const [exp, edu, proj, skills] = await Promise.all([
    supabase.from("experiences").select("*").eq("profile_id", profileId),
    supabase.from("education").select("*").eq("profile_id", profileId),
    supabase.from("projects").select("*").eq("profile_id", profileId),
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
  });

  const { data: aiResult, degraded } = await validateProfileData(JSON.stringify(payload));

  return {
    validation: aiResult ?? local,
    degraded,
  };
}
