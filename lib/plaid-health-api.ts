import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlaidApi, CountryCode } from 'plaid';
import { plaidErrorCode, plaidErrorOutcome } from './plaid-errors.ts';

type Dependencies = { admin: SupabaseClient; plaid: Pick<PlaidApi, 'itemGet' | 'linkTokenCreate'>; countries: CountryCode[]; iosRedirect?: string };
type Item = { id: string; institution_name: string; last_synced_at: string | null; plaid_access_token: string };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

async function owner(req: Request, admin: SupabaseClient) {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

/** Read-only connection checks. An import timestamp is never advanced here. */
export async function bankHealth(req: Request, { admin, plaid }: Dependencies): Promise<Response> {
  const user = await owner(req, admin);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { data, error } = await admin.from('plaid_items')
    .select('id,institution_name,last_synced_at,plaid_access_token')
    .eq('user_id', user.id).order('created_at', { ascending: true });
  if (error) return json({ error: "Couldn't load your banks. Try again." }, 503);
  const items = (data ?? []) as Item[];
  const banks: Record<string, unknown>[] = [];
  const deadline = Date.now() + 40000;
  // Bound upstream concurrency; one unavailable institution cannot hide the others.
  for (let offset = 0; offset < items.length; offset += 4) {
    const batch = await Promise.all(items.slice(offset, offset + 4).map(async item => {
      let status: 'connected' | 'attention' | 'unknown' = 'unknown';
      let reconnect = false;
      try {
        if (Date.now() >= deadline) throw new Error('Status check deadline');
        const response = await plaid.itemGet({ access_token: item.plaid_access_token }, { timeout: 8000 });
        const code = response.data.item.error?.error_code;
        reconnect = plaidErrorOutcome(code) === 'reconnect';
        status = response.data.item.error ? (code ? 'attention' : 'unknown') : 'connected';
      } catch (err) {
        reconnect = plaidErrorOutcome(plaidErrorCode(err)) === 'reconnect';
        if (reconnect) status = 'attention';
      }
      return { id: item.id, name: item.institution_name || 'Your bank', lastSyncedAt: item.last_synced_at, status, reconnect };
    }));
    banks.push(...batch);
  }
  return json({ banks, checkedAt: new Date().toISOString() });
}

/** Update mode only: no products, token exchange, new item or subscription gate. */
export async function bankReconnect(req: Request, { admin, plaid, countries, iosRedirect }: Dependencies): Promise<Response> {
  const user = await owner(req, admin);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || !('item_id' in body) || typeof body.item_id !== 'string' || !body.item_id.trim()
    || !('platform' in body) || typeof body.platform !== 'string' || !['ios', 'android'].includes(body.platform)) return json({ error: 'Invalid bank request' }, 400);
  const { data: item, error } = await admin.from('plaid_items').select('plaid_access_token')
    .eq('user_id', user.id).eq('id', body.item_id).maybeSingle();
  if (error) return json({ error: "Couldn't load this bank. Try again." }, 503);
  if (!item) return json({ error: 'Bank not found' }, 404);
  if (body.platform === 'ios' && !iosRedirect) return json({ error: 'Bank reconnect is temporarily unavailable on iPhone.' }, 503);
  try {
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id }, client_name: 'UntilFire', language: 'en', country_codes: countries,
      access_token: item.plaid_access_token,
      ...(body.platform === 'android' ? { android_package_name: 'com.untilfire.app' } : { redirect_uri: iosRedirect }),
    }, { timeout: 10000 });
    return json({ link_token: response.data.link_token });
  } catch {
    return json({ error: "Couldn't start reconnecting. Try again." }, 503);
  }
}
