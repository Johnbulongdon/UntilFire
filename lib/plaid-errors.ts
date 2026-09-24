/**
 * What a Plaid refusal means for the person, shared by the holdings request
 * and the daily refresh so both read an error code the same way.
 *
 * - "reconnect": they can fix it by reconnecting: a permission was never
 *   granted, or the bank wants them to log in again.
 * - "quiet": nothing for them to do: the data is not ready yet, or the
 *   institution does not offer it.
 * - "unexpected": our fault or Plaid's, not theirs. Logged, and not blamed on
 *   their connection.
 */
export type PlaidErrorOutcome = "reconnect" | "quiet" | "unexpected";

const RECONNECT = new Set(["ADDITIONAL_CONSENT_REQUIRED", "ITEM_LOGIN_REQUIRED", "PENDING_EXPIRATION", "PENDING_DISCONNECT"]);
const QUIET = new Set(["PRODUCT_NOT_READY", "PRODUCTS_NOT_SUPPORTED", "ITEM_NOT_SUPPORTED", "NO_INVESTMENT_ACCOUNTS", "NO_ACCOUNTS"]);

export function plaidErrorOutcome(errorCode: string | undefined): PlaidErrorOutcome {
  if (errorCode && RECONNECT.has(errorCode)) return "reconnect";
  if (errorCode && QUIET.has(errorCode)) return "quiet";
  return "unexpected";
}

/** The error_code on a Plaid SDK error, if it carries one. */
export function plaidErrorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
}

export interface ItemRun { institution: string; ok: boolean; errorCode?: string }

/**
 * One line for job_runs from a night's refresh. A connection waiting for its
 * owner to log in again is listed but does not fail the job: it is not
 * something a rerun or a fix here can change, and a job that is always red
 * stops being read. Anything unexpected does fail it.
 */
export function summariseRefresh(runs: ItemRun[]): {
  status: "ok" | "error"; considered: number; acted: number; error?: string;
} {
  const failed = runs.filter((r) => !r.ok);
  const needsOwner = failed.filter((r) => plaidErrorOutcome(r.errorCode) !== "unexpected");
  const broken = failed.filter((r) => plaidErrorOutcome(r.errorCode) === "unexpected");
  const parts = [
    broken.length ? `failed: ${broken.map((r) => `${r.institution} (${r.errorCode ?? "no code"})`).join(", ")}` : null,
    needsOwner.length ? `waiting on the owner: ${needsOwner.map((r) => `${r.institution} (${r.errorCode})`).join(", ")}` : null,
  ].filter(Boolean);
  return {
    status: broken.length ? "error" : "ok",
    considered: runs.length,
    acted: runs.length - failed.length,
    ...(parts.length ? { error: parts.join("; ") } : {}),
  };
}
