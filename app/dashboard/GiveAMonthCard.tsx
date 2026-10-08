"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { REFERRED_TRIAL_LABEL } from "@/lib/pricing";
import { Button } from "@/components/ui";
import SectionTitle from "./SectionTitle";

/**
 * "Give a month, get a month" (D-27). The link is made when asked for, not
 * for every account, and it is offered here in Profile, after value, never
 * as a prompt.
 */
export default function GiveAMonthCard({ cardStyle, bare = false }: { cardStyle: React.CSSProperties; bare?: boolean }) {
  const [link, setLink] = useState<{ url: string; monthsEarned: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getLink() {
    setBusy(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/referrals/friend", { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "Couldn't get your link. Try again.");
    setLink({ url: `https://www.untilfire.com/r/${d.code}`, monthsEarned: d.monthsEarned ?? 0 });
  }

  return (
    <div style={{ ...(bare ? {} : cardStyle), display: "grid", gap: 10 }}>
      {!bare && <div>
        <SectionTitle icon="gift" style={{ margin: "0 0 4px" }}>Give a month, get a month</SectionTitle>
        <span style={{ display: "block", fontSize: 13, color: "var(--uf-text-2)", paddingLeft: 40 }}>
          Friends get Pro {REFERRED_TRIAL_LABEL}. When one subscribes, you get a month free.
        </span>
      </div>}
      {link ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="uf-t-data" style={{ fontSize: 13, wordBreak: "break-all" }}>{link.url.replace("https://www.", "")}</span>
          <Button variant="primary" size="sm" onClick={() => { navigator.clipboard?.writeText(link.url).then(() => setCopied(true)).catch(() => {}); }}>
            {copied ? "Copied ✓" : "Copy link"}
          </Button>
          {link.monthsEarned > 0 && (
            <span style={{ fontSize: 13, color: "var(--uf-text-2)", width: "100%" }}>
              {link.monthsEarned === 1 ? "1 free month earned" : `${link.monthsEarned} free months earned`}, taken off your next bill.
            </span>
          )}
        </div>
      ) : (
        <div>
          <Button variant="secondary" size="sm" onClick={getLink} disabled={busy}>{busy ? "Getting your link…" : "Get my link"}</Button>
        </div>
      )}
      {error && <span role="alert" style={{ fontSize: 13, color: "var(--uf-neg-ink)" }}>{error}</span>}
    </div>
  );
}
