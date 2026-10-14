-- When someone last opened the app or the dashboard (Oct 2026). Bank
-- connections cost a monthly Plaid fee whether anyone looks at them, so a
-- free account idle for 30 days has its bank disconnected (lib/bank-cleanup).
-- Existing accounts start from the rollout, so nobody is cut off on day one.
alter table public.profiles
  add column if not exists last_active_at timestamptz not null default now();
