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

// ─── P2: accounts both partners linked ───────────────────────────────────────

export interface DuplicateCandidate {
  /** plaid_account_id belonging to the caller. */
  a: string;
  /** plaid_account_id belonging to the partner. */
  b: string;
  institution: string;
  mask: string;
  /** What the pair is worth, so the prompt can say what is at stake. */
  balance: number;
  currency: string;
}

interface AccountRow {
  plaid_account_id: string;
  user_id: string;
  mask: string | null;
  name: string | null;
  balance_current: number | null;
  iso_currency_code: string | null;
  plaid_item_id: string;
}

/**
 * Pairs of accounts, one from each partner, that look like the same account.
 *
 * Matched on institution plus mask. That is enough to raise the question and
 * not enough to answer it, so nothing here changes a total on its own — a
 * confirmation does. Pairs already decided (either way) are filtered out, so
 * the prompt appears once rather than on every page load.
 */
export async function duplicateCandidates(admin: Admin, userId: string): Promise<DuplicateCandidate[]> {
  const { data: mine } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!mine) return [];

  const { data: members } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", mine.household_id);
  const ids = (members ?? []).map((m) => m.user_id as string);
  if (ids.length < 2) return [];

  const { data: accounts } = await admin
    .from("plaid_accounts")
    .select("plaid_account_id, user_id, mask, name, balance_current, iso_currency_code, plaid_item_id")
    .in("user_id", ids);
  if (!accounts?.length) return [];

  // institution_id is on plaid_items, which authenticated cannot read at all.
  const itemIds = [...new Set((accounts as AccountRow[]).map((a) => a.plaid_item_id))];
  const { data: items } = await admin
    .from("plaid_items")
    .select("id, institution_id, institution_name")
    .in("id", itemIds);
  const institutionOf = new Map<string, { id: string | null; name: string | null }>();
  for (const it of items ?? []) {
    institutionOf.set(it.id as string, {
      id: (it.institution_id as string) ?? null,
      name: (it.institution_name as string) ?? null,
    });
  }

  const { data: decided } = await admin
    .from("shared_account_links")
    .select("plaid_account_id_a, plaid_account_id_b")
    .eq("household_id", mine.household_id);
  const settled = new Set((decided ?? []).map((d) => `${d.plaid_account_id_a}|${d.plaid_account_id_b}`));

  const rows = accounts as AccountRow[];
  const out: DuplicateCandidate[] = [];

  for (const mineRow of rows.filter((r) => r.user_id === userId)) {
    if (!mineRow.mask) continue;
    const mineInst = institutionOf.get(mineRow.plaid_item_id);
    if (!mineInst?.id) continue;

    for (const theirs of rows.filter((r) => r.user_id !== userId)) {
      if (theirs.mask !== mineRow.mask) continue;
      const theirInst = institutionOf.get(theirs.plaid_item_id);
      if (theirInst?.id !== mineInst.id) continue;

      const [lo, hi] = mineRow.plaid_account_id < theirs.plaid_account_id
        ? [mineRow.plaid_account_id, theirs.plaid_account_id]
        : [theirs.plaid_account_id, mineRow.plaid_account_id];
      if (settled.has(`${lo}|${hi}`)) continue;

      out.push({
        a: mineRow.plaid_account_id,
        b: theirs.plaid_account_id,
        institution: mineInst.name ?? "your bank",
        mask: mineRow.mask,
        balance: Number(mineRow.balance_current ?? 0),
        currency: mineRow.iso_currency_code ?? "USD",
      });
    }
  }
  return out;
}

// ─── P3: the household's combined position ───────────────────────────────────

export interface MemberPosition {
  userId: string;
  name: string;
  isYou: boolean;
  age: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  portfolio: number;
}

