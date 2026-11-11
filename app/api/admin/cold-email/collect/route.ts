import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { collectContacts } from "@/lib/prospect-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
// Extra per-instance protection; authentication and bounded requests remain the
// security boundary. This is not advertised as a distributed rate limiter.
const active = new Set<string>();
export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  if (active.has(auth.user.id)) return NextResponse.json({error:"A collection is already running. Wait for it to finish."},{status:429});
  if (Number(req.headers.get("content-length")) > 5000) return NextResponse.json({error:"Use at most three website URLs."},{status:413});
  const reader = req.body?.getReader();
  let raw = "", bytes = 0;
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 5000) {await reader.cancel();return NextResponse.json({error:"Use at most three website URLs."},{status:413});}
      raw += decoder.decode(value,{stream:true});
    }
    raw += decoder.decode();
  }
  try {
    const body = JSON.parse(raw);
    if (!Array.isArray(body.urls) || body.urls.some((v: unknown) => typeof v !== "string" || v.length > 1000)) throw new Error("Enter website URLs as text.");
    if (active.has(auth.user.id)) return NextResponse.json({error:"A collection is already running. Wait for it to finish."},{status:429});
    active.add(auth.user.id);
    const result = await collectContacts(body.urls);
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error ? error.message : "Could not collect contacts."},{status:400});
  } finally {active.delete(auth.user.id);}
}
