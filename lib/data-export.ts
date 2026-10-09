/**
 * Your data, to take with you (D-56). Built in the browser from what the
 * signed-in account can already read, so nothing new crosses the network
 * and no server holds a copy. Bank connection tokens are never read here;
 * accounts come from the same routes the dashboard uses, which omit them.
 */
import { supabase } from "./supabase";
import { fetchAllPages } from "./supabase-pages";
import { loadCatCustomizations } from "./categories";

import { type ExportTransaction } from "./export-csv";
export { csvCell, transactionsCsv, type ExportTransaction } from "./export-csv";

async function token(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function api<T>(path: string, key: string, bearer: string): Promise<T[]> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${bearer}` } }).catch(() => null);
  if (!res?.ok) return [];
  const body = await res.json().catch(() => null);
  return Array.isArray(body?.[key]) ? body[key] : [];
}

async function all<T>(table: string, userId: string, order: string): Promise<T[]> {
  const { data, error } = await fetchAllPages<T>((from, to) => supabase.from(table).select("*").eq("user_id", userId).order(order).order("id").range(from, to));
  if (error) throw new Error(`Could not read ${table}: ${error.message}`);
  return data ?? [];
}

async function rows<T>(table: string, userId: string, columns = "*"): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(columns).eq("user_id", userId);
  if (error) throw new Error(`Could not read ${table}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function loadTransactions(userId: string): Promise<ExportTransaction[]> {
  return all<ExportTransaction>("expenses", userId, "date");
}

/** Everything the account holds, as one JSON document. */
export async function exportEverything(userId: string): Promise<string> {
  const bearer = await token();
  if (!bearer) throw new Error("You're signed out. Sign in again to export.");
  const [transactions, upcoming, budget, goals, snapshots, profile, rules, scenarios, assumptions, contributionHistory, accounts, banks] = await Promise.all([
    loadTransactions(userId),
    rows("expected_payments", userId),
    rows("user_budget", userId, "income, expenses, fire_age, fire_assets, baseline_net_worth, baseline_date, updated_at"),
    rows("goals", userId),
    all("net_worth_snapshots", userId, "captured_at"),
    rows("profiles", userId, "display_name, locale_kind, jurisdiction, current_age, default_currency, preferred_currencies, contribution_plan, free_to_spend_accounts, debt_originals, dashboard_layout, created_at"),
    rows("classification_rules", userId),
    rows("scenarios", userId),
    rows("scenario_assumptions", userId),
    rows("contribution_snapshots", userId),
    api("/api/plaid/accounts", "accounts", bearer),
    api<{ institution_name: string; last_synced_at: string | null }>("/api/plaid/items", "items", bearer),
  ]);
  let fireType: unknown = null;
  try { fireType = JSON.parse(localStorage.getItem("uf_fire_type_result") ?? "null"); } catch { fireType = null; }
  return JSON.stringify({
    format: "untilfire-export",
    version: 1,
    exported_at: new Date().toISOString(),
    note: "Amounts are in each row's own currency. Bank connection tokens are never included.",
    profile: profile[0] ?? null,
    budget: budget[0] ?? null,
    transactions,
    upcoming_payments: upcoming,
    goals,
    connected_banks: banks.map((b) => ({ name: b.institution_name, last_synced_at: b.last_synced_at })),
    accounts,
    net_worth_history: snapshots,
    category_rules: rules,
    category_settings_on_this_device: loadCatCustomizations(),
    plan_scenarios: scenarios,
    plan_assumptions: assumptions,
    contribution_history: contributionHistory,
    fire_type_on_this_device: fireType,
  }, null, 2);
}

/** Hands the browser a file to save. */
export function download(filename: string, body: string, type: string): void {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const exportFileName = (kind: "transactions" | "everything", ext: "csv" | "json") =>
  `untilfire-${kind}-${new Date().toISOString().slice(0, 10)}.${ext}`;
