import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { Transaction as PlaidTransaction } from "plaid";
import { getInstitutionBranding, getPlaidClient, mapPlaidTx } from "@/lib/plaid";
import { applyRefunds } from "@/lib/plaid-sync";
import { LIFECYCLE_EVENTS, recordEvent } from "@/lib/lifecycle";
import { FALLBACK_RATES } from "@/lib/currency";
import { setupFinds } from "@/lib/setup-steps";
import type { RawTx } from "@/lib/recurring-detect";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    public_token: string;
    institution_name: string;
    institution_id: string;
  };

  if (!body.public_token) {
    return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
  }

  // Server-side paywall: free users limited to 1 bank
  const [{ data: sub }, { count: itemCount }] = await Promise.all([
    admin.from("subscriptions").select("status, plan").eq("user_id", user.id).maybeSingle(),
    admin.from("plaid_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const isFree = !sub || sub.status !== "active" || sub.plan !== "pro";
  if (isFree && (itemCount ?? 0) >= 1) {
    return NextResponse.json({ error: "Free plan allows 1 bank. Upgrade to Pro for unlimited." }, { status: 403 });
  }

  try {
    const plaid = getPlaidClient();

    // Exchange public token for access token
    const exchangeResp = await plaid.itemPublicTokenExchange({
      public_token: body.public_token,
    });
    const accessToken = exchangeResp.data.access_token;
    const plaidItemId = exchangeResp.data.item_id;

    // Paginate transactions/sync (no cursor = full history)
    let cursor: string | undefined = undefined;
    const allAdded: PlaidTransaction[] = [];
    let hasMore = true;

    while (hasMore) {
      const syncResp = await plaid.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 500,
        options: { include_personal_finance_category: true },
      });
      allAdded.push(...syncResp.data.added);
      cursor = syncResp.data.next_cursor;
      hasMore = syncResp.data.has_more;
    }

    const branding = body.institution_id
      ? await getInstitutionBranding(body.institution_id)
      : { logo: null, color: null };

    // Upsert plaid_items row (handles re-connect of same institution)
    const { data: itemRow, error: itemErr } = await admin
      .from("plaid_items")
      .upsert(
        {
          user_id: user.id,
          plaid_item_id: plaidItemId,
          plaid_access_token: accessToken,
          institution_id: body.institution_id,
          institution_name: body.institution_name,
          institution_logo: branding.logo,
          institution_color: branding.color,
          // Keep a retryable starting point until the import is persisted.
          cursor: null,
          last_synced_at: null,
        },
        { onConflict: "user_id,institution_id" },
      )
      .select("id")
      .single();

    if (itemErr || !itemRow) {
      console.error("[plaid/exchange-token] plaid_items upsert:", itemErr);
      return NextResponse.json({ error: "Failed to save connection" }, { status: 500 });
    }

    // Map and bulk upsert into expenses
    const rows = allAdded.map((tx) => mapPlaidTx(tx, user.id)).filter(Boolean);

    if (rows.length > 0) {
      const { error: expErr } = await admin
        .from("expenses")
        .upsert(rows, { onConflict: "plaid_transaction_id", ignoreDuplicates: true });
      if (expErr) {
        console.error("[plaid/exchange-token] expenses upsert:", expErr);
        return NextResponse.json({ error: "Bank connection saved. Reload Money and use Sync to finish importing." }, { status: 500 });
      }
    }
    const { data: savedCursor, error: cursorError } = await admin.from("plaid_items")
      .update({ cursor: cursor ?? null, last_synced_at: new Date().toISOString() })
      .eq("id", itemRow.id).eq("user_id", user.id).select("id").single();
    if (cursorError || !savedCursor) {
      console.error("[plaid/exchange-token] cursor save:", cursorError);
      return NextResponse.json({ error: "Bank connection saved. Reload Money and use Sync to finish importing." }, { status: 500 });
    }
    await recordEvent(admin, user.id, LIFECYCLE_EVENTS.BANK_CONNECTED);

    // Money back from a shop reduces that purchase, rather than reading as income (lib/refunds).
    await applyRefunds(admin, user.id, allAdded.filter((tx) => tx.amount < 0 && !tx.pending).map((tx) => tx.transaction_id));

    // What the bank showed, for the "working" screen (lib/setup-steps setupFinds, the
    // checklist's own rule): a paycheck and repeating bills Calendar doesn't list yet.
    let found = { payday: false, bills: 0 };
    try {
      const txns: RawTx[] = rows.flatMap((r, i) => r && (r.transaction_type === "expense" || r.transaction_type === "income")
        ? [{ id: String(i), date: r.date, amount: r.amount, currency: r.currency, description: r.description ?? "", category: r.category ?? "", transaction_type: r.transaction_type }]
        : []);
      const { data: listed } = await admin.from("expected_payments").select("description").eq("user_id", user.id);
      const finds = setupFinds(txns, listed ?? [], FALLBACK_RATES);
      found = { payday: !!finds.payday, bills: finds.bills.length };
    } catch (findErr) {
      console.error("[plaid/exchange-token] finds:", findErr);
    }
    let accountsCount = 0;

    // Fetch and store account balances
    try {
      const accountsResp = await plaid.accountsGet({ access_token: accessToken });
      const accountRows = accountsResp.data.accounts.map((a) => ({
        user_id: user.id,
        plaid_item_id: itemRow.id,
        plaid_account_id: a.account_id,
        name: a.name,
        official_name: a.official_name ?? null,
        type: a.type,
        subtype: a.subtype ?? null,
        balance_current: a.balances.current ?? null,
        balance_available: a.balances.available ?? null,
        balance_limit: a.balances.limit ?? null,
        iso_currency_code: a.balances.iso_currency_code ?? "USD",
        mask: a.mask ?? null,
        updated_at: new Date().toISOString(),
      }));
      accountsCount = accountRows.length;
      if (accountRows.length > 0) {
        const { error: accErr } = await admin
          .from("plaid_accounts")
          .upsert(accountRows, { onConflict: "plaid_account_id" });
        if (accErr) console.error("[plaid/exchange-token] accounts upsert:", accErr);
      }
    } catch (accErr) {
      console.error("[plaid/exchange-token] accountsGet:", accErr);
    }

    return NextResponse.json({
      item_id: itemRow.id,
      institution_name: body.institution_name,
      added_count: rows.length,
      accounts_count: accountsCount,
      found,
    });
  } catch (err) {
    console.error("[plaid/exchange-token]", err);
    return NextResponse.json({ error: "Failed to connect bank" }, { status: 500 });
  }
}
