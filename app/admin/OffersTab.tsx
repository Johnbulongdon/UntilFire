"use client";

import { useEffect, useState } from "react";
import ProviderLinkReviews from "./ProviderLinkReviews";
import { DateField } from "@/components/ui";
import { OFFER_KIND_LABEL, OFFER_KINDS, rateLabel, type OfferKind } from "@/lib/partner-offers";

interface AdminOffer {
  id?: string;
  slug: string;
  kind: OfferKind;
  name: string;
  blurb: string;
  rateBps: number | string | null;
  bonusText: string | null;
  bonusEndsOn: string | null;
  url: string;
  allowedDomain: string;
  status?: "live" | "hidden";
  sort: number;
  clicks?: number;
  country?: string;
  memberLinksEnabled?: boolean;
}

const BLANK: AdminOffer = { slug: "", kind: "savings", name: "", blurb: "", rateBps: "", bonusText: "", bonusEndsOn: "", url: "", allowedDomain: "", sort: 0 };

const card: React.CSSProperties = { background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-card)", padding: 16 };
const small: React.CSSProperties = { fontSize: 12, color: "var(--uf-ink-3)" };
const button: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--uf-border-2)", background: "var(--uf-card)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "var(--uf-ink)" };
const input: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--uf-border-2)", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

/**
 * Partner offers: the accounts users see on Money → Offers, each with
 * UntilFire's referral link. New offers start hidden; "Show" makes one live.
 */
export default function OffersTab({ token }: { token: string }) {
  const [offers, setOffers] = useState<AdminOffer[] | null>(null);
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/admin/offers", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setOffers(d.offers)))
      .catch(() => setError("Couldn't load offers."));
  }
  useEffect(load, [token]);

  async function post(body: unknown) {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/admin/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setError(d.error ?? "Something went wrong.");
      return false;
    }
    load();
    return true;
  }

  const set = (k: keyof AdminOffer) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditing((o) => (o ? { ...o, [k]: e.target.value } : o));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--uf-ink-2)" }}>
          The accounts users see in Accounts & tools. Enable member links only after reviewing the provider’s programme terms.
        </p>
        <button style={button} onClick={() => setEditing({ ...BLANK })}>Add offer</button>
      </div>
      {error && <p style={{ margin: 0, color: "var(--uf-neg)", fontSize: 13 }}>{error}</p>}

      {editing && (
        <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <label style={small}>Name<input style={input} value={editing.name} onChange={set("name")} /></label>
          <label style={small}>Slug (in the /go/ link)<input style={input} value={editing.slug} onChange={set("slug")} placeholder="savings-a" /></label>
          <label style={small}>Type
            <select style={input} value={editing.kind} onChange={set("kind")}>
              {OFFER_KINDS.map((k) => <option key={k} value={k}>{OFFER_KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label style={small}>Rate in basis points (420 = 4.20%)<input style={input} value={editing.rateBps ?? ""} onChange={set("rateBps")} inputMode="numeric" /></label>
          <label style={{ ...small, gridColumn: "1 / -1" }}>Why it fits (one sentence)<input style={input} value={editing.blurb} onChange={set("blurb")} /></label>
          <label style={small}>Bonus<input style={input} value={editing.bonusText ?? ""} onChange={set("bonusText")} placeholder="$300 bonus for a new account" /></label>
          <label style={small}>Bonus ends on<DateField style={input} value={editing.bonusEndsOn ?? ""} clearable placeholder="No end date" onChange={(v) => setEditing((o) => (o ? { ...o, bonusEndsOn: v } : o))} /></label>
          <label style={small}>Provider domain<input style={input} value={editing.allowedDomain} onChange={set("allowedDomain")} placeholder="example.com" /></label>
          <label style={small}>UntilFire&apos;s referral link<input style={input} value={editing.url} onChange={set("url")} placeholder="https://example.com/r/untilfire" /></label>
          <label style={small}>Country (two-letter code)<input style={input} value={editing.country ?? "US"} onChange={set("country")} maxLength={2} /></label>
          <label style={{...small, display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={editing.memberLinksEnabled===true} onChange={e=>setEditing(o=>o?{...o,memberLinksEnabled:e.target.checked}:o)}/> Programme permits member referral links</label>
          <label style={small}>Order<input style={input} value={editing.sort} onChange={set("sort")} inputMode="numeric" /></label>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", justifyContent: "flex-end" }}>
            <button style={button} onClick={() => setEditing(null)}>Cancel</button>
            <button style={button} disabled={busy} onClick={async () => { if (await post({ action: "save", offer: editing })) setEditing(null); }}>Save</button>
          </div>
        </div>
      )}

      {offers === null && !error && <p style={small}>Loading&hellip;</p>}
      {offers?.length === 0 && <p style={small}>No offers yet.</p>}
      {offers?.map((o) => (
        <div key={o.id} style={{ ...card, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong>{o.name} <span style={small}>· {OFFER_KIND_LABEL[o.kind]} · /go/{o.slug}</span></strong>
            <span style={small}>
              {[rateLabel(typeof o.rateBps === "number" ? o.rateBps : null), o.bonusText && `${o.bonusText}${o.bonusEndsOn ? ` until ${o.bonusEndsOn}` : ""}`, `${o.clicks ?? 0} clicks`].filter(Boolean).join(" · ")}
            </span>
            <span style={{ ...small, fontFamily: "var(--uf-font-mono, monospace)" }}>{o.url}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: o.status === "live" ? "var(--uf-pos-ink)" : "var(--uf-warn-ink)" }}>
              {o.status === "live" ? "Live" : "Hidden"}
            </span>
            <button style={button} onClick={() => setEditing({ ...o, rateBps: o.rateBps ?? "", bonusText: o.bonusText ?? "", bonusEndsOn: o.bonusEndsOn ?? "" })}>Edit</button>
            <button style={button} disabled={busy} onClick={() => post({ action: "status", id: o.id, status: o.status === "live" ? "hidden" : "live" })}>
              {o.status === "live" ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      ))}
      <ProviderLinkReviews token={token} />
    </div>
  );
}
