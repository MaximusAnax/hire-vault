import { createClient } from "@/lib/supabase/server";

export async function getMockSessions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mock_sessions")
    .select("*, jobs(title, company)")
    .order("conducted_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getMockJobs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, company")
    .order("created_at", { ascending: false })
    .limit(30);
  return data ?? [];
}
