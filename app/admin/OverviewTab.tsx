"use client";

import { useEffect, useState } from "react";

interface Overview {
  totalUsers: number;
  newLast7d: number;
  newLast30d: number;
  activePro: number;
  mrr: number;
  waitlistCount: number;
  feedbackCount: number;
}

export default function OverviewTab({ token }: { token: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Failed to load"));
  }, [token]);

  if (error) return <p style={{ color: "#DC2626" }}>{error}</p>;
  if (!data) return <p style={{ color: "#64748B" }}>Loading&hellip;</p>;

  const cards = [
    { label: "Total users", value: data.totalUsers },
    { label: "New (7d)", value: data.newLast7d },
    { label: "New (30d)", value: data.newLast30d },
    { label: "Active Pro", value: data.activePro },
    { label: "MRR", value: `$${data.mrr.toFixed(2)}` },
    { label: "Waitlist", value: data.waitlistCount },
    { label: "Feedback", value: data.feedbackCount },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
      {cards.map((c) => (
        <div key={c.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#19181E" }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
