# Authentication & Supabase Setup

This is the live setup guide for UntilFire. The earlier version of this doc described a legacy `user_plans` plan-tracker and a `middleware.ts` route guard; neither matches the running app. See the *Legacy notes* section at the bottom if you find references to those elsewhere.

## Architecture at a glance

- **Auth provider:** Supabase Google OAuth (PKCE flow). Initiated from `/login`, completed at `/auth/callback`.
- **Client:** `lib/supabase.ts` exports a singleton browser client with `persistSession`, `autoRefreshToken`, and `storageKey: 'fire-dashboard-auth'`.
- **Auth context:** `lib/auth-context.tsx` exposes `useAuth()` for `user`, `loading`, and `signOut`. Wrapped at the root in `app/layout.tsx`.
- **Route protection:** there is **no `middleware.ts`**. Protected pages (today: `/dashboard`) check the session client-side and redirect to `/login` when unauthenticated. Row Level Security on Supabase is the real security boundary; the redirect is a UX nicety. `docs/DECISIONS.md` (2026-03) explicitly chose RLS over middleware.
- **Server-side admin:** `app/api/stripe/webhook/route.ts` uses `SUPABASE_SERVICE_ROLE_KEY` to upsert into `subscriptions`. Never expose that key to the client.

## Live data model

Bootstrap SQL: `supabase-setup.sql` (run once on a fresh Supabase project).

| Table | Owner / writer | Read by | Notes |
|---|---|---|---|
| `user_budget` | `authenticated` (RLS by `user_id`) | `app/dashboard/page.tsx`, `app/dashboard/TransactionsTab.tsx` | One row per user. `expenses` is jsonb keyed by category plus `_fire_profile` blob. |
| `expenses` | `authenticated` (RLS by `user_id`) | `app/dashboard/page.tsx`, `app/dashboard/TransactionsTab.tsx` | Transaction log. `transaction_type` ∈ `expense \| income`. |
| `subscriptions` | `service_role` (Stripe webhook) | `lib/supabase.ts` `getSubscription/isPro`, `app/api/stripe/{portal,checkout}/route.ts` | Authenticated users have SELECT-only RLS; writes use service role from the webhook. |
| `waitlist` | `anon` (public form) | n/a — no client reads | INSERT-only policy, unique on `email`. |

Tables that are NOT in the live app and NOT in the bootstrap SQL: `user_plans`, `stash_history`. Components that reference them (`CalculatorForm`, `PlanList`, `LogStashForm`, `QuickAddButton`, `ProjectionChart`) are orphaned in `/components` and not imported by any active route as of this document.

## Environment variables

Required on every environment:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Required for Stripe / paid tier (server only):

```
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_PRO_PRICE_ID=...
STRIPE_WEBHOOK_SECRET=...
```

Without the public Supabase vars, `lib/env.getOptionalSupabaseEnv()` returns `null`, the client falls back to a placeholder, and the waitlist API responds with 503. The dashboard will fail to load a session.

## Fresh-environment setup

1. **Create the Supabase project.** New project → wait for the database to provision.
2. **Enable Google OAuth.** Authentication → Providers → Google. Add the OAuth client and set:
   - **Authorized redirect URI:** `https://<project-ref>.supabase.co/auth/v1/callback` (the Supabase value, not your app URL).
3. **Configure auth URLs.** Authentication → URL Configuration:
   - **Site URL:** your deployed canonical UntilFire origin (e.g. `https://untilfire.com` or `https://www.untilfire.com`, whichever you actually use live). This is the URL Google should show to users on the consent screen instead of the raw `*.supabase.co` project URL.
   - **Redirect URLs:** add every origin you sign in from, including local dev. The app sends users back to `/auth/callback` on the local origin for localhost and to the canonical production URL in `lib/site.ts` for live sign-ins.
4. **Run the schema.** SQL Editor → paste `supabase-setup.sql` → Run. It is idempotent and uses `IF NOT EXISTS` plus `DROP POLICY IF EXISTS` so re-running is safe.
5. **Set environment variables.** In `.env.local` for local dev or in the Vercel project settings for production. The anon key and URL are visible in Supabase → Project Settings → API.
6. **Run the app.**
   ```bash
   npm install
   npm run dev
   ```
   - Visit `http://localhost:3000` — calculator should render without auth.
   - Visit `http://localhost:3000/dashboard` — should bounce to `/login` (client-side redirect because there is no session).
   - Sign in with Google → land on `/dashboard` → enter income/expense values → confirm a row appears in `user_budget`. Add a transaction → confirm it appears in `expenses`.

## Using auth in code

```tsx
'use client'
import { useAuth } from '@/lib/auth-context'

export default function Component() {
  const { user, loading, signOut } = useAuth()
  if (loading) return null
  if (!user) return <a href="/login">Sign in</a>
  return <button onClick={signOut}>Sign out {user.email}</button>
}
```

User-scoped Supabase queries (RLS-enforced):

```tsx
const { data: { session } } = await supabase.auth.getSession()
if (!session) return
await supabase
  .from('expenses')
  .insert({ user_id: session.user.id, /* ...rest */ })
```

`auth.uid() = user_id` policies will reject inserts that omit `user_id` or use someone else's id, so always include `session.user.id` from the live session.

## Why no `middleware.ts`?

- RLS already prevents cross-user data access. A middleware redirect adds no security; it is purely UX.
- Next.js 15 + Supabase SSR middleware adds cookie-juggling and edge runtime constraints that were not worth the cost for a single protected route.
- The dashboard already does the redirect itself in its mount effect, and there are no other authenticated pages today.

If we add more protected routes (e.g. `/profile`, `/settings`), revisit this decision and either (a) add a small `middleware.ts` using `@supabase/ssr` or (b) factor a shared `useRequireSession()` hook. Update this section when that happens.

## Troubleshooting

- **`/dashboard` instantly bounces back to `/login`** — Supabase env vars are missing or wrong, or the session cookie was cleared. Check the browser console for `Missing Supabase environment variables` and verify `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` are loaded (`process.env.NEXT_PUBLIC_SUPABASE_URL` in DevTools).
- **OAuth redirect loop** — the Site URL or Redirect URL list in Supabase does not include the origin you are signing in from. Add it.
- **`new row violates row-level security policy`** — the insert is missing `user_id` or the value does not match `auth.uid()`. Always set `user_id: session.user.id`.
- **Stripe webhook does not update `subscriptions`** — the route uses `SUPABASE_SERVICE_ROLE_KEY`. If unset, writes will silently fail RLS. Configure the env var in the deployment.
- **Waitlist POST returns 503** — `getOptionalSupabaseEnv()` returned `null`. Set the public Supabase env vars and redeploy.

## Legacy notes

Earlier docs described `user_plans`, `stash_history`, and a `middleware.ts`. None of those are in `supabase-setup.sql` or the live app today. The components that reference them are orphaned and may be deleted in a follow-up cleanup. If you find a doc, comment, or commit that still references them, treat it as stale.
