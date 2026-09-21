/**
 * Google Search Console, without the SDK.
 *
 * `googleapis` is a very large dependency for two HTTP calls, and the auth it
 * would do for us is a signed JWT swapped for an access token — about twenty
 * lines with node:crypto, which is already there. The rest is one POST.
 *
 * Server-only: it signs with a private key.
 */

import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export type GscDimension = "date" | "page" | "query";

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscConfig {
  clientEmail: string;
  privateKey: string;
  siteUrl: string;
}

/**
 * The three settings this needs, or null when it is not configured.
 *
 * Returns null rather than throwing so the cron can report "not configured"
 * as an ordinary outcome. A job that crashes on a missing environment
 * variable looks like a broken job; this one is simply switched off until the
 * service account exists.
 */
export function gscConfig(): GscConfig | null {
  const clientEmail = process.env.GSC_CLIENT_EMAIL?.trim();
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  // Vercel stores the PEM on one line, so the newlines arrive escaped.
  // crypto rejects the key outright if they are left that way.
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!clientEmail || !privateKey || !siteUrl) return null;
  return { clientEmail, privateKey, siteUrl };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * A service-account access token.
 *
 * Google's two-legged flow: sign a claim set asserting who we are and what we
 * want, POST it, get a token back. No user consent screen, no refresh token —
 * the signature is the credential, so it is minted fresh each run.
 */
async function accessToken(config: GscConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = base64url(
    crypto.createSign("RSA-SHA256").update(`${header}.${claims}`).sign(config.privateKey),
  );

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });

  if (!res.ok) {
    // Google's error body names the real cause — a clock skew, an unshared
    // property, an API that was never enabled. Worth keeping verbatim.
    throw new Error(`Google token request failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Google returned no access token");
  return body.access_token;
}

/**
 * One searchAnalytics query.
 *
 * `rowLimit` caps what Google returns; it orders by clicks descending, so a
 * truncated result keeps the rows worth having. `startDate`/`endDate` are
 * inclusive and in the property's timezone, which Google fixes to
 * America/Los_Angeles regardless of where anyone is.
 */
export async function querySearchAnalytics(
  config: GscConfig,
  params: { startDate: string; endDate: string; dimensions: GscDimension[]; rowLimit?: number },
): Promise<GscRow[]> {
  const token = await accessToken(config);
  const endpoint =
    `https://www.googleapis.com/webmasters/v3/sites/` +
    `${encodeURIComponent(config.siteUrl)}/searchAnalytics/query`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions,
      rowLimit: params.rowLimit ?? 1000,
      type: "web",
    }),
  });

  if (!res.ok) {
    throw new Error(`Search Console query failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { rows?: GscRow[] };
  // No rows is a real answer, not an error: it is what "nothing ranked in
  // this window" looks like, and for this site that is the likely result.
  return body.rows ?? [];
}

/** YYYY-MM-DD, n days before today, in UTC. */
export function dayOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
