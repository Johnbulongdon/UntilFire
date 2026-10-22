/**
 * Sign in with Apple revoke (guideline 5.1.1(v)): the client secret sent to
 * Apple's token and revoke endpoints is a valid ES256 JWT for this app.
 *
 * Run: npm run test:apple-signin
 */
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
process.env.APPLE_TEAM_ID = "TEAM123456";
process.env.APPLE_SIGNIN_KEY_ID = "KEY1234567";
// As Vercel stores it: one line with literal \n.
process.env.APPLE_SIGNIN_PRIVATE_KEY = (privateKey.export({ type: "pkcs8", format: "pem" }) as string).replace(/\n/g, "\\n");

const { appleClientSecret, appleSignInConfigured } = await import("../lib/apple-signin.ts");

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };

ok("configured once the three keys are set", () => assert.equal(appleSignInConfigured(), true));

ok("client secret is a signed ES256 JWT for the app", () => {
  const jwt = appleClientSecret(1_700_000_000);
  const [h, c, s] = jwt.split(".");
  const header = JSON.parse(Buffer.from(h, "base64url").toString());
  const claims = JSON.parse(Buffer.from(c, "base64url").toString());
  assert.deepEqual(header, { alg: "ES256", kid: "KEY1234567" });
  assert.deepEqual(claims, { iss: "TEAM123456", iat: 1_700_000_000, exp: 1_700_000_300, aud: "https://appleid.apple.com", sub: "com.untilfire.app" });
  const valid = verify("sha256", Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
  assert.equal(valid, true);
});

ok("not configured without the key", () => {
  delete process.env.APPLE_SIGNIN_PRIVATE_KEY;
  assert.equal(appleSignInConfigured(), false);
});

console.log(`\n${n} checks passed`);
