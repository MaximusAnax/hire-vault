import { extractJdKeywords, type ParsedJobDescription } from "@hirevault/ai-core";
import type { ApplicationStatus, ApplicationWithJob, OverviewAction } from "@hirevault/types";
import type { InterviewPrepSummary } from "@/lib/interviews/queries";
import type { ResumeActionSignals } from "@/lib/resumes/queries";
import { interviewPrepUrl, resumeBuilderUrl } from "@/lib/resumes/urls";
import { resumeGapLabel, resumeAtsLabel } from "@/lib/resumes/resume-summary";

/** Minimum JD appearances before surfacing a profile skill nudge. */
export const SKILL_NUDGE_MIN_JD_COUNT = 2;

export interface TailoringBlocker {
  field: string;
  message: string;
  href: string;
}

export interface DeriveOverviewActionsInput {
  apps: ApplicationWithJob[];
  resumeSignals: Record<string, ResumeActionSignals>;
  interviewSummaries: Record<string, InterviewPrepSummary>;
  pendingConflictsCount: number;
  profileSkills: string[];
  readinessBlockers?: TailoringBlocker[];
}

const PREP_STATUSES: ApplicationStatus[] = ["screening", "interview"];

const STATUS_WEIGHT: Record<ApplicationStatus, number> = {
  screening: 4,
  interview: 4,
  applied: 2,
  saved: 1,
  offer: 1,
  rejected: 0,
  withdrawn: 0,
};

function statusWeight(status: ApplicationStatus): number {
  return STATUS_WEIGHT[status] ?? 0;
}

function appPriority(app: ApplicationWithJob): number {
  return app.priority ?? 0;
}

function jobLabel(app: ApplicationWithJob): string {
  const job = app.job;
  if (!job) return "Unknown role";
  return `${job.title} @ ${job.company}`;
}

function parsedJd(app: ApplicationWithJob): ParsedJobDescription | null {
  const parsed = app.job?.description_parsed;
  if (!parsed || typeof parsed !== "object") return null;
  return parsed as ParsedJobDescription;
}

function baseAppPriority(app: ApplicationWithJob, kindBoost: number): number {
  return kindBoost + appPriority(app) * 10 + statusWeight(app.status) * 100;
}

function compareOverviewActions(a: OverviewAction, b: OverviewAction): number {
  if (b.priority !== a.priority) return b.priority - a.priority;

  const statusA = (a.metadata?.statusWeight as number | undefined) ?? 0;
  const statusB = (b.metadata?.statusWeight as number | undefined) ?? 0;
  if (statusB !== statusA) return statusB - statusA;

  const updatedA = (a.metadata?.lastUpdated as string | undefined) ?? "";
  const updatedB = (b.metadata?.lastUpdated as string | undefined) ?? "";
  if (updatedA !== updatedB) return updatedA.localeCompare(updatedB);

  return a.title.localeCompare(b.title);
}

function withAppMetadata(
  action: OverviewAction,
  app: ApplicationWithJob
): OverviewAction {
  return {
    ...action,
    metadata: {
      ...action.metadata,
      applicationId: app.id,
      jobId: app.job_id,
      status: app.status,
      statusWeight: statusWeight(app.status),
      lastUpdated: app.last_updated,
    },
  };
}

function collectSkillNudges(
  apps: ApplicationWithJob[],
  profileSkills: string[]
): OverviewAction[] {
  const skillSet = new Set(profileSkills.map((s) => s.toLowerCase().trim()).filter(Boolean));
  const keywordCounts = new Map<string, number>();

  for (const app of apps) {
    const job = app.job;
    if (!job) continue;
    const hasJdText =
      Boolean(job.description_raw?.trim()) ||
      Boolean(job.tech_stack?.length) ||
      Boolean(job.required_qualifications?.length);
    if (!hasJdText) continue;

    const keywords = extractJdKeywords(parsedJd(app), job.description_raw);
    const seenForApp = new Set<string>();
    for (const keyword of keywords) {
      const normalized = keyword.toLowerCase().trim();
      if (!normalized || skillSet.has(normalized) || seenForApp.has(normalized)) continue;
      seenForApp.add(normalized);
      keywordCounts.set(normalized, (keywordCounts.get(normalized) ?? 0) + 1);
    }
  }

  const actions: OverviewAction[] = [];
  for (const [keyword, count] of keywordCounts) {
    if (count < SKILL_NUDGE_MIN_JD_COUNT) continue;
    actions.push({
      kind: "skill_nudge",
      priority: 150 + count,
      title: `Add ${keyword} to profile`,
      subtitle:
        count === 1
          ? "Mentioned in a saved job description"
          : `Mentioned in ${count} saved job descriptions`,
      href: "/profile?tab=skills",
      metadata: { keyword, jdCount: count },
    });
  }

  return actions.sort((a, b) => b.priority - a.priority);
}

