import { createClient } from "@/lib/supabase/server";
import type { IngestionRun, PreviewSummary } from "@hirevault/types";

export async function getIngestionRun(
  runId: string,
  profileId: string
): Promise<IngestionRun | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingestion_runs")
    .select("*")
    .eq("id", runId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) return null;
  return data as IngestionRun;
}

export async function getAwaitingConfirmRun(profileId: string): Promise<IngestionRun | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingestion_runs")
    .select("*")
    .eq("profile_id", profileId)
    .eq("status", "awaiting_confirm")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as IngestionRun;
}

export async function getPendingConflictsCount(profileId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("dedup_conflicts")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("resolution", "pending");

  if (error) return 0;
  return count ?? 0;
}

export function previewFromRun(run: IngestionRun): PreviewSummary | null {
  return run.preview_summary;
}
