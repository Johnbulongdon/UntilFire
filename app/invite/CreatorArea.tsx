"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  formatCents, REFERRAL_HOLD_DAYS, REFERRAL_MIN_PAYOUT_CENTS, REFERRAL_MONTHS,
  REFERRAL_RATE_LABEL, REFERRAL_TAIL_RATE_LABEL, REFERRAL_TIER_CUSTOMERS, REFERRAL_TIER_RATE_LABEL, type PayoutMethod,
} from "@/lib/referrals";
import { Button, Card, Field, Input, Progress, SegmentedControl, Stat } from "@/components/ui";

interface Me {
  partner: null | { code: string; status: "active" | "paused" | "removed"; payout_method: PayoutMethod; payout_email: string };
  stats?: {
    visits: number; signups: number; inTrial: number; inTrialWorthCents: number; payingCustomers: number;
    earned: number; pending: number; payable: number; paid: number; readyToPay: boolean;
  };
  payouts?: { amount_cents: number; method: string; paid_at: string }[];
}

const METHODS = [{ value: "paypal", label: "PayPal" }, { value: "wise", label: "Wise" }] as const;
const methodName = (m: string) => (m === "wise" ? "Wise" : "PayPal");

/**
 * A signed-in user's side of the creator program (D-27): the form to get a
 * link, then their numbers. Lives in the dashboard (Profile → Creator
 * program), so a user never leaves the app for it; /invite is the public
 * pitch for creators who don't have an account yet.
 */
export default function CreatorArea() {
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

  if (!token || !me) return <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-3)" }}>{token === null ? "Sign in to join." : "Loading…"}</p>;
  if (!me.partner) return <JoinForm token={token} onJoined={() => load(token)} />;
  return <CreatorDashboard me={me} token={token} onSaved={() => load(token)} />;
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
      <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>Pick your link and where to be paid. Takes a minute.</p>
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
      <Card style={{ display: "flex", gap: "var(--uf-s3)", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <span className="uf-t-data" style={{ fontSize: 17, fontWeight: 700, wordBreak: "break-all" }}>{link}</span>
        <Button variant="primary" size="sm" onClick={() => { navigator.clipboard?.writeText(`https://www.${link}`).then(() => setCopied(true)).catch(() => {}); }}>
          {copied ? "Copied ✓" : "Copy link"}
        </Button>
        {p.status === "paused" && <span className="uf-t-small" style={{ color: "var(--uf-neg-ink)", width: "100%" }}>Paused: this link isn&apos;t earning right now. Email hello@untilfire.com.</span>}
        {p.status === "removed" && <span className="uf-t-small" style={{ color: "var(--uf-neg-ink)", width: "100%" }}>Removed from the program under its terms. Email hello@untilfire.com.</span>}
      </Card>

      <EmbedSnippet code={p.code} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--uf-s4)" }}>
        <Stat label="Visits" value={s.visits.toLocaleString()} />
        <Stat label="Signups" value={s.signups.toLocaleString()} />
        <Stat label="In free trial" value={s.inTrial.toLocaleString()} />
        <Stat label="Paying" value={s.payingCustomers.toLocaleString()} />
        <Stat label="Earned" value={formatCents(s.earned)} tone="positive" />
      </div>
      {s.inTrial > 0 && (
        <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
          {s.inTrial === 1 ? "1 reader is" : `${s.inTrial} readers are`} trying Pro. If they subscribe yearly, that&apos;s about <b>{formatCents(s.inTrialWorthCents)}</b> for you in their first year.
        </p>
      )}
      <Progress
        value={s.payingCustomers / REFERRAL_TIER_CUSTOMERS}
        label={s.payingCustomers >= REFERRAL_TIER_CUSTOMERS ? `You're on ${REFERRAL_TIER_RATE_LABEL} for new payments` : `${REFERRAL_TIER_CUSTOMERS - s.payingCustomers} more paying readers to ${REFERRAL_TIER_RATE_LABEL}`}
        caption={`${Math.min(s.payingCustomers, REFERRAL_TIER_CUSTOMERS)} of ${REFERRAL_TIER_CUSTOMERS}`}
      />

      <Card style={{ display: "grid", gap: "var(--uf-s2)" }}>
        <div className="uf-t-body" style={{ display: "flex", gap: "var(--uf-s5)", flexWrap: "wrap" }}>
          <span>On hold <b className="uf-t-data">{formatCents(s.pending)}</b></span>
          <span>Ready <b className="uf-t-data">{formatCents(s.payable)}</b></span>
          <span>Paid <b className="uf-t-data">{formatCents(s.paid)}</b></span>
        </div>
        <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
          {s.readyToPay
            ? `Goes out in this month's payout to your ${methodName(p.payout_method)}.`
            : s.paid > 0
              ? `Earnings are held ${REFERRAL_HOLD_DAYS} days for refunds, then paid monthly once ${formatCents(REFERRAL_MIN_PAYOUT_CENTS)} is ready.`
              : `Earnings are held ${REFERRAL_HOLD_DAYS} days for refunds. Your first payout goes out at any amount.`}
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
        {REFERRAL_RATE_LABEL} of each payment in a reader&apos;s first {REFERRAL_MONTHS} months, {REFERRAL_TAIL_RATE_LABEL} after. Say it&apos;s an affiliate link. <Link href="/invite/terms" style={{ color: "var(--uf-green)" }}>Terms</Link>
      </p>
    </div>
  );
}

/**
 * The calculator for a creator's own post (D-27). The iframe is the tool;
 * the plain link under it is what search engines count, and both go through
 * the creator's /r/ link so readers who continue are credited to them.
 */
function EmbedSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const snippet =
    `<iframe src="https://www.untilfire.com/embed/${code}" title="Freedom date calculator" width="100%" height="520" style="border:0;border-radius:12px" loading="lazy"></iframe>\n` +
    `<p><a href="https://www.untilfire.com/r/${code}">Freedom date calculator by UntilFire</a></p>`;
  return (
    <Card style={{ display: "grid", gap: "var(--uf-s3)" }}>
      <div>
        <h2 className="uf-t-h3" style={{ margin: 0 }}>Put the calculator in your post</h2>
        <p className="uf-t-small" style={{ margin: "var(--uf-s1) 0 0", color: "var(--uf-ink-2)" }}>
          Readers get their freedom year right on your page. Anyone who continues is credited to you.
        </p>
      </div>
      <pre className="uf-t-data" style={{ margin: 0, padding: "var(--uf-s3)", background: "var(--uf-surface)", borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{snippet}</pre>
      <div style={{ display: "flex", gap: "var(--uf-s3)", alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard?.writeText(snippet).then(() => setCopied(true)).catch(() => {}); }}>
          {copied ? "Copied ✓" : "Copy embed code"}
        </Button>
        <a href={`/embed/${code}`} target="_blank" rel="noopener" className="uf-t-small" style={{ color: "var(--uf-green)" }}>Preview</a>
      </div>
    </Card>
  );
}
