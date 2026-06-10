/** Shared HireVault database types (mirrors Supabase schema) */

export type ProfileSource = "resume_upload" | "linkedin" | "manual";

export type SkillCategory = "language" | "framework" | "tool" | "soft_skill";

export type JobType = "full_time" | "internship" | "contract";

export type RoleSeason = "spring" | "summer" | "fall" | "winter";

/** How an application was captured into the pipeline. */
export type CaptureSource = "extension" | "web";

export type CaptureScrapeConfidence = "high" | "medium" | "low";

/**
 * Structured job capture draft — shared contract for web preview, extension preview/save APIs.
 * Built server-side via `buildCapturePreview`; extension mirrors this shape client-side.
 */
export interface CaptureDraft {
  title: string;
  company: string;
  url?: string;
  description_raw: string;
  job_type: JobType | null;
  role_season: RoleSeason | null;
  role_year: number | null;
  locations: string[];
  tech_stack: string[];
  required_qualifications: string[];
  preferred_qualifications: string[];
  salary_range: string | null;
  priority: number | null;
  scrape_source?: string;
  confidence?: CaptureScrapeConfidence;
  degraded?: boolean;
  warning?: string;
}

export interface CaptureDraftSaveOptions {
  skip_ai_parse?: boolean;
  priority?: number | null;
  needs_review?: boolean;
  capture_source?: CaptureSource;
  createApplication?: boolean;
}

export const ROLE_SEASONS: readonly RoleSeason[] = [
  "spring",
  "summer",
  "fall",
  "winter",
] as const;

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-time",
  internship: "Internship",
  contract: "Contract",
};

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type QuestionCategory =
  | "behavioral"
  | "technical"
  | "situational"
  | "role_specific";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  headline: string | null;
  location: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  raw_resume_data: Record<string, unknown> | null;
  source: ProfileSource;
  target_roles: string[];
  technical_skills_tex: string | null;
  /** User-set weekly application target for velocity widget (default 5). */
  weekly_application_goal: number;
  created_at: string;
  updated_at: string;
}

