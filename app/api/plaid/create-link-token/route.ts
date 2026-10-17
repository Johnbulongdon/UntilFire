import { NextRequest, NextResponse } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { adminClient } from "@/lib/supabase-admin";
import { Products } from "plaid";
import { getPlaidClient, plaidCountries } from "@/lib/plaid";


export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(callerKey(req, "plaid-create-link-token"), 10);
  if (limited) return limited;
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

  // Banks that log in on their own site (OAuth, e.g. Chase) need a way back:
  // iOS returns through a universal link registered in the Plaid dashboard
  // (PLAID_IOS_REDIRECT_URI, served by app/plaid-oauth and the AASA file);
  // Android returns to the app by package name. The website flow is unchanged.
  const { platform } = (await req.json().catch(() => ({}))) as { platform?: string };
  const oauth =
    platform === "ios" && process.env.PLAID_IOS_REDIRECT_URI ? { redirect_uri: process.env.PLAID_IOS_REDIRECT_URI }
    : platform === "android" ? { android_package_name: "com.untilfire.app.native" }
    : {};

  try {
    const plaid = getPlaidClient();
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "UntilFire",
      // Every product in `products` is billed on every connection, and Link
      // only lists banks that support all of them — with an account for
      // each — so asking for Investments here hid banks without investments
      // and charged the Investments fee on bank-only connections. Investments
      // is used only where the person picks an investment account.
      products: [Products.Transactions],
      required_if_supported_products: [Products.Investments],
      // Two years, not Plaid's default 90 days: the freedom date runs on the last
      // 12 complete months of real spending (D-86), so 90 days left it on the budget.
      transactions: { days_requested: 730 },
      country_codes: plaidCountries(),
      language: "en",
      ...oauth,
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: unknown) {
    const plaidErr = err as { response?: { data?: unknown }; message?: string };
    console.error("[plaid/create-link-token]", plaidErr.response?.data ?? plaidErr.message ?? err);
    const detail = (plaidErr.response?.data as { error_message?: string })?.error_message;
    return NextResponse.json({ error: detail ?? "Failed to create link token" }, { status: 500 });
  }
}
