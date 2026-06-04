-- Extension capture and other server routes use SUPABASE_SERVICE_ROLE_KEY.
-- Initial schema granted public tables only to authenticated/anon, not service_role.

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Tables created after the initial grant (explicit for idempotency on partial deploys)
grant all on table public.extension_tokens to service_role;
grant all on table public.company_research to service_role;
grant all on table public.ingestion_runs to service_role;
grant all on table public.dedup_conflicts to service_role;
grant all on table public.leadership to service_role;
