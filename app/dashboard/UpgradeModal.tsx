"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { trackCheckoutStarted, trackPaywallViewed } from "@/lib/analytics";

const PRO_BENEFITS = [
  {
    icon: "📅",
    title: "Monthly plan that moves your date closer",
    detail: "Each month you get a specific action — how much to invest, what to cut, why it matters — based on your real numbers.",
  },
  {
    icon: "📊",
    title: "Track progress against your plan",
    detail: "See whether this month is on track, compare to your target, and watch your freedom date respond.",
  },
  {
    icon: "🔗",
    title: "Auto-sync bank & brokerage accounts",
    detail: "Connect your accounts so your plan always reflects real spending and portfolio values — no manual entry.",
  },
];

export default function UpgradeModal({ open, onClose, source = "dashboard_upgrade_modal" }: { open: boolean; onClose: () => void; source?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    trackPaywallViewed({ source });
  }, [open, source]);

  if (!open) return null;

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
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, padding: "32px 28px",
          maxWidth: 400, width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🗓️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#064E3B" }}>Your personal FIRE adviser</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 6, lineHeight: 1.5, maxWidth: 300, margin: "6px auto 0" }}>
            UntilFire does it with you — a monthly plan, real progress, and a path that keeps moving.
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#047857", marginTop: 14 }}>
            $4.99
            <span style={{ fontSize: 15, fontWeight: 600, color: "#64748B" }}>/month</span>
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>Cancel anytime · less than one coffee</div>
        </div>

        {/* Benefits */}
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {PRO_BENEFITS.map((b) => (
            <div key={b.title} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", background: "#F0FDF4", borderRadius: 10, border: "1px solid #D1FAE5" }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{b.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#064E3B", marginBottom: 2 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: "#4B7D5C", lineHeight: 1.5 }}>{b.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            fontSize: 13, color: "#DC2626",
            background: "#FEF2F2", border: "1px solid #FCA5A5",
            borderRadius: 8, padding: "8px 12px", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
            background: loading ? "#D1FAE5" : "#047857",
            color: loading ? "#047857" : "#fff",
            fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Opening Stripe…" : "Start my adviser plan →"}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 10,
            border: "1px solid #E2E8F0", background: "none",
            fontSize: 14, color: "#64748B", cursor: "pointer",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
