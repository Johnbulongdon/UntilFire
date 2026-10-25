// The real account that scripts sign in as (Journeys capture, dev:login).
// It never pays and never deletes.
export const BOT_EMAIL = 'journeys-bot@untilfire.com'

/** Signs the test account in through the admin API and returns its Supabase session. */
export async function botSession(supabaseUrl: string, serviceKey: string): Promise<Record<string, unknown>> {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
  const post = (path: string, body: object) => fetch(`${supabaseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  await post('/auth/v1/admin/users', { email: BOT_EMAIL, email_confirm: true }) // 422 once it exists
  const link = await (await post('/auth/v1/admin/generate_link', { type: 'magiclink', email: BOT_EMAIL })).json()
  const res = await post('/auth/v1/verify', { type: 'magiclink', token_hash: link.hashed_token ?? link.properties?.hashed_token })
  if (!res.ok) throw new Error(`Test account sign-in failed: ${res.status} ${await res.text()}`)
  const session = await res.json()
  // Keep the retention emails away from an inbox nobody reads.
  await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: session.user.id, marketing_unsubscribed_at: new Date().toISOString() }),
  })
  return { ...session, expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in }
}

/** Where each app keeps its session in localStorage. */
export const SITE_AUTH_KEY = 'fire-dashboard-auth' // lib/supabase.ts storageKey
export const appAuthKey = (supabaseUrl: string) => `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token` // supabase-js default
