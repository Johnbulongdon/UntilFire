/**
 * Where a pending invitation waits while the browser goes to Google and back.
 *
 * Client-safe on purpose: lib/household.ts imports node:crypto for token
 * minting, so it cannot be pulled into a client bundle. This one constant is
 * needed by both the join page and the dashboard's bounce-back, and a magic
 * string duplicated across two files is a string that eventually disagrees
 * with itself.
 */
export const HOUSEHOLD_INVITE_KEY = "uf_household_invite";
