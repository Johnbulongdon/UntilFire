import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { lookupProspects, lookupPartnerProspects } from "@/lib/prospect-discovery";

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
  if (Number(req.headers.get("content-length")) > 5000) return NextResponse.json({error:"Lookup request is too large."},{status:413});
  const reader = req.body?.getReader();
  let raw = "", bytes = 0;
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 5000) {await reader.cancel();return NextResponse.json({error:"Lookup request is too large."},{status:413});}
      raw += decoder.decode(value,{stream:true});
    }
    raw += decoder.decode();
  }
  let acquired = false;
  try {
    const body = JSON.parse(raw);
    const cursor = body.cursor ?? 0;
    const audience = body.audience ?? "users";
    if (audience !== "users" && audience !== "partners") throw new Error("Choose potential users or creators and partners.");
    if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > 1_000_000) throw new Error("Invalid lookup position. Reload and try again.");
    if (active.has(auth.user.id)) return NextResponse.json({error:"A collection is already running. Wait for it to finish."},{status:429});
    active.add(auth.user.id);
    acquired = true;
    const result = audience === "partners" ? await lookupPartnerProspects(cursor) : await lookupProspects(cursor);
    const emails = result.contacts.map(c => c.email).filter(Boolean);
    let skippedCount = 0;
    if (emails.length) {
      const [saved, suppressed] = await Promise.all([
        auth.admin.from("cold_prospects").select("email").in("email", emails),
        auth.admin.from("cold_suppressions").select("email").in("email", emails),
      ]);
      if (saved.error || suppressed.error) return NextResponse.json({error:"Could not check saved contacts. Try again."},{status:503});
      const excluded = new Set([...(saved.data ?? []), ...(suppressed.data ?? [])].map(row => row.email.toLowerCase()));
      const fresh = result.contacts.filter(c => !excluded.has(c.email.toLowerCase()));
      skippedCount = result.contacts.length - fresh.length;
      result.contacts = fresh;
    }
    return NextResponse.json({...result, skippedCount},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error ? error.message : "Could not collect contacts."},{status:400});
  } finally {if (acquired) active.delete(auth.user.id);}
}
