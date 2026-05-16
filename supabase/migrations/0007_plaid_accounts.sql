create table if not exists public.plaid_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  plaid_item_id     uuid not null references public.plaid_items(id) on delete cascade,
  plaid_account_id  text not null,
  name              text not null,
  official_name     text,
  type              text not null,
  subtype           text,
  balance_current   numeric,
  balance_available numeric,
  balance_limit     numeric,
  iso_currency_code text default 'USD',
  mask              text,
  updated_at        timestamptz not null default now(),
  constraint plaid_accounts_account_id_key unique (plaid_account_id)
);

alter table public.plaid_accounts enable row level security;

create policy "Users can read own accounts"
  on public.plaid_accounts for select using (auth.uid() = user_id);
