import { Suspense } from "react";
import { getApplicationsWithJobs } from "@/lib/applications/queries";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { ApplicationFilters } from "@/components/applications/application-filters";
import { AddApplicationForm } from "@/components/applications/add-application-form";
import { PipelineAnalytics } from "@/components/applications/pipeline-analytics";
import { getApplicationStats } from "@/lib/applications/queries";
import type { ApplicationStatus, RoleSeason } from "@hirevault/types";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    status: (params.status as ApplicationStatus | "all") ?? "all",
    company: params.company,
    priority: params.priority ? Number(params.priority) : undefined,
    priorityMin: params.priorityMin ? Number(params.priorityMin) : undefined,
    jobType: params.jobType,
    roleSeason: (params.roleSeason as RoleSeason | "all") ?? "all",
    roleYear: params.roleYear ? Number(params.roleYear) : undefined,
    location: params.location,
    activeOnly: params.active === "1",
    remoteOnly: params.remote === "1",
    sort:
      (params.sort as
        | "updated"
        | "applied"
        | "priority"
        | "company"
        | "role_timing") ?? "updated",
  };

  const [applications, stats] = await Promise.all([
    getApplicationsWithJobs(filters),
    getApplicationStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">
          Kanban pipeline — click a card to edit, filter by cohort or priority, drag by the handle.
        </p>
      </div>

      <PipelineAnalytics
        pipeline={stats.pipeline}
        responseRate={stats.responseRate}
        offerRate={stats.offerRate}
        velocity30d={stats.velocity30d}
      />

      <Suspense fallback={null}>
        <ApplicationFilters />
      </Suspense>

      <KanbanBoard applications={applications} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Add application</h2>
        <AddApplicationForm />
      </div>
    </div>
  );
}
