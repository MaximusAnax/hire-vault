import { createClient } from "@/lib/supabase/server";
import { getApplicationsWithJobs } from "@/lib/applications/queries";
import type { ResumeSummary } from "@/lib/resumes/resume-summary";

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

export async function getResumeSummariesByApplication(): Promise<Record<string, ResumeSummary>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tailored_resumes")
    .select("application_id, version, ats_score, generated_at, pdf_storage_path")
    .order("generated_at", { ascending: false });
  if (error || !data) return {};

  const map: Record<string, ResumeSummary> = {};
  for (const row of data) {
    const appId = row.application_id as string;
    if (!map[appId]) {
      map[appId] = {
        count: 1,
        latestVersion: row.version,
        latestAts: row.ats_score,
        latestGeneratedAt: row.generated_at,
        hasPdf: Boolean(row.pdf_storage_path),
      };
    } else {
      map[appId].count += 1;
    }
  }
  return map;
}
