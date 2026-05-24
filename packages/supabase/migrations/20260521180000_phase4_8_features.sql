-- Phase 4-8: extension tokens, resume tailoring, interview prep, mock, insights

-- Extension API tokens (hashed; raw shown once on create)
create table public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Chrome extension',
  token_hash text not null unique,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index extension_tokens_user_id_idx on public.extension_tokens (user_id);
create index extension_tokens_hash_idx on public.extension_tokens (token_hash);

create trigger extension_tokens_set_updated_at before update on public.extension_tokens
  for each row execute function public.set_updated_at();

alter table public.extension_tokens enable row level security;

create policy "Users manage own extension tokens"
  on public.extension_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tailored resumes enhancements
alter table public.tailored_resumes
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists label text,
  add column if not exists ats_score int check (ats_score is null or (ats_score >= 0 and ats_score <= 100)),
  add column if not exists match_summary jsonb default '{}',
  add column if not exists keyword_gaps text[] not null default '{}';

create index if not exists tailored_resumes_user_id_idx on public.tailored_resumes (user_id);

-- Interview questions: practice tracking
alter table public.interview_questions
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists practice_rating int check (practice_rating is null or (practice_rating >= 1 and practice_rating <= 5)),
  add column if not exists practiced_at timestamptz,
  add column if not exists self_notes text,
  add column if not exists technical_topics text[] not null default '{}';

-- Mock sessions enhancements
alter table public.mock_sessions
  add column if not exists role_title text,
  add column if not exists feedback_json jsonb default '{}',
  add column if not exists duration_seconds int,
  add column if not exists question_count int default 0;

-- Company research cache (stub-friendly)
create table public.company_research (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  summary text,
  sources jsonb default '[]',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_name)
);

create index company_research_user_id_idx on public.company_research (user_id);

create trigger company_research_set_updated_at before update on public.company_research
  for each row execute function public.set_updated_at();

alter table public.company_research enable row level security;

create policy "Users manage own company research"
  on public.company_research for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on public.extension_tokens to authenticated;
grant all on public.company_research to authenticated;
