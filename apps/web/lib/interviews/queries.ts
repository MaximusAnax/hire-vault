import { createClient } from "@/lib/supabase/server";

export interface InterviewPrepSummary {
  total: number;
  unpracticed: number;
  unrated: number;
  missingPersonalized: number;
}

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

export async function getInterviewPrepSummariesByJobId(): Promise<
  Record<string, InterviewPrepSummary>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("interview_questions")
    .select("job_id, practiced, practice_rating, personalized_answer")
    .eq("user_id", user.id);

  if (error || !data) return {};

  const map: Record<string, InterviewPrepSummary> = {};
  for (const row of data) {
    const jobId = row.job_id as string;
    const current = map[jobId] ?? {
      total: 0,
      unpracticed: 0,
      unrated: 0,
      missingPersonalized: 0,
    };
    current.total += 1;
    if (!row.practiced) current.unpracticed += 1;
    if (row.practiced && row.practice_rating == null) current.unrated += 1;
    if (!row.personalized_answer?.trim()) current.missingPersonalized += 1;
    map[jobId] = current;
  }
  return map;
}
