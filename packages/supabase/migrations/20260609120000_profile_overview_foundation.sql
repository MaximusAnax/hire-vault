-- Stream 0: import preview gate + overview velocity setting

alter table public.ingestion_runs
  drop constraint if exists ingestion_runs_status_check;

alter table public.ingestion_runs
  add constraint ingestion_runs_status_check
  check (status in (
    'pending',
    'processing',
    'completed',
    'failed',
    'awaiting_confirm',
    'cancelled'
  ));

alter table public.ingestion_runs
  add column if not exists preview_summary jsonb;

alter table public.profiles
  add column if not exists weekly_application_goal int not null default 5;
