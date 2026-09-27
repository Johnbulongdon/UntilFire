"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/referrals";

interface Commission {
  id: string;
  collectedCents: number;
  commissionCents: number;
  status: "pending" | "payable" | "paid" | "reversed";
  earnedAt: string;
  reversedReason: string | null;
}

interface Partner {
  id: string;
  code: string;
  status: "active" | "paused";
  accountEmail: string;
  payoutMethod: "paypal" | "wise";
  payoutEmail: string;
  visits: number;
  signups: number;
  payingCustomers: number;
  earned: number;
  pending: number;
  payable: number;
  paid: number;
  readyToPay: boolean;
  commissions: Commission[];
  payouts: { amount_cents: number; method: string; reference: string; paid_at: string }[];
}

const card: React.CSSProperties = { background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: 16 };
const small: React.CSSProperties = { fontSize: 12, color: "var(--uf-ink-3)" };
const button: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--uf-border-2)", background: "var(--uf-card)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "var(--uf-ink)" };
const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Creator referrals (D-27). Each month: send every "ready" creator the amount
 * shown by PayPal or Wise, then paste that transfer's id here and mark it
 * paid. Nothing here moves money.
 */
export default function ReferralsTab({ token }: { token: string }) {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [minPayout, setMinPayout] = useState(2000);
  const [error, setError] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/admin/referrals", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setPartners(d.partners);
        setMinPayout(d.minPayoutCents);
      })
      .catch(() => setError("Failed to load"));
  }
  useEffect(load, [token]);

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(d.error ?? "Failed");
    load();
  }

  if (error && !partners) return <p style={{ color: "var(--uf-neg-ink)" }}>{error}</p>;
  if (!partners) return <p style={small}>Loading…</p>;

  const owed = partners.reduce((s, p) => s + (p.readyToPay ? p.payable : 0), 0);
  const holding = partners.reduce((s, p) => s + p.pending, 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...card, display: "flex", gap: 32, flexWrap: "wrap" }}>
        <div><div style={small}>Pay this month</div><div style={{ fontSize: 22, fontWeight: 800 }}>{formatCents(owed)}</div></div>
        <div><div style={small}>Still in the 30-day hold</div><div style={{ fontSize: 22, fontWeight: 800 }}>{formatCents(holding)}</div></div>
        <div><div style={small}>Creators</div><div style={{ fontSize: 22, fontWeight: 800 }}>{partners.length}</div></div>
      </div>
      {error && <p style={{ color: "var(--uf-neg-ink)", margin: 0 }}>{error}</p>}
      {partners.length === 0 && <p style={small}>No creators yet. Share untilfire.com/invite with them.</p>}

      {partners.map((p) => (
        <div key={p.id} style={{ ...card, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800 }}>untilfire.com/r/{p.code} {p.status === "paused" && <span style={{ ...small, fontWeight: 700 }}>· paused</span>}</div>
              <div style={small}>{p.accountEmail} · pays to {p.payoutMethod === "paypal" ? "PayPal" : "Wise"} {p.payoutEmail}</div>
            </div>
            <button style={button} disabled={busy} onClick={() => act({ action: "status", partnerId: p.id, status: p.status === "active" ? "paused" : "active" })}>
              {p.status === "active" ? "Pause" : "Reactivate"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
            <span>{p.visits} visits</span><span>{p.signups} signups</span><span>{p.payingCustomers} paying</span>
            <span>Earned {formatCents(p.earned)}</span><span>Holding {formatCents(p.pending)}</span>
            <span>Payable {formatCents(p.payable)}</span><span>Paid {formatCents(p.paid)}</span>
          </div>

          {p.readyToPay ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: "var(--uf-green-50)", borderRadius: 8, padding: 10 }}>
              <span style={{ fontSize: 13 }}>
                Send <b>{formatCents(p.payable)}</b> by {p.payoutMethod === "paypal" ? "PayPal" : "Wise"} to <b>{p.payoutEmail}</b>, then:
              </span>
              <input
                aria-label={`Transaction id for ${p.code}`}
                placeholder="Transaction id"
                value={refs[p.id] ?? ""}
                onChange={(e) => setRefs({ ...refs, [p.id]: e.target.value })}
                style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--uf-border-2)", fontSize: 13, fontFamily: "inherit" }}
              />
              <button style={button} disabled={busy || !(refs[p.id] ?? "").trim()} onClick={() => act({ action: "payout", partnerId: p.id, amountCents: p.payable, reference: refs[p.id] })}>
                Mark paid
              </button>
            </div>
          ) : (
            p.payable > 0 && <div style={small}>{formatCents(p.payable)} payable; pays out at {formatCents(minPayout)}.</div>
          )}

          {(p.commissions.length > 0 || p.payouts.length > 0) && (
            <button style={{ ...button, justifySelf: "start" }} onClick={() => setOpen(open === p.id ? null : p.id)}>
              {open === p.id ? "Hide history" : "History"}
            </button>
          )}
          {open === p.id && (
            <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
              {p.commissions.map((c) => (
                <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span>{date(c.earnedAt)}</span>
                  <span>{formatCents(c.commissionCents)} of {formatCents(c.collectedCents)}</span>
                  <span style={{ fontWeight: 700 }}>{c.status}{c.reversedReason ? ` (${c.reversedReason})` : ""}</span>
                  {(c.status === "pending" || c.status === "payable") && (
                    <button style={button} disabled={busy} onClick={() => act({ action: "reverse", commissionId: c.id, reason: "reversed by admin" })}>Reverse</button>
                  )}
                </div>
              ))}
              {p.payouts.map((x) => (
                <div key={x.reference + x.paid_at} style={small}>Paid {formatCents(x.amount_cents)} by {x.method} on {date(x.paid_at)} · {x.reference}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
