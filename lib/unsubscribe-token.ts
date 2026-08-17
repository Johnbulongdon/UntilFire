import { createHmac, timingSafeEqual } from "node:crypto";

// One-click unsubscribe tokens: HMAC(user_id) so a link can't be tampered
// with or used to unsubscribe someone else, without needing the recipient
// to log in to click it (the whole point of one-click unsubscribe).

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET is not set");
  return s;
}

export function makeUnsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("hex");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  try {
    const expected = Buffer.from(makeUnsubscribeToken(userId), "hex");
    const actual = Buffer.from(token, "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
