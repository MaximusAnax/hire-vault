-- leadership was created after the initial "grant all on all tables" migration.
-- RLS policies exist but authenticated users lacked base table privileges.

grant all on table public.leadership to authenticated;
