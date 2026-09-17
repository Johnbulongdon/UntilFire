#!/usr/bin/env node
/**
 * Every outbound email must be attributable.
 *
 * The Resend webhook identifies an email by a broadcast_id tag and discards
 * anything without one — literally `ignored: "untagged"`. For months only the
 * admin broadcast set that tag, so the welcome email, the day 1/3/7 sequence,
 * the waitlist result and the trial reminder were all invisible: they sent
 * fine, and every delivery, open and click was binned on arrival. Six
 * retention emails went out on 16 September 2026 and left no trace.
 *
 * That was silent for months because nothing failed. This is the check that
 * makes it loud: any new call to resend.emails.send outside the two files
 * allowed to make one is a new blind spot.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// lib/email-send.ts is the helper that tags. The admin broadcast route sets
// broadcast_id itself and is verified separately below.
const ALLOWED = new Set(["lib/email-send.ts", "app/api/admin/emails/send/route.ts"]);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
};

const offenders = [];
for (const file of [...walk("app"), ...walk("lib")]) {
  const rel = file.replace(/\\/g, "/");
  if (ALLOWED.has(rel)) continue;
  const src = readFileSync(file, "utf8");
  if (/\bresend\s*\.\s*emails\s*\.\s*send\s*\(/.test(src)) offenders.push(rel);
}

const broadcast = readFileSync("app/api/admin/emails/send/route.ts", "utf8");
if (!broadcast.includes("broadcast_id")) {
  offenders.push("app/api/admin/emails/send/route.ts (no broadcast_id tag)");
}

if (offenders.length) {
  console.error("Untagged email sends — these will be invisible to the webhook:\n");
  offenders.forEach((f) => console.error("  " + f));
  console.error("\nUse sendTagged() from lib/email-send.ts instead.");
  process.exit(1);
}

console.log("email tagging: every send is attributable");
