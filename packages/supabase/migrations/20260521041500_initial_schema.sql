-- HireVault initial schema (Phase 1)
-- Requires Supabase Auth (auth.users)

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.profile_source as enum ('resume_upload', 'linkedin', 'manual');
create type public.skill_category as enum ('language', 'framework', 'tool', 'soft_skill');
create type public.job_type as enum ('full_time', 'internship', 'contract');
create type public.application_status as enum (
  'saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'
);
create type public.interview_type as enum (
  'phone_screen', 'technical', 'behavioral', 'system_design', 'onsite', 'final'
);
create type public.interview_outcome as enum ('pending', 'passed', 'failed');
create type public.question_category as enum (
  'behavioral', 'technical', 'situational', 'role_specific'
);
create type public.mock_session_type as enum ('behavioral', 'technical', 'mixed');

-- Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  headline text,
  summary text,
  location text,
  phone text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  raw_resume_data jsonb,
  source public.profile_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_user_id_idx on public.profiles (user_id);

-- Profile sections
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  company text not null,
  title text not null,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  bullet_points text[] not null default '{}',
  technologies text[] not null default '{}',
  source public.profile_source not null default 'manual',
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index experiences_profile_id_idx on public.experiences (profile_id);

create table public.education (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  start_date date,
  expected_graduation date,
  gpa real check (gpa is null or (gpa >= 0 and gpa <= 4.5)),
  relevant_courses text[] not null default '{}',
  source public.profile_source not null default 'manual',
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index education_profile_id_idx on public.education (profile_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  technologies text[] not null default '{}',
  url text,
  github_url text,
  bullet_points text[] not null default '{}',
  source public.profile_source not null default 'manual',
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_profile_id_idx on public.projects (profile_id);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  category public.skill_category not null default 'tool',
  proficiency_level int check (proficiency_level is null or (proficiency_level >= 1 and proficiency_level <= 5)),
  source public.profile_source not null default 'manual',
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index skills_profile_id_idx on public.skills (profile_id);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  institution text,
  completion_date date,
  credential_url text,
  source public.profile_source not null default 'manual',
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_profile_id_idx on public.courses (profile_id);

-- Jobs & applications (Phase 3+ UI; schema ready Phase 1)
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  company text not null,
  location text,
  url text,
  description_raw text,
  description_parsed jsonb,
  required_qualifications text[] not null default '{}',
  preferred_qualifications text[] not null default '{}',
  tech_stack text[] not null default '{}',
  salary_range text,
  job_type public.job_type,
  scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_user_id_idx on public.jobs (user_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  status public.application_status not null default 'saved',
  applied_date date,
  last_updated timestamptz not null default now(),
  notes text[] not null default '{}',
  priority int check (priority is null or (priority >= 1 and priority <= 5)),
  referral_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_id_idx on public.applications (user_id);
create index applications_job_id_idx on public.applications (job_id);

create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index application_notes_application_id_idx on public.application_notes (application_id);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  type public.interview_type not null,
  scheduled_at timestamptz,
  interviewer_name text,
  notes text,
  outcome public.interview_outcome not null default 'pending',
  prep_notes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interviews_application_id_idx on public.interviews (application_id);

create table public.tailored_resumes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  content jsonb not null default '{}',
  pdf_storage_path text,
  template_used text,
  generated_at timestamptz not null default now(),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tailored_resumes_application_id_idx on public.tailored_resumes (application_id);

create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  question text not null,
  category public.question_category not null,
  suggested_answer text,
  personalized_answer text,
  practiced boolean not null default false,
  difficulty int check (difficulty is null or (difficulty >= 1 and difficulty <= 5)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interview_questions_job_id_idx on public.interview_questions (job_id);

create table public.mock_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  session_type public.mock_session_type not null,
  conversation_log jsonb not null default '[]',
  feedback text,
  conducted_at timestamptz not null default now(),
  score int check (score is null or (score >= 0 and score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mock_sessions_user_id_idx on public.mock_sessions (user_id);

-- updated_at triggers
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger experiences_set_updated_at before update on public.experiences
  for each row execute function public.set_updated_at();
create trigger education_set_updated_at before update on public.education
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger skills_set_updated_at before update on public.skills
  for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger applications_set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger application_notes_set_updated_at before update on public.application_notes
  for each row execute function public.set_updated_at();
create trigger interviews_set_updated_at before update on public.interviews
  for each row execute function public.set_updated_at();
create trigger tailored_resumes_set_updated_at before update on public.tailored_resumes
  for each row execute function public.set_updated_at();
create trigger interview_questions_set_updated_at before update on public.interview_questions
  for each row execute function public.set_updated_at();
create trigger mock_sessions_set_updated_at before update on public.mock_sessions
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, source)
  values (new.id, 'manual');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.experiences enable row level security;
alter table public.education enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.courses enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.application_notes enable row level security;
alter table public.interviews enable row level security;
alter table public.tailored_resumes enable row level security;
alter table public.interview_questions enable row level security;
alter table public.mock_sessions enable row level security;

-- Helper: profile belongs to current user
create or replace function public.user_owns_profile(profile_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = profile_uuid and user_id = auth.uid()
  );
$$;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Profile section policies (via profile ownership)
create policy "Users manage own experiences"
  on public.experiences for all
  using (public.user_owns_profile(profile_id))
  with check (public.user_owns_profile(profile_id));

create policy "Users manage own education"
  on public.education for all
  using (public.user_owns_profile(profile_id))
  with check (public.user_owns_profile(profile_id));

create policy "Users manage own projects"
  on public.projects for all
  using (public.user_owns_profile(profile_id))
  with check (public.user_owns_profile(profile_id));

create policy "Users manage own skills"
  on public.skills for all
  using (public.user_owns_profile(profile_id))
  with check (public.user_owns_profile(profile_id));

create policy "Users manage own courses"
  on public.courses for all
  using (public.user_owns_profile(profile_id))
  with check (public.user_owns_profile(profile_id));

-- Jobs & downstream (user_id = auth.uid())
create policy "Users manage own jobs"
  on public.jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own applications"
  on public.applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own application notes"
  on public.application_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage interviews for own applications"
  on public.interviews for all
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  );

create policy "Users manage tailored resumes for own applications"
  on public.tailored_resumes for all
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  );

create policy "Users manage interview questions for own jobs"
  on public.interview_questions for all
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.user_id = auth.uid()
    )
  );

create policy "Users manage own mock sessions"
  on public.mock_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Grants
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
