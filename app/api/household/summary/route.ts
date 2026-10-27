import { NextRequest, NextResponse } from "next/server";
import { requireUser, householdPosition } from "@/lib/household";
import { householdProjection } from "@/lib/household-projection";

/**
 * One freedom date for two people.
 *
 * Computed server side because it reads both members at once, and returned as
 * a finished shape so the Home card renders it without doing cross-user maths
 * in the browser.
 *
 * Each partner's own dashboard is untouched by any of this — the household
 * view is additive, never a replacement.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin, user } = auth;

  try {
    const position = await householdPosition(admin, user.id);
    if (!position) return NextResponse.json({ household: null });

    const { combined, members } = position;

    const fire = householdProjection(combined);

    return NextResponse.json({
      household: {
        ...position,
        fireTarget: fire.fireTarget,
        years: fire.years,
        retireYear: fire.retireYear,
        // Each person's age at the shared date, which is what makes it read as
        // a household result rather than one person's with a passenger.
        agesAtFreedom: fire.years === null
          ? []
          : members
              .filter((m) => m.age > 0)
              .map((m) => ({ name: m.name, isYou: m.isYou, age: Math.round(m.age + (fire.years ?? 0)) })),
      },
    });
  } catch (err) {
    console.error("[household/summary]", err);
    return NextResponse.json({ error: "Could not build the household view" }, { status: 500 });
  }
}
