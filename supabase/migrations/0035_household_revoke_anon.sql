-- 0035_household_revoke_anon.sql
-- Follow-up to 0016. That migration ends each helper with
--
--   REVOKE ALL ON FUNCTION ... FROM PUBLIC;
--   GRANT EXECUTE ON FUNCTION ... TO authenticated;
--
-- and its comment claims the result is "exposed to authenticated". It is not.
-- Supabase ships ALTER DEFAULT PRIVILEGES granting EXECUTE on new functions in
-- `public` to anon, authenticated and service_role individually, so a freshly
-- created function's ACL already reads
--
--   {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--
-- Revoking from PUBLIC removes only the PUBLIC pseudo-role entry. The explicit
-- per-role grants are separate ACL entries and survive it untouched, which is
-- why the Supabase linter reported both helpers as anon-executable over
-- /rest/v1/rpc/ right after 0016 was applied.
--
-- Not exploitable as written: both helpers key off auth.uid(), which is NULL
-- for an unauthenticated caller, so my_household_id() returns NULL and
-- is_household_peer() returns false for every input — no membership or user
-- enumeration is possible. This is closed because the grant contradicts the
-- migration's own stated intent, not because it currently leaks.
--
-- The lesson for any future SECURITY DEFINER helper here: REVOKE FROM PUBLIC
-- is not enough on Supabase. Name the roles.

REVOKE EXECUTE ON FUNCTION my_household_id() FROM anon;
REVOKE EXECUTE ON FUNCTION is_household_peer(UUID) FROM anon;
