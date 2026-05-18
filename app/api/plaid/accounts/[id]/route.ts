import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { apy?: number | null };
  const apy = body.apy ?? null;

  if (apy !== null && (typeof apy !== "number" || !isFinite(apy) || apy < 0 || apy > 100)) {
    return NextResponse.json({ error: "Invalid APY value" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("plaid_accounts")
    .update({ apy })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, apy")
    .single();

  if (error || !data) {
    console.error("[plaid/accounts/PATCH]", error);
    return NextResponse.json({ error: "Account not found or update failed" }, { status: error?.code === "PGRST116" ? 404 : 500 });
  }

  return NextResponse.json(data);
}
