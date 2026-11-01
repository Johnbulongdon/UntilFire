import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url),
  root = path.resolve("."),
  cache = new Map();
let store,
  failedTable = null,
  tests = 0;
const userA = {
    id: "user-a",
    email: "a@example.test",
    created_at: new Date().toISOString(),
  },
  userB = {
    id: "user-b",
    email: "b@example.test",
    created_at: new Date().toISOString(),
  },
  administrator = { id: "admin", email: "reviewer@example.test" };
const users = { a: userA, b: userB, admin: administrator };
process.env.ADMIN_EMAILS = administrator.email;
function result(data, error = null) {
  return { data: structuredClone(data), error };
}
class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.mode = "get";
    this.fields = "*";
    this.one = false;
    this.sorts = [];
  }
  select(fields) {
    this.fields = fields;
    this.returning = true;
    return this;
  }
  eq(k, v) {
    this.filters.push((r) => r[k] === v);
    return this;
  }
  gt(k, v) {
    this.filters.push((r) => r[k] > v);
    return this;
  }
  lt(k, v) {
    this.filters.push((r) => r[k] < v);
    return this;
  }
  order(k, opts = {}) {
    this.sorts.push([k, opts.ascending !== false]);
    return this;
  }
  limit(n) {
    this.max = n;
    return this;
  }
  insert(row) {
    this.mode = "insert";
    this.value = row;
    return this;
  }
  update(row) {
    this.mode = "update";
    this.value = row;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  maybeSingle() {
    this.one = true;
    return this;
  }
  single() {
    this.one = true;
    return this;
  }
  then(resolve, reject) {
    return Promise.resolve()
      .then(() => this.exec())
      .then(resolve, reject);
  }
  exec() {
    if (this.table === failedTable)
      return result(null, { message: "simulated database failure" });
    const rows = (store[this.table] ??= []);
    let affected = [];
    if (this.mode === "insert") {
      const row = { id: crypto.randomUUID(), ...this.value };
      if (this.table === "partner_offer_intents")
        row.expires_at ??= new Date(Date.now() + 600000).toISOString();
      if (
        this.table === "partner_referral_links" &&
        rows.some(
          (r) => r.partner_id === row.partner_id && r.offer_id === row.offer_id,
        )
      )
        return result(null, { code: "23505" });
      if (
        this.table === "referral_attributions" &&
        rows.some((r) => r.referred_user_id === row.referred_user_id)
      )
        return result(null, { code: "23505" });
      if (
        this.table === "account_setup_journeys" &&
        rows.some((r) => r.user_id === row.user_id && r.goal === row.goal)
      )
        return result(null, { code: "23505" });
      rows.push(row);
      affected = [row];
    } else {
      affected = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.mode === "update")
        affected.forEach((r) => Object.assign(r, this.value));
      if (this.mode === "delete")
        store[this.table] = rows.filter((r) => !affected.includes(r));
    }
    for (const [k, asc] of this.sorts.toReversed())
      affected.sort(
        (a, b) => String(a[k]).localeCompare(String(b[k])) * (asc ? 1 : -1),
      );
    affected = affected.slice(0, this.max);
    if (this.fields !== "*")
      affected = affected.map((r) =>
        Object.fromEntries(
          this.fields
            .split(",")
            .map((k) => k.trim())
            .map((k) => [k, r[k]]),
        ),
      );
    return result(this.one ? (affected[0] ?? null) : affected);
  }
}
const db = {
  from: (t) => new Query(t),
  auth: {
    getUser: async (token) => ({
      data: { user: users[token] ?? null },
      error: users[token] ? null : { message: "bad token" },
    }),
  },
};
function load(file) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const loadedModule = { exports: {} };
  cache.set(absolute, loadedModule.exports);
  const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = (specifier) => {
    if (
      specifier === "@/lib/supabase-admin" ||
      specifier === "./supabase-admin"
    )
      return { adminClient: () => db };
    if (specifier.startsWith("@/"))
      return load(specifier.slice(2) + (path.extname(specifier) ? "" : ".ts"));
    if (specifier.startsWith("."))
      return load(
        path.relative(
          root,
          path.resolve(
            path.dirname(absolute),
            specifier + (path.extname(specifier) ? "" : ".ts"),
          ),
        ),
      );
    return require(specifier);
  };
  new Function("require", "module", "exports", source)(
    localRequire,
    loadedModule,
    loadedModule.exports,
  );
  cache.set(absolute, loadedModule.exports);
  return loadedModule.exports;
}
const { NextRequest } = require("next/server");
const list = load("app/api/offers/route.ts"),
  open = load("app/api/offers/open/route.ts"),
  go = load("app/go/[slug]/route.ts"),
  own = load("app/api/referrals/provider-links/route.ts"),
  review = load("app/api/admin/offers/provider-links/route.ts"),
  setup = load("app/api/account-setup/route.ts");
