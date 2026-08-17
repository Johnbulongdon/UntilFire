# Admin (Ops) Page

Confirmed with John on 2026-08-16. A single internal `/admin` page to run
day-to-day operations: see users, see what's happening, draft and send
email, handle support — without querying Supabase by hand.

## Product decisions (confirmed 2026-08-16)

- **v1 scope: all four.** User directory, revenue/ops snapshot, support
  inbox, and account actions (grant/revoke Pro, delete an account) all
  ship in the first version.
- **Email audience: send-by-default + unsubscribe.** UntilFire has no
  marketing-consent flag — signup only implies product/transactional
  consent. Rather than block the composer on building an opt-in flow first
  (which would leave zero eligible recipients on day one), any registered
  user can be emailed by default, and every broadcast carries a one-click
  unsubscribe that's honored immediately.
- **Composition: reusable template, freeform content.** Not raw HTML, not
  a fully freeform composer either — one branded template
  (`buildAdminAnnouncementEmail`) with a subject, heading, and message body
  John fills in each time. Same visual system as the existing
  welcome/retention/trial-reminder emails.
- **Access: single admin, env-based.** `/admin` is gated by an
  `ADMIN_EMAILS` allowlist env var, checked server-side on every
  `/api/admin/*` call. No new database table for roles — adding a second
  admin later is a one-line env change, not a migration.

## What this is *not*

- **Not a PostHog replacement.** Product analytics, funnels, and retention
  curves already live in PostHog. The Overview tab only surfaces
  billing-shaped numbers PostHog doesn't have natively (MRR from the local
  `subscriptions` table, active Pro count).
- **Not a bulk-email platform.** No scheduling, no A/B subject lines, no
  drip sequences. One compose box, one send, one segment.

## Architecture

### Security model

`/admin` is a client page, matching how the rest of the app authenticates
(this app has no server-side session cookie — auth lives in
localStorage/PKCE, and API routes verify a Bearer token per request; there
is no middleware-level session to gate on). Given that, the security
boundary is **always the API route**, never the page:

- `lib/admin-auth.ts` exports `requireAdminUser(req)` — extracts the Bearer
  token, verifies it against Supabase (`admin.auth.getUser(token)`), then
  checks the resulting email against the `ADMIN_EMAILS` allowlist. Every
  `/api/admin/*` route calls this first, unconditionally.
- `app/admin/page.tsx`'s client-side session/allowlist check is UX only —
  it calls `/api/admin/overview` on mount and shows "you don't have
  access" on a 403. Removing or bypassing that check client-side would hit
  the exact same 403 wall on every real data call.

### Data flow

No client component ever queries Supabase directly for admin data — every
read and write goes through an `/api/admin/*` route using the
service-role client (`adminClient()`), the same pattern already used for
Stripe and Plaid elsewhere in this codebase. This sidesteps needing any
RLS changes for admin access — the service role bypasses RLS entirely, and
the allowlist check is the actual gate.

### Email sending

- `lib/email-html.ts` gained `buildAdminAnnouncementEmail({ heading,
  bodyHtml, unsubscribeUrl })` — reuses the existing `heroCard` /
  `sectionCard` primitives so it looks like the rest of UntilFire's email,
  and always renders an unsubscribe line (the existing lifecycle emails —
  welcome, retention, trial-reminder — deliberately were not retrofitted
  with one; they're transactional/lifecycle, not broadcast marketing).
- `lib/unsubscribe-token.ts` — HMAC(user_id) token so `/unsubscribe?u=...&t=...`
  works without requiring login (the point of one-click unsubscribe) while
  resisting tampering or enumeration. Verified with `timingSafeEqual`.
- `app/api/admin/emails/send/route.ts` resolves the segment (all / free /
  pro), excludes anyone with `profiles.marketing_unsubscribed_at` set, and
  sends **sequentially with a 550ms delay** between calls to stay under
  Resend's rate limit — matching the existing `/api/email/retention` route's
  sequential-loop pattern. Logs one row to `admin_email_sends` per send for
  a lightweight audit trail.

  **Known ceiling, not fixed here:** this is a single synchronous request.
  At UntilFire's current scale (dozens of users) it finishes in seconds.
  If the user base grows into the hundreds+, the sequential loop will
  approach a serverless function's execution-time limit — at that point
  this needs to move to a queued/background job (e.g. a Vercel Cron-polled
  outbox table) instead of a request-scoped loop. Flagging now so it
  doesn't silently become a footgun later.

### Schema (`0017_admin_email.sql`)

```
profiles.marketing_unsubscribed_at   TIMESTAMPTZ, nullable, default NULL
admin_email_sends                    id, subject, segment, recipients, sent_by, created_at
                                      RLS enabled, zero policies for `authenticated`
                                      (default-deny — only service_role touches it,
                                      and only /api/admin/* routes use service_role)
```

No RLS changes needed on existing tables — every admin read/write goes
through the service-role client, not through a browser-side Supabase
client subject to RLS.

## Pages / routes

- `app/admin/page.tsx` — shell, session + allowlist check, tab switcher.
- `app/admin/OverviewTab.tsx` — total users, new (7d/30d), active Pro, MRR,
  waitlist count, feedback count.
- `app/admin/UsersTab.tsx` — directory (email, joined, last seen, plan,
  marketing-subscribed) + grant/revoke Pro + delete (type-the-email-to-confirm,
  irreversible — cascades via the existing `ON DELETE CASCADE` foreign keys).
- `app/admin/EmailsTab.tsx` — segment picker, subject/heading/message
  fields, live preview, confirm-before-send.
- `app/admin/SupportTab.tsx` — feedback + survey responses, merged and
  sorted, newest first.
- `app/unsubscribe/page.tsx` + `app/api/unsubscribe/route.ts` — public,
  no auth, token-verified.

## Required environment variables (not set by this change — deploy-time)

- `ADMIN_EMAILS` — comma-separated allowlist, e.g. `ngjohn101@gmail.com`.
  Server-side only (no `NEXT_PUBLIC_` prefix), so it never reaches the
  client bundle.
- `UNSUBSCRIBE_SECRET` — any random string, used as the HMAC key for
  unsubscribe tokens. The send route and the unsubscribe route both fail
  closed (503 / 400) if either this or `ADMIN_EMAILS` is unset, rather than
  silently operating without protection.

## Deliberately deferred (not v1)

- Waitlist emailing (the composer only targets registered accounts,
  matching "send emails to all users" — the waitlist is a different,
  pre-account entity).
- Manual account-action audit log beyond the email-send log (grant/revoke
  Pro and delete don't currently log *who* did it and *when*, beyond
  Postgres's own row timestamps — worth adding if a second admin joins).
- Pagination on the user directory (fine at dozens of users via a single
  `listUsers({ perPage: 1000 })` call; will need real pagination well
  before hitting that ceiling).
