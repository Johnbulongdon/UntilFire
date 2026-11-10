import nodemailer from "nodemailer";
import { pathToFileURL } from "node:url";

export function workerConfig(env) {
  const origin = new URL(env.UNTILFIRE_ORIGIN || "https://www.untilfire.com");
  if (
    origin.origin !== "https://www.untilfire.com" &&
    !(
      origin.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(origin.hostname)
    )
  )
    throw new Error("Worker origin must be production UntilFire or localhost");
  if (!env.COLD_EMAIL_WORKER_SECRET || env.COLD_EMAIL_WORKER_SECRET.length < 32)
    throw new Error("Worker secret is missing");
  if (env.SMTP_OUTREACH_PERMITTED !== "true")
    throw new Error(
      "Confirm the SMTP server permits your outreach before sending",
    );
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS)
    throw new Error(
      "Configure an authenticated SMTP server; forwarding is not a sending service",
    );
  if (
    /(^|\.)(resend\.com|resend\.dev|smtp2go\.com|brevo\.com|sendinblue\.com|gmail\.com|cloudflare\.net)$/i.test(
      env.SMTP_HOST,
    )
  )
    throw new Error(
      "This host is not approved for this outreach worker; use a server whose terms permit the campaign",
    );
  const port = Number(env.SMTP_PORT || 587);
  if (![465, 587].includes(port))
    throw new Error("Use authenticated TLS on port 465 or 587");
  const max = Number(env.WORKER_MAX_MESSAGES || 10),
    delay = Number(env.WORKER_DELAY_SECONDS || 60);
  if (
    !Number.isInteger(max) ||
    max < 1 ||
    max > 300 ||
    !Number.isFinite(delay) ||
    delay < 10
  )
    throw new Error(
      "Use 1–300 messages and at least 10 seconds between attempts",
    );
  return {
    origin: origin.origin,
    secret: env.COLD_EMAIL_WORKER_SECRET,
    max,
    delay,
    transport: {
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 45000,
      tls: { rejectUnauthorized: true },
    },
  };
}

export async function runWorker(
  config,
  transport,
  request = fetch,
  pause = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  async function api(payload) {
    const response = await request(`${config.origin}/api/cold-email/worker`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new Error(
        `Queue API failed (${response.status}); no automatic resend`,
      );
    return response.json();
  }
  // No queue claim if credentials/connectivity are broken.
  await transport.verify();
  let count = 0;
  for (let i = 0; i < config.max; i++) {
    const { job } = await api({ action: "claim" });
    if (!job) break;
    const { send } = await api({
      action: "check",
      id: job.id,
      lease: job.lease,
    });
    if (!send) {
      await api({
        action: "ack",
        id: job.id,
        lease: job.lease,
        state: "suppressed",
      });
      continue;
    }
    let state = "unknown";
    try {
      const result = await transport.sendMail({
        from: job.from,
        to: job.to,
        replyTo: job.replyTo,
        subject: job.subject,
        text: job.text,
        html: job.html,
        messageId: job.messageId,
        headers: {
          "List-Unsubscribe": `<${job.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      state = result.accepted?.length ? "accepted" : "failed";
    } catch (error) {
      // A disconnect after DATA may mean SMTP accepted the message. Never resend.
      state = Number(error.responseCode) >= 500 ? "failed" : "unknown";
    }
    await api({ action: "ack", id: job.id, lease: job.lease, state });
    count++;
    console.log(`Email ${count}: ${state}`); // Never log addresses, bodies or credentials.
    if (state !== "accepted") break; // Investigate delivery failures before more sends.
    if (i + 1 < config.max) await pause(config.delay * 1000);
  }
  return count;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const config = workerConfig(process.env);
    await runWorker(config, nodemailer.createTransport(config.transport));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
