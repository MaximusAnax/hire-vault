import { describe, expect, it } from "vitest";
import type { ApplicationWithJob, Job } from "@hirevault/types";
import {
  deriveOverviewActions,
  SKILL_NUDGE_MIN_JD_COUNT,
  type DeriveOverviewActionsInput,
} from "./derive-overview-actions";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    user_id: "user-1",
    title: "Software Engineer",
    company: "Acme",
    location: null,
    locations: [],
    url: null,
    description_raw: null,
    description_parsed: null,
    required_qualifications: [],
    preferred_qualifications: [],
    tech_stack: [],
    salary_range: null,
    job_type: null,
    role_season: null,
    role_year: null,
    scraped_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeApp(overrides: Partial<ApplicationWithJob> = {}): ApplicationWithJob {
  const job = overrides.job === null ? null : (overrides.job ?? makeJob());
  return {
    id: "app-1",
    user_id: "user-1",
    job_id: job?.id ?? null,
    status: "saved",
    applied_date: null,
    last_updated: "2026-06-01T00:00:00Z",
    notes: [],
    priority: 3,
    referral_contact: null,
    needs_review: false,
    capture_source: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    job,
    ...overrides,
  };
}

function baseInput(overrides: Partial<DeriveOverviewActionsInput> = {}): DeriveOverviewActionsInput {
  return {
    apps: [],
    resumeSignals: {},
    interviewSummaries: {},
    pendingConflictsCount: 0,
    profileSkills: [],
    readinessBlockers: [],
    ...overrides,
  };
}

describe("deriveOverviewActions ranking", () => {
  it("ranks screening prep above saved tailor actions", () => {
    const screeningApp = makeApp({
      id: "app-screening",
      status: "screening",
      priority: 1,
      last_updated: "2026-06-05T00:00:00Z",
      job: makeJob({ id: "job-screening" }),
      job_id: "job-screening",
    });
    const savedApp = makeApp({
      id: "app-saved",
      status: "saved",
      priority: 5,
      last_updated: "2026-06-01T00:00:00Z",
      job: makeJob({ id: "job-saved", company: "Beta" }),
      job_id: "job-saved",
    });

    const actions = deriveOverviewActions(
      baseInput({
        apps: [savedApp, screeningApp],
        interviewSummaries: {
          "job-screening": {
            total: 0,
            unpracticed: 0,
            unrated: 0,
            missingPersonalized: 0,
          },
        },
      })
    );

    const prepIndex = actions.findIndex((a) => a.kind === "generate_questions");
    const tailorIndex = actions.findIndex((a) => a.kind === "tailor_resume");
    expect(prepIndex).toBeGreaterThanOrEqual(0);
    expect(tailorIndex).toBeGreaterThanOrEqual(0);
    expect(prepIndex).toBeLessThan(tailorIndex);
  });

  it("sorts by priority desc, then status weight, then oldest last_updated", () => {
    const olderInterview = makeApp({
      id: "app-old",
      status: "interview",
      priority: 3,
      last_updated: "2026-06-01T00:00:00Z",
      job: makeJob({ id: "job-old", company: "OldCo" }),
      job_id: "job-old",
    });
    const newerInterview = makeApp({
      id: "app-new",
      status: "interview",
      priority: 3,
      last_updated: "2026-06-10T00:00:00Z",
      job: makeJob({ id: "job-new", company: "NewCo" }),
      job_id: "job-new",
    });

    const actions = deriveOverviewActions(
      baseInput({
        apps: [newerInterview, olderInterview],
        interviewSummaries: {
          "job-old": { total: 2, unpracticed: 1, unrated: 0, missingPersonalized: 0 },
          "job-new": { total: 2, unpracticed: 1, unrated: 0, missingPersonalized: 0 },
        },
      })
    );

    const practiceActions = actions.filter((a) => a.kind === "practice_interview");
    expect(practiceActions).toHaveLength(2);
    expect(practiceActions[0]?.metadata?.applicationId).toBe("app-old");
    expect(practiceActions[1]?.metadata?.applicationId).toBe("app-new");
  });
});

