import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { satisfaction, featuresUsed, missing, missingOther, recommend, notes } =
    await req.json() as {
      satisfaction?: number;
      featuresUsed?: string[];
      missing?: string;
      missingOther?: string;
      recommend?: string;
      notes?: string;
    };

  const { error: insertError } = await admin.from("surveys").insert({
    user_id:       user.id,
    satisfaction:  typeof satisfaction === "number" ? satisfaction : null,
    features_used: Array.isArray(featuresUsed) ? featuresUsed : [],
    missing:       missing ?? null,
    missing_other: missingOther?.trim() || null,
    recommend:     ["yes", "maybe", "no"].includes(recommend ?? "") ? recommend : null,
    notes:         notes?.trim() || null,
  });

  if (insertError) return NextResponse.json({ error: "Save failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