export function deriveOverviewActions(input: DeriveOverviewActionsInput): OverviewAction[] {
  const {
    apps,
    resumeSignals,
    interviewSummaries,
    pendingConflictsCount,
    profileSkills,
    readinessBlockers = [],
  } = input;

  const actions: OverviewAction[] = [];

  for (const blocker of readinessBlockers) {
    actions.push({
      kind: "profile_blocker",
      priority: 900,
      title: blocker.message,
      subtitle: "Complete your profile to tailor resumes",
      href: blocker.href,
      metadata: { field: blocker.field },
    });
  }

  if (pendingConflictsCount > 0) {
    actions.push({
      kind: "import_conflicts",
      priority: 700,
      title:
        pendingConflictsCount === 1
          ? "1 import conflict needs review"
          : `${pendingConflictsCount} import conflicts need review`,
      subtitle: "Resolve duplicates before your next import",
      href: "/profile/import",
      metadata: { count: pendingConflictsCount },
    });
  }

  const needsReviewCount = apps.filter((app) => app.needs_review).length;
  if (needsReviewCount > 0) {
    actions.push({
      kind: "capture_review",
      priority: 720,
      title:
        needsReviewCount === 1
          ? "Review 1 captured role"
          : `Review ${needsReviewCount} captured roles`,
      subtitle: "Polish extension quick-captures before applying",
      href: "/applications?needsReview=1",
      metadata: { count: needsReviewCount },
    });
  }

  for (const app of apps) {
    const signals = resumeSignals[app.id];
    const prepSummary = app.job_id ? interviewSummaries[app.job_id] : undefined;

    if (!signals?.hasResume) {
      actions.push(
        withAppMetadata(
          {
            kind: "tailor_resume",
            priority: baseAppPriority(app, 650),
            title: "Tailor resume",
            subtitle: jobLabel(app),
            href: resumeBuilderUrl(app.id),
          },
          app
        )
      );
    } else {
      if (signals.keywordGaps.length > 0) {
        actions.push(
          withAppMetadata(
            {
              kind: "keyword_gaps",
              priority: baseAppPriority(app, 550),
              title: resumeGapLabel(signals.keywordGaps.length),
              subtitle:
                signals.atsScore != null
                  ? `${resumeAtsLabel(signals.atsScore)} · ${jobLabel(app)}`
                  : jobLabel(app),
              href: resumeBuilderUrl(app.id),
              metadata: {
                gapCount: signals.keywordGaps.length,
                gaps: signals.keywordGaps.slice(0, 5),
              },
            },
            app
          )
        );
      }

      if (!signals.hasPdf) {
        actions.push(
          withAppMetadata(
            {
              kind: "export_pdf",
              priority: baseAppPriority(app, 500),
              title: "Export resume PDF",
              subtitle: jobLabel(app),
              href: resumeBuilderUrl(app.id),
            },
            app
          )
        );
      }
    }

    if (app.status === "saved" && app.job_id) {
      actions.push(
        withAppMetadata(
          {
            kind: "apply_saved",
            priority: baseAppPriority(app, 450),
            title: "Apply to saved role",
            subtitle: jobLabel(app),
            href: "/applications",
          },
          app
        )
      );
    }

    if (PREP_STATUSES.includes(app.status) && app.job_id) {
      const prep = prepSummary ?? {
        total: 0,
        unpracticed: 0,
        unrated: 0,
        missingPersonalized: 0,
      };

      if (prep.total === 0) {
        actions.push(
          withAppMetadata(
            {
              kind: "generate_questions",
              priority: baseAppPriority(app, 800),
              title: "Generate interview questions",
              subtitle: jobLabel(app),
              href: interviewPrepUrl(app.job_id),
            },
            app
          )
        );
      }

      if (prep.unpracticed > 0) {
        actions.push(
          withAppMetadata(
            {
              kind: "practice_interview",
              priority: baseAppPriority(app, 780),
              title:
                prep.unpracticed === 1
                  ? "Practice 1 interview question"
                  : `Practice ${prep.unpracticed} interview questions`,
              subtitle: jobLabel(app),
              href: interviewPrepUrl(app.job_id),
              metadata: { unpracticed: prep.unpracticed },
            },
            app
          )
        );
      }
    }
  }

  actions.push(...collectSkillNudges(apps, profileSkills));

  return actions.sort(compareOverviewActions);
}

export function buildReadinessBlockersFromValidation(
  suggestions: { field: string; severity: string; message: string }[]
): TailoringBlocker[] {
  return suggestions
    .filter((s) => s.severity === "error")
    .map((s) => ({
      field: s.field,
      message: s.message,
      href:
        s.field === "experiences"
          ? "/profile?tab=experience"
          : s.field === "target_roles"
            ? "/profile"
            : "/profile",
    }));
}
