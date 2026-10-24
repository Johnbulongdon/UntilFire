-- A free month of Pro for finishing the FIRE type quiz (D-79): no card, once
-- per account, only for someone who has never had a trial. It lives in the
-- subscriptions row like any other Pro, so every "is this person Pro?" check
-- works unchanged; source 'reward' marks it, and current_period_end is when
-- /api/cron/reward-expiry turns it back to free.
alter table public.subscriptions
  drop constraint if exists subscriptions_source_check;
alter table public.subscriptions
  add constraint subscriptions_source_check check (source in ('stripe', 'apple', 'reward'));

-- When the month was given, so it is given once whatever happens to the row.
alter table public.profiles
  add column if not exists reward_month_at timestamptz;
