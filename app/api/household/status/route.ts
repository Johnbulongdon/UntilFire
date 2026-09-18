import { NextRequest, NextResponse } from "next/server";
import { householdFor, requireUser } from "@/lib/household";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin, user } = auth;

  try {
    return NextResponse.json(await householdFor(admin, user.id, user.email ?? ""));
  } catch (err) {
    console.error("[household/status]", err);
    return NextResponse.json({ error: "Could not load household" }, { status: 500 });
  }
}
