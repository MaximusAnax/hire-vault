-- Phase 2: ingestion storage, runs, dedup conflicts, source_hash triggers

-- Resume storage bucket (private, user-scoped paths: {user_id}/{filename})
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Storage RLS
create policy "Users upload own resumes"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own resumes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own resumes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Ingestion run tracking
create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source public.profile_source not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  storage_path text,
  file_name text,
  raw_text text,
  parsed_data jsonb,
  items_inserted int not null default 0,
  items_merged int not null default 0,
  items_skipped int not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingestion_runs_profile_id_idx on public.ingestion_runs (profile_id);
create index ingestion_runs_user_id_idx on public.ingestion_runs (user_id);

-- Dedup conflict queue for user resolution
create table public.dedup_conflicts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  section text not null
    check (section in ('experiences', 'education', 'projects', 'skills', 'courses')),
  existing_id uuid not null,
  incoming_data jsonb not null,
  source public.profile_source not null,
  resolution text not null default 'pending'
    check (resolution in ('pending', 'keep_existing', 'use_incoming', 'merged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dedup_conflicts_profile_id_idx on public.dedup_conflicts (profile_id);
create index dedup_conflicts_pending_idx on public.dedup_conflicts (profile_id)
  where resolution = 'pending';

create trigger ingestion_runs_set_updated_at
  before update on public.ingestion_runs
  for each row execute function public.set_updated_at();

create trigger dedup_conflicts_set_updated_at
  before update on public.dedup_conflicts
  for each row execute function public.set_updated_at();

alter table public.ingestion_runs enable row level security;
alter table public.dedup_conflicts enable row level security;

create policy "Users manage own ingestion runs"
  on public.ingestion_runs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own dedup conflicts"
  on public.dedup_conflicts for all
  using (public.user_owns_profile(profile_id))
  with check (public.user_owns_profile(profile_id));

-- Normalize text for hashing
create or replace function public.normalize_hash_part(val text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(coalesce(val, ''), '\s+', ' ', 'g')));
$$;

create or replace function public.set_experience_source_hash()
returns trigger
language plpgsql
as $$
begin
  new.source_hash := encode(
    digest(
      public.normalize_hash_part(new.company) || '|' ||
      public.normalize_hash_part(new.title) || '|' ||
      coalesce(new.start_date::text, ''),
      'sha256'
    ),
    'hex'
  );
  return new;
end;
$$;

create or replace function public.set_education_source_hash()
returns trigger
language plpgsql
as $$
begin
  new.source_hash := encode(
    digest(
      public.normalize_hash_part(new.institution) || '|' ||
      public.normalize_hash_part(new.degree) || '|' ||
      coalesce(new.start_date::text, ''),
      'sha256'
    ),
    'hex'
  );
  return new;
end;
$$;

create or replace function public.set_project_source_hash()
returns trigger
language plpgsql
as $$
begin
  new.source_hash := encode(
    digest(public.normalize_hash_part(new.name), 'sha256'),
    'hex'
  );
  return new;
end;
$$;

create or replace function public.set_skill_source_hash()
returns trigger
language plpgsql
as $$
begin
  new.source_hash := encode(
    digest(public.normalize_hash_part(new.name), 'sha256'),
    'hex'
  );
  return new;
end;
$$;

create or replace function public.set_course_source_hash()
returns trigger
language plpgsql
as $$
begin
  new.source_hash := encode(
    digest(
      public.normalize_hash_part(new.name) || '|' ||
      public.normalize_hash_part(new.institution),
      'sha256'
    ),
    'hex'
  );
  return new;
end;
$$;

drop trigger if exists experiences_source_hash on public.experiences;
create trigger experiences_source_hash
  before insert or update on public.experiences
  for each row execute function public.set_experience_source_hash();

drop trigger if exists education_source_hash on public.education;
create trigger education_source_hash
  before insert or update on public.education
  for each row execute function public.set_education_source_hash();

drop trigger if exists projects_source_hash on public.projects;
create trigger projects_source_hash
  before insert or update on public.projects
  for each row execute function public.set_project_source_hash();

drop trigger if exists skills_source_hash on public.skills;
create trigger skills_source_hash
  before insert or update on public.skills
  for each row execute function public.set_skill_source_hash();

drop trigger if exists courses_source_hash on public.courses;
create trigger courses_source_hash
  before insert or update on public.courses
  for each row execute function public.set_course_source_hash();

-- Backfill existing rows
update public.experiences set company = company;
update public.education set institution = institution;
update public.projects set name = name;
update public.skills set name = name;
update public.courses set name = name;

grant all on public.ingestion_runs to authenticated;
grant all on public.dedup_conflicts to authenticated;