describe("deriveOverviewActions prep coupling", () => {
  it("emits prep actions only for screening and interview statuses", () => {
    const apps = [
      makeApp({
        id: "saved",
        status: "saved",
        job_id: "job-saved",
        job: makeJob({ id: "job-saved" }),
      }),
      makeApp({
        id: "applied",
        status: "applied",
        job_id: "job-applied",
        job: makeJob({ id: "job-applied", company: "AppliedCo" }),
      }),
      makeApp({
        id: "screening",
        status: "screening",
        job_id: "job-screening",
        job: makeJob({ id: "job-screening", company: "ScreenCo" }),
      }),
    ];

    const actions = deriveOverviewActions(
      baseInput({
        apps,
        interviewSummaries: {
          "job-screening": {
            total: 0,
            unpracticed: 0,
            unrated: 0,
            missingPersonalized: 0,
          },
        },
      })
    );

    const prepKinds = actions
      .filter((a) => a.kind === "generate_questions" || a.kind === "practice_interview")
      .map((a) => a.metadata?.applicationId);

    expect(prepKinds).toEqual(["screening"]);
  });

  it("does not emit prep actions without a job_id", () => {
    const actions = deriveOverviewActions(
      baseInput({
        apps: [
          makeApp({
            id: "screening-no-job",
            status: "screening",
            job_id: null,
            job: null,
          }),
        ],
      })
    );

    expect(
      actions.some(
        (a) => a.kind === "generate_questions" || a.kind === "practice_interview"
      )
    ).toBe(false);
  });
});

describe("deriveOverviewActions skill nudges", () => {
  it("emits skill nudges when a keyword appears in multiple JDs and is missing from profile", () => {
    const kubernetesJob = makeJob({
      id: "job-k8s-1",
      tech_stack: ["Kubernetes", "Go"],
      description_raw: "Build services with Kubernetes",
    });
    const kubernetesJob2 = makeJob({
      id: "job-k8s-2",
      company: "Beta",
      tech_stack: ["Kubernetes", "Python"],
      description_raw: "Operate Kubernetes clusters",
    });

    const actions = deriveOverviewActions(
      baseInput({
        apps: [
          makeApp({
            id: "app-1",
            job_id: kubernetesJob.id,
            job: kubernetesJob,
          }),
          makeApp({
            id: "app-2",
            job_id: kubernetesJob2.id,
            job: kubernetesJob2,
          }),
        ],
        profileSkills: ["Python", "Go"],
      })
    );

    const nudge = actions.find((a) => a.kind === "skill_nudge" && a.metadata?.keyword === "kubernetes");
    expect(nudge).toBeDefined();
    expect(nudge?.metadata?.jdCount).toBeGreaterThanOrEqual(SKILL_NUDGE_MIN_JD_COUNT);
    expect(nudge?.href).toBe("/profile?tab=skills");
  });

  it("skips skill nudges when the keyword is already on the profile", () => {
    const job = makeJob({
      tech_stack: ["Kubernetes"],
      description_raw: "Kubernetes platform team",
    });

    const actions = deriveOverviewActions(
      baseInput({
        apps: [
          makeApp({ id: "app-1", job_id: job.id, job }),
          makeApp({
            id: "app-2",
            job_id: "job-2",
            job: makeJob({ id: "job-2", tech_stack: ["Kubernetes"] }),
          }),
        ],
        profileSkills: ["Kubernetes"],
      })
    );

    expect(actions.some((a) => a.kind === "skill_nudge")).toBe(false);
  });

  it("skips skill nudges below the minimum JD count threshold", () => {
    const job = makeJob({
      tech_stack: ["Rust"],
      description_raw: "Rust systems programming",
    });

    const actions = deriveOverviewActions(
      baseInput({
        apps: [makeApp({ id: "app-1", job_id: job.id, job })],
        profileSkills: [],
      })
    );

    expect(actions.some((a) => a.kind === "skill_nudge" && a.metadata?.keyword === "rust")).toBe(
      false
    );
  });
});

describe("deriveOverviewActions import and resume signals", () => {
  it("surfaces import conflicts and keyword gap actions", () => {
    const app = makeApp({
      id: "app-resume",
      status: "applied",
      job_id: "job-resume",
      job: makeJob({ id: "job-resume" }),
    });

    const actions = deriveOverviewActions(
      baseInput({
        apps: [app],
        pendingConflictsCount: 2,
        resumeSignals: {
          "app-resume": {
            hasResume: true,
            keywordGaps: ["graphql", "redis"],
            atsScore: 72,
            pendingTechSuggestions: 0,
            hasPdf: true,
            generatedAt: "2026-06-01T00:00:00Z",
          },
        },
      })
    );

    expect(actions.some((a) => a.kind === "import_conflicts")).toBe(true);
    expect(actions.some((a) => a.kind === "keyword_gaps")).toBe(true);
    expect(actions.some((a) => a.kind === "tailor_resume")).toBe(false);
  });

  it("surfaces capture review when applications need_review", () => {
    const actions = deriveOverviewActions(
      baseInput({
        apps: [
          makeApp({ id: "app-review-1", needs_review: true }),
          makeApp({ id: "app-review-2", needs_review: true }),
          makeApp({ id: "app-clean" }),
        ],
      })
    );

    const captureReview = actions.find((a) => a.kind === "capture_review");
    expect(captureReview?.title).toBe("Review 2 captured roles");
    expect(captureReview?.href).toBe("/applications?needsReview=1");
    expect(captureReview?.metadata?.count).toBe(2);
  });
});
