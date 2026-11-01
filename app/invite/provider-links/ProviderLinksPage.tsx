"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { rememberReturnTo } from "@/lib/auth-finish";
import ProviderLinksPanel from "@/app/dashboard/ProviderLinksPanel";
export default function ProviderLinksPage({ fromProfile = false }: { fromProfile?: boolean }) {
  const { user, loading } = useAuth();
  return <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px", minHeight: "100vh" }}>
    <Link href={fromProfile ? "/dashboard?tab=profile" : "/invite"} className="uf-t-small" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "var(--uf-ink)", fontWeight: 700 }}>
      ← {fromProfile ? "Profile" : "Creator programme"}
    </Link>
    {loading ? <p role="status">Loading…</p> : user ? <ProviderLinksPanel key={user.id} /> : <p>
      <Link href="/login" onClick={() => rememberReturnTo("/invite/provider-links" + (fromProfile ? "?from=profile" : ""))}>Sign in to manage your provider links</Link>
    </p>}
  </main>;
}
