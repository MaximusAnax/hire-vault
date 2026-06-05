-- Extension capture API uses SUPABASE_SERVICE_ROLE_KEY; phase-4 migration only granted authenticated.

grant all on table public.extension_tokens to service_role;
grant all on table public.extension_tokens to authenticated;

-- Same gap for company_research (service-role reads in future APIs)
grant all on table public.company_research to service_role;
