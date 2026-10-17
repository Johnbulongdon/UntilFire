import { NextResponse } from "next/server";

// Lets iOS open https://www.untilfire.com/plaid-oauth in the UntilFire app
// instead of Safari, so banks that log in on their own site (Plaid OAuth)
// hand people back to the app. The Team ID comes from APPLE_TEAM_ID.
export function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  const details = teamId ? [{ appIDs: [`${teamId}.com.untilfire.app`], components: [{ "/": "/plaid-oauth*" }] }] : [];
  return NextResponse.json(
    { applinks: { details } },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
