"use client";

import { useEffect, useState } from "react";

interface SupportItem {
  kind: "feedback" | "survey";
  id: string;
  email: string;
  createdAt: string;
  type?: string;
  message?: string;
  satisfaction?: number;
  recommend?: string;
  missing?: string;
  notes?: string;
}

export default function SupportTab({ token }: { token: string }) {
  const [items, setItems] = useState<SupportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/support", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setItems(d.items)))
      .catch(() => setError("Failed to load"));
  }, [token]);

  if (error) return <p style={{ color: "#DC2626" }}>{error}</p>;
  if (!items) return <p style={{ color: "var(--uf-ink-2)" }}>Loading&hellip;</p>;
  if (items.length === 0) return <p style={{ color: "var(--uf-ink-2)" }}>No feedback or survey responses yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div key={`${item.kind}-${item.id}`} style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: item.kind === "feedback" ? "var(--uf-pos)" : "#0369A1" }}>
              {item.kind === "feedback" ? `Feedback · ${item.type}` : "Survey"}
            </span>
            <span style={{ fontSize: 11, color: "var(--uf-ink-3)" }}>{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--uf-ink-2)", marginBottom: 6 }}>{item.email}</div>
          {item.kind === "feedback" ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--uf-ink)" }}>{item.message}</p>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: "var(--uf-ink)" }}>
              Satisfaction: {item.satisfaction ?? "—"}/5 · Recommend: {item.recommend ?? "—"}
              {item.missing ? ` · Missing: ${item.missing}` : ""}
              {item.notes ? ` · ${item.notes}` : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
