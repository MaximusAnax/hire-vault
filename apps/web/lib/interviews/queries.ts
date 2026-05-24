import { createClient } from "@/lib/supabase/server";

export async function getInterviewJobs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, company, description_raw, tech_stack")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getQuestionsForJob(jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getAllQuestions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interview_questions")
    .select("*, jobs(title, company)")
    .order("updated_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