export interface HouseholdPosition {
  members: MemberPosition[];
  combined: {
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    portfolio: number;
    annualExpenses: number;
  };
  /** Balance removed because both partners had linked the same account. */
  dedupedBalance: number;
  /** Candidate pairs nobody has ruled on yet — the total is provisional while any exist. */
  undecidedDuplicates: number;
}

/**
 * Both partners' numbers, summed.
 *
 * Aggregate, not pooled: each person's own figures are untouched and this only
 * ever adds them up. Read through the service-role client because it needs
 * both members at once, and every value comes from scenario_assumptions, which
 * is the same source each person's own dashboard reads.
 *
 * Portfolio is 401k + Roth + taxable. Cash savings live outside
 * scenario_assumptions, so they are deliberately absent rather than guessed —
 * a household total that quietly invents a number is worse than one that is
 * visibly conservative.
 */
export async function householdPosition(admin: Admin, userId: string): Promise<HouseholdPosition | null> {
  const { data: mine } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!mine) return null;

  const { data: memberRows } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", mine.household_id)
    .order("member_slot");
  const ids = (memberRows ?? []).map((m) => m.user_id as string);
  if (ids.length < 2) return null;

  const members: MemberPosition[] = [];
  for (const id of ids) {
    const [{ data: prof }, { data: assumptions }, auth] = await Promise.all([
      admin.from("profiles").select("display_name").eq("user_id", id).maybeSingle(),
      admin
        .from("scenario_assumptions")
        .select("monthly_income, fire_age, k401, roth_ira, taxable, budget_categories, scenarios!inner(is_default)")
        .eq("user_id", id)
        .eq("scenarios.is_default", true)
        .maybeSingle(),
      admin.auth.admin.getUserById(id),
    ]);

    const categories = (assumptions?.budget_categories ?? {}) as Record<string, number>;
    const monthlyExpenses = Object.values(categories).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const monthlyIncome = Number(assumptions?.monthly_income ?? 0);
    const portfolio =
      Number(assumptions?.k401 ?? 0) + Number(assumptions?.roth_ira ?? 0) + Number(assumptions?.taxable ?? 0);

    members.push({
      userId: id,
      name: (prof?.display_name as string)?.trim()
        || auth.data?.user?.email?.split("@")[0]
        || "Partner",
      isYou: id === userId,
      age: Number(assumptions?.fire_age ?? 0),
      monthlyIncome,
      monthlyExpenses,
      monthlySavings: Math.max(0, monthlyIncome - monthlyExpenses),
      portfolio,
    });
  }

  // Confirmed duplicates are counted once. Undecided ones stay counted for
  // both — overstating a household total is a smaller failure than silently
  // halving it — but the caller is told how many are outstanding so it can say so.
  const { data: links } = await admin
    .from("shared_account_links")
    .select("plaid_account_id_b, status")
    .eq("household_id", mine.household_id);

  const confirmed = (links ?? []).filter((l) => l.status === "confirmed");
  let dedupedBalance = 0;
  if (confirmed.length) {
    const { data: dupAccounts } = await admin
      .from("plaid_accounts")
      .select("balance_current")
      .in("plaid_account_id", confirmed.map((l) => l.plaid_account_id_b as string));
    dedupedBalance = (dupAccounts ?? []).reduce((sum, a) => sum + Number(a.balance_current ?? 0), 0);
  }

  const undecided = await duplicateCandidates(admin, userId);

  const monthlyIncome = members.reduce((s, m) => s + m.monthlyIncome, 0);
  const monthlyExpenses = members.reduce((s, m) => s + m.monthlyExpenses, 0);
  const portfolio = Math.max(0, members.reduce((s, m) => s + m.portfolio, 0) - dedupedBalance);

  return {
    members,
    combined: {
      monthlyIncome,
      monthlyExpenses,
      monthlySavings: Math.max(0, monthlyIncome - monthlyExpenses),
      portfolio,
      annualExpenses: monthlyExpenses * 12,
    },
    dedupedBalance,
    undecidedDuplicates: undecided.length,
  };
}
