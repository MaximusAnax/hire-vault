-- Refinement Iteration 1 — Phase B
-- Adds multi-location support to jobs while preserving the existing single-string `location`
-- column for backward compatibility. New inserts populate both; old rows keep `locations = '{}'`.

alter table public.jobs
  add column if not exists locations text[] not null default '{}';

-- Backfill: copy any non-empty legacy `location` into the new array so existing rows render
-- consistently in the chip UI without a separate one-off migration.
update public.jobs
   set locations = array[location]
 where locations = '{}'
   and location is not null
   and length(trim(location)) > 0;
