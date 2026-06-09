import type { ParsedJobDescription } from "@hirevault/ai-core";
import type { CaptureDraft, CaptureSource } from "@hirevault/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface InsertJobFromCaptureDraftInput {
  userId: string;
  draft: CaptureDraft;
  description_parsed?: ParsedJobDescription | null;
  priority?: number | null;
  needs_review?: boolean;
  capture_source?: CaptureSource | null;
  createApplication?: boolean;
}

export interface InsertJobFromCaptureDraftSuccess {
  jobId: string;
  applicationId?: string;
  deduped: boolean;
}

export async function insertJobFromCaptureDraft(
  supabase: SupabaseClient,
  input: InsertJobFromCaptureDraftInput
): Promise<InsertJobFromCaptureDraftSuccess | { error: string }> {
  const { draft } = input;
  const jobUrl = draft.url?.trim() || null;
  const primaryLocation = draft.locations[0] ?? null;

  const jobRow = {
    user_id: input.userId,
    title: draft.title,
    company: draft.company,
    location: primaryLocation,
    locations: draft.locations,
    url: jobUrl,
    description_raw: draft.description_raw || null,
    description_parsed: input.description_parsed ?? null,
    tech_stack: draft.tech_stack,
    required_qualifications: draft.required_qualifications,
    preferred_qualifications: draft.preferred_qualifications,
    salary_range: draft.salary_range,
    job_type: draft.job_type,
    role_season: draft.role_season,
    role_year: draft.role_year,
    scraped_at: new Date().toISOString(),
  };

  let jobId: string;
  let deduped = false;

  if (jobUrl) {
    const { data: existing } = await supabase
      .from("jobs")
      .select("id")
      .eq("user_id", input.userId)
      .eq("url", jobUrl)
      .maybeSingle();

    if (existing?.id) {
      jobId = existing.id;
      deduped = true;
      const { error: updateError } = await supabase.from("jobs").update(jobRow).eq("id", jobId);
      if (updateError) return { error: updateError.message };
    } else {
      const { data: inserted, error } = await supabase
        .from("jobs")
        .insert(jobRow)
        .select("id")
        .single();
      if (error) return { error: error.message };
      if (!inserted?.id) return { error: "Job insert failed" };
      jobId = inserted.id;
    }
  } else {
    const { data: inserted, error } = await supabase
      .from("jobs")
      .insert(jobRow)
      .select("id")
      .single();
    if (error) return { error: error.message };
    if (!inserted?.id) return { error: "Job insert failed" };
    jobId = inserted.id;
  }

  let applicationId: string | undefined;
  if (input.createApplication !== false) {
    const { data: existingApp } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", input.userId)
      .eq("job_id", jobId)
      .maybeSingle();

    if (existingApp?.id) {
      applicationId = existingApp.id;
    } else {
      const priority =
        input.priority !== undefined ? input.priority : draft.priority ?? null;

      const { data: app, error: appError } = await supabase
        .from("applications")
        .insert({
          user_id: input.userId,
          job_id: jobId,
          status: "saved",
          priority,
          needs_review: input.needs_review ?? false,
          capture_source: input.capture_source ?? null,
          notes: [],
        })
        .select("id")
        .single();

      if (appError) return { error: appError.message };
      applicationId = app?.id;
    }
  }

  return { jobId, applicationId, deduped };
}
