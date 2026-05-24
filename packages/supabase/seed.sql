-- HireVault seed data (local dev only)
-- Run after migrations with a test user signed up via Google OAuth.
-- Replace USER_ID with your auth.users id from Supabase dashboard.

-- Example (uncomment and set user id after first login):
-- insert into public.experiences (profile_id, company, title, is_current, bullet_points)
-- select p.id, 'Acme Corp', 'Software Engineer', true, array['Built APIs', 'Led migrations']
-- from public.profiles p
-- where p.user_id = 'YOUR-USER-UUID-HERE';
