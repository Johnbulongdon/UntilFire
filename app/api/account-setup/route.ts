import { NextRequest } from "next/server";
import { apiFailure, providerAuth, reply } from "@/lib/provider-api";
import { checked } from "@/lib/provider-links-server";
import {
  isSetupGoal,
  setupChange,
  type AccountSetup,
} from "@/lib/account-setup";
import { rateLimit, callerKey } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { db, user } = await providerAuth(req);
    return reply({
      journeys: checked(
        await db
          .from("account_setup_journeys")
          .select("goal,stage,origin,account_label,version")
          .eq("user_id", user!.id),
      ),
    });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(req: NextRequest) {
  const limited = rateLimit(callerKey(req, "account-setup"), 30);
  if (limited) return limited;
  try {
    const { db, user } = await providerAuth(req);
    const body = await req.json().catch(() => ({}));
    if (!isSetupGoal(body.goal))
      return reply({ error: "Choose savings or investing." }, 400);
    const current = checked(
      await db
        .from("account_setup_journeys")
        .select("goal,stage,origin,account_label,version")
        .eq("user_id", user!.id)
        .eq("goal", body.goal)
        .maybeSingle(),
    ) as AccountSetup | null;
    if ((current?.version ?? 0) !== body.version)
      return reply(
        {
          error: "This step changed on another device. Refresh and try again.",
        },
        409,
      );
    const change = setupChange(current, body.action, body.label);
    if (!change) return reply({ error: "Choose a valid next step." }, 400);
    const row = {
      stage: change.stage,
      origin: change.origin,
      account_label: change.account_label,
      version: (current?.version ?? 0) + 1,
      updated_at: new Date().toISOString(),
    };
    const result = current
      ? await db
          .from("account_setup_journeys")
          .update(row)
          .eq("user_id", user!.id)
          .eq("goal", body.goal)
          .eq("version", current.version)
          .select("goal,stage,origin,account_label,version")
          .maybeSingle()
      : await db
          .from("account_setup_journeys")
          .insert({ ...row, user_id: user!.id, goal: body.goal })
          .select("goal,stage,origin,account_label,version")
          .single();
    if (result.error?.code === "23505" || (!result.error && !result.data))
      return reply({ error: "This step changed. Refresh and try again." }, 409);
    return reply({ journey: checked(result) });
  } catch (e) {
    return apiFailure(e);
  }
}
