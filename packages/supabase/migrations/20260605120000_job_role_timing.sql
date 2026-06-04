-- Role cohort timing for internships / new-grad pipelines (e.g. Fall 2026 → fall + 2026).

do $$ begin
  create type public.role_season as enum ('spring', 'summer', 'fall', 'winter');
exception
  when duplicate_object then null;
end $$;

alter table public.jobs
  add column if not exists role_season public.role_season,
  add column if not exists role_year smallint;

alter table public.jobs
  drop constraint if exists jobs_role_year_range;

alter table public.jobs
  add constraint jobs_role_year_range
  check (role_year is null or (role_year >= 2000 and role_year <= 2100));

comment on column public.jobs.role_season is 'Cohort season: spring, summer, fall, winter';
comment on column public.jobs.role_year is 'Cohort year, e.g. 2026 for Fall ''26';
