import { NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { getPlaidClient, plaidCountries } from '@/lib/plaid';
import { bankHealth } from '@/lib/plaid-health-api';
import { callerKey, rateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;
export async function GET(req: NextRequest): Promise<Response> {
  const limited = rateLimit(callerKey(req, 'plaid-health'), 12);
  if (limited) return limited;
  return bankHealth(req, { admin: adminClient(), plaid: getPlaidClient(), countries: plaidCountries() });
}
