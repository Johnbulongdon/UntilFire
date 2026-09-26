"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { rememberReturnTo } from "@/lib/auth-finish";
import { PRO_ANNUAL_USD, PRO_MONTHLY_USD } from "@/lib/pricing";
import {
  commissionCents, formatCents, REFERRAL_HOLD_DAYS, REFERRAL_MIN_PAYOUT_CENTS, REFERRAL_MONTHS,
  REFERRAL_RATE_LABEL, type PayoutMethod,
} from "@/lib/referrals";
import { Badge, Button, Card, Field, Input, SegmentedControl, Stat } from "@/components/ui";

interface Me {
  partner: null | { code: string; status: "active" | "paused"; payout_method: PayoutMethod; payout_email: string };
  stats?: { visits: number; signups: number; payingCustomers: number; earned: number; pending: number; payable: number; paid: number; readyToPay: boolean };
  payouts?: { amount_cents: number; method: string; paid_at: string }[];
}

const METHODS = [{ value: "paypal", label: "PayPal" }, { value: "wise", label: "Wise" }] as const;
const methodName = (m: string) => (m === "wise" ? "Wise" : "PayPal");

/**
 * The creator page (D-27): the pitch when signed out, a short form to get a
 * link, then the creator's own numbers. Three states, one URL, so the link a
 * founder sends a creator always works.
 */
export default function InviteClient() {
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(async (t: string) => {
    const res = await fetch("/api/referrals/me", { headers: { Authorization: `Bearer ${t}` } });
    setMe(res.ok ? await res.json() : { partner: null });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
      if (session) load(session.access_token);
    });
  }, [load]);

  if (token === undefined || (token && !me)) return <p className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Loading…</p>;
  if (!token) return <Pitch onStart={() => { rememberReturnTo("/invite"); router.push("/login"); }} />;
  if (!me?.partner) return <JoinForm token={token} onJoined={() => load(token)} />;
  return <CreatorDashboard me={me} token={token} onSaved={() => load(token)} />;
}

function Pitch({ onStart }: { onStart: () => void }) {
  const annual = formatCents(commissionCents(PRO_ANNUAL_USD * 100));
  const monthly = formatCents(commissionCents(PRO_MONTHLY_USD * 100));
  return (
    <div style={{ display: "grid", gap: "var(--uf-s5)" }}>
      <div>
        <Badge tone="positive">For creators</Badge>
        <h1 className="uf-t-h1" style={{ margin: "var(--uf-s3) 0 var(--uf-s2)" }}>Earn {REFERRAL_RATE_LABEL} for a year</h1>
        <p className="uf-t-lead" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
          Share the free FIRE calculator. When a reader subscribes, you earn {REFERRAL_RATE_LABEL} of what they pay for {REFERRAL_MONTHS} months.
        </p>
      </div>
      <Button variant="primary" size="lg" onClick={onStart} style={{ justifySelf: "start" }}>Get your link</Button>
      <Card style={{ display: "grid", gap: "var(--uf-s3)" }}>
        {[
          ["1", "Get your link", "untilfire.com/r/yourname, in a minute."],
          ["2", "Readers try it free", "The calculator needs no signup. Pro starts with 30 days free."],
          ["3", "Get paid monthly", `By PayPal or Wise, once ${formatCents(REFERRAL_MIN_PAYOUT_CENTS)} is ready.`],
        ].map(([n, title, line]) => (
          <div key={n} style={{ display: "flex", gap: "var(--uf-s3)", alignItems: "baseline" }}>
            <span className="uf-t-data" style={{ color: "var(--uf-teal)", fontWeight: 700 }}>{n}</span>
            <span className="uf-t-body"><b>{title}.</b> <span style={{ color: "var(--uf-ink-2)" }}>{line}</span></span>
          </div>
        ))}
      </Card>
      <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
        A reader on the yearly plan earns you {annual}. On monthly, {monthly} a month for up to a year.{" "}
        <Link href="/invite/terms" style={{ color: "var(--uf-green)" }}>Terms</Link>
      </p>
    </div>
  );
}

function JoinForm({ token, onJoined }: { token: string; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<PayoutMethod>("paypal");
  const [email, setEmail] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/referrals/me", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, payoutMethod: method, payoutEmail: email, acceptTerms: accept }),
    });
    setBusy(false);
    if (res.ok) return onJoined();
    setError((await res.json().catch(() => ({}))).error ?? "Something went wrong. Try again.");
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "var(--uf-s5)" }}>
      <h1 className="uf-t-h1" style={{ margin: 0 }}>Get your link</h1>
      <Field label="Your link" htmlFor="ref-code" hint="Letters, numbers and hyphens. It can't change later.">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--uf-s2)" }}>
          <span className="uf-t-data" style={{ color: "var(--uf-ink-3)", whiteSpace: "nowrap" }}>untilfire.com/r/</span>
          <Input id="ref-code" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} placeholder="jane-saves" autoComplete="off" required style={{ minWidth: 0, flex: 1 }} />
        </div>
      </Field>
      <SegmentedControl label="Get paid by" options={METHODS} value={method} onChange={setMethod} />
      <Field label={`${methodName(method)} email`} htmlFor="ref-email">
        <Input id="ref-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </Field>
      <label className="uf-t-small" style={{ display: "flex", gap: "var(--uf-s2)", alignItems: "flex-start", color: "var(--uf-ink-2)" }}>
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} style={{ marginTop: 3 }} />
        <span>I accept the <Link href="/invite/terms" style={{ color: "var(--uf-green)" }} target="_blank">terms</Link>, and I&apos;ll tell readers it&apos;s an affiliate link.</span>
      </label>
      {error && <p role="alert" className="uf-t-small" style={{ margin: 0, color: "var(--uf-neg-ink)" }}>{error}</p>}
      <Button type="submit" variant="primary" disabled={busy || !accept} style={{ justifySelf: "start" }}>{busy ? "Creating…" : "Create my link"}</Button>
    </form>
  );
}

