import { test } from "node:test";
import assert from "node:assert/strict";
import { runWorker, workerConfig, verifyLocalPostfix } from "./worker.mjs";
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
test("local relay cannot be pointed at remote or authenticated SMTP", () => {
  const local = { COLD_EMAIL_TRANSPORT: "local-postfix", COLD_EMAIL_WORKER_SECRET: "x".repeat(32), SMTP_OUTREACH_PERMITTED: "true" };
  const c = workerConfig(local);
  assert.equal(c.transport.host, "127.0.0.1");
  assert.equal(c.transport.port, 25);
  assert.equal(c.transport.auth, undefined);
  for (const key of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"]) {
    assert.throws(() => workerConfig({ ...local, [key]: "remote" }), /remove SMTP overrides/);
  }
  assert.throws(() => workerConfig({ ...local, SMTP_OUTREACH_PERMITTED: "false" }), /permits/);
  assert.throws(() => workerConfig({ ...local, COLD_EMAIL_TRANSPORT: "other" }), /transport/);
});
test("local preflight rejects exposed, deferred or unsigned mail delivery", async () => {
  const ready = { inet_interfaces: "loopback-only", default_transport: "smtp", defer_transports: "", smtpd_milters: "inet:127.0.0.1:8891", milter_default_action: "tempfail" };
  await verifyLocalPostfix(async key => ready[key]);
  for (const [key, unsafe] of Object.entries({ inet_interfaces: "all", default_transport: "error", defer_transports: "smtp", smtpd_milters: "", milter_default_action: "accept" })) {
    await assert.rejects(verifyLocalPostfix(async name => name === key ? unsafe : ready[name]), /not ready/);
  }
  await assert.rejects(verifyLocalPostfix(async () => { throw new Error("missing Postfix"); }), /missing Postfix/);
});
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
