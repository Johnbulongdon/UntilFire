"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { REFERRAL_RATE_LABEL } from "@/lib/referrals";
import { Button } from "@/components/ui";
import SectionTitle from "./SectionTitle";

/**
 * Profile's creator program card (D-27): your link and a way to the full
 * program on /invite, nothing more. A client-side Link, not a page load, so
 * the dashboard's "leave site?" guard never fires on the way there.
 */
export default function CreatorCard({ cardStyle, bare = false }: { cardStyle: React.CSSProperties; bare?: boolean }) {
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return setCode(null);
      const res = await fetch("/api/referrals/me", { headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null);
      const me = res?.ok ? await res.json() : null;
      setCode(me?.partner?.status === "active" ? me.partner.code : null);
    });
  }, []);

  const link = code ? `untilfire.com/r/${code}` : null;
  return (
    <div style={{ ...(bare ? {} : cardStyle), display: "grid", gap: 10 }}>
      {!bare && <div>
        <SectionTitle icon="megaphone" style={{ margin: "0 0 4px" }}>Creator program</SectionTitle>
        <span style={{ display: "block", fontSize: 13, color: "var(--uf-ink-2)", paddingLeft: 40 }}>
          {link ? "Your link. Numbers, embed and payouts are on your creator page." : `Share UntilFire and earn ${REFERRAL_RATE_LABEL} of what your readers pay for a year.`}
        </span>
      </div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", paddingLeft: bare ? 0 : 40 }}>
        {link && (
          <>
            <span className="uf-t-data" style={{ fontSize: 13, wordBreak: "break-all" }}>{link}</span>
            <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard?.writeText(`https://www.${link}`).then(() => setCopied(true)).catch(() => {}); }}>
              {copied ? "Copied ✓" : "Copy"}
            </Button>
          </>
        )}
        {code !== undefined && (
          <Link href="/invite" style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-green)", textDecoration: "none" }}>
            {link ? "More →" : "Learn more →"}
          </Link>
        )}
      </div>
    </div>
  );
}
