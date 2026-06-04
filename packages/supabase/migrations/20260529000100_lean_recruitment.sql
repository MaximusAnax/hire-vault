-- Lean recruitment: drop pitch/summary engine; add LaTeX profile fields + leadership

-- Profile fields for LaTeX heading / skills block
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists technical_skills_tex text;

alter table public.profiles
  drop column if exists pitch,
  drop column if exists summary,
  drop column if exists summary_stale,
  drop column if exists summary_assembled_at;

drop table if exists public.profile_summary_snippets;

-- Leadership (mirrors experiences; maps to resume_ref Leadership section)
create table public.leadership (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  organization text not null,
  title text not null,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  bullet_points text[] not null default '{}',
  source public.profile_source not null default 'manual',
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leadership_profile_id_idx on public.leadership (profile_id);

create trigger leadership_set_updated_at
  before update on public.leadership
  for each row execute function public.set_updated_at();

alter table public.leadership enable row level security;

create policy "Users manage own leadership"
  on public.leadership for all
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- source_hash trigger (same pattern as experiences)
create or replace function public.leadership_source_hash()
returns trigger language plpgsql as $$
begin
  new.source_hash := encode(
    sha256(
      convert_to(
        lower(trim(coalesce(new.organization, ''))) || '|' ||
        lower(trim(coalesce(new.title, ''))) || '|' ||
        coalesce(new.start_date::text, ''),
        'UTF8'
      )
    ),
    'hex'
  );
  return new;
end;
$$;

create trigger leadership_source_hash
  before insert or update on public.leadership
  for each row execute function public.leadership_source_hash();
