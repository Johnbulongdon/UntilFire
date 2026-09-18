import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { adminClient } from "./supabase-admin";

/**
 * Household membership, server side.
 *
 * Every structural write here goes through the service-role client, the same
 * pattern Stripe and Plaid already use. `authenticated` holds only SELECT on
 * these tables plus DELETE on its own membership row — see
 * 0016_household_accounts.sql. That means a client can read the roster and
 * leave, and nothing else: it cannot invent a membership, promote itself, or
 * write a row on someone else's behalf.
 *
 * Design decisions this file implements: docs/design/family-accounts.md.
 */

type Admin = SupabaseClient<any, any, any>;

/**
 * Resolve the caller and a service-role client, or the response to send.
 *
 * Order matters here and the first version got it wrong. Building the admin
 * client first means a request carrying no token at all still constructs one,
 * so a configuration fault turns every anonymous request into a 500 instead of
 * the 401 it is. The header is free to check; check it first.
 *
 * getUser can also throw rather than return an error, and a throw before the
 * route's own try block escapes as a bare 500 — so a caller with a bad token
 * gets a server fault where a 401 is the truth. Both faults are handled here,
 * once, for the five routes that needed these same lines.
 */
export async function requireUser(
  req: { headers: { get(name: string): string | null } },
): Promise<{ admin: Admin; user: { id: string; email?: string } } | { status: number; error: string }> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { status: 401, error: "Unauthorized" };

  let admin: Admin;
  try {
    admin = adminClient() as Admin;
  } catch (err) {
    console.error("[household] service client unavailable:", err);
    return { status: 503, error: "Authentication is unavailable right now." };
  }

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return { status: 401, error: "Unauthorized" };
    return { admin, user: { id: data.user.id, email: data.user.email } };
  } catch (err) {
    console.error("[household] auth check failed:", err);
    return { status: 503, error: "Authentication is unavailable right now." };
  }
}

/** A household holds two people. The slot is what enforces it. */
export const SLOT_OWNER = 1;
export const SLOT_PARTNER = 2;

export const INVITE_TTL_DAYS = 14;

export interface MemberView {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: "owner" | "member";
  slot: number;
  isYou: boolean;
}

export interface HouseholdView {
  householdId: string | null;
  members: MemberView[];
  /** A pending invite this user sent, if any. */
  pendingInvite: { email: string; expiresAt: string } | null;
  /** A pending invite addressed to this user, if any. */
  incomingInvite: { token: string; fromName: string | null; fromEmail: string | null } | null;
}

/**
 * Opaque, single-use, 256 bits.
 *
 * base64url rather than hex so the link stays short enough not to wrap in a
 * mail client, which is where a wrapped token becomes a broken link.
 */
export function mintInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function inviteExpiry(): string {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Normalised for comparison: invites are matched on email, and people type. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const e = normaliseEmail(raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 320;
}

/**
 * Everything the Profile section needs, in one round trip.
 *
 * Reads through the admin client because it joins auth.users for emails, which
 * `authenticated` has no access to. Every branch is still scoped to the caller:
 * nothing is returned that the caller's own membership does not entitle them to.
 */
export async function householdFor(admin: Admin, userId: string, userEmail: string): Promise<HouseholdView> {
  const { data: mine } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .maybeSingle();

  const householdId = (mine?.household_id as string) ?? null;

  // No household: the only thing that can be true is an invite waiting for them.
  if (!householdId) {
    const { data: incoming } = await admin
      .from("household_invites")
      .select("token, inviter_id")
      .eq("invitee_email", normaliseEmail(userEmail))
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!incoming) return { householdId: null, members: [], pendingInvite: null, incomingInvite: null };

    const { data: inviter } = await admin
      .from("profiles")
      .select("display_name")
      .eq("user_id", incoming.inviter_id)
      .maybeSingle();
    const { data: inviterAuth } = await admin.auth.admin.getUserById(incoming.inviter_id as string);

    return {
      householdId: null,
      members: [],
      pendingInvite: null,
      incomingInvite: {
        token: incoming.token as string,
        fromName: (inviter?.display_name as string) ?? null,
        fromEmail: inviterAuth?.user?.email ?? null,
      },
    };
  }

  const { data: rows } = await admin
    .from("household_members")
    .select("user_id, role, member_slot")
    .eq("household_id", householdId)
    .order("member_slot");

  const members: MemberView[] = [];
  for (const row of rows ?? []) {
    const id = row.user_id as string;
    const [{ data: prof }, auth] = await Promise.all([
      admin.from("profiles").select("display_name").eq("user_id", id).maybeSingle(),
      admin.auth.admin.getUserById(id),
    ]);
    members.push({
      userId: id,
      email: auth.data?.user?.email ?? null,
      displayName: (prof?.display_name as string) ?? null,
      role: row.role as "owner" | "member",
      slot: row.member_slot as number,
      isYou: id === userId,
    });
  }

  const { data: pending } = await admin
    .from("household_invites")
    .select("invitee_email, expires_at")
    .eq("household_id", householdId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    householdId,
    members,
    pendingInvite: pending
      ? { email: pending.invitee_email as string, expiresAt: pending.expires_at as string }
      : null,
    incomingInvite: null,
  };
}
