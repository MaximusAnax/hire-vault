import { createClient } from "@/lib/supabase/server";
import type { ApplicationWithJob, ApplicationStatus, RoleSeason } from "@hirevault/types";
import { roleTimingSortKey } from "./role-timing";

export interface ApplicationFilters {
  status?: ApplicationStatus | "all";
  company?: string;
  /** Exact priority match (1–5). */
  priority?: number;
  /** Minimum stars, e.g. 3 for "3+ stars". */
  priorityMin?: number;
  jobType?: string;
  roleSeason?: RoleSeason | "all";
  roleYear?: number;
  location?: string;
  /** Exclude rejected and withdrawn. */
  activeOnly?: boolean;
  /** Any job location chip contains "remote" (case-insensitive). */
  remoteOnly?: boolean;
  sort?: "updated" | "applied" | "priority" | "company" | "role_timing";
}

function jobLocations(app: ApplicationWithJob): string[] {
  const job = app.job;
  if (!job) return [];
  if ((job.locations?.length ?? 0) > 0) return job.locations;
  if (job.location) return [job.location];
  return [];
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

  if (filters.priorityMin != null && filters.priorityMin > 0) {
    results = results.filter((a) => (a.priority ?? 0) >= filters.priorityMin!);
  }

  if (filters.company?.trim()) {
    const q = filters.company.toLowerCase();
    results = results.filter((a) => a.job?.company?.toLowerCase().includes(q));
  }

  if (filters.jobType && filters.jobType !== "all") {
    results = results.filter((a) => a.job?.job_type === filters.jobType);
  }

  if (filters.roleSeason && filters.roleSeason !== "all") {
    results = results.filter((a) => a.job?.role_season === filters.roleSeason);
  }

  if (filters.roleYear) {
    results = results.filter((a) => a.job?.role_year === filters.roleYear);
  }

  if (filters.location?.trim()) {
    const q = filters.location.toLowerCase();
    results = results.filter((a) =>
      jobLocations(a).some((loc) => loc.toLowerCase().includes(q))
    );
  }

  if (filters.remoteOnly) {
    results = results.filter((a) =>
      jobLocations(a).some((loc) => loc.toLowerCase().includes("remote"))
    );
  }

  if (filters.activeOnly) {
    results = results.filter(
      (a) => a.status !== "rejected" && a.status !== "withdrawn"
    );
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
    if (sort === "role_timing") {
      const ka = roleTimingSortKey(a.job?.role_season, a.job?.role_year);
      const kb = roleTimingSortKey(b.job?.role_season, b.job?.role_year);
      if (ka !== kb) return ka - kb;
      return (a.job?.company ?? "").localeCompare(b.job?.company ?? "");
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