export interface Leadership {
  id: string;
  profile_id: string;
  organization: string;
  title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  bullet_points: string[];
  source: ProfileSource;
  source_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Experience {
  id: string;
  profile_id: string;
  company: string;
  title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  bullet_points: string[];
  technologies: string[];
  source: ProfileSource;
  source_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Education {
  id: string;
  profile_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  expected_graduation: string | null;
  gpa: number | null;
  relevant_courses: string[];
  source: ProfileSource;
  source_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  technologies: string[];
  url: string | null;
  github_url: string | null;
  bullet_points: string[];
  source: ProfileSource;
  source_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  profile_id: string;
  name: string;
  category: SkillCategory;
  proficiency_level: number | null;
  source: ProfileSource;
  source_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  profile_id: string;
  name: string;
  institution: string | null;
  completion_date: string | null;
  credential_url: string | null;
  source: ProfileSource;
  source_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  title: string;
  company: string;
  /** Legacy single-string location, kept for backward compatibility. */
  location: string | null;
  /** Multi-location chip array. Populated by refinement iteration 1; older rows may be empty. */
  locations: string[];
  url: string | null;
  description_raw: string | null;
  description_parsed: Record<string, unknown> | null;
  required_qualifications: string[];
  preferred_qualifications: string[];
  tech_stack: string[];
  salary_range: string | null;
  job_type: JobType | null;
  /** Cohort season for intern/new-grad roles (e.g. fall for Fall '26). */
  role_season: RoleSeason | null;
  /** Cohort year (e.g. 2026). */
  role_year: number | null;
  scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string | null;
  status: ApplicationStatus;
  applied_date: string | null;
  last_updated: string;
  notes: string[];
  priority: number | null;
  referral_contact: string | null;
  /** True when saved via quick capture and awaiting web review. */
  needs_review: boolean;
  /** Origin of capture; null for rows created before capture tracking. */
  capture_source: CaptureSource | null;
  created_at: string;
  updated_at: string;
}

export interface TailoredResume {
  id: string;
  application_id: string;
  job_id: string | null;
  user_id: string | null;
  content: Record<string, unknown>;
  pdf_storage_path: string | null;
  template_used: string | null;
  label: string | null;
  ats_score: number | null;
  match_summary: Record<string, unknown> | null;
  keyword_gaps: string[];
  generated_at: string;
  version: number;
  user_edited_at: string | null;
  latex_source: string | null;
  latex_edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileSection =
  | "experiences"
  | "education"
  | "projects"
  | "skills"
  | "courses"
  | "leadership";

export type IngestionRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "awaiting_confirm"
  | "cancelled";

export type MergeStrategy = "conservative" | "newest_wins";

export type SectionUpsertAction = "insert" | "update" | "skip" | "conflict";

export interface SectionUpsertPlan {
  action: SectionUpsertAction;
  section: ProfileSection;
  incoming: Record<string, unknown>;
  existingId?: string;
  existing?: Record<string, unknown>;
  merged?: Record<string, unknown>;
}

export interface PreviewSectionCounts {
  insert: number;
  update: number;
  skip: number;
  conflict: number;
}

export interface PreviewProfileHeader {
  changedFields: string[];
  update: Record<string, unknown>;
}

export interface PreviewSummary {
  bySection: Partial<Record<ProfileSection, PreviewSectionCounts>>;
  totals: PreviewSectionCounts;
  plans: SectionUpsertPlan[];
  profileHeader?: PreviewProfileHeader;
}

export type OverviewActionKind =
  | "tailor_resume"
  | "keyword_gaps"
  | "export_pdf"
  | "generate_questions"
  | "practice_interview"
  | "profile_blocker"
  | "import_conflicts"
  | "apply_saved"
  | "skill_nudge"
  | "capture_review";

export interface OverviewAction {
  kind: OverviewActionKind;
  priority: number;
  title: string;
  subtitle: string;
  href: string;
  metadata?: Record<string, unknown>;
}

export interface OverviewActionGroup {
  kind: OverviewActionKind;
  priority: number;
  title: string;
  subtitle: string;
  href: string;
  count: number;
  items: OverviewAction[];
}

export type OverviewQueueItem =
  | { type: "global"; action: OverviewAction }
  | { type: "group"; group: OverviewActionGroup };

export interface IngestionRun {
  id: string;
  profile_id: string;
  user_id: string;
  source: ProfileSource;
  status: IngestionRunStatus;
  storage_path: string | null;
  file_name: string | null;
  raw_text: string | null;
  parsed_data: Record<string, unknown> | null;
  preview_summary: PreviewSummary | null;
  items_inserted: number;
  items_merged: number;
  items_skipped: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type DedupResolution = "pending" | "keep_existing" | "use_incoming" | "merged";

export interface DedupConflict {
  id: string;
  profile_id: string;
  section: ProfileSection;
  existing_id: string;
  incoming_data: Record<string, unknown>;
  source: ProfileSource;
  resolution: DedupResolution;
  created_at: string;
  updated_at: string;
}

/** LinkedIn OAuth connection metadata (tokens stored encrypted server-side). */
export interface LinkedInConnection {
  id: string;
  profile_id: string;
  linkedin_member_id: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/** Application with joined job for dashboard views */
export interface ApplicationWithJob extends Application {
  job: Job | null;
}

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export const PIPELINE_COLUMNS: ApplicationStatus[] = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
];

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        Omit<Profile, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      experiences: TableDef<
        Experience,
        Omit<Experience, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      education: TableDef<
        Education,
        Omit<Education, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      projects: TableDef<
        Project,
        Omit<Project, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      skills: TableDef<
        Skill,
        Omit<Skill, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      courses: TableDef<
        Course,
        Omit<Course, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      leadership: TableDef<
        Leadership,
        Omit<Leadership, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      jobs: TableDef<Job>;
      applications: TableDef<Application>;
      tailored_resumes: TableDef<
        TailoredResume,
        Omit<TailoredResume, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      linkedin_connections: TableDef<
        LinkedInConnection & {
          access_token_enc: string;
          refresh_token_enc: string | null;
        },
        {
          profile_id: string;
          linkedin_member_id: string;
          access_token_enc: string;
          refresh_token_enc?: string | null;
          expires_at: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
