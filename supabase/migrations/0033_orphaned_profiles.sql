-- 0033_orphaned_profiles.sql
--
-- Three users existed in auth and nowhere else.
--
-- profiles rows are created by the welcome-email route, so anyone who signed
-- up before it existed — or for whom it failed — never got one. The retention
-- job selects candidates from profiles, which means those users were invisible
-- to every stage of the lifecycle: no welcome, no day 1, no day 3, no day 7.
-- Three of thirteen, all from April and May 2026, each of whom signed in
-- exactly once and never returned. One had filled in a budget.
--
-- This gives them a profile so they are counted, and suppresses the sequence
-- so they are not emailed. They signed up five months ago; a "you have gone
-- quiet" note about an account they may not remember opening is a spam
-- complaint, not a re-activation.
--
-- The stage timestamps here mean "do not send", NOT "was sent". The truth
-- about what was actually delivered lives in lifecycle_events, which this
-- deliberately does not write to — so the admin Retention tab continues to
-- report these stages as missed, because they were.

INSERT INTO profiles (
  user_id, display_name,
  welcome_email_sent_at, day1_email_sent_at, day3_email_sent_at, day7_email_sent_at
)
SELECT
  u.id,
  LEFT(TRIM(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')), 120),
  NOW(), NOW(), NOW(), NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- Google hands over full_name on every sign-in and it was never copied across,
-- so every email greeted every user as nobody. Captured going forward in
-- app/api/email/welcome/route.ts; this catches the ones already here.
UPDATE profiles p
SET display_name = LEFT(TRIM(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')), 120)
FROM auth.users u
WHERE u.id = p.user_id
  AND (p.display_name IS NULL OR p.display_name = '')
  AND COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') IS NOT NULL;
