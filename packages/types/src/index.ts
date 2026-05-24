/** Shared HireVault database types (mirrors Supabase schema) */

export type ProfileSource = "resume_upload" | "linkedin" | "manual";

export type SkillCategory = "language" | "framework" | "tool" | "soft_skill";

export type JobType = "full_time" | "internship" | "contract";

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type InterviewType =
  | "phone_screen"
  | "technical"
  | "behavioral"
  | "system_design"
  | "onsite"
  | "final";

export type InterviewOutcome = "pending" | "passed" | "failed";

export type QuestionCategory =
  | "behavioral"
  | "technical"
  | "situational"
  | "role_specific";

export type MockSessionType = "behavioral" | "technical" | "mixed";

export interface Profile {
  id: string;
  user_id: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  raw_resume_data: Record<string, unknown> | null;
  source: ProfileSource;
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
  location: string | null;
  url: string | null;
  description_raw: string | null;
  description_parsed: Record<string, unknown> | null;
  required_qualifications: string[];
  preferred_qualifications: string[];
  tech_stack: string[];
  salary_range: string | null;
  job_type: JobType | null;
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
  created_at: string;
  updated_at: string;
}

export type ProfileSection =
  | "experiences"
  | "education"
  | "projects"
  | "skills"
  | "courses";

export type IngestionRunStatus = "pending" | "processing" | "completed" | "failed";

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
      jobs: TableDef<Job>;
      applications: TableDef<Application>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
