import { createClient } from "@/lib/supabase/server";

export async function getTailoredResumes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tailored_resumes")
    .select("*, jobs(title, company)")
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