const claim = load("app/api/referrals/claim/route.ts");
const { selectedLink } = load("lib/provider-links.ts");
const offer = {
  id: "offer-a",
  slug: "broker-a",
  name: "Broker A",
  kind: "brokerage",
  blurb: "Investing account",
  url: "https://broker.example/r/founder",
  allowed_domain: "broker.example",
  country: "US",
  status: "live",
  member_links_enabled: true,
  updated_at: "2026-11-01T00:00:00Z",
  rate_bps: null,
  bonus_text: "Founder-only bonus",
  bonus_ends_on: null,
};
const link = {
  id: "link-a",
  partner_id: "partner-a",
  offer_id: offer.id,
  url: "https://broker.example/r/member-a",
  display_name: "Alex",
  status: "approved",
  version: 1,
};
function reset() {
  failedTable = null;
  store = {
    partner_offers: [structuredClone(offer)],
    partner_referral_links: [structuredClone(link)],
    referral_partners: [
      { id: "partner-a", user_id: "user-a", code: "alex", status: "active" },
    ],
    referral_attributions: [
      { referred_user_id: "user-b", partner_id: "partner-a" },
    ],
    partner_offer_intents: [],
    partner_offer_clicks: [],
    account_setup_journeys: [],
  };
}
function req(
  url = "https://www.untilfire.com/api/offers",
  token = "b",
  body,
  headers = {},
) {
  return new NextRequest(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function check(name, fn) {
  reset();
  await fn();
  tests++;
  console.log("✓ " + name);
}
const json = async (r) => ({ status: r.status, ...(await r.json()) });
async function ticket() {
  const o = (await (await list.GET(req())).json()).offers[0];
  return (
    await (
      await open.POST(
        req(undefined, "b", { slug: o.slug, referralKey: o.referralKey }),
      )
    ).json()
  ).href;
}
await check(
  "signed-in invitee sees inviter label, no founder bonus or raw URL",
  async () => {
    const d = await json(await list.GET(req()));
    assert.equal(d.status, 200);
    assert.equal(d.offers[0].referralLabel, "Alex’s referral link");
    assert.equal(d.offers[0].bonusText, null);
    assert.ok(!JSON.stringify(d).includes("member-a"));
  },
);
await check("anonymous and non-referred accounts use UntilFire", async () => {
  for (const token of [null, "a"]) {
    const d = await json(await list.GET(req(undefined, token)));
    assert.equal(d.offers[0].referralLabel, "UntilFire referral link");
  }
});
await check("invalid bearer is rejected, not downgraded to founder", async () =>
  assert.equal((await list.GET(req(undefined, "invalid"))).status, 401),
);
await check(
  "lookup failure fails closed instead of switching beneficiary",
  async () => {
    failedTable = "referral_attributions";
    assert.equal((await list.GET(req())).status, 503);
  },
);
await check(
  "later invite cookie and supplied partner id do not replace immutable attribution",
  async () => {
    const d = await json(
      await list.GET(
        req(undefined, "b", undefined, { cookie: "uf_ref=someone-else" }),
      ),
    );
    assert.equal(d.offers[0].referralLabel, "Alex’s referral link");
  },
);
await check(
  "paused, pending, disabled and wrong-domain links each use founder fallback",
  async () => {
    for (const patch of [
      { status: "pending" },
      { url: "https://broker.example.evil.test/r/x" },
    ])
      assert.equal(selectedLink(offer, { ...link, ...patch }).partnerId, null);
    assert.equal(
      selectedLink({ ...offer, member_links_enabled: false }, link).partnerId,
      null,
    );
    store.referral_partners[0].status = "paused";
    assert.equal(
      (await json(await list.GET(req()))).offers[0].referralLabel,
      "UntilFire referral link",
    );
  },
);
await check(
  "one-time ticket redirects to inviter and counts inviter, without user id",
  async () => {
    const href = await ticket();
    const r = await go.GET(req("https://www.untilfire.com" + href, null), {
      params: Promise.resolve({ slug: "broker-a" }),
    });
    assert.equal(r.headers.get("location"), link.url);
    assert.equal(r.headers.get("referrer-policy"), "no-referrer");
    assert.equal(store.partner_offer_clicks[0].partner_id, "partner-a");
    assert.equal(store.partner_offer_clicks[0].user_id, undefined);
    const replay = await go.GET(req("https://www.untilfire.com" + href, null), {
      params: Promise.resolve({ slug: "broker-a" }),
    });
    assert.match(replay.headers.get("location"), /link=refresh/);
    assert.equal(store.partner_offer_clicks.length, 1);
  },
);
await check("simultaneous ticket consumption redirects only once", async () => {
  const href = await ticket();
  const r = await Promise.all(
    [1, 2].map(() =>
      go.GET(req("https://www.untilfire.com" + href, null), {
        params: Promise.resolve({ slug: "broker-a" }),
      }),
    ),
  );
  assert.equal(
    r.filter((x) => x.headers.get("location") === link.url).length,
    1,
  );
});
await check(
  "expired, changed, revoked, paused and disabled tickets never switch to founder",
  async () => {
    for (const mutate of [
      () => (store.partner_offer_intents[0].expires_at = "2020-01-01"),
      () => store.partner_referral_links[0].version++,
      () => (store.partner_referral_links[0].status = "rejected"),
      () => (store.referral_partners[0].status = "paused"),
      () => (store.partner_offers[0].status = "hidden"),
      () => (store.partner_offers[0].member_links_enabled = false),
    ]) {
      reset();
      const href = await ticket();
      mutate();
      const r = await go.GET(req("https://www.untilfire.com" + href, null), {
        params: Promise.resolve({ slug: "broker-a" }),
      });
      assert.match(r.headers.get("location"), /link=refresh/);
      assert.equal(store.partner_offer_clicks.length, 0);
    }
  },
);
await check(
  "stale displayed referral selection returns conflict before opening",
  async () => {
    const r = await open.POST(
      req(undefined, "b", { slug: "broker-a", referralKey: "untilfire:old" }),
    );
    assert.equal(r.status, 409);
    assert.equal(store.partner_offer_intents.length, 0);
  },
);
await check("a supplied arbitrary URL cannot control a redirect", async () => {
  const r = await go.GET(
    req("https://www.untilfire.com/go/broker-a?url=https://evil.test", null),
    { params: Promise.resolve({ slug: "broker-a" }) },
  );
  assert.equal(r.headers.get("location"), offer.url);
});
await check(
  "member editing clears approval and increments version",
  async () => {
    const r = await own.POST(
      req(undefined, "a", {
        slug: "broker-a",
        version: 1,
        url: "https://broker.example/r/new",
        displayName: "Alex",
        partnerId: "someone-else",
      }),
    );
    assert.equal(r.status, 200);
    const l = store.partner_referral_links[0];
    assert.equal(l.status, "pending");
    assert.equal(l.version, 2);
    assert.equal(l.reviewed_at, null);
    assert.equal(l.partner_id, "partner-a");
  },
);
await check("member cannot edit another person’s link", async () => {
  store.referral_partners.push({
    id: "partner-b",
    user_id: "user-b",
    status: "active",
    code: "bee",
  });
  const r = await own.POST(
    req(undefined, "b", {
      slug: "broker-a",
      version: 1,
      url: "https://broker.example/r/hijack",
      displayName: "Bee",
    }),
  );
  assert.equal(r.status, 409);
  assert.equal(store.partner_referral_links[0].url, link.url);
});
await check(
  "member submission rejects lookalikes, short links, HTTP, userinfo, nonstandard ports",
  async () => {
    for (const url of [
      "http://broker.example/x",
      "https://bit.ly/x",
      "https://broker.example.evil.test/x",
      "https://name@broker.example/x",
      "https://broker.example:8443/x",
    ])
      assert.equal(
        (
          await own.POST(
            req(undefined, "a", {
              slug: "broker-a",
              version: 1,
              url,
              displayName: "Alex",
            }),
          )
        ).status,
        400,
      );
  },
);
await check(
  "member cannot approve own link; review checks actual admin authorization",
  async () => {
    assert.equal(
      (
        await review.POST(
          req(undefined, "a", { id: link.id, status: "approved", version: 1 }),
        )
      ).status,
      403,
    );
    assert.equal((await review.GET(req(undefined, null))).status, 401);
  },
);
await check(
  "review rejects stale versions and disabled programmes",
  async () => {
    assert.equal(
      (
        await review.POST(
          req(undefined, "admin", {
            id: link.id,
            status: "approved",
            version: 0,
          }),
        )
      ).status,
      409,
    );
    store.partner_offers[0].member_links_enabled = false;
    assert.equal(
      (
        await review.POST(
          req(undefined, "admin", {
            id: link.id,
            status: "approved",
            version: 1,
          }),
        )
      ).status,
      409,
    );
  },
);
await check("admin approval and revocation increment version", async () => {
  store.partner_referral_links[0].status = "pending";
  assert.equal(
    (
      await review.POST(
        req(undefined, "admin", {
          id: link.id,
          status: "approved",
          version: 1,
        }),
      )
    ).status,
    200,
  );
  assert.equal(store.partner_referral_links[0].version, 2);
  assert.equal(
    (
      await review.POST(
        req(undefined, "admin", {
          id: link.id,
          status: "rejected",
          version: 2,
        }),
      )
    ).status,
    200,
  );
  assert.equal(store.partner_referral_links[0].status, "rejected");
});
await check(
  "existing-account path stays existing after setup completion and never writes money",
  async () => {
    assert.equal(
      (
        await setup.POST(
          req(undefined, "b", {
            goal: "invest",
            action: "existing",
            label: "My account",
            version: 0,
          }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await setup.POST(
          req(undefined, "b", { goal: "invest", action: "done", version: 1 }),
        )
      ).status,
      200,
    );
    const row = store.account_setup_journeys[0];
    assert.equal(row.origin, "existing");
    assert.equal(row.stage, "done");
    assert.equal(row.user_id, "user-b");
    assert.equal(store.partner_offer_clicks.length, 0);
  },
);
await check(
  "clicking a provider does not confirm opened; only valid transitions complete setup",
  async () => {
    await setup.POST(
      req(undefined, "b", {
        goal: "invest",
        action: "started",
        label: "Broker",
        version: 0,
      }),
    );
    assert.equal(
      (
        await setup.POST(
          req(undefined, "b", { goal: "invest", action: "done", version: 1 }),
        )
      ).status,
      400,
    );
    await setup.POST(
      req(undefined, "b", { goal: "invest", action: "opened", version: 1 }),
    );
    assert.equal(store.account_setup_journeys[0].stage, "opened");
  },
);
await check(
  "setup optimistic concurrency and goals/account ownership are isolated",
  async () => {
    const r = await Promise.all(
      [1, 2].map(() =>
        setup.POST(
          req(undefined, "b", {
            goal: "invest",
            action: "existing",
            label: "Account",
            version: 0,
          }),
        ),
      ),
    );
    assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
    assert.equal(
      (await json(await setup.GET(req(undefined, "a")))).journeys.length,
      0,
    );
    await setup.POST(
      req(undefined, "b", {
        goal: "save",
        action: "existing",
        label: "Savings",
        version: 0,
      }),
    );
    assert.equal(store.account_setup_journeys.length, 2);
  },
);
await check(
  "failed invite lookup preserves the invite cookie for retry",
  async () => {
    failedTable = "referral_partners";
    const r = await claim.POST(
      req(undefined, "b", {}, { cookie: "uf_ref=alex" }),
    );
    assert.equal(r.status, 503);
    assert.equal(r.headers.get("set-cookie"), null);
  },
);
await check(
  "failed invite attribution write preserves the invite cookie",
  async () => {
    failedTable = "referral_attributions";
    const r = await claim.POST(
      req(undefined, "b", {}, { cookie: "uf_ref=alex" }),
    );
    assert.equal(r.status, 503);
    assert.equal(r.headers.get("set-cookie"), null);
  },
);
await check(
  "duplicate invite claims preserve the original attribution",
  async () => {
    const r = await claim.POST(
      req(undefined, "b", {}, { cookie: "uf_ref=alex" }),
    );
    assert.equal(r.status, 200);
    assert.equal(store.referral_attributions.length, 1);
    assert.equal(store.referral_attributions[0].partner_id, "partner-a");
  },
);
const creator = load("app/api/referrals/me/route.ts");
const invite = load("app/r/[code]/route.ts");
const join = () => creator.POST(req(undefined, "a", {
  code: "alex-creator", payoutMethod: "paypal", payoutEmail: "alex@example.test", acceptTerms: true,
}));
await check("member upgrade preserves shared code, partner ownership and outstanding invite claims", async () => {
  const partner = store.referral_partners[0];
  partner.kind = "friend";
  partner.code = "f-abcdefgh";
  const before = await json(await creator.GET(req(undefined, "a")));
  assert.equal(before.inviteCode, partner.code);
  assert.equal((await join()).status, 200);
  assert.equal(partner.code, "f-abcdefgh");
  assert.equal(partner.kind, "creator");
  assert.equal(partner.id, "partner-a");
  const visit = await invite.GET(req("https://www.untilfire.com/r/f-abcdefgh", null), { params: Promise.resolve({ code: "f-abcdefgh" }) });
  assert.match(visit.headers.get("set-cookie"), /uf_ref=f-abcdefgh/);
  store.referral_attributions = [];
  const claimed = await claim.POST(req(undefined, "b", {}, { cookie: "uf_ref=f-abcdefgh" }));
  assert.equal(claimed.status, 200);
  assert.equal(store.referral_attributions[0].partner_id, partner.id);
  assert.equal(store.partner_referral_links[0].partner_id, partner.id);
});
await check("new creators can still select a new invite code", async () => {
  store.referral_partners = [];
  assert.equal((await join()).status, 200);
  assert.equal(store.referral_partners[0].code, "alex-creator");
});
await check("creator lookup failure is retryable, never a successful not-joined response", async () => {
  failedTable = "referral_partners";
  const response = await json(await creator.GET(req(undefined, "a")));
  assert.equal(response.status, 503);
  assert.ok(response.error);
  assert.equal("partner" in response, false);
  assert.equal((await join()).status, 503);
});
await check("creator statistics failure does not show fabricated zero balances", async () => {
  store.referral_partners[0].kind = "creator";
  failedTable = "referral_commissions";
  const response = await json(await creator.GET(req(undefined, "a")));
  assert.equal(response.status, 503);
  assert.equal("stats" in response, false);
});
await check("creator code-check failure does not create an account", async () => {
  store.referral_partners = [];
  failedTable = "referral_code_holds";
  assert.equal((await join()).status, 503);
  assert.equal(store.referral_partners.length, 0);
});

console.log(
  "All " + tests + " provider-routing and setup-handler scenarios passed.",
);

// User-entered names must not be unmasked in phone session recordings.
for (const file of [
  "mobile/src/app/(tabs)/plan/account-setup.tsx",
  "mobile/src/app/(tabs)/money/tools.tsx",
  "mobile/src/app/provider-links.tsx",
  "mobile/src/components/AccountSetupCard.tsx",
]) {
  const source = fs.readFileSync(file, "utf8");
  for (const node of source.matchAll(/<Text\b([^>]*)>([\s\S]*?)<\/Text>/g)) {
    if (/account_label|referralLabel|data\.code|review_note/.test(node[2]))
      assert.match(node[1], /\bprivate\b/, file + " has unmasked private text");
  }
}
console.log(
  "Session replay privacy guard passed for account names, inviter labels and own links.",
);

for (const file of ['app/dashboard/AccountSetupTab.tsx','app/dashboard/OffersTab.tsx','app/dashboard/ProviderLinksPanel.tsx','app/admin/ProviderLinkReviews.tsx']) {
 const source=fs.readFileSync(file,'utf8');
 for (const node of source.matchAll(/<(p|h2|h3|code)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
  if (/account_label|referralLabel|review_note|display_name|data\.code/.test(node[3])) assert.match(node[2],/ph-mask/,file+' has unmasked private text');
 }
}
console.log('Web replay privacy guard passed.');
