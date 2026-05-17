import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { CountryCode, Products } from "plaid";
import { getPlaidClient } from "@/lib/plaid";


export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "UntilFire",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: unknown) {
    const plaidErr = err as { response?: { data?: unknown }; message?: string };
    console.error("[plaid/create-link-token]", plaidErr.response?.data ?? plaidErr.message ?? err);
    const detail = (plaidErr.response?.data as { error_message?: string })?.error_message;
    return NextResponse.json({ error: detail ?? "Failed to create link token" }, { status: 500 });
  }
}
