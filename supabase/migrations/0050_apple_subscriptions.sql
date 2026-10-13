-- Pro bought through Apple's in-app purchase lives in the same subscriptions
-- table as Stripe (D-75), so every check that asks "is this person Pro?" keeps
-- working unchanged. `source` says who bills; Apple rows carry the original
-- transaction ID that Apple's renewal notices refer to, and whether the
-- subscription will renew (which decides whether the account can be deleted).
alter table public.subscriptions
  add column if not exists source text not null default 'stripe',
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_product_id text,
  add column if not exists auto_renew boolean;

alter table public.subscriptions
  drop constraint if exists subscriptions_source_check;
alter table public.subscriptions
  add constraint subscriptions_source_check check (source in ('stripe', 'apple'));

-- One Apple purchase belongs to one UntilFire account.
create unique index if not exists subscriptions_apple_original_transaction_id_key
  on public.subscriptions (apple_original_transaction_id)
  where apple_original_transaction_id is not null;
