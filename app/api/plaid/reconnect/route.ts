import { NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { getPlaidClient, plaidCountries } from '@/lib/plaid';
import { bankReconnect } from '@/lib/plaid-health-api';
import { callerKey, rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest): Promise<Response> {
  const limited = rateLimit(callerKey(req, 'plaid-reconnect'), 10);
  if (limited) return limited;
  return bankReconnect(req, { admin: adminClient(), plaid: getPlaidClient(), countries: plaidCountries(), iosRedirect: process.env.PLAID_IOS_REDIRECT_URI });
}
