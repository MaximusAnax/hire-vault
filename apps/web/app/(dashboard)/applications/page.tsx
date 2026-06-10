import Link from "next/link";
import { Suspense } from "react";
import { getApplicationsWithJobs, getApplicationStats } from "@/lib/applications/queries";
import { CaptureReviewPanel } from "@/components/applications/capture-review-panel";
import {
  overviewTaskLabel,
  parseOverviewTaskParam,
  filterApplicationsByOverviewTask,
} from "@/lib/overview/overview-task-filter";
import { getInterviewPrepSummariesByJobId } from "@/lib/interviews/queries";
import {
  getResumeActionSignalsByApplication,
  getResumeSummariesByApplication,
} from "@/lib/resumes/queries";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { ApplicationListView } from "@/components/applications/application-list-view";
import { ApplicationFilters } from "@/components/applications/application-filters";
import { ApplicationViewToggle } from "@/components/applications/application-view-toggle";
import { AddApplicationForm } from "@/components/applications/add-application-form";
import { PipelineAnalytics } from "@/components/applications/pipeline-analytics";
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
    needsReview: params.needsReview === "1",
    sort:
      (params.sort as
        | "updated"
        | "applied"
        | "priority"
        | "company"
        | "role_timing") ?? "updated",
  };

  const view = params.view === "list" ? "list" : "board";
  const overviewTask = parseOverviewTaskParam(params.overviewTask);

  const [applicationsRaw, needsReviewApps, stats, resumeSummaries, resumeSignals, interviewSummaries] =
    await Promise.all([
      getApplicationsWithJobs(overviewTask ? { activeOnly: true, sort: filters.sort } : filters),
      getApplicationsWithJobs({ needsReview: true }),
      getApplicationStats(),
      getResumeSummariesByApplication(),
      getResumeActionSignalsByApplication(),
      getInterviewPrepSummariesByJobId(),
    ]);

  const applications = overviewTask
    ? filterApplicationsByOverviewTask(
        applicationsRaw,
        overviewTask,
        resumeSignals,
        interviewSummaries
      )
    : applicationsRaw;

  const needsReviewCount = needsReviewApps.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">
          Board or list — open a role&apos;s resume from any card or row.
        </p>
      </div>

      <PipelineAnalytics
        pipeline={stats.pipeline}
        responseRate={stats.responseRate}
        offerRate={stats.offerRate}
        velocity30d={stats.velocity30d}
      />

      {overviewTask ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <p>
            Showing <span className="font-medium">{applications.length}</span> role
            {applications.length === 1 ? "" : "s"} — {overviewTaskLabel(overviewTask)}
          </p>
          <Link href="/applications" className="text-primary hover:underline text-xs">
            Clear overview filter
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <Suspense fallback={null}>
          <ApplicationFilters needsReviewCount={needsReviewCount} />
        </Suspense>
        <Suspense fallback={null}>
          <ApplicationViewToggle />
        </Suspense>
      </div>

      {needsReviewCount > 0 ? <CaptureReviewPanel applications={needsReviewApps} /> : null}

      {view === "list" ? (
        <ApplicationListView
          applications={applications}
          resumeSummaries={resumeSummaries}
        />
      ) : (
        <KanbanBoard applications={applications} resumeSummaries={resumeSummaries} />
      )}

      <div id="add">
        <h2 className="text-lg font-semibold mb-3">Add application</h2>
        <AddApplicationForm initialAddUrl={params.addUrl} />
      </div>
    </div>
  );
}
