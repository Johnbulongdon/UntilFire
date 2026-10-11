import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { fetchAllPages, transactionsCsv, type ExportTransaction } from '@/engine'
import { supabase } from '@/lib/supabase'

const stamp = () => new Date().toISOString().slice(0, 10)

/** Writes a file to the phone's cache and opens the share sheet (Save to Files, AirDrop, Mail…). */
async function share(name: string, body: string, mimeType: string) {
  const file = new File(Paths.cache, name)
  if (file.exists) file.delete()
  file.create()
  file.write(body)
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name })
}

async function all<T>(table: string, userId: string, order: string): Promise<T[]> {
  const { data, error } = await fetchAllPages<T>((from, to) => supabase.from(table).select('*').eq('user_id', userId).order(order).order('id').range(from, to))
  if (error) throw new Error(`Could not read ${table}.`)
  return data ?? []
}

async function rows<T>(table: string, userId: string, columns = '*'): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(columns).eq('user_id', userId)
  if (error) throw new Error(`Could not read ${table}.`)
  return (data ?? []) as T[]
}

/** Every transaction as a spreadsheet, in the website's column layout (lib/export-csv.ts). */
export async function exportTransactions(userId: string) {
  const tx = await all<ExportTransaction>('expenses', userId, 'date')
  await share(`untilfire-transactions-${stamp()}.csv`, transactionsCsv(tx), 'text/csv')
}

/** Everything the account holds as one JSON file, the same sections as the website's export (D-56). */
export async function exportEverything(userId: string) {
  const [transactions, upcoming, budget, goals, snapshots, profile] = await Promise.all([
    all('expenses', userId, 'date'),
    rows('expected_payments', userId),
    rows('user_budget', userId, 'income, expenses, fire_age, fire_assets, baseline_net_worth, baseline_date, updated_at'),
    rows('goals', userId),
    all('net_worth_snapshots', userId, 'captured_at'),
    rows('profiles', userId, 'display_name, default_currency, preferred_currencies, contribution_plan, created_at'),
  ])
  const body = JSON.stringify({
    format: 'untilfire-export',
    version: 1,
    exported_at: new Date().toISOString(),
    note: 'Amounts are in each row\'s own currency. Bank connection tokens are never included.',
    profile: profile[0] ?? null,
    budget: budget[0] ?? null,
    transactions,
    upcoming_payments: upcoming,
    goals,
    net_worth_history: snapshots,
  }, null, 2)
  await share(`untilfire-everything-${stamp()}.json`, body, 'application/json')
}
