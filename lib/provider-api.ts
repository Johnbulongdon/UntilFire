import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "./supabase-admin";
export const privateHeaders = { "Cache-Control": "private, no-store" };
export function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: privateHeaders });
}
export async function providerAuth(req: NextRequest, required = true) {
  const db = adminClient();
  const header = req.headers.get("authorization");
  if (!header) {
    if (required) throw new Error("Unauthorized");
    return { db, user: null };
  }
  if (!/^Bearer [^ ]+$/.test(header)) throw new Error("Unauthorized");
  const { data, error } = await db.auth.getUser(header.slice(7));
  if (error || !data.user) throw new Error("Unauthorized");
  return { db, user: data.user };
}
export function apiFailure(error: unknown) {
  return error instanceof Error && error.message === "Unauthorized"
    ? reply({ error: "Please sign in again." }, 401)
    : reply({ error: "Couldn’t load this right now. Please try again." }, 503);
}
