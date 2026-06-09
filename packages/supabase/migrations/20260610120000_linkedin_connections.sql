-- LinkedIn OAuth token storage (Stream 6)

create table public.linkedin_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  linkedin_member_id text not null,
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index linkedin_connections_profile_id_idx on public.linkedin_connections (profile_id);

create trigger linkedin_connections_set_updated_at
  before update on public.linkedin_connections
  for each row execute function public.set_updated_at();

alter table public.linkedin_connections enable row level security;

create policy "Users manage own linkedin connections"
  on public.linkedin_connections for all
  using (public.user_owns_profile(profile_id))
  with check (public.user_owns_profile(profile_id));

grant all on table public.linkedin_connections to authenticated;
