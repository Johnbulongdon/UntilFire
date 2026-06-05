import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getPlaidClient, PLAID_CATEGORY_MAP } from "@/lib/plaid";

// Plaid recurring frequency → UntilFire FrequencyLabel
const FREQ_MAP: Record<string, string> = {
  WEEKLY:       "weekly",
  BIWEEKLY:     "biweekly",
  SEMI_MONTHLY: "biweekly",
  MONTHLY:      "monthly",
  ANNUALLY:     "annual",
  UNKNOWN:      "irregular",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStream(stream: any, type: "expense" | "income") {
  const primary: string = stream.personal_finance_category?.primary ?? "";
  const category = PLAID_CATEGORY_MAP[primary] ?? (type === "income" ? "salary" : "other");
  return {
    stream_id: stream.stream_id as string,
    description: (stream.merchant_name ?? stream.description) as string,
    category,
    transaction_type: type,
    amount: Math.abs(stream.average_amount.amount as number),
    currency: (stream.average_amount.iso_currency_code ?? "USD") as string,
    frequency: FREQ_MAP[stream.frequency as string] ?? "monthly",
    last_date: stream.last_date as string,
    predicted_next_date: (stream.predicted_next_date ?? null) as string | null,
    status: stream.status as string,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: items, error: itemsError } = await admin
    .from("plaid_items")
    .select("plaid_access_token, institution_name")
    .eq("user_id", user.id);

  if (itemsError || !items?.length) {
    return NextResponse.json({ outflow: [], inflow: [] });
  }

  const plaid = getPlaidClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outflow: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inflow: any[] = [];

  await Promise.all(
    items.map(async (item) => {
      try {
        const resp = await plaid.transactionsRecurringGet({
          access_token: item.plaid_access_token,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isActive = (s: any) => s.is_active && s.status !== "TOMBSTONED";
        outflow.push(...resp.data.outflow_streams.filter(isActive).map((s) => mapStream(s, "expense")));
        inflow.push(...resp.data.inflow_streams.filter(isActive).map((s) => mapStream(s, "income")));
      } catch {
        // one item failing shouldn't block the others
      }
    })
  );

  return NextResponse.json({ outflow, inflow });
}
