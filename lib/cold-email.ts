import { createHmac, timingSafeEqual } from "node:crypto";

export type ColdVariant = { subject: string; intro: string; bridge: string };
export const DEFAULT_COLD_VARIANTS: Record<"A" | "B", ColdVariant> = {
  A: {
    subject: "Does your savings plan fit life in {{city}}?",
    intro: "Does your savings plan support the life you want in {{city}}?",
    bridge:
      "UntilFire is a personal finance app that connects your budget, city cost comparisons, and estimated financial independence timeline—so you can explore what your plan makes possible.",
  },
  B: {
    subject: "When could work become optional for you?",
    intro:
      "You have an age when you’d like work to become optional. Does your savings plan get you there?",
    bridge:
      "I built UntilFire to connect your everyday budget with your bigger plans—so you can explore how today’s choices could change your financial independence timeline.",
  },
};

export function normalizeColdEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(
      email,
    )
  )
    throw new Error("Enter a valid email address");
  return email;
}

export function cleanColdText(value: unknown, max: number): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[\r\n\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)
  )
    throw new Error(`Text must be 1–${max} characters on one line`);
  return value.trim();
}

export function coldToken(
  id: string,
  kind: "unsubscribe" | "click",
  secret: string,
): string {
  if (secret.length < 32)
    throw new Error("Cold email signing secret is not configured");
  return createHmac("sha256", secret)
    .update(`cold-email:v1:${kind}:${id}`)
    .digest("hex");
}

export function validColdToken(
  id: string,
  kind: "unsubscribe" | "click",
  token: string | null,
  secret: string,
): boolean {
  if (
    !/^[a-f0-9-]{36}$/i.test(id) ||
    !token ||
    !/^[a-f0-9]{64}$/i.test(token) ||
    secret.length < 32
  )
    return false;
  return timingSafeEqual(
    Buffer.from(token, "hex"),
    Buffer.from(coldToken(id, kind, secret), "hex"),
  );
}

export function coldMerge(
  template: string,
  firstName: string | null,
  city: string | null,
): string {
  return template
    .replaceAll("{{first_name}}", firstName || "there")
    .replaceAll("{{city}}", city || "your city");
}

export function escapeColdHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

export function renderColdEmail(input: {
  variant: ColdVariant;
  firstName: string | null;
  city: string | null;
  unsubscribeUrl: string;
  clickUrl: string;
  postalAddress: string;
  origin: string;
}) {
  const merge = (s: string) => coldMerge(s, input.firstName, input.city);
  const e = escapeColdHtml;
  const subject = merge(input.variant.subject);
  const text = `Hi ${input.firstName || "there"},\n\n${merge(input.variant.intro)}\n\n${merge(input.variant.bridge)}\n\nTry Pro free for 30 days and build a personal finance plan around your life.\n${input.clickUrl}\n\nFirst-time subscribers only. Paid subscription follows unless canceled.\n\nHave a question? Just reply.\nJohn\nFounder, UntilFire\n\nPromotional email from UntilFire\n${input.postalAddress}\nUnsubscribe: ${input.unsubscribeUrl}\nYou can also reply “no thanks.”`;
  // Table layout and inline styles for mail clients; never inbox chrome or scripts.
  const html = `<!doctype html><html><body style="margin:0;background:#F8F8FB;color:#151719;font-family:Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff"><tr><td style="padding:24px"><img src="${e(input.origin)}/brand/logo-horizontal.png" alt="UntilFire — personal finance" width="160" style="display:block;max-width:100%;height:auto"></td></tr><tr><td style="padding:0 24px;font-size:16px;line-height:1.7"><p>Hi ${e(input.firstName || "there")},</p><p>${e(merge(input.variant.intro))}</p><p>${e(merge(input.variant.bridge))}</p></td></tr><tr><td style="padding:20px 24px"><img src="${e(input.origin)}/email/cinematic-phone.jpg" alt="A future with more you. UntilFire personal finance app concept shown on a phone." width="552" style="display:block;width:100%;height:auto;border-radius:20px"><div style="padding:24px;background:#FFE58A;border-radius:0 0 20px 20px;font-size:28px;font-weight:800">30 days of Pro. Free.</div></td></tr><tr><td style="padding:0 24px 24px;font-size:16px;line-height:1.7"><p>Build a personal finance plan around your life.</p><a href="${e(input.clickUrl)}" style="display:block;background:#151719;color:#fff;padding:16px;text-align:center;border-radius:28px;text-decoration:none;font-weight:700">Explore UntilFire · Try Pro free</a><p style="font-size:12px;color:#5C6170">First-time subscribers only. Paid subscription follows unless canceled.</p><p>Have a question before you start? Just reply.</p><p>John<br>Founder, UntilFire</p><hr style="border:0;border-top:1px solid #E7E5ED"><p style="font-size:12px;color:#5C6170">Promotional email from UntilFire<br>${e(input.postalAddress)}<br><a href="${e(input.unsubscribeUrl)}" style="color:#5C6170">Unsubscribe from marketing emails</a><br>You can also reply “no thanks.”</p></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
