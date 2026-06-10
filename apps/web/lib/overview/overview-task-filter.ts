import type { ApplicationStatus, ApplicationWithJob } from "@hirevault/types";
import type { InterviewPrepSummary } from "@/lib/interviews/queries";
import type { ResumeActionSignals } from "@/lib/resumes/queries";

export type OverviewTaskFilter =
  | "tailor"
  | "gaps"
  | "pdf"
  | "saved"
  | "prep";

const PREP_STATUSES: ApplicationStatus[] = ["screening", "interview"];

export function parseOverviewTaskParam(
  value: string | undefined
): OverviewTaskFilter | undefined {
  if (
    value === "tailor" ||
    value === "gaps" ||
    value === "pdf" ||
    value === "saved" ||
    value === "prep"
  ) {
    return value;
  }
  return undefined;
}

export function filterApplicationsByOverviewTask(
  apps: ApplicationWithJob[],
  task: OverviewTaskFilter,
  resumeSignals: Record<string, ResumeActionSignals>,
  interviewSummaries: Record<string, InterviewPrepSummary>
): ApplicationWithJob[] {
  switch (task) {
    case "tailor":
      return apps.filter((app) => !resumeSignals[app.id]?.hasResume);
    case "gaps":
      return apps.filter((app) => (resumeSignals[app.id]?.keywordGaps.length ?? 0) > 0);
    case "pdf":
      return apps.filter(
        (app) => resumeSignals[app.id]?.hasResume && !resumeSignals[app.id]?.hasPdf
      );
    case "saved":
      return apps.filter((app) => app.status === "saved" && Boolean(app.job_id));
    case "prep":
      return apps.filter((app) => {
        if (!app.job_id || !PREP_STATUSES.includes(app.status)) return false;
        const prep = interviewSummaries[app.job_id];
        return (prep?.unpracticed ?? 0) > 0 || prep?.total === 0;
      });
    default:
      return apps;
  }
}

export function overviewTaskLabel(task: OverviewTaskFilter): string {
  switch (task) {
    case "tailor":
      return "Needs tailored resume";
    case "gaps":
      return "Keyword gaps";
    case "pdf":
      return "Missing PDF export";
    case "saved":
      return "Saved — ready to apply";
    case "prep":
      return "Interview prep";
  }
}
