import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getPlaidClient } from "@/lib/plaid";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: items } = await admin
    .from("plaid_items")
    .select("plaid_access_token, institution_name")
    .eq("user_id", user.id);

  if (!items || items.length === 0) {
    return NextResponse.json({ holdings: [], securities: {}, needs_reconnect: [] });
  }

  const plaid = getPlaidClient();
  const allHoldings: object[] = [];
  const securitiesMap: Record<string, object> = {};
  const needsReconnect: string[] = [];

  await Promise.all(
    items.map(async (item) => {
      try {
        const res = await plaid.investmentsHoldingsGet({ access_token: item.plaid_access_token });
        for (const h of res.data.holdings) {
          allHoldings.push({
            account_id: h.account_id,
            security_id: h.security_id,
            quantity: h.quantity,
            institution_price: h.institution_price ?? null,
            institution_value: h.institution_value ?? null,
            cost_basis: h.cost_basis ?? null,
            iso_currency_code: h.iso_currency_code ?? null,
          });
        }
        for (const s of res.data.securities) {
          securitiesMap[s.security_id] = {
            security_id: s.security_id,
            name: s.name ?? null,
            ticker_symbol: s.ticker_symbol ?? null,
            type: s.type ?? null,
          };
        }
      } catch (err: unknown) {
        const plaidErr = err as { response?: { data?: { error_code?: string } } };
        const code = plaidErr.response?.data?.error_code;
        if (code === "PRODUCT_NOT_READY" || code === "PRODUCTS_NOT_SUPPORTED" || code === "ITEM_NOT_SUPPORTED") {
          needsReconnect.push(item.institution_name);
        } else {
          console.error("[plaid/holdings]", item.institution_name, plaidErr.response?.data ?? err);
          needsReconnect.push(item.institution_name);
        }
      }
    })
  );

  return NextResponse.json({ holdings: allHoldings, securities: securitiesMap, needs_reconnect: needsReconnect });
}
