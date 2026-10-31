import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { adminClient } from "./supabase-admin";
import { FALLBACK_RATES } from "./currency";
import { accountInUSD, connectedBalance } from "./account-currency";
import { retirementCash, CASH_INFLATION_RATE } from "./freedom-cash";
import { fetchAllPages } from "./supabase-pages";
import { confirmedAccountGroups, householdSpending, type MemberSpendRow } from "./household-spending";

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
  cashSavings: number;
  cashGrowthRate: number;
}

export interface HouseholdPosition {
  members: MemberPosition[];
  combined: {
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    portfolio: number;
    cashSavings: number;
    cashGrowthRate: number;
    annualExpenses: number;
  };
  /** Balance removed because both partners had linked the same account. */
  dedupedBalance: number;
  /** Candidate pairs nobody has ruled on yet — the total is provisional while any exist. */
  undecidedDuplicates: number;
}

/** Same retirement classification as personal balances. */
function isRetirementAccount(a: { subtype: string | null }): boolean {
  const subtype = (a.subtype ?? "").toLowerCase().replace(/[_-]/g, " ");
  return ["401", "403", "457", "ira", "roth", "retirement", "pension", "annuity", "sep", "simple", "keogh"].some(t => subtype.includes(t));
}

/** Read-only household aggregation from the current personal account store.
 * Ownership shares apply to personal views, not this full-household aggregate.
 * Confirmed bank duplicates count once; typed shared funds cannot be inferred. */
