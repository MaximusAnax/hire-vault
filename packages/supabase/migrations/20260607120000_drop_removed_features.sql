-- Lean recruitment cleanup: drop unused mock and scheduled-interview tables

drop table if exists public.mock_sessions cascade;
drop table if exists public.interviews cascade;

drop type if exists public.mock_session_type;
drop type if exists public.interview_type;
drop type if exists public.interview_outcome;
