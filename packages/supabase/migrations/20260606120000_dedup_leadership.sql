-- Allow leadership rows in dedup conflict queue (added in lean recruitment migration).

alter table public.dedup_conflicts
  drop constraint if exists dedup_conflicts_section_check;

alter table public.dedup_conflicts
  add constraint dedup_conflicts_section_check
  check (section in ('experiences', 'education', 'projects', 'skills', 'courses', 'leadership'));
