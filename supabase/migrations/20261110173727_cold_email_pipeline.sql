-- Private outreach data, isolated from registered users and lifecycle email.
create table public.cold_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  state text not null default 'draft' check (state in ('draft','running','paused')),
  variants jsonb not null,
  daily_limit integer not null default 25 check (daily_limit between 1 and 300),
  created_at timestamptz not null default now()
);
create table public.cold_prospects (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  first_name text,
  city text,
  country text not null default 'US' check (country = 'US'),
  source_url text not null,
  fit_note text not null,
  created_at timestamptz not null default now()
);
create table public.cold_suppressions (
  email text primary key,
  reason text not null check (reason in ('unsubscribe','reply','bounce','complaint','manual')),
  created_at timestamptz not null default now()
);
create table public.cold_jobs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.cold_campaigns(id),
  prospect_id uuid not null references public.cold_prospects(id),
  variant text not null check (variant in ('A','B')),
  state text not null default 'queued' check (state in ('queued','sending','accepted','failed','unknown','suppressed')),
  lease uuid,
  claimed_at timestamptz,
  accepted_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  positive_at timestamptz,
  trial_started_at timestamptz,
  activated_at timestamptz,
  outcome text check (outcome in ('positive','negative','bounce','complaint','trial_started','activated')),
  message_id text,
  created_at timestamptz not null default now(),
  unique (campaign_id, prospect_id),
  unique (prospect_id)
);
-- No authenticated/anonymous access. Admin routes and the worker use service_role.
alter table public.cold_campaigns enable row level security;
alter table public.cold_prospects enable row level security;
alter table public.cold_jobs enable row level security;
alter table public.cold_suppressions enable row level security;
revoke all on public.cold_campaigns, public.cold_prospects, public.cold_jobs, public.cold_suppressions from anon, authenticated;
grant all on public.cold_campaigns, public.cold_prospects, public.cold_jobs, public.cold_suppressions to service_role;
create index cold_jobs_queue on public.cold_jobs(created_at) where state = 'queued';
create index cold_jobs_claimed on public.cold_jobs(claimed_at);

-- Campaign lock serializes queue creation with state changes; duplicate-safe.
create function public.cold_enqueue(p_campaign uuid) returns integer
language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  perform 1 from public.cold_campaigns where id=p_campaign for update;
  if not found then raise exception 'Campaign not found'; end if;
  if exists(select 1 from public.cold_campaigns where id=p_campaign and state <> 'draft') then
    raise exception 'Queue can only be built while draft';
  end if;
  insert into public.cold_jobs(campaign_id,prospect_id,variant)
  select p_campaign,p.id,case when (get_byte(decode(md5(p.email || p_campaign::text),'hex'),0) % 2)=0 then 'A' else 'B' end
  from public.cold_prospects p
  where not exists(select 1 from public.cold_suppressions s where s.email=p.email)
    and not exists(select 1 from public.cold_jobs j where j.prospect_id=p.id)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- One reservation per call, globally serialized budget across workers/campaigns.
-- Failed/unknown attempts also consume the daily budget. No automatic retries.
create function public.cold_claim() returns setof public.cold_jobs
language plpgsql security invoker set search_path = '' as $$
declare j public.cold_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(70743101);
  update public.cold_jobs set state='unknown'
    where state='sending' and claimed_at < now()-interval '15 minutes';
  if (select count(*) from public.cold_jobs where claimed_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= 300 then return; end if;
  select q.* into j from public.cold_jobs q join public.cold_campaigns c on c.id=q.campaign_id
  join public.cold_prospects p on p.id=q.prospect_id
  where q.state='queued' and c.state='running'
    and not exists(select 1 from public.cold_suppressions s where s.email=p.email)
    and (select count(*) from public.cold_jobs d where d.campaign_id=c.id and d.claimed_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') < c.daily_limit
  order by q.created_at,q.id limit 1 for update of q skip locked;
  if j.id is null then return; end if;
  update public.cold_jobs set state='sending',lease=gen_random_uuid(),claimed_at=now() where id=j.id returning * into j;
  return next j;
end $$;

create function public.cold_suppress(p_email text, p_reason text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.cold_suppressions(email,reason) values(lower(trim(p_email)),p_reason)
    on conflict(email) do nothing;
  update public.cold_jobs set state='suppressed'
    where state='queued' and prospect_id in(select id from public.cold_prospects where email=lower(trim(p_email)));
end $$;

-- Prevent draft edits racing the first claim / resume.
create function public.cold_update_campaign(p_id uuid,p_state text,p_variants jsonb,p_limit integer) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(70743101);
  perform 1 from public.cold_campaigns where id=p_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  if p_variants is not null and exists(select 1 from public.cold_jobs where campaign_id=p_id and claimed_at is not null) then
    raise exception 'Copy is frozen after the first claim; create a new campaign';
  end if;
  update public.cold_campaigns set state=coalesce(p_state,state),variants=coalesce(p_variants,variants),daily_limit=coalesce(p_limit,daily_limit) where id=p_id;
end $$;

revoke all on function public.cold_enqueue(uuid),public.cold_claim(),public.cold_suppress(text,text),public.cold_update_campaign(uuid,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.cold_enqueue(uuid),public.cold_claim(),public.cold_suppress(text,text),public.cold_update_campaign(uuid,text,jsonb,integer) to service_role;
