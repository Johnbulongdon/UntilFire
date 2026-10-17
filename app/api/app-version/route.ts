import { NextResponse } from "next/server";

// The website and the phone app share one money model (D-86), so a phone build
// older than MIN_APP_VERSION would show numbers the website no longer agrees
// with. Raise it in the same PR as any website change that older builds can't
// follow; the app then shows "Update UntilFire" instead of stale maths.
// Overridable without a deploy through the APP_MIN_VERSION environment variable.
const MIN_APP_VERSION = "0.1.0";
const APP_STORE_URL = "https://apps.apple.com/app/untilfire/id0000000000";

export function GET() {
  return NextResponse.json(
    {
      minVersion: process.env.APP_MIN_VERSION || MIN_APP_VERSION,
      storeUrl: process.env.APP_STORE_URL || APP_STORE_URL,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
