import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  DEFAULT_COLD_VARIANTS,
  normalizeColdEmail,
  coldToken,
  validColdToken,
  renderColdEmail,
} from "../../lib/cold-email.ts";

test("signed links are scoped, malformed input fails closed, templates escape recipient data", () => {
  const id = "11111111-1111-4111-8111-111111111111",
    secret = "s".repeat(32);
  const token = coldToken(id, "unsubscribe", secret);
  assert.equal(validColdToken(id, "unsubscribe", token, secret), true);
  assert.equal(validColdToken(id, "click", token, secret), false);
  assert.equal(validColdToken(id, "unsubscribe", "invalid", secret), false);
  assert.throws(() =>
    normalizeColdEmail("a@example.org\r\nBcc: attacker@example.org"),
  );
  const rendered = renderColdEmail({
    variant: DEFAULT_COLD_VARIANTS.A,
    firstName: "<img src=x onerror=alert(1)>",
    city: "Chicago",
    unsubscribeUrl: "https://www.untilfire.com/unsubscribe",
    clickUrl: "https://www.untilfire.com/",
    postalAddress: "Test address",
    origin: "https://www.untilfire.com",
  });
  assert.ok(rendered.html.includes("&lt;img"));
  assert.ok(!rendered.html.includes("onerror=alert(1)>"));
  assert.match(rendered.text, /First-time subscribers only/);
  assert.doesNotMatch(rendered.html, /calculator/i);
  assert.match(rendered.html, /cinematic-phone.jpg/);
});

test("real PostgreSQL: private data, deduplication, cap, pause, opt-outs and immutable experiment", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;",
    );
    await db.exec(
      await readFile(
        new URL(
          "../../supabase/migrations/20261110173727_cold_email_pipeline.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await assert.rejects(
      db.exec("set role anon;select * from public.cold_prospects"),
      /permission denied/,
    );
    await db.exec("reset role");
    await assert.rejects(
      db.exec("set role authenticated;select * from public.cold_claim()"),
      /permission denied/,
    );
    await db.exec("reset role;set role service_role");
    const c = (
      await db.query(
        "insert into public.cold_campaigns(name,variants,daily_limit) values ('Test',$1,1) returning id",
        [JSON.stringify(DEFAULT_COLD_VARIANTS)],
      )
    ).rows[0].id;
    await db.exec(
      "insert into public.cold_prospects(email,source_url,fit_note) values ('one@example.org','https://example.org','Explicit FIRE interest'),('two@example.org','https://example.org','Explicit FIRE interest'),('three@example.org','https://example.org','Explicit FIRE interest')",
    );
    assert.equal(
      (await db.query("select public.cold_enqueue($1) n", [c])).rows[0].n,
      3,
    );
    assert.equal(
      (await db.query("select public.cold_enqueue($1) n", [c])).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select * from public.cold_claim()")).rows.length,
      0,
    );
    await db.query(
      "select public.cold_update_campaign($1,'running',null,null)",
      [c],
    );
    const first = (await db.query("select * from public.cold_claim()")).rows[0];
    assert.ok(first.lease);
    assert.equal(
      (await db.query("select * from public.cold_claim()")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.cold_update_campaign($1,null,$2,null)", [
        c,
        JSON.stringify(DEFAULT_COLD_VARIANTS),
      ]),
      /frozen/,
    );
    await db.query("select public.cold_update_campaign($1,'paused',null,3)", [
      c,
    ]);
    assert.equal(
      (await db.query("select * from public.cold_claim()")).rows.length,
      0,
    );
    const next = (
      await db.query(
        "select p.email from public.cold_jobs j join public.cold_prospects p on p.id=j.prospect_id where j.state='queued' limit 1",
      )
    ).rows[0].email;
    await db.query("select public.cold_suppress($1,'unsubscribe')", [next]);
    await db.query(
      "select public.cold_update_campaign($1,'running',null,null)",
      [c],
    );
    const second = (await db.query("select * from public.cold_claim()"))
      .rows[0];
    assert.ok(second);
    const suppressed = (
      await db.query(
        "select j.state from public.cold_jobs j join public.cold_prospects p on p.id=j.prospect_id where p.email=$1",
        [next],
      )
    ).rows[0];
    assert.equal(suppressed.state, "suppressed");
    const other = (
      await db.query(
        "insert into public.cold_campaigns(name,variants) values ('Other',$1) returning id",
        [JSON.stringify(DEFAULT_COLD_VARIANTS)],
      )
    ).rows[0].id;
    assert.equal(
      (await db.query("select public.cold_enqueue($1) n", [other])).rows[0].n,
      0,
    );
    await db.exec(
      "update public.cold_jobs set claimed_at=now()-interval '20 minutes' where state='sending'",
    );
    await db.query("select * from public.cold_claim()");
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from public.cold_jobs where state='unknown'",
        )
      ).rows[0].n,
      2,
    );
    // Independent global cap applies even when a different campaign has capacity.
    await db.exec(
      "insert into public.cold_prospects(email,source_url,fit_note) select 'budget-'||n||'@example.org','https://example.org','Test interest' from generate_series(1,301) n",
    );
    assert.equal(
      (await db.query("select public.cold_enqueue($1) n", [other])).rows[0].n,
      301,
    );
    await db.query(
      "select public.cold_update_campaign($1,'running',null,300)",
      [other],
    );
    await db.query(
      "update public.cold_jobs set state='accepted',claimed_at=now() where id in (select id from public.cold_jobs where campaign_id=$1 order by id limit 298)",
      [other],
    );
    assert.equal(
      (await db.query("select * from public.cold_claim()")).rows.length,
      0,
    );
    const readable = (
      await db.query(
        "select count(*)::int n from pg_tables where schemaname='public' and tablename like 'cold_%' and rowsecurity",
      )
    ).rows[0].n;
    assert.equal(readable, 4);
  } finally {
    await db.close();
  }
});
