"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { rememberReturnTo } from "@/lib/auth-finish";
import { PRO_ANNUAL_USD, PRO_MONTHLY_USD, REFERRED_TRIAL_LABEL } from "@/lib/pricing";
import {
  commissionCents, firstYearEstimateCents, formatCents, REFERRAL_HOLD_DAYS, REFERRAL_MIN_PAYOUT_CENTS, REFERRAL_MONTHS,
  REFERRAL_RATE_LABEL, REFERRAL_TAIL_RATE_LABEL, REFERRAL_TIER_CUSTOMERS, REFERRAL_TIER_RATE_LABEL,
} from "@/lib/referrals";
import { Badge, Button, Icon, Slider } from "@/components/ui";
import styles from "./InvitePitch.module.css";
import CreatorArea from "./CreatorArea";

/**
 * The creator page (D-27). Signed out: the pitch. Signed in: your own
 * program first (the form to get a link, or your link, numbers and
 * payouts), then how the program works. Profile keeps a small card that
 * links here, so the dashboard isn't crowded with it.
 */
export default function InviteClient() {
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session ? session.access_token : null));
  }, []);

  if (token === undefined) return <p className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Loading…</p>;
  if (token === null) return <Pitch onStart={() => { rememberReturnTo("/invite"); router.push("/login"); }} />;
  return (
    <div className={styles.pitch}>
      <section className={styles.mine} aria-labelledby="mine">
        <Link href="/dashboard?tab=profile" className="uf-t-small" style={{ color: "var(--uf-ink-3)", textDecoration: "none" }}>← Back to your dashboard</Link>
        <h1 id="mine" className="uf-t-h1" style={{ margin: 0 }}>Your creator program</h1>
        <CreatorArea />
      </section>
      <Pitch signedIn />
    </div>
  );
}

const perYear = PRO_ANNUAL_USD * 100;

