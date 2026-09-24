import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getPlaidClient } from "@/lib/plaid";
import { disconnectAllForUser, listInstitutions } from "@/lib/plaid-remove";


export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Disconnect every bank at Plaid first. Deleting the user cascades away
  // the access tokens, and a connection Plaid still has keeps being billed
  // and keeps its access to the bank, with nothing left to remove it.
  const { failed, readError } = await disconnectAllForUser(admin, user.id, getPlaidClient);
  if (readError) {
    return NextResponse.json({ error: "Couldn't check your bank connections, so your account hasn't been deleted. Please try again." }, { status: 500 });
  }
  if (failed.length > 0) {
    const names = listInstitutions(failed.map((f) => f.institution));
    return NextResponse.json({
      error: `We couldn't disconnect ${names}, so your account hasn't been deleted yet. Please try again in a few minutes.`,
    }, { status: 502 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
