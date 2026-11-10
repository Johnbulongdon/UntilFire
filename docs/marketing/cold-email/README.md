# Cold outreach pipeline

Owner: Codex. Requested by John, 11 November 2026. Baseline: latest pushed main
55ed7e469c32d25bfe3ff2fee3e1c8a9695adc59. Implementation for review; not live.

## What is built

Admin → Cold outreach is separate from Emails and all signup/lifecycle sending.
Create campaigns, edit A/B hooks, preview the approved cinematic-phone template,
import qualified U.S. prospects with public-source evidence, build a duplicate-safe
queue, set a 1–300 daily cap, pause/start, stop outreach, and log results.
Default cap is 25. A/B assignment is a stable hash of campaign and email; it is
approximately 50/50, not an exact split. Copy freezes after the first reservation.
A prospect gets at most one initial outreach across campaigns. No automatic
follow-ups or requeue/retry control is included in this first version.

UntilFire is a personal finance app. Never call the product a calculator in
public copy. The shared 30-day Pro trial applies to first-time subscribers;
paid subscription follows unless canceled. The phone image is illustrative.

## Delivery and measurement

This builds the software, not a free internet mail server. The worker uses any
properly configured authenticated TLS SMTP service whose terms permit the
campaign. Resend and the signup pipeline are never used as a fallback. Free
forwarding still only handles incoming mail. No provider is subscribed and no
SMTP credentials, recipient lists or real emails are bundled or committed.

Counts: queued, sending, server accepted, failed, unknown, suppressed; first
click per job; manually recorded replies, positive replies, trials and activation.
SMTP acceptance is not inbox delivery. A mail scanner can generate a click.
No open pixel, automatic inbox reply ingestion, delivery webhook or automatic
per-recipient trial attribution is claimed. Variant-only acquisition labels use
existing source tracking without embedding prospect identity in the app URL.
Replies/opt-outs must be processed in admin; a logged reply suppresses all future
cold outreach. Trial and activation milestones preserve earlier reply milestones.

Daily budget uses UTC and counts every reserved attempt, including failures and
unknown sends. Global cap is 300 across campaigns/workers. One worker claims one
message, rechecks campaign and suppression before SMTP, then acknowledges it.
A message already being transmitted can finish after pause or unsubscribe.

A worker crash/timeout may mean a message was accepted. Claims older than 15
minutes become unknown on the next claim, never queued again. A failed or unknown
SMTP result pauses the campaign. Manual bounce/complaint outcomes suppress the
address and pause its campaign. A failed acknowledgement stops the worker and
must be investigated before more sends. No promise of exactly-once external SMTP
or guaranteed inbox placement is made.

## Rollout order

1. Review/apply the full SQL below to the intended Supabase project. It creates
   private tables and service-role-only functions; no production migration has
   been applied as part of implementation.
2. Configure server-only env: COLD_EMAIL_SECRET and COLD_EMAIL_WORKER_SECRET,
   independent random values at least 32 characters; COLD_EMAIL_POSTAL_ADDRESS;
   COLD_EMAIL_ENABLED=false initially. Keep secrets out of NEXT_PUBLIC variables.
3. Deploy the reviewed website, verify admin authorization and unsubscribe pages,
   then configure scripts/cold-email-worker/.env from .env.example locally.
   npm ci --omit=dev installs only the pinned SMTP dependency. This worker runs
   on the operator's machine, not Vercel; it adds no subscription or hosted cron.
4. Configure SMTP host, TLS port 465/587, username/password. Verify sender ownership,
   SPF/DKIM/DMARC and both From and Reply-To john.ng@untilfire.com. Use a provider
   permitting this outreach; do not use a recipient quota as evidence of permission.
   Set SMTP_OUTREACH_PERMITTED=true only after that verification. The explicit
   known-incompatible host check is a backstop, not exhaustive provider validation.
5. Add the real business postal address, run a test only to an operator-controlled
   recipient with authorization, verify image rendering, replies and opt-out. Then
   set COLD_EMAIL_ENABLED=true, build a campaign queue and start it from admin.
   Run npm start in scripts/cold-email-worker. Default run attempts at most ten
   messages with a minute between attempts. A scheduler can invoke it repeatedly;
   no background machine task was installed here. Keep the machine awake.
6. Review accepted/reply/outcome results and errors before increasing the cap.
   Opt-out links use signed job IDs, reveal no address, and need no account/login.
   GET shows a confirmation; POST suppresses, including RFC8058 one-click POST.
   Stop server/worker before any rollback. Code rollback can leave private data
   intact; never delete prospects/opt-outs to work around a suppression.

## Boundaries and access

Every admin endpoint calls requireAdminUser; public signed links expose no lists.
All tables have RLS with no anon/authenticated grants or policies. Only server
service_role paths access contact data. Worker endpoints require their own secret.
No provider credentials are returned to the client. The worker disallows URL/file
access in Nodemailer. Administrative imports are 300 rows max with explicit US,
source URL and fit note, normalized email, no guessed names and no overwrite of
existing prospect data. Keep raw names and contact lists outside the public repo.

Admin displays bounded windows: 50 campaigns, 1,000 prospects, 10,000 sends and
10,000 suppressions; these are not all-time totals after those limits are reached.
Do not declare a winning hook from small samples or from opens/clicks alone.

## Full migration SQL

```sql
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

```


## Verification — 11 November 2026

- Six focused tests pass, including real PostgreSQL/PGlite execution of the full
  migration: private-role denial, stable queue/dedup, campaign/global daily caps,
  pause, suppression, copy freeze and uncertain-claim handling. One embedded
  database does not simulate independent PostgreSQL sessions; advisory locking
  and unique constraints also enforce cross-worker consistency.
- Latest-main validation snapshot: TypeScript, ESLint and optimized production
  build pass. Full validate's second build hit a Windows EPERM output-folder
  error; the same production build passed on retry. Existing lint warnings remain.
- Built HTTP endpoints return 401 for unauthenticated admin GET/preview and worker
  requests; invalid public opt-out/click tokens return 400. No DB or SMTP calls
  were needed for those rejection checks.
- Actual component checked with synthetic local-only fixtures: 390px and 1280px,
  no page horizontal overflow, A/B subject switching, preview iframe content,
  prospect import and results tabs, disabled send state; dark tokens verified.
  QA routes/fixtures exist only under .artifacts and are excluded from the patch.
- No real delivery, inbox placement, inbound reply ingestion, production database
  migration or full signed-in production journey was tested. Sender configuration
  and the live postal address remain rollout requirements, not completed setup.