/** The public pitch: the offer, the ladder, what it could earn, the widget, readers, FAQ. */
function Pitch({ onStart, signedIn = false }: { onStart?: () => void; signedIn?: boolean }) {
  const [readers, setReaders] = useState(10);
  const estimate = firstYearEstimateCents(readers, perYear);
  const steps = [
    { rate: REFERRAL_RATE_LABEL, when: `Readers 1–${REFERRAL_TIER_CUSTOMERS - 1}`, note: `for their first ${REFERRAL_MONTHS} months` },
    { rate: REFERRAL_TIER_RATE_LABEL, when: `From your ${REFERRAL_TIER_CUSTOMERS}th paying reader`, note: "on every new payment in year one" },
    { rate: REFERRAL_TAIL_RATE_LABEL, when: "After a reader's first year", note: "for as long as they stay" },
  ];
  const faq: [string, string][] = [
    ["When do I get paid?", `Monthly, by PayPal or Wise. Earnings wait ${REFERRAL_HOLD_DAYS} days in case of refunds. Your first payout goes out at any amount, then from ${formatCents(REFERRAL_MIN_PAYOUT_CENTS)}.`],
    ["Who counts as my reader?", "Anyone who opens your link and creates a new account within 60 days, on the same browser."],
    ["Do I have to say it's an affiliate link?", "Yes. Say so plainly, and don't promise anyone a retirement date or returns."],
    ["What does it cost me?", "Nothing. There's no fee and nothing to buy."],
  ];
  return (
    <div className={styles.pitch}>
      {!signedIn && (
        <header className={styles.hero}>
          <Badge tone="positive">For creators</Badge>
          <h1 className={`uf-t-display ${styles.title}`}>Share a free calculator. Get paid when readers subscribe.</h1>
          <div className={styles.offer} aria-label="The offer">
            <div><span className={`uf-t-data ${styles.big}`}>{REFERRAL_RATE_LABEL}</span><span className="uf-t-small">of what they pay</span></div>
            <div><span className={`uf-t-data ${styles.big}`}>{REFERRAL_MONTHS} mo</span><span className="uf-t-small">per reader</span></div>
            <div><span className={`uf-t-data ${styles.big}`}>{REFERRED_TRIAL_LABEL.replace(" free", "")}</span><span className="uf-t-small">of Pro free for your readers</span></div>
          </div>
          <div className={styles.ctaRow}>
            <Button variant="primary" size="lg" onClick={onStart}>Get your link</Button>
            <Link href="/invite/terms" className="uf-t-small">Program terms</Link>
          </div>
        </header>
      )}

      <section aria-labelledby="ladder">
        <h2 id="ladder" className="uf-t-h2">Earn more as you grow</h2>
        <ol className={styles.ladder}>
          {steps.map((st, i) => (
            <li key={st.rate} className={styles.step} data-step={i}>
              <span className={`uf-t-data ${styles.stepRate}`}>{st.rate}</span>
              <span className="uf-t-body" style={{ fontWeight: 700 }}>{st.when}</span>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{st.note}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="estimate" className={styles.estimate}>
        <h2 id="estimate" className="uf-t-h2">What it could add up to</h2>
        <Slider label="Readers who subscribe" value={readers} min={1} max={100} onChange={setReaders} format={(n) => `${n}`} exact={false} />
        <div aria-live="polite">
          <span className={`uf-t-data ${styles.estimateNum}`}>≈ {formatCents(estimate)}</span>
          <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}> in your first year</span>
        </div>
        <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-3)" }}>
          An estimate, if each reader takes the yearly plan (${PRO_ANNUAL_USD}) and stays the year. Monthly readers earn you {formatCents(commissionCents(PRO_MONTHLY_USD * 100))} a month.{readers >= REFERRAL_TIER_CUSTOMERS ? ` Includes ${REFERRAL_TIER_RATE_LABEL} from your ${REFERRAL_TIER_CUSTOMERS}th reader.` : ""}
        </p>
      </section>

      <section aria-labelledby="kit" className={styles.kit}>
        <div>
          <h2 id="kit" className="uf-t-h2">Put it in your post</h2>
          <p className="uf-t-body" style={{ color: "var(--uf-ink-2)" }}>You get a link and this calculator to paste into any blog. Readers see their own freedom year without leaving your page, and anyone who continues is credited to you.</p>
          <ul className={styles.kitList}>
            <li><Icon name="target" size={18} /> Your own link, untilfire.com/r/you</li>
            <li><Icon name="money" size={18} /> Visits, signups and earnings in your dashboard</li>
            <li><Icon name="card" size={18} /> Paid monthly by PayPal or Wise</li>
          </ul>
        </div>
        <iframe src="/embed/your-name" title="Example of the calculator in a post" className={styles.frame} loading="lazy" />
      </section>

      <section aria-labelledby="readers">
        <h2 id="readers" className="uf-t-h2">What your readers get</h2>
        <div className={styles.readers}>
          <div><Icon name="calendar" size={22} /><b>Their freedom year</b><span className="uf-t-small">Free, no sign-up, in about a minute.</span></div>
          <div><Icon name="gift" size={22} /><b>Pro {REFERRED_TRIAL_LABEL}</b><span className="uf-t-small">Twice the usual trial, only through your link.</span></div>
          <div><Icon name="plan" size={22} /><b>A plan, not a pitch</b><span className="uf-t-small">One next move and progress they can see.</span></div>
        </div>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className="uf-t-h2">Questions</h2>
        {faq.map(([q, a]) => (
          <details key={q} className={styles.qa}>
            <summary className="uf-t-h3">{q}</summary>
            <p className="uf-t-body" style={{ margin: "var(--uf-s2) 0 0", color: "var(--uf-ink-2)" }}>{a}</p>
          </details>
        ))}
      </section>

      {!signedIn && (
        <div className={styles.ctaRow}>
          <Button variant="primary" size="lg" onClick={onStart}>Get your link</Button>
        </div>
      )}
    </div>
  );
}
