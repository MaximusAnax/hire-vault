import { createClient } from "@/lib/supabase/server";
import { getApplicationsWithJobs } from "@/lib/applications/queries";
import { getPendingConflictsCount } from "@/lib/ingestion/queries";
import { getInterviewPrepSummariesByJobId } from "@/lib/interviews/queries";
import { getProfileForUser } from "@/lib/profile/get-profile";
import { getTailoringReadiness } from "@/lib/profile/readiness";
import {
  getResumeActionSignalsByApplication,
  type ResumeActionSignals,
} from "@/lib/resumes/queries";
import type { ApplicationWithJob, OverviewAction, Profile } from "@hirevault/types";
import type { InterviewPrepSummary } from "@/lib/interviews/queries";
import {
  deriveOverviewActions,
  type TailoringBlocker,
} from "./derive-overview-actions";

export {
  deriveOverviewActions,
  buildReadinessBlockersFromValidation,
  SKILL_NUDGE_MIN_JD_COUNT,
  type DeriveOverviewActionsInput,
  type TailoringBlocker,
} from "./derive-overview-actions";

export interface OverviewDashboard {
  profile: Profile;
  apps: ApplicationWithJob[];
  resumeSignals: Record<string, ResumeActionSignals>;
  interviewSummaries: Record<string, InterviewPrepSummary>;
  pendingConflictsCount: number;
  readinessReady: boolean;
  readinessBlockers: OverviewAction[];
  actions: OverviewAction[];
  weeklyApplicationGoal: number;
  appliedThisWeek: number;
}

function weekStartIso(): string {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - mondayOffset);
  return start.toISOString().slice(0, 10);
}

function countAppliedThisWeek(apps: ApplicationWithJob[]): number {
  const start = weekStartIso();
  return apps.filter((a) => a.applied_date && a.applied_date >= start).length;
}

function toTailoringBlockers(blockers: OverviewAction[]): TailoringBlocker[] {
  return blockers.map((b) => ({
    field: (b.metadata?.field as string) ?? "",
    message: b.title,
    href: b.href,
  }));
}

export async function getOverviewDashboard(): Promise<OverviewDashboard | null> {
  const profile = await getProfileForUser();
  if (!profile) return null;

  const supabase = await createClient();
  const [
    apps,
    allApps,
    resumeSignals,
    interviewSummaries,
    pendingConflictsCount,
    skillsRes,
    readiness,
  ] = await Promise.all([
    getApplicationsWithJobs({ activeOnly: true, sort: "updated" }),
    getApplicationsWithJobs({ sort: "updated" }),
    getResumeActionSignalsByApplication(),
    getInterviewPrepSummariesByJobId(),
    getPendingConflictsCount(profile.id),
    supabase.from("skills").select("name").eq("profile_id", profile.id),
    getTailoringReadiness(profile.id),
  ]);

  const profileSkills = (skillsRes.data ?? [])
    .map((row) => row.name as string)
    .filter(Boolean);

  const readinessBlockers = readiness.blockers;

  const actions = deriveOverviewActions({
    apps,
    resumeSignals,
    interviewSummaries,
    pendingConflictsCount,
    profileSkills,
    readinessBlockers: toTailoringBlockers(readinessBlockers),
  });

  return {
    profile,
    apps,
    resumeSignals,
    interviewSummaries,
    pendingConflictsCount,
    readinessReady: readiness.ready,
    readinessBlockers,
    actions,
    weeklyApplicationGoal: profile.weekly_application_goal,
    appliedThisWeek: countAppliedThisWeek(allApps),
  };
}
