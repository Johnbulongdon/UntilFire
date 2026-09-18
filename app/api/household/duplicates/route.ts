import { NextRequest, NextResponse } from "next/server";
import { requireUser, duplicateCandidates } from "@/lib/household";

/**
 * Accounts both partners appear to have linked.
 *
 * Plaid gives an institution and a mask (last four digits) per account, which
 * is enough to *suspect* a shared joint account and not enough to be sure —
 * two genuinely different accounts at one bank can share a mask by
 * coincidence. So this only ever proposes; a human confirms.
 *
 * institution_id lives on plaid_items, which carries the access token and has
 * RLS with no policies at all. That table is service-role only and stays that
 * way, which is why this runs on the server rather than in the client.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin, user } = auth;

  try {
    return NextResponse.json({ candidates: await duplicateCandidates(admin, user.id) });
  } catch (err) {
    console.error("[household/duplicates]", err);
    return NextResponse.json({ error: "Could not check for shared accounts" }, { status: 500 });
  }
}

/**
 * Record the decision. `confirmed` means one account, count it once;
 * `dismissed` means two genuinely different accounts, stop asking.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin, user } = auth;

  let body: { a?: string; b?: string; status?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { a, b, status } = body;
  if (!a || !b) return NextResponse.json({ error: "Missing account ids" }, { status: 400 });
  if (status !== "confirmed" && status !== "dismissed") {
    return NextResponse.json({ error: "Unknown decision" }, { status: 400 });
  }

  const { data: mine } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mine) return NextResponse.json({ error: "You're not in a household." }, { status: 409 });

  try {
    // Both ids must belong to this household, or a caller could link accounts
    // they have no relationship to and change someone else's total.
    const { data: members } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", mine.household_id);
    const memberIds = (members ?? []).map((m) => m.user_id as string);

    const { count } = await admin
      .from("plaid_accounts")
      .select("plaid_account_id", { count: "exact", head: true })
      .in("plaid_account_id", [a, b])
      .in("user_id", memberIds);
    if ((count ?? 0) !== 2) {
      return NextResponse.json({ error: "Those accounts aren't both in your household." }, { status: 403 });
    }

    // Ordered, so the same pair proposed from either side is one row.
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const { error } = await admin.from("shared_account_links").upsert(
      {
        household_id: mine.household_id,
        plaid_account_id_a: lo,
        plaid_account_id_b: hi,
        confirmed_by: user.id,
        status,
      },
      { onConflict: "plaid_account_id_a,plaid_account_id_b" },
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[household/duplicates] POST", err);
    return NextResponse.json({ error: "Could not record that decision" }, { status: 500 });
  }
}
