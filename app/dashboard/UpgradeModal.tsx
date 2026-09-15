"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { trackCheckoutStarted, trackPaywallViewed } from "@/lib/analytics";
import { Alert, Badge, Button, Icon } from "@/components/ui";

/**
 * The Pro paywall.
 *
 * Two rules it used to break, and now doesn't:
 *
 * 1. It only claims what is actually gated. The single enforced limit is bank
 *    connections — free gets one, checked server-side in
 *    app/api/plaid/{create-link-token,exchange-token}. The AI need/want tagging
 *    is Pro-only in the UI. Everything else the old list sold — the calculator,
 *    the Learning Hub, cashflow charts — free users already have, and listing
 *    them on the screen where someone decides to trust us with a card is how
 *    you lose them.
 *
 * 2. It names the wall the reader just hit. `source` knows which one it was;
 *    it used to reach analytics and nothing else.
 */

type Angle = { eyebrow: string; title: string; sub: string };

/** Someone bounced off the one-bank limit is told about the one-bank limit. */
const AT_BANK_LIMIT: Angle = {
  eyebrow: "Bank connections",
  title: "Your free plan connects one bank.",
  sub: "Pro connects the rest, so your freedom date is built on all of your money — not one account's worth of it.",
};

/** Everyone else gets the same promise, told forwards. */
const GENERAL: Angle = {
  eyebrow: "UntilFire Pro",
  title: "Every account. One freedom date.",
  sub: "Free connects one bank. Pro connects them all, so the number you plan around is the real one.",
};

function angleFor(source: string): Angle {
  return source.includes("plaid_limit") ? AT_BANK_LIMIT : GENERAL;
}

const PRO_FEATURES: { title: string; detail: string }[] = [
  {
    title: "Unlimited bank connections",
    detail: "Free stops at one. Pro has no limit.",
  },
  {
    title: "Every account in one place",
    detail: "Balances and transactions from all of your banks, not just the first one you added.",
  },
  {
    title: "AI tags a month of spending",
    detail: "Need or want, across every untagged transaction, in one click.",
  },
];

export default function UpgradeModal({ open, onClose, source = "dashboard_upgrade_modal" }: { open: boolean; onClose: () => void; source?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    trackPaywallViewed({ source });
  }, [open, source]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const angle = angleFor(source);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to start checkout — please try again");
        return;
      }
      trackCheckoutStarted({ source, priceId: data.priceId });
      window.location.href = data.url;
    } catch {
      setError("Failed to start checkout — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "var(--uf-scrim)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--uf-s4)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="uf-upgrade-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--uf-card)",
          border: "1px solid var(--uf-border)",
          borderRadius: "var(--uf-r-modal)",
          padding: "var(--uf-s6) var(--uf-s5) var(--uf-s5)",
          maxWidth: 440, width: "100%",
          maxHeight: "92vh", overflowY: "auto",
          boxShadow: "var(--uf-e3)",
        }}
      >
        {/* What wall you hit, and what's on the other side of it */}
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
          color: "var(--uf-ink-3)",
        }}>
          {angle.eyebrow}
        </div>
        <h2
          id="uf-upgrade-title"
          style={{
            fontFamily: "var(--uf-font-display)", fontSize: 24, fontWeight: 600,
            color: "var(--uf-ink)", lineHeight: 1.2,
            margin: "var(--uf-s2) 0 0",
          }}
        >
          {angle.title}
        </h2>
        <p style={{ fontSize: 14, color: "var(--uf-ink-2)", lineHeight: 1.5, margin: "var(--uf-s3) 0 0" }}>
          {angle.sub}
        </p>

        {/* Only what Pro actually unlocks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--uf-s3)", margin: "var(--uf-s5) 0" }}>
          {PRO_FEATURES.map((f) => (
            <div key={f.title} style={{ display: "flex", gap: "var(--uf-s3)", alignItems: "flex-start" }}>
              <span style={{ color: "var(--uf-green)", display: "flex", flexShrink: 0, marginTop: 2 }}>
                <Icon name="positive" size={16} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-ink)", lineHeight: 1.35 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "var(--uf-ink-2)", lineHeight: 1.45, marginTop: 2 }}>{f.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* The price, said plainly */}
        <div style={{
          background: "var(--uf-surface)", border: "1px solid var(--uf-border)",
          borderRadius: "var(--uf-r-control)", padding: "var(--uf-s4)",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--uf-s2)", flexWrap: "wrap" }}>
            <Badge tone="positive">3 months free</Badge>
            <span style={{
              fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums",
              fontSize: 18, fontWeight: 500, color: "var(--uf-ink)",
            }}>
              $4.99
            </span>
            <span style={{ fontSize: 13, color: "var(--uf-ink-2)" }}>/month after</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--uf-ink-2)", marginTop: "var(--uf-s2)", lineHeight: 1.45 }}>
            No charge today. We&apos;ll email you 3 days before the trial ends, and you can cancel any time before then.
          </div>
        </div>

        {error && <Alert tone="critical" title={error} style={{ marginTop: "var(--uf-s4)" }} />}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubscribe}
          disabled={loading}
          style={{ marginTop: "var(--uf-s4)" }}
        >
          {loading ? "Opening Stripe…" : "Start 3 months free"}
        </Button>
        <Button
          variant="ghost"
          fullWidth
          onClick={onClose}
          style={{ marginTop: "var(--uf-s2)" }}
        >
          Maybe later
        </Button>
      </div>
    </div>
  );
}
