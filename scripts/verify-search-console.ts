/**
 * The Search Console client, checked without touching Google.
 *
 * The auth is a hand-rolled RS256 JWT, which is the part most likely to be
 * quietly wrong: a malformed claim set or a mis-encoded signature does not
 * throw locally, it comes back as a 400 from Google days later inside a cron
 * log nobody reads. So this stubs fetch, captures the assertion the module
 * actually sends, and verifies it against a throwaway public key.
 */

import crypto from "node:crypto";
import assert from "node:assert";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Stored the way Vercel stores it: one line, newlines escaped.
process.env.GSC_CLIENT_EMAIL = "untilfire-seo@example.iam.gserviceaccount.com";
process.env.GSC_PRIVATE_KEY = privateKey.replace(/\n/g, "\\n");
process.env.GSC_SITE_URL = "sc-domain:untilfire.com";

const { gscConfig, querySearchAnalytics, dayOffset } = await import("../lib/search-console.ts");

const config = gscConfig();
assert(config, "gscConfig returned null with all three variables set");
assert(
  config.privateKey.includes("\n") && !config.privateKey.includes("\\n"),
  "escaped newlines were not restored — crypto would reject this key",
);

let tokenBody: URLSearchParams | null = null;
let queryRequest: { url: string; auth: string | null; body: Record<string, unknown> } | null = null;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  if (url.includes("oauth2.googleapis.com/token")) {
    tokenBody = new URLSearchParams(String(init?.body));
    return new Response(JSON.stringify({ access_token: "stub-token" }), { status: 200 });
  }
  queryRequest = {
    url,
    auth: new Headers(init?.headers).get("Authorization"),
    body: JSON.parse(String(init?.body)),
  };
  return new Response(
    JSON.stringify({
      rows: [{ keys: ["2026-09-20", "/fire-number/austin-tx"], clicks: 3, impressions: 91, ctr: 0.033, position: 42.7 }],
    }),
    { status: 200 },
  );
}) as typeof fetch;

const rows = await querySearchAnalytics(config, {
  startDate: dayOffset(10),
  endDate: dayOffset(1),
  dimensions: ["date", "page"],
  rowLimit: 5000,
});
globalThis.fetch = realFetch;

// ── The JWT ────────────────────────────────────────────────────────────────
assert(tokenBody, "no token request was made");
const params = tokenBody as URLSearchParams;
assert.equal(params.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");

const assertion = params.get("assertion") ?? "";
const [header64, claims64, signature64] = assertion.split(".");
assert(header64 && claims64 && signature64, "assertion is not three dot-separated parts");

const decode = (s: string) => JSON.parse(Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
assert.deepEqual(decode(header64), { alg: "RS256", typ: "JWT" });

const claims = decode(claims64);
assert.equal(claims.iss, process.env.GSC_CLIENT_EMAIL);
assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
assert.equal(claims.scope, "https://www.googleapis.com/auth/webmasters.readonly");
assert(claims.exp > claims.iat, "token expires before it is issued");
assert(claims.exp - claims.iat <= 3600, "Google rejects a lifetime over an hour");

// base64url, not base64: a '+' or '/' left in the signature makes Google
// reject the assertion, and it is the one mistake that still looks like a
// valid JWT from the outside.
assert(!/[+/=]/.test(assertion), "assertion contains characters base64url forbids");

const verified = crypto
  .createVerify("RSA-SHA256")
  .update(`${header64}.${claims64}`)
  .verify(publicKey, Buffer.from(signature64.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
assert(verified, "signature does not verify against the public key");

// ── The query ──────────────────────────────────────────────────────────────
const q = queryRequest as unknown as { url: string; auth: string; body: Record<string, unknown> };
assert(q, "no searchAnalytics request was made");
assert.equal(q.auth, "Bearer stub-token", "the access token was not passed through");
assert(
  q.url.includes("sc-domain%3Auntilfire.com"),
  `site url must be encoded into the path, got ${q.url}`,
);
assert.deepEqual(q.body.dimensions, ["date", "page"]);
assert.equal(q.body.rowLimit, 5000);

// ── Rows and edges ─────────────────────────────────────────────────────────
assert.equal(rows.length, 1);
assert.equal(rows[0].keys[1], "/fire-number/austin-tx");

assert.match(dayOffset(1), /^\d{4}-\d{2}-\d{2}$/, "dates must be YYYY-MM-DD");
assert(dayOffset(10) < dayOffset(1), "a longer offset must be the earlier date");

for (const missing of ["GSC_CLIENT_EMAIL", "GSC_PRIVATE_KEY", "GSC_SITE_URL"]) {
  const kept = process.env[missing];
  delete process.env[missing];
  assert.equal(gscConfig(), null, `gscConfig should be null without ${missing}`);
  process.env[missing] = kept;
}

console.log(
  "Search Console ok: JWT verifies, base64url clean, scope and lifetime valid, " +
    "site url encoded, rows parsed, missing config returns null.",
);
