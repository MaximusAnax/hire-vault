import { createClient } from "@/lib/supabase/server";
import type { ApplicationWithJob, ApplicationStatus } from "@hirevault/types";

export interface ApplicationFilters {
  status?: ApplicationStatus | "all";
  company?: string;
  priority?: number;
  jobType?: string;
  sort?: "updated" | "applied" | "priority" | "company";
}

export async function getApplicationsWithJobs(
  filters: ApplicationFilters = {}
): Promise<ApplicationWithJob[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("applications")
    .select("*, job:jobs(*)")
    .eq("user_id", user.id);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  let results = data.map((row) => ({
    ...(row as Omit<ApplicationWithJob, "job">),
    job: (row as { job: ApplicationWithJob["job"] }).job ?? null,
  })) as ApplicationWithJob[];

  if (filters.company?.trim()) {
    const q = filters.company.toLowerCase();
    results = results.filter((a) => a.job?.company?.toLowerCase().includes(q));
  }
  if (filters.jobType && filters.jobType !== "all") {
    results = results.filter((a) => a.job?.job_type === filters.jobType);
  }

  const sort = filters.sort ?? "updated";
  results.sort((a, b) => {
    if (sort === "company") {
      return (a.job?.company ?? "").localeCompare(b.job?.company ?? "");
    }
    if (sort === "applied") {
      return (b.applied_date ?? "").localeCompare(a.applied_date ?? "");
    }
    if (sort === "priority") {
      return (b.priority ?? 0) - (a.priority ?? 0);
    }
    return (b.last_updated ?? "").localeCompare(a.last_updated ?? "");
  });

  return results;
}

export async function getApplicationStats() {
  const apps = await getApplicationsWithJobs();
  const byStatus: Record<string, number> = {};
  for (const a of apps) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  }
  const applied = apps.filter((a) =>
    ["applied", "screening", "interview", "offer", "rejected"].includes(a.status)
  ).length;
  const responses = apps.filter((a) =>
    ["screening", "interview", "offer", "rejected"].includes(a.status)
  ).length;
  const offers = byStatus.offer ?? 0;

  const last30 = apps.filter((a) => {
    const d = new Date(a.created_at);
    return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
  }).length;

  return {
    total: apps.length,
    byStatus,
    applied,
    responseRate: applied > 0 ? Math.round((responses / applied) * 100) : 0,
    offerRate: applied > 0 ? Math.round((offers / applied) * 100) : 0,
    velocity30d: last30,
    pipeline: [
      { status: "saved", count: byStatus.saved ?? 0 },
      { status: "applied", count: byStatus.applied ?? 0 },
      { status: "screening", count: byStatus.screening ?? 0 },
      { status: "interview", count: byStatus.interview ?? 0 },
      { status: "offer", count: byStatus.offer ?? 0 },
      { status: "rejected", count: byStatus.rejected ?? 0 },
    ],
  };
}
