"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/money";
import { Badge, Button } from "@/components/ui";

/**
 * The household's combined position, on Home.
 *
 * Home synthesises and owns no inputs of its own (app-structure rule 3), so
 * this card only ever reads — the one exception is confirming a duplicate
 * account, which is a question about what the number in front of you means
 * rather than an input into it.
 *
 * Renders nothing at all without a household. Not an empty state: an empty
 * card is a permanent advertisement on the screen that is meant to feel calm.
 */

export interface Member {
  userId: string; name: string; isYou: boolean; age: number;
  monthlyIncome: number; monthlyExpenses: number; monthlySavings: number; portfolio: number;
}
export interface Candidate { a: string; b: string; institution: string; mask: string; balance: number; currency: string }
export interface Household {
  members: Member[];
  combined: { monthlyIncome: number; monthlyExpenses: number; monthlySavings: number; portfolio: number; annualExpenses: number };
  dedupedBalance: number;
  undecidedDuplicates: number;
  fireTarget: number;
  years: number | null;
  retireYear: number | null;
  agesAtFreedom: { name: string; isYou: boolean; age: number }[];
}

const card: React.CSSProperties = {
  background: "var(--uf-card)",
  border: "1px solid var(--uf-border)",
  borderRadius: 20,
  padding: 24,
};

/**
 * The container: fetches, and owns the one write (confirming a duplicate).
 * Split from the view below so the view can be rendered against fixtures —
 * this card only appears for a household, which makes it exactly the kind of
 * surface that otherwise ships unseen.
 */
export default function HouseholdCard({ displayCurrency = "USD" }: { displayCurrency?: string }) {
  const [data, setData] = useState<Household | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };
    try {
      const res = await fetch("/api/household/summary", { headers });
      const json = (await res.json()) as { household?: Household | null };
      setData(json.household ?? null);
      if (json.household) {
        const dup = await fetch("/api/household/duplicates", { headers });
        const dj = (await dup.json()) as { candidates?: Candidate[] };
        setCandidates(dj.candidates ?? []);
      }
    } catch {
      // A household view that cannot load is not worth an error banner on Home.
      setData(null);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(c: Candidate, status: "confirmed" | "dismissed") {
    setBusy(c.a);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await fetch("/api/household/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ a: c.a, b: c.b, status }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <HouseholdCardView
      data={data}
      candidates={candidates}
      busy={busy}
      onDecide={decide}
      displayCurrency={displayCurrency}
    />
  );
}

export function HouseholdCardView({
  data,
  candidates,
  busy,
  onDecide,
  displayCurrency = "USD",
}: {
  data: Household | null;
  candidates: Candidate[];
  busy: string | null;
  onDecide: (c: Candidate, status: "confirmed" | "dismissed") => void;
  displayCurrency?: string;
}) {
  if (!data) return null;

  const money = (n: number) => formatMoney(n, { currency: displayCurrency });
  const you = data.members.find((m) => m.isYou);
  const partner = data.members.find((m) => !m.isYou);

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <h3 className="uf-t-h3" style={{ margin: 0 }}>Together</h3>
        <Badge tone="muted">Household</Badge>
      </div>

      {/* The freedom date. Teal, because this is progress toward freedom. */}
      {data.retireYear ? (
        <>
          <div className="uf-t-display" style={{ color: "var(--uf-teal)", lineHeight: 1.05, marginBottom: 6 }}>
            {data.retireYear}
          </div>
          {data.agesAtFreedom.length > 0 && (
            <p className="uf-t-body" style={{ margin: "0 0 4px", color: "var(--uf-ink-2)" }}>
              {data.agesAtFreedom.map((a, i) => (
                <span key={a.name}>
                  {i > 0 && ", "}
                  {a.isYou ? "you’re" : `${a.name} is`} {a.age}
                </span>
              ))}
            </p>
          )}
          <p className="uf-t-small" style={{ margin: "0 0 20px", color: "var(--uf-ink-3)" }}>
            On {money(data.combined.annualExpenses)}/yr together — a target of {money(data.fireTarget)}.
          </p>
        </>
      ) : (
        <p className="uf-t-body" style={{ margin: "0 0 20px", color: "var(--uf-ink-2)" }}>
          Together you&rsquo;re not yet saving enough to reach {money(data.fireTarget)} within the
          projection. Adding a monthly surplus is what moves this.
        </p>
      )}

      {/* You / Partner / Together, so the combined figure is never a black box. */}
      <div className="uf-household-split" style={{ marginBottom: 4 }}>
        {[
          { label: you?.name ?? "You", v: you },
          { label: partner?.name ?? "Partner", v: partner },
          { label: "Together", v: null as Member | null },
        ].map(({ label, v }, i) => {
          const savings = v ? v.monthlySavings : data.combined.monthlySavings;
          const pot = v ? v.portfolio : data.combined.portfolio;
          return (
            <div key={label} style={{
              minWidth: 0,
              background: i === 2 ? "var(--uf-surface)" : "transparent",
              border: "1px solid var(--uf-border)",
              borderRadius: 12, padding: "12px 14px",
            }}>
              <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 6, overflowWrap: "anywhere" }}>
                {label}
              </div>
              <div className="uf-t-data" style={{ fontWeight: 700, color: "var(--uf-ink)" }}>{money(pot)}</div>
              <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginTop: 4 }}>
                {money(savings)}/mo saved
              </div>
            </div>
          );
        })}
      </div>

      {data.dedupedBalance > 0 && (
        <p className="uf-t-label" style={{ color: "var(--uf-ink-3)", margin: "10px 0 0" }}>
          {money(data.dedupedBalance)} counted once, not twice — you confirmed a shared account.
        </p>
      )}
      {data.undecidedDuplicates > 0 && (
        <p className="uf-t-label" style={{ color: "var(--uf-ink-3)", margin: "10px 0 0" }}>
          Counting {data.undecidedDuplicates === 1 ? "one account" : `${data.undecidedDuplicates} accounts`} for
          both of you until confirmed below, so this total may be high.
        </p>
      )}
      <p className="uf-t-label" style={{ color: "var(--uf-ink-3)", margin: "10px 0 0" }}>
        Manually entered balances aren&rsquo;t deduplicated yet.
      </p>

      {/* P2: same account, or two that merely look alike? Only a human knows. */}
      {candidates.map((c) => (
        <div key={`${c.a}|${c.b}`} style={{
          marginTop: 16, padding: "14px 16px",
          background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 12,
        }}>
          <p className="uf-t-body" style={{ margin: "0 0 12px", color: "var(--uf-ink)" }}>
            You&rsquo;ve both linked {c.institution} &bull;&bull;&bull;&bull; {c.mask}. Same account?
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" size="sm" disabled={busy === c.a} onClick={() => onDecide(c, "confirmed")}>
              Yes, count it once
            </Button>
            <Button variant="ghost" size="sm" disabled={busy === c.a} onClick={() => onDecide(c, "dismissed")}>
              No, they&rsquo;re different
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
