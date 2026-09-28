"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  formatCents, REFERRAL_HOLD_DAYS, REFERRAL_MIN_PAYOUT_CENTS,
  REFERRAL_RATE_LABEL, REFERRAL_TIER_CUSTOMERS, REFERRAL_TIER_RATE_LABEL, type PayoutMethod,
} from "@/lib/referrals";
import { Badge, Button, Card, Field, Input, Progress, SegmentedControl, Stat } from "@/components/ui";
import styles from "./InvitePitch.module.css";

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
 * A signed-in user's side of the creator program (D-27), in the same dark
 * hero as the public pitch: the one bright card is what matters most (the
 * form to get a link, or what you've earned and your progress to 40%), and
 * the rest (numbers, the embed, payouts) follows on the light page.
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

  if (!token || !me) return <Hero title="Your creator program"><p className={`uf-t-small ${styles.onDark}`} style={{ margin: 0 }}>{token === null ? "Sign in to join." : "Loading…"}</p></Hero>;
  if (!me.partner) return <JoinForm token={token} onJoined={() => load(token)} />;
  return <CreatorDashboard me={me} token={token} onSaved={() => load(token)} />;
}

/** The dark band: title and what sits under it on the left, the bright card on the right. */
function Hero({ title, children, card }: { title: string; children?: React.ReactNode; card?: React.ReactNode }) {
  return (
    <header className={styles.heroBand}>
      <div className={styles.glowA} aria-hidden="true" />
      <div className={styles.glowB} aria-hidden="true" />
      <div className={styles.dots} aria-hidden="true" />
      <div className={`${styles.inner} ${styles.heroWrap}`}>
        <div className={styles.hero}>
          <Link href="/dashboard?tab=profile" className={`uf-t-small ${styles.onDark}`} style={{ textDecoration: "none" }}>← Back to your dashboard</Link>
          <Badge tone="positive">Creator program</Badge>
          <h1 className={`uf-t-display ${styles.title}`}>{title}</h1>
          {children}
        </div>
        {card && <div className={styles.kvCard}>{card}</div>}
      </div>
    </header>
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

  const form = (
    <form onSubmit={submit} style={{ display: "grid", gap: "var(--uf-s4)" }}>
      <h2 className="uf-t-h3" style={{ margin: 0 }}>Get your link</h2>
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
  return (
    <Hero title={`Earn ${REFERRAL_RATE_LABEL} for sharing a free calculator`} card={form}>
      <p className={`uf-t-body ${styles.onDark}`} style={{ margin: 0 }}>Pick your link and where to be paid. Takes a minute.</p>
    </Hero>
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

  const earnings = (
    <div style={{ display: "grid", gap: "var(--uf-s3)" }}>
      {p.status === "paused" && <span className="uf-t-small" style={{ color: "var(--uf-neg-ink)" }}>Paused: this link isn&apos;t earning right now. Email hello@untilfire.com.</span>}
      {p.status === "removed" && <span className="uf-t-small" style={{ color: "var(--uf-neg-ink)" }}>Removed from the program under its terms. Email hello@untilfire.com.</span>}
      <div>
        <div className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>Earned so far</div>
        <div className={`uf-t-data ${styles.estimateNum}`}>{formatCents(s.earned)}</div>
        {s.inTrial > 0 && (
          <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
            {s.inTrial === 1 ? "1 reader" : `${s.inTrial} readers`} on a free trial: about <b>{formatCents(s.inTrialWorthCents)}</b> more if they subscribe yearly.
          </p>
        )}
      </div>
      <Progress
        value={s.payingCustomers / REFERRAL_TIER_CUSTOMERS}
        label={s.payingCustomers >= REFERRAL_TIER_CUSTOMERS ? `You're on ${REFERRAL_TIER_RATE_LABEL} for new payments` : `${REFERRAL_TIER_CUSTOMERS - s.payingCustomers} more paying readers to ${REFERRAL_TIER_RATE_LABEL}`}
        caption={`${Math.min(s.payingCustomers, REFERRAL_TIER_CUSTOMERS)} of ${REFERRAL_TIER_CUSTOMERS}`}
      />
      <div className="uf-t-small" style={{ display: "flex", gap: "var(--uf-s4)", flexWrap: "wrap", color: "var(--uf-ink-2)" }}>
        <span>On hold <b className="uf-t-data">{formatCents(s.pending)}</b></span>
        <span>Ready <b className="uf-t-data">{formatCents(s.payable)}</b></span>
        <span>Paid <b className="uf-t-data">{formatCents(s.paid)}</b></span>
      </div>
      <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-3)" }}>
        {s.readyToPay
          ? `In this month's payout to your ${methodName(p.payout_method)}.`
          : s.paid > 0
            ? `${REFERRAL_HOLD_DAYS}-day refund hold, then paid monthly from ${formatCents(REFERRAL_MIN_PAYOUT_CENTS)}.`
            : `${REFERRAL_HOLD_DAYS}-day refund hold. First payout at any amount.`}
      </p>
    </div>
  );

  return (
    <>
      <Hero title="Your creator program" card={earnings}>
        <div className={styles.linkPill}>
          <span className="uf-t-data">{link}</span>
          <Button variant="primary" size="sm" onClick={() => { navigator.clipboard?.writeText(`https://www.${link}`).then(() => setCopied(true)).catch(() => {}); }}>
            {copied ? "Copied ✓" : "Copy link"}
          </Button>
        </div>
        <p className={`uf-t-small ${styles.onDark}`} style={{ margin: 0 }}>Share it anywhere. Say it&apos;s an affiliate link.</p>
      </Hero>

      <div className={styles.inner} style={{ display: "grid", gap: "var(--uf-s5)", paddingTop: "var(--uf-s7)", paddingBottom: "var(--uf-s7)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--uf-s4)" }}>
        <Stat label="Visits" value={s.visits.toLocaleString()} />
        <Stat label="Signups" value={s.signups.toLocaleString()} />
        <Stat label="In free trial" value={s.inTrial.toLocaleString()} />
        <Stat label="Paying" value={s.payingCustomers.toLocaleString()} />
      </div>

      <EmbedSnippet code={p.code} />

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
          {" · "}<Link href="/invite/terms" style={{ color: "var(--uf-green)" }}>Terms</Link>
        </p>
      )}
      </div>
    </>
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
          Readers get their freedom year on your page; anyone who continues is yours.
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
