import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdminUser } from "@/lib/admin-auth";

/**
 * Open/click tracking is a property of the sending domain in Resend, not of an
 * individual send. Exposing it here means the switch lives next to the thing
 * it affects, instead of in a dashboard on someone else's website.
 */
const DOMAIN = "untilfire.com";

async function findDomain(resend: Resend) {
  const { data, error } = await resend.domains.list();
  if (error) return { error: error.message };
  // The SDK has moved this between a bare array and { data: [...] }.
  const list = (Array.isArray(data) ? data : data?.data) ?? [];
  const domain = list.find((d) => d.name === DOMAIN) ?? list[0];
  if (!domain) return { error: `No sending domain found for ${DOMAIN}` };
  return { domain };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const found = await findDomain(resend);
  if ("error" in found) return NextResponse.json({ error: found.error }, { status: 502 });

  const { data, error } = await resend.domains.get(found.domain!.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({
    domain: data?.name,
    status: data?.status,
    openTracking: !!data?.open_tracking,
    clickTracking: !!data?.click_tracking,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const openTracking = body?.openTracking !== false;
  const clickTracking = body?.clickTracking !== false;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const found = await findDomain(resend);
  if ("error" in found) return NextResponse.json({ error: found.error }, { status: 502 });

  const { error } = await resend.domains.update({
    id: found.domain!.id,
    openTracking,
    clickTracking,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  // Tracking only applies to mail sent after it is switched on; it cannot be
  // applied to a send that already went out.
  return NextResponse.json({ ok: true, openTracking, clickTracking });
}
