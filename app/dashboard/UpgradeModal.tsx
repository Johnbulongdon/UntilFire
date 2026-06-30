"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { trackCheckoutStarted, trackPaywallViewed } from "@/lib/analytics";

const PRO_FEATURES = [
  "Unlimited bank connections via Plaid",
  "Auto-import & sync transactions",
  "Full cashflow tracking & charts",
  "FIRE calculator with city data",
  "Learning Hub & calculators",
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
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔓</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#064E3B" }}>Try Pro free for 3 months</div>
          <div style={{
            display: "inline-block", marginTop: 10, padding: "4px 14px",
            background: "#D1FAE5", borderRadius: 99,
            fontSize: 13, fontWeight: 700, color: "#065F46",
          }}>
            3 months free
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#047857", marginTop: 10 }}>
            $4.99
            <span style={{ fontSize: 16, fontWeight: 600, color: "#64748B" }}>/month after</span>
          </div>
          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Cancel anytime — no charge today</div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
            background: "#F0FDF4", border: "1px solid #BBF7D0",
            borderRadius: 8, padding: "9px 14px", marginTop: 12,
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>✉️</span>
            <span style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>
              We&apos;ll email you 3 days before your trial ends.
            </span>
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: 24 }}>
          {PRO_FEATURES.map((f) => (
            <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
              <span style={{ color: "#059669", fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 14, color: "#374151" }}>{f}</span>
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
          {loading ? "Opening Stripe…" : "Start 3 months free →"}
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
