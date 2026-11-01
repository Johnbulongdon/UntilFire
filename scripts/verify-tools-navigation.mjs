import assert from "node:assert/strict";
import fs from "node:fs";
import { reserveToolHandoff } from "../lib/tool-handoff.ts";
const offer = { slug: "broker-a", name: "Broker A", referralKey: "member:1" };
const href = "/go/broker-a?intent=11111111-1111-4111-8111-111111111111";
const calls = [];
const api = async (path, body) => { calls.push({ path, body }); return { href }; };
assert.equal(await reserveToolHandoff(api, offer), href);
assert.deepEqual(calls.map(c => c.path), ["/api/offers/open"], "Money browsing must never read or write a Plan task");
assert.deepEqual(calls[0].body, { slug: offer.slug, referralKey: offer.referralKey });
let started = 0;
assert.equal(await reserveToolHandoff(api, offer, { onStarted: async o => { assert.equal(o.name, offer.name); started++; } }), href);
assert.equal(started, 1, "Explicit Plan picker records one start");
await assert.rejects(reserveToolHandoff(async () => ({ href: "https://attacker.example" }), offer, { onStarted: async () => { started++; } }));
assert.equal(started, 1, "Invalid handoff must not start a plan");
await assert.rejects(reserveToolHandoff(api, offer, { onStarted: async () => { throw new Error("stale setup"); } }), /stale setup/);
const web = fs.readFileSync("app/dashboard/OffersTab.tsx", "utf8"), phone = fs.readFileSync("mobile/src/components/AccountToolsBrowser.tsx", "utf8");
for (const source of [web, phone]) { assert.match(source, /reserveToolHandoff\(api, o, plan\)/); assert.doesNotMatch(source, /api\(.*account-setup/); assert.doesNotMatch(source, /My referral links/); }
assert.match(fs.readFileSync("app/invite/CreatorArea.tsx", "utf8"), /href="\/invite\/provider-links"/);
assert.match(fs.readFileSync("app/invite/provider-links/ProviderLinksPage.tsx", "utf8"), /fromProfile \? "\/dashboard\?tab=profile" : "\/invite"/);
assert.match(fs.readFileSync("mobile/src/app/provider-links.tsx", "utf8"), /Redirect/);
console.log("PASS Money/Plan handoff separation, valid/stale handoff guards, canonical creator navigation and legacy redirect.");

// Execute the real sign-in return allowlist with isolated storage and analytics stubs.
const ts = (await import("typescript")).default;
const exports = {};
const store = new Map();
globalThis.localStorage = { setItem: (key, value) => store.set(key, value), getItem: key => store.get(key) ?? null, removeItem: key => store.delete(key) };
const code = ts.transpileModule(fs.readFileSync("lib/auth-finish.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function("require", "exports", code)(() => ({}), exports);
for (const path of ["/invite/provider-links", "/invite/provider-links?from=profile"]) { exports.rememberReturnTo(path); assert.equal(exports.afterSignInPath(), path); }
for (const path of ["https://attacker.example", "//attacker.example", "/invite/provider-links?from=https://attacker.example"]) { exports.rememberReturnTo(path); assert.equal(exports.afterSignInPath(), "/dashboard"); }
delete globalThis.localStorage;
console.log("PASS provider-link sign-in returns and strict external/unknown return rejection.");
