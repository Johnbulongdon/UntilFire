-- 0042_function_security.sql
-- Two findings from Supabase's security advisor, 2026-09-24.
--
-- 1. rls_auto_enable() could be called by anyone, signed in or not, at
--    /rest/v1/rpc/rls_auto_enable. It is the function behind the ensure_rls
--    event trigger, which turns on row level security for every new table in
--    public. It is SECURITY DEFINER, so it must not be callable as an API
--    endpoint. Postgres checks EXECUTE on an event trigger's function when
--    the trigger is created, not each time it fires, so revoking the grant
--    closes the endpoint without affecting the trigger.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 2. update_updated_at_column() ran with whatever search_path the caller had,
--    so an object earlier on that path could stand in for the functions it
--    calls. It only uses TIMEZONE and NOW from pg_catalog, which is always
--    searched, so an empty search_path changes nothing for it.
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Deliberately unchanged: household_has_pro(), is_household_peer() and
-- my_household_id() stay SECURITY DEFINER and callable by signed-in users.
-- Row level security policies call them to see across a household, and the
-- app calls household_has_pro() directly; each returns only what concerns
-- the caller. anon already cannot call them (0035_household_revoke_anon).
