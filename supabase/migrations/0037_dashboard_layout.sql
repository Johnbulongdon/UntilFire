-- 0037_dashboard_layout.sql
-- Home becomes arrangeable: which cards you see, in what order, at what width.
--
-- On profiles rather than its own table: every user already has exactly one
-- profile row, its RLS is already correct, and a layout is a preference rather
-- than a record of anything. A new table would need its own policies for no
-- gain.
--
-- NULL means "never customised", which is deliberately different from an empty
-- object. A user who has hidden every card gets an empty layout and should
-- keep it; a user who has never touched it gets the defaults, and picks up any
-- card added later. lib/dashboard-layout.ts holds that merge.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dashboard_layout JSONB;

COMMENT ON COLUMN profiles.dashboard_layout IS
  'Home card arrangement: {"cards":[{"id":"hero","visible":true,"span":"full"},...]}. NULL = never customised, use defaults. Layout preference only — never financial data.';