export async function householdPosition(admin: Admin, userId: string, suppliedRates?: Record<string, number>): Promise<HouseholdPosition | null> {
  const membership = await admin.from("household_members").select("household_id").eq("user_id", userId).maybeSingle();
  if (membership.error) throw new Error(membership.error.message);
  if (!membership.data) return null;
  const householdId = membership.data.household_id;
  const roster = await admin.from("household_members").select("user_id").eq("household_id", householdId).order("member_slot");
  if (roster.error) throw new Error(roster.error.message);
  const ids = [...new Set((roster.data ?? []).map(m => m.user_id as string))];
  if (ids.length < 2) return null;
  let rates = suppliedRates;
  if (!rates) {
    try {
      const response = await fetch("https://api.frankfurter.app/latest?from=USD", { signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error("Exchange rates unavailable");
      const result = await response.json();
      rates = { ...FALLBACK_RATES, ...(result.rates ?? {}) };
    } catch { rates = FALLBACK_RATES; }
  }
  const toUsd = (amount: number, currency: string) => {
    const code = currency.trim().toUpperCase() || "USD";
    if (code === "USD") return amount;
    const rate = rates![code];
    if (!(rate > 0) || !Number.isFinite(rate)) throw new Error("Missing exchange rate for " + code);
    return amount / rate;
  };
  const accountResult = await fetchAllPages((from, to) => admin.from("plaid_accounts")
    .select("id, plaid_account_id, user_id, name, type, subtype, balance_current, iso_currency_code, apy")
    .in("user_id", ids).order("id").range(from, to));
  if (accountResult.error) throw new Error(accountResult.error.message);
  type Account = { id: string; plaid_account_id: string; user_id: string; name: string | null; type: string; subtype: string | null; balance_current: number | null; iso_currency_code: string | null; apy?: number | null };
  const accounts = ((accountResult.data ?? []) as Account[]).map(a => {
    const converted = accountInUSD(a, rates!);
    if (!converted.converted) throw new Error("Missing exchange rate for " + converted.native_currency);
    if (a.balance_current == null || !Number.isFinite(a.balance_current)) throw new Error("Connected balance unavailable");
    return converted;
  });
  const linkResult = await admin.from("shared_account_links").select("plaid_account_id_a, plaid_account_id_b, status").eq("household_id", householdId);
  if (linkResult.error) throw new Error(linkResult.error.message);
  const byId = new Map(accounts.map(a => [a.plaid_account_id, a]));
  const confirmedLinks = (linkResult.data ?? []).filter(l => {
    const a = byId.get(l.plaid_account_id_a), b = byId.get(l.plaid_account_id_b);
    return l.status === "confirmed" && a && b && a.user_id !== b.user_id && a.type === b.type;
  }).map(l => ({ a: l.plaid_account_id_a as string, b: l.plaid_account_id_b as string }));
  const members: MemberPosition[] = [];
  const included = new Map<string, { amount: number; cash: boolean; realInterest: number }>();
  const numeric = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
  for (const id of ids) {
    const [profileResult, budgetResult, auth] = await Promise.all([
      admin.from("profiles").select("display_name, default_currency, free_to_spend_accounts").eq("user_id", id).maybeSingle(),
      admin.from("user_budget").select("income, expenses, fire_age, fire_assets").eq("user_id", id).maybeSingle(),
      admin.auth.admin.getUserById(id),
    ]);
    if (profileResult.error || budgetResult.error) throw new Error(profileResult.error?.message ?? budgetResult.error!.message);
    if (!budgetResult.data) throw new Error("Partner budget unavailable");
    const budget = budgetResult.data, profile = profileResult.data;
    const raw = (budget.expenses ?? {}) as Record<string, unknown>;
    const fp = (raw._fire_profile ?? {}) as Record<string, unknown>;
    const categories = Object.fromEntries(Object.entries(raw).filter(([k, v]) => !k.startsWith("_") && typeof v === "number" && Number.isFinite(v))) as Record<string, number>;
    const local = raw._budget_local as { currency?: string; values?: Record<string, number> } | undefined;
    if (local && local.currency && local.currency === (profile?.default_currency || "USD") && local.values) {
      for (const [key, value] of Object.entries(local.values)) if (!key.startsWith("_") && Number.isFinite(value)) categories[key] = toUsd(value, local.currency);
    }
    const monthlyExpenses = Object.values(categories).reduce((sum, value) => sum + value, 0);
    const monthlyIncome = Number(budget.income ?? 0);
    const mine = accounts.filter(a => a.user_id === id);
    const retirement = connectedBalance(mine, a => a.type === "investment" && isRetirementAccount(a));
    const brokerage = connectedBalance(mine, a => a.type === "investment" && !isRetirementAccount(a));
    const toggles = (profile?.free_to_spend_accounts ?? {}) as Record<string, boolean>;
    const cash = retirementCash(mine, toggles, numeric(fp.cashSavings));
    const portfolio = (retirement ?? numeric(fp.k401, Number(budget.fire_assets ?? 0)) + numeric(fp.rothIRA)) + (brokerage ?? numeric(fp.taxable)) + cash.cashSavings;
    for (const a of mine) {
      if (a.type === "investment") included.set(a.plaid_account_id, { amount: a.balance_current ?? 0, cash: false, realInterest: 0 });
      else if (a.type === "depository") {
        const held = retirementCash([a], toggles, 0);
        if (held.cashSavings > 0) included.set(a.plaid_account_id, { amount: held.cashSavings, cash: true, realInterest: held.cashSavings * held.cashGrowthRate });
      }
    }
    members.push({ userId: id, name: (profile?.display_name as string)?.trim() || auth.data?.user?.email?.split("@")[0] || "Partner", isYou: id === userId,
      age: Number(budget.fire_age ?? 0), monthlyIncome, monthlyExpenses, monthlySavings: Math.max(0, monthlyIncome - monthlyExpenses), portfolio, ...cash });
  }
  let dedupedBalance = 0, dedupedCash = 0, dedupedInterest = 0;
  const groups = confirmedAccountGroups(confirmedLinks);
  for (const group of new Set(groups.values())) {
    const values = [...groups].filter(([, value]) => value === group).map(([id]) => included.get(id)).filter((v): v is NonNullable<typeof v> => !!v);
    if (values.length < 2) continue;
    const kept = values.reduce((a, b) => a.amount >= b.amount ? a : b);
    const removed = values.filter(value => value !== kept);
    dedupedBalance += removed.reduce((sum, v) => sum + v.amount, 0);
    dedupedCash += removed.filter(v => v.cash).reduce((sum, v) => sum + v.amount, 0);
    dedupedInterest += removed.filter(v => v.cash).reduce((sum, v) => sum + v.realInterest, 0);
  }
  const undecided = await duplicateCandidates(admin, userId);
  const monthlyIncome = members.reduce((sum, m) => sum + m.monthlyIncome, 0);
  let monthlyExpenses = members.reduce((sum, m) => sum + m.monthlyExpenses, 0);
  try {
    const now = new Date(), current = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const start = new Date(now.getFullYear(), now.getMonth() - 13, 1);
    const since = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-01";
    // Any transaction establishes a member's first observed date; spending only contributes amounts.
    const result = await fetchAllPages((from, to) => admin.from("expenses")
      .select("user_id, date, amount, refund_amount, currency, description, sub_category, plaid_account_id, transaction_type")
      .in("user_id", ids).gte("date", since).order("date").order("id").range(from, to));
    if (result.error) throw new Error(result.error.message);
    const real = householdSpending((result.data ?? []) as MemberSpendRow[], current, toUsd, { memberIds: ids, confirmedLinks });
    if (real.average != null) monthlyExpenses = real.average;
  } catch (error) { console.error("[household] using saved budgets; history unavailable:", error); }
  const portfolio = Math.max(0, members.reduce((sum, m) => sum + m.portfolio, 0) - dedupedBalance);
  const cashSavings = Math.max(0, members.reduce((sum, m) => sum + m.cashSavings, 0) - dedupedCash);
  const cashInterest = members.reduce((sum, m) => sum + m.cashSavings * m.cashGrowthRate, 0) - dedupedInterest;
  return { members, combined: { monthlyIncome, monthlyExpenses, monthlySavings: Math.max(0, monthlyIncome - monthlyExpenses), portfolio, cashSavings,
    cashGrowthRate: cashSavings > 0 ? cashInterest / cashSavings : 1 / (1 + CASH_INFLATION_RATE) - 1, annualExpenses: monthlyExpenses * 12 },
    dedupedBalance, undecidedDuplicates: undecided.length };
}
