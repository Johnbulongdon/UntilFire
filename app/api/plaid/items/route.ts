import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getInstitutionBranding } from "@/lib/plaid";

type PlaidItemRow = {
  id: string;
  institution_id: string;
  institution_name: string;
  institution_logo: string | null;
  institution_color: string | null;
  last_synced_at: string | null;
};

// Returns the user's connected institutions — never exposes access_token or plaid_item_id.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await admin
    .from("plaid_items")
    .select("id, institution_id, institution_name, institution_logo, institution_color, last_synced_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[plaid/items]", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }

  const items = (data ?? []) as PlaidItemRow[];

  // Backfill branding for connections made before logo caching existed.
  const missing = items.filter((it) => !it.institution_logo && it.institution_id);
  if (missing.length > 0) {
    await Promise.all(
      missing.map(async (it) => {
        const branding = await getInstitutionBranding(it.institution_id);
        if (!branding.logo && !branding.color) return;
        it.institution_logo = branding.logo;
        it.institution_color = branding.color;
        await admin
          .from("plaid_items")
          .update({ institution_logo: branding.logo, institution_color: branding.color })
          .eq("id", it.id);
      }),
    );
  }

  return NextResponse.json({
    items: items.map((it) => ({
      id: it.id,
      institution_name: it.institution_name,
      institution_logo: it.institution_logo ? `data:image/png;base64,${it.institution_logo}` : null,
      institution_color: it.institution_color,
      last_synced_at: it.last_synced_at,
    })),
  });
}
