/**
 * Sign in with Apple, server side: when someone who signed in with Apple
 * deletes their account, their Apple sign-in is revoked too, as App Store
 * guideline 5.1.1(v) requires. The app asks Apple for a fresh authorization
 * code at delete time; here it becomes a refresh token, which is revoked.
 *
 * Needs a Sign in with Apple key from the Apple Developer account:
 * APPLE_TEAM_ID, APPLE_SIGNIN_KEY_ID and APPLE_SIGNIN_PRIVATE_KEY (the .p8
 * file's contents). The app's bundle ID is the client ID.
 */
import { createPrivateKey, sign } from "node:crypto";

/** The client ID: the app's bundle ID, as in lib/apple-store.ts (kept free of its imports so the check runs in plain Node). */
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || "com.untilfire.app";

const APPLE_AUTH = "https://appleid.apple.com";

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

/** Whether the Sign in with Apple key is set, so revoking can run at all. */
export function appleSignInConfigured(): boolean {
  return !!(process.env.APPLE_TEAM_ID && process.env.APPLE_SIGNIN_KEY_ID && process.env.APPLE_SIGNIN_PRIVATE_KEY);
}

/** The short-lived ES256 client secret Apple's token and revoke endpoints ask for. */
export function appleClientSecret(now = Math.floor(Date.now() / 1000)): string {
  const teamId = process.env.APPLE_TEAM_ID!;
  const keyId = process.env.APPLE_SIGNIN_KEY_ID!;
  // Vercel stores the .p8 on one line with literal \n.
  const pem = process.env.APPLE_SIGNIN_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: now, exp: now + 300, aud: APPLE_AUTH, sub: APPLE_BUNDLE_ID }));
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key: createPrivateKey(pem), dsaEncoding: "ieee-p1363" });
  return `${header}.${claims}.${b64url(signature)}`;
}

async function post(path: string, body: Record<string, string>): Promise<Response> {
  return fetch(`${APPLE_AUTH}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
}

/** Trades the app's authorization code for a refresh token, then revokes it. Throws on failure. */
export async function revokeAppleSignIn(authorizationCode: string): Promise<void> {
  const client = { client_id: APPLE_BUNDLE_ID, client_secret: appleClientSecret() };
  const tokenRes = await post("/auth/token", { ...client, code: authorizationCode, grant_type: "authorization_code" });
  if (!tokenRes.ok) throw new Error(`Apple token exchange failed (${tokenRes.status}): ${await tokenRes.text()}`);
  const tokens = await tokenRes.json() as { refresh_token?: string; access_token?: string };
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token) throw new Error("Apple returned no token to revoke");
  const revokeRes = await post("/auth/revoke", { ...client, token, token_type_hint: tokens.refresh_token ? "refresh_token" : "access_token" });
  if (!revokeRes.ok) throw new Error(`Apple revoke failed (${revokeRes.status}): ${await revokeRes.text()}`);
}
