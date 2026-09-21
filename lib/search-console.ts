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
  const privateKey = normalisePrivateKey(process.env.GSC_PRIVATE_KEY);
  if (!clientEmail || !privateKey || !siteUrl) return null;
  return { clientEmail, privateKey, siteUrl };
}

/**
 * Turn whatever survived the copy-paste back into a PEM.
 *
 * The key travels from a JSON file, through a clipboard, into a dashboard
 * field, and each leg can mangle it in a way that OpenSSL reports only as
 * `DECODER routines::unsupported` — which says nothing about which leg. The
 * three that actually happen:
 *
 *   - the surrounding double quotes come along from the JSON value
 *   - the newlines stay escaped as the two characters \ and n
 *   - the newlines arrive as CRLF
 *
 * All three are recoverable, so recover them rather than making someone
 * guess which one they hit.
 */
export function normalisePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  // JSON's own quotes, if the value was copied including them.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  // OpenSSL wants the final newline; a trimmed PEM fails on some versions.
  return key.endsWith("\n") ? key : `${key}\n`;
}

/**
 * What is wrong with the key, in terms that do not print it.
 *
 * Structure only — whether it has the armour, how long it is, how many lines.
 * Enough to tell a truncated paste from a quoted one from a wrong-field one,
 * and it lands in a job_runs row that anyone with database access can read,
 * so it must never carry key material.
 */
function describeKey(key: string): string {
  const hasHeader = /^-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(key);
  const hasFooter = /-----END [A-Z ]*PRIVATE KEY-----\s*$/.test(key);
  const escaped = key.includes("\\n");
  return [
    `length=${key.length}`,
    `lines=${key.split("\n").length}`,
    `header=${hasHeader}`,
    `footer=${hasFooter}`,
    `literal_backslash_n=${escaped}`,
  ].join(" ");
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
  let signature: string;
  try {
    signature = base64url(
      crypto.createSign("RSA-SHA256").update(`${header}.${claims}`).sign(config.privateKey),
    );
  } catch (err) {
    // OpenSSL's own message for a bad PEM is "DECODER routines::unsupported",
    // which is true and useless. Say what the key looks like instead.
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `GSC_PRIVATE_KEY could not be used to sign (${reason}). ` +
        `Key structure: ${describeKey(config.privateKey)}. ` +
        `Expected header=true footer=true literal_backslash_n=false and about 28 lines.`,
    );
  }

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
    const detail = await res.text();
    // A 403 here is almost never "no access" — it is "no access to that
    // string". Google treats https://www.untilfire.com/,
    // https://untilfire.com/ and sc-domain:untilfire.com as three unrelated
    // sites, so the property the service account was added to and the one
    // GSC_SITE_URL names can differ while looking identical to a person.
    // Asking Google what it can see turns that into an answer.
    if (res.status === 403) {
      const visible = await listSites(token).catch(() => null);
      const seen = visible === null
        ? "could not list them"
        : visible.length === 0
          ? "none at all — the service account has not been added to any property"
          : visible.map((site) => `"${site}"`).join(", ");
      throw new Error(
        `Search Console denied "${config.siteUrl}" (403). ` +
          `Properties this service account can read: ${seen}. ` +
          `GSC_SITE_URL must match one of those exactly, trailing slash included. ` +
          `Google response: ${detail}`,
      );
    }
    throw new Error(`Search Console query failed (${res.status}): ${detail}`);
  }
  const body = (await res.json()) as { rows?: GscRow[] };
  // No rows is a real answer, not an error: it is what "nothing ranked in
  // this window" looks like, and for this site that is the likely result.
  return body.rows ?? [];
}

/**
 * Every property this token can read, as Google spells them.
 *
 * Only used to explain a 403. Permission in Search Console is granted per
 * exact property string, so the list is the answer to "what should
 * GSC_SITE_URL be".
 */
export async function listSites(token: string): Promise<string[]> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Site list failed (${res.status})`);
  const body = (await res.json()) as { siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }> };
  return (body.siteEntry ?? []).map(
    (entry) => `${entry.siteUrl ?? "?"} (${entry.permissionLevel ?? "unknown"})`,
  );
}

/** YYYY-MM-DD, n days before today, in UTC. */
export function dayOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