function CreatorDashboard({ me, token, onSaved }: { me: Me; token: string; onSaved: () => void }) {
  const p = me.partner!;
  const s = me.stats!;
  const link = `untilfire.com/r/${p.code}`;
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>(p.payout_method);
  const [email, setEmail] = useState(p.payout_email);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const res = await fetch("/api/referrals/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ payoutMethod: method, payoutEmail: email }),
    });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't save.");
    setEditing(false);
    onSaved();
  }

  return (
    <div style={{ display: "grid", gap: "var(--uf-s5)" }}>
      <h1 className="uf-t-h1" style={{ margin: 0 }}>Your creator link</h1>
      <Card style={{ display: "flex", gap: "var(--uf-s3)", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <span className="uf-t-data" style={{ fontSize: 17, fontWeight: 700, wordBreak: "break-all" }}>{link}</span>
        <Button variant="primary" size="sm" onClick={() => { navigator.clipboard?.writeText(`https://www.${link}`).then(() => setCopied(true)).catch(() => {}); }}>
          {copied ? "Copied ✓" : "Copy link"}
        </Button>
        {p.status === "paused" && <span className="uf-t-small" style={{ color: "var(--uf-neg-ink)", width: "100%" }}>Paused: this link isn&apos;t earning right now. Email hello@untilfire.com.</span>}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--uf-s4)" }}>
        <Stat label="Visits" value={s.visits.toLocaleString()} />
        <Stat label="Signups" value={s.signups.toLocaleString()} />
        <Stat label="Paying" value={s.payingCustomers.toLocaleString()} />
        <Stat label="Earned" value={formatCents(s.earned)} tone="positive" />
      </div>

      <Card style={{ display: "grid", gap: "var(--uf-s2)" }}>
        <div className="uf-t-body" style={{ display: "flex", gap: "var(--uf-s5)", flexWrap: "wrap" }}>
          <span>On hold <b className="uf-t-data">{formatCents(s.pending)}</b></span>
          <span>Ready <b className="uf-t-data">{formatCents(s.payable)}</b></span>
          <span>Paid <b className="uf-t-data">{formatCents(s.paid)}</b></span>
        </div>
        <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
          {s.readyToPay
            ? `Goes out in this month's payout to your ${methodName(p.payout_method)}.`
            : `Earnings are held ${REFERRAL_HOLD_DAYS} days for refunds, then paid monthly once ${formatCents(REFERRAL_MIN_PAYOUT_CENTS)} is ready.`}
        </p>
      </Card>

      {(me.payouts ?? []).length > 0 && (
        <div style={{ display: "grid", gap: "var(--uf-s1)" }}>
          <span className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>Payouts</span>
          {me.payouts!.map((x) => (
            <span key={x.paid_at} className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>
              <span className="uf-t-data">{formatCents(x.amount_cents)}</span> by {methodName(x.method)} · {new Date(x.paid_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          ))}
        </div>
      )}

      {editing ? (
        <div style={{ display: "grid", gap: "var(--uf-s3)" }}>
          <SegmentedControl label="Get paid by" options={METHODS} value={method} onChange={setMethod} size="sm" />
          <Field label={`${methodName(method)} email`} htmlFor="ref-email-edit">
            <Input id="ref-email-edit" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <p role="alert" className="uf-t-small" style={{ margin: 0, color: "var(--uf-neg-ink)" }}>{error}</p>}
          <div style={{ display: "flex", gap: "var(--uf-s2)" }}>
            <Button variant="primary" size="sm" onClick={save}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
          Paid to {methodName(p.payout_method)} {p.payout_email}.{" "}
          <button type="button" onClick={() => setEditing(true)} style={{ background: "none", border: "none", padding: 0, color: "var(--uf-green)", font: "inherit", fontWeight: 700, cursor: "pointer" }}>Change</button>
        </p>
      )}
      <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-3)" }}>
        {REFERRAL_RATE_LABEL} of each payment for a reader&apos;s first {REFERRAL_MONTHS} months of paying. Say it&apos;s an affiliate link. <Link href="/invite/terms" style={{ color: "var(--uf-green)" }}>Terms</Link>
      </p>
    </div>
  );
}
