-- Refinement iteration 1 / Phase A:
-- Profile target roles + pitch + summary state + per-entity snippet cache.
-- Keeps the legacy `headline` column for backward compatibility (no longer surfaced).

-- --------------------------------------------------------------------------
-- profiles: new columns
-- --------------------------------------------------------------------------
alter table public.profiles
  add column if not exists target_roles text[] not null default '{}',
  add column if not exists pitch text,
  add column if not exists summary_stale boolean not null default false,
  add column if not exists summary_assembled_at timestamptz;

-- --------------------------------------------------------------------------
-- profile_summary_snippets: per-entity 1-2 sentence AI snippets used to
-- assemble the profile-level summary cheaply.
-- --------------------------------------------------------------------------
create table if not exists public.profile_summary_snippets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  entity_type text not null check (
    entity_type in ('experience', 'education', 'project', 'skill', 'course')
  ),
  entity_id uuid not null,
  snippet text not null,
  source_hash text not null,
  model text not null default 'gpt-4o-mini',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, entity_type, entity_id)
);

create index if not exists profile_summary_snippets_profile_id_idx
  on public.profile_summary_snippets (profile_id);
create index if not exists profile_summary_snippets_entity_idx
  on public.profile_summary_snippets (entity_type, entity_id);

create trigger profile_summary_snippets_set_updated_at
  before update on public.profile_summary_snippets
  for each row execute function public.set_updated_at();

alter table public.profile_summary_snippets enable row level security;

-- Snippets are scoped to the owning profile; reuse the existing helper.
create policy "Users manage own profile summary snippets"
  on public.profile_summary_snippets for all
  using (public.user_owns_profile(profile_id))
  with check (public.user_owns_profile(profile_id));

grant all on public.profile_summary_snippets to authenticated;
