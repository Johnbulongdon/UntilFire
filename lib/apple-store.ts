/**
 * Pro bought in the iOS app through Apple (D-75). The website checks Apple's
 * signed transactions itself (no RevenueCat) and keeps them in the same
 * `subscriptions` table as Stripe, with `source = 'apple'`, so every existing
 * "is this person Pro?" check keeps working.
 *
 * The rules (what a transaction or a notice means for the row) are pure and
 * checked in scripts/verify-apple-subscriptions.ts; the signature checking
 * uses Apple's own library and Apple's root certificates.
 */
import { Environment, SignedDataVerifier, type JWSRenewalInfoDecodedPayload, type JWSTransactionDecodedPayload } from "@apple/app-store-server-library";

/** The app's bundle ID and its Pro subscription products in App Store Connect. */
export const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || "com.untilfire.app";
export const APPLE_PRO_PRODUCTS = new Set((process.env.APPLE_PRO_PRODUCT_IDS || "com.untilfire.pro.monthly,com.untilfire.pro.yearly").split(",").map((s) => s.trim()).filter(Boolean));

export interface AppleRow {
  status: "active" | "expired" | "revoked";
  plan: "pro" | "free";
  current_period_end: string | null;
  auto_renew: boolean | null;
  apple_original_transaction_id: string;
  apple_product_id: string | null;
}

/** What a verified transaction means for the person's row. Null when it isn't a Pro purchase. */
export function rowForTransaction(tx: Pick<JWSTransactionDecodedPayload, "originalTransactionId" | "productId" | "expiresDate" | "revocationDate" | "bundleId">, renewal?: Pick<JWSRenewalInfoDecodedPayload, "autoRenewStatus"> | null, now = Date.now()): AppleRow | null {
  if (!tx.originalTransactionId || !tx.productId || !APPLE_PRO_PRODUCTS.has(tx.productId)) return null;
  if (tx.bundleId && tx.bundleId !== APPLE_BUNDLE_ID) return null;
  const revoked = !!tx.revocationDate;
  const live = !revoked && (tx.expiresDate ?? 0) > now;
  return {
    status: revoked ? "revoked" : live ? "active" : "expired",
    plan: live ? "pro" : "free",
    current_period_end: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null,
    // 1 = on, 0 = off (Apple's AutoRenewStatus). Unknown counts as renewing, which errs toward blocking deletion.
    auto_renew: renewal?.autoRenewStatus == null ? (live ? true : null) : Number(renewal.autoRenewStatus) === 1,
    apple_original_transaction_id: tx.originalTransactionId,
    apple_product_id: tx.productId,
  };
}

/** Whether an Apple-billed row will charge again (blocks account deletion, as Stripe does). */
export function appleWillRenew(row: { source?: string | null; status?: string | null; auto_renew?: boolean | null } | null): boolean {
  if (!row || row.source !== "apple") return false;
  return row.status === "active" && row.auto_renew !== false;
}

/** Apple's root certificates, fetched once from apple.com and kept in memory. */
const ROOTS = [
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
  "https://www.apple.com/certificateauthority/AppleIncRootCertificate.cer",
  "https://www.apple.com/certificateauthority/AppleComputerRootCertificate.cer",
];
let roots: Promise<Buffer[]> | null = null;
function rootCertificates(): Promise<Buffer[]> {
  roots ??= Promise.all(ROOTS.map(async (u) => Buffer.from(await (await fetch(u)).arrayBuffer())));
  return roots;
}

/**
 * Production first, then the sandbox (TestFlight and test purchases), as Apple
 * recommends. APPLE_APP_ID (the app's numeric Apple ID) is required for
 * production and only exists once the app is in App Store Connect.
 */
async function verifiers(): Promise<SignedDataVerifier[]> {
  const certs = await rootCertificates();
  const appId = process.env.APPLE_APP_ID ? Number(process.env.APPLE_APP_ID) : undefined;
  const list: SignedDataVerifier[] = [];
  if (appId) list.push(new SignedDataVerifier(certs, true, Environment.PRODUCTION, APPLE_BUNDLE_ID, appId));
  list.push(new SignedDataVerifier(certs, true, Environment.SANDBOX, APPLE_BUNDLE_ID));
  return list;
}

async function firstVerified<T>(work: (v: SignedDataVerifier) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const v of await verifiers()) {
    try { return await work(v); } catch (e) { last = e; }
  }
  throw last ?? new Error("Apple verification failed");
}

export const verifyTransaction = (jws: string) => firstVerified((v) => v.verifyAndDecodeTransaction(jws));
export const verifyRenewalInfo = (jws: string) => firstVerified((v) => v.verifyAndDecodeRenewalInfo(jws));
export const verifyNotification = (signedPayload: string) => firstVerified((v) => v.verifyAndDecodeNotification(signedPayload));
