alter table public.profiles
  add column if not exists preferred_currencies text[] not null default '{}';
