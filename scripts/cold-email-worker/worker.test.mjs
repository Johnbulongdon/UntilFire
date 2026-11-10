import { test } from "node:test";
import assert from "node:assert/strict";
import { runWorker, workerConfig } from "./worker.mjs";
const env = {
  SMTP_HOST: "smtp.example.org",
  SMTP_USER: "user",
  SMTP_PASS: "test",
  SMTP_OUTREACH_PERMITTED: "true",
  COLD_EMAIL_WORKER_SECRET: "x".repeat(32),
};
test("configuration fails closed and requires TLS", () => {
  assert.throws(() => workerConfig({}), /secret/);
  assert.throws(
    () => workerConfig({ ...env, SMTP_OUTREACH_PERMITTED: "false" }),
    /permits/,
  );
  assert.throws(
    () => workerConfig({ ...env, SMTP_HOST: "smtp.resend.com" }),
    /not approved/,
  );
  assert.throws(() => workerConfig({ ...env, SMTP_PORT: "25" }), /TLS/);
  assert.throws(
    () => workerConfig({ ...env, UNTILFIRE_ORIGIN: "https://evil.test" }),
    /origin/,
  );
  assert.equal(workerConfig(env).transport.tls.rejectUnauthorized, true);
});
const job = {
  id: "test-job",
  lease: "test-lease",
  from: "John <john.ng@untilfire.com>",
  to: "test@example.org",
  unsubscribeUrl: "https://www.untilfire.com/unsubscribe",
  messageId: "<test@untilfire.com>",
};
test("pause/opt-out immediately before send prevents delivery", async () => {
  const calls = [];
  let sent = 0;
  const api = async (_url, opts) => {
    const b = JSON.parse(opts.body);
    calls.push(b);
    return {
      ok: true,
      json: async () =>
        b.action === "claim"
          ? { job }
          : b.action === "check"
            ? { send: false }
            : { ok: true },
    };
  };
  await runWorker(
    { ...workerConfig(env), max: 1 },
    {
      verify: async () => {},
      sendMail: async () => {
        sent++;
      },
    },
    api,
  );
  assert.equal(sent, 0);
  assert.equal(calls.at(-1).state, "suppressed");
});
test("uncertain SMTP delivery is recorded once and never retried", async () => {
  const calls = [];
  let sent = 0;
  const api = async (_url, opts) => {
    const b = JSON.parse(opts.body);
    calls.push(b);
    return {
      ok: true,
      json: async () =>
        b.action === "claim"
          ? { job }
          : b.action === "check"
            ? { send: true }
            : { ok: true },
    };
  };
  await runWorker(
    workerConfig(env),
    {
      verify: async () => {},
      sendMail: async () => {
        sent++;
        throw new Error("connection reset after DATA");
      },
    },
    api,
  );
  assert.equal(sent, 1);
  assert.equal(calls.at(-1).state, "unknown");
});
test("acknowledgement failure never resends and SMTP acceptance is not delivery", async () => {
  let sent = 0;
  const api = async (_url, opts) => {
    const b = JSON.parse(opts.body);
    return {
      ok: b.action !== "ack",
      status: 503,
      json: async () => (b.action === "claim" ? { job } : { send: true }),
    };
  };
  await assert.rejects(
    runWorker(
      workerConfig(env),
      {
        verify: async () => {},
        sendMail: async (m) => {
          sent++;
          assert.equal(m.disableUrlAccess, true);
          assert.equal(
            m.headers["List-Unsubscribe-Post"],
            "List-Unsubscribe=One-Click",
          );
          return { accepted: [job.to] };
        },
      },
      api,
    ),
    /no automatic resend/,
  );
  assert.equal(sent, 1);
});
