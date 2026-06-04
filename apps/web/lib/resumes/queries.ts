import { createClient } from "@/lib/supabase/server";
import { getApplicationsWithJobs } from "@/lib/applications/queries";

export async function getApplicationsForResumeWorkspace() {
  return getApplicationsWithJobs({ sort: "updated" });
}

export async function getTailoredResumes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tailored_resumes")
    .select(
      "id, application_id, job_id, label, ats_score, version, template_used, content, pdf_storage_path, keyword_gaps, generated_at, jobs(title, company)"
    )
    .order("generated_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getTailoredResume(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tailored_resumes")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function getJobsForTailoring() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, company, description_raw, tech_stack, required_qualifications")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
