"use server";

import { revalidatePath } from "next/cache";
import { parseJobDescription } from "@hirevault/ai-core";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@hirevault/types";

function revalidateApps() {
  revalidatePath("/applications");
  revalidatePath("/jobs");
  revalidatePath("/overview");
}

export async function createJob(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const description = (formData.get("description_raw") as string) || "";
  let parsed = null;
  let tech_stack: string[] = [];
  let required_qualifications: string[] = [];
  let preferred_qualifications: string[] = [];

  if (description.length > 50) {
    const result = await parseJobDescription(description);
    if (result.data) {
      parsed = result.data;
      tech_stack = result.data.tech_stack ?? [];
      required_qualifications = result.data.required_qualifications ?? [];
      preferred_qualifications = result.data.preferred_qualifications ?? [];
    }
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      title: (formData.get("title") as string) || parsed?.title || "Untitled role",
      company: (formData.get("company") as string) || parsed?.company || "Unknown company",
      location: (formData.get("location") as string) || parsed?.location || null,
      url: (formData.get("url") as string) || null,
      description_raw: description || null,
      description_parsed: parsed,
      tech_stack,
      required_qualifications,
      preferred_qualifications,
      salary_range: parsed?.salary_range ?? null,
      job_type: (formData.get("job_type") as "full_time" | "internship" | "contract") || parsed?.job_type || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true, jobId: job?.id };
}

export async function createApplication(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let jobId = (formData.get("job_id") as string) || null;

  if (!jobId) {
    const jobResult = await createJob(formData);
    if (jobResult.error) return jobResult;
    jobId = jobResult.jobId ?? null;
  }

  const status = (formData.get("status") as ApplicationStatus) || "saved";
  const { error } = await supabase.from("applications").insert({
    user_id: user.id,
    job_id: jobId,
    status,
    applied_date: formData.get("applied_date")
      ? (formData.get("applied_date") as string)
      : status === "applied"
        ? new Date().toISOString().slice(0, 10)
        : null,
    priority: formData.get("priority") ? Number(formData.get("priority")) : null,
    referral_contact: (formData.get("referral_contact") as string) || null,
    notes: formData.get("notes")
      ? [(formData.get("notes") as string)]
      : [],
  });

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    status,
    last_updated: new Date().toISOString(),
  };
  if (status === "applied") {
    updates.applied_date = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", applicationId);

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function updateApplication(
  applicationId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({
      status: (formData.get("status") as ApplicationStatus) || undefined,
      applied_date: (formData.get("applied_date") as string) || null,
      priority: formData.get("priority") ? Number(formData.get("priority")) : null,
      referral_contact: (formData.get("referral_contact") as string) || null,
      last_updated: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function addApplicationNote(applicationId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!content.trim()) return { error: "Note cannot be empty" };

  const { error } = await supabase.from("application_notes").insert({
    application_id: applicationId,
    user_id: user.id,
    content: content.trim(),
  });

  if (error) return { error: error.message };

  const { data: notes } = await supabase
    .from("application_notes")
    .select("content")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  await supabase
    .from("applications")
    .update({
      notes: (notes ?? []).map((n) => n.content),
      last_updated: new Date().toISOString(),
    })
    .eq("id", applicationId);

  revalidateApps();
  return { success: true };
}

export async function deleteApplication(applicationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("applications").delete().eq("id", applicationId);
  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}
