/** Pure helpers for dev data reset (testable without Supabase). */

export interface DevDataSummary {
  profile: {
    experiences: number;
    education: number;
    leadership: number;
    skills: number;
    courses: number;
    projects: number;
  };
  pipeline: {
    jobs: number;
    applications: number;
    tailored_resumes: number;
    company_research: number;
  };
  import: {
    ingestion_runs: number;
    dedup_conflicts: number;
    dedup_conflicts_pending: number;
  };
  other: {
    interview_questions: number;
    extension_tokens: number;
    resume_storage_files: number;
  };
}

export const EMPTY_DEV_DATA_SUMMARY: DevDataSummary = {
  profile: {
    experiences: 0,
    education: 0,
    leadership: 0,
    skills: 0,
    courses: 0,
    projects: 0,
  },
  pipeline: {
    jobs: 0,
    applications: 0,
    tailored_resumes: 0,
    company_research: 0,
  },
  import: {
    ingestion_runs: 0,
    dedup_conflicts: 0,
    dedup_conflicts_pending: 0,
  },
  other: {
    interview_questions: 0,
    extension_tokens: 0,
    resume_storage_files: 0,
  },
};

/** Build storage object paths for files listed under a user prefix. */
export function buildResumeStoragePaths(userId: string, fileNames: string[]): string[] {
  return fileNames
    .filter((name) => name && !name.endsWith("/"))
    .map((name) => `${userId}/${name}`);
}

export function formatPipelineClearSummary(counts: {
  applications: number;
  jobs: number;
  tailored_resumes: number;
  company_research: number;
}): string {
  const parts: string[] = [];
  if (counts.applications) parts.push(`${counts.applications} application(s)`);
  if (counts.jobs) parts.push(`${counts.jobs} job(s)`);
  if (counts.tailored_resumes) parts.push(`${counts.tailored_resumes} tailored resume(s)`);
  if (counts.company_research) parts.push(`${counts.company_research} company research row(s)`);
  return parts.length ? `Removed ${parts.join(", ")}.` : "Pipeline was already empty.";
}

export function formatProfileClearSummary(counts: {
  sections: number;
  storageFiles: number;
}): string {
  const parts: string[] = [];
  if (counts.sections) parts.push(`${counts.sections} profile section row(s)`);
  if (counts.storageFiles) parts.push(`${counts.storageFiles} storage file(s)`);
  return parts.length
    ? `Cleared profile data (${parts.join(", ")}).`
    : "Profile scalars reset; no section rows to delete.";
}

export const PIPELINE_DELETE_ORDER = [
  "tailored_resumes",
  "applications",
  "jobs",
  "company_research",
] as const;

export const PROFILE_SECTION_TABLES = [
  "experiences",
  "education",
  "leadership",
  "skills",
  "courses",
  "projects",
] as const;
