"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const PRO_FEATURES = [
  "Unlimited bank connections via Plaid",
  "Auto-import & sync transactions",
  "Full cashflow tracking & charts",
  "FIRE calculator with city data",
  "Learning Hub & calculators",
];

export default function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !data.url) {
      setError(data.error ?? "Failed to start checkout — please try again");
      return;
    }
    window.location.href = data.url;
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
          <div style={{ fontSize: 20, fontWeight: 800, color: "#064E3B" }}>Upgrade to Pro</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#047857", marginTop: 8 }}>
            $9
            <span style={{ fontSize: 16, fontWeight: 600, color: "#64748B" }}>/month</span>
          </div>
          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>Cancel anytime</div>
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
          {loading ? "Opening Stripe…" : "Subscribe now →"}
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
