-- Application capture review inbox: flag quick extension saves for web polish.

alter table public.applications
  add column if not exists needs_review boolean not null default false,
  add column if not exists capture_source text;

comment on column public.applications.needs_review is
  'True when capture was saved without full side-panel edit (review on web).';

comment on column public.applications.capture_source is
  'Origin of capture: extension, web, or null for legacy rows.';
