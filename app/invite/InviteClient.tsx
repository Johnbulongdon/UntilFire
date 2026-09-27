"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { rememberReturnTo } from "@/lib/auth-finish";
import { PRO_ANNUAL_USD, REFERRED_TRIAL_LABEL } from "@/lib/pricing";
import {
  firstYearEstimateCents, formatCents, REFERRAL_HOLD_DAYS, REFERRAL_MIN_PAYOUT_CENTS, REFERRAL_MONTHS,
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
    <div>
      <div className={styles.inner} style={{ paddingTop: "var(--uf-s6)", paddingBottom: "var(--uf-s6)" }}>
        <section className={styles.mine} aria-labelledby="mine">
          <Link href="/dashboard?tab=profile" className="uf-t-small" style={{ color: "var(--uf-ink-3)", textDecoration: "none" }}>← Back to your dashboard</Link>
          <h1 id="mine" className="uf-t-h1" style={{ margin: 0 }}>Your creator program</h1>
          <CreatorArea />
        </section>
      </div>
      <Pitch signedIn />
    </div>
  );
}

const perYear = PRO_ANNUAL_USD * 100;

const LADDER = [
  { rate: REFERRAL_RATE_LABEL, pct: 30, when: `Readers 1–${REFERRAL_TIER_CUSTOMERS - 1}` },
  { rate: REFERRAL_TIER_RATE_LABEL, pct: 40, when: `From reader ${REFERRAL_TIER_CUSTOMERS}` },
  { rate: REFERRAL_TAIL_RATE_LABEL, pct: 10, when: "After year one, for life" },
];

const FAQ: [string, string][] = [
  ["When do I get paid?", `Monthly by PayPal or Wise, after a ${REFERRAL_HOLD_DAYS}-day refund hold. First payout at any amount, then from ${formatCents(REFERRAL_MIN_PAYOUT_CENTS)}.`],
  ["Who counts as my reader?", "Anyone who opens your link and signs up within 60 days, on the same browser."],
  ["Do I disclose it?", "Yes, say it's an affiliate link. Don't promise returns or a retirement date."],
];

/**
 * The public pitch (design B): a dark hero where the key visual is the one
 * bright thing, then how you earn, what you get and FAQ on light bands, and
 * a dark closing call to action. Signed in, the hero and the closing band drop out.
 */
function Pitch({ onStart, signedIn = false }: { onStart?: () => void; signedIn?: boolean }) {
  const [readers, setReaders] = useState(10);
  return (
    <div>
      {!signedIn && (
        <header className={styles.heroBand}>
          <div className={styles.glowA} aria-hidden="true" />
          <div className={styles.glowB} aria-hidden="true" />
          <div className={styles.dots} aria-hidden="true" />
          <div className={`${styles.inner} ${styles.heroWrap}`}>
            <div className={styles.hero}>
              <Badge tone="positive">For creators</Badge>
              <h1 className={`uf-t-display ${styles.title}`}>Earn {REFERRAL_RATE_LABEL} for sharing a free calculator</h1>
              <div className={styles.offer} aria-label="The offer">
                <div><span className={`uf-t-data ${styles.big}`}>{REFERRAL_RATE_LABEL}</span><span className="uf-t-small">of what readers pay</span></div>
                <div><span className={`uf-t-data ${styles.big}`}>{REFERRAL_MONTHS} mo</span><span className="uf-t-small">per reader</span></div>
                <div><span className={`uf-t-data ${styles.big}`}>{REFERRED_TRIAL_LABEL.replace(" free", "")}</span><span className="uf-t-small">free Pro for them</span></div>
              </div>
              <div className={styles.ctaRow}>
                <Button variant="primary" size="lg" onClick={onStart}>Get your link</Button>
                <Link href="/invite/terms" className="uf-t-small">Terms</Link>
              </div>
            </div>
            <KeyVisual />
          </div>
        </header>
      )}

      <section className={styles.earnBand} aria-label="How you earn">
        <div className={`${styles.inner} ${styles.earn}`}>
          <div className={styles.panel}>
            <h2 className="uf-t-h3">How you earn</h2>
            <ol className={styles.ladder}>
              {LADDER.map((l) => (
                <li key={l.rate}>
                  <span className={`uf-t-data ${styles.rate}`}>{l.rate}</span>
                  <span className={styles.bar}><i style={{ width: `${(l.pct / 40) * 100}%` }} /></span>
                  <span className="uf-t-small">{l.when}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className={styles.panel}>
            <h2 className="uf-t-h3">What it could add up to</h2>
            <Slider label="Readers who subscribe" value={readers} min={1} max={100} onChange={setReaders} format={(n) => `${n}`} exact={false} />
            <div aria-live="polite">
              <span className={`uf-t-data ${styles.estimateNum}`}>≈ {formatCents(firstYearEstimateCents(readers, perYear))}</span>
              <span className="uf-t-small"> first year</span>
            </div>
            <p className="uf-t-small" style={{ margin: 0, opacity: 0.7 }}>Estimate: yearly plan (${PRO_ANNUAL_USD}), kept for a year.</p>
          </div>
        </div>
      </section>

      {!signedIn && (
        <section className={styles.inner} aria-labelledby="kit" style={{ paddingTop: "var(--uf-s7)" }}>
          <h2 id="kit" className="uf-t-h2" style={{ margin: "0 0 var(--uf-s4)" }}>What you get</h2>
          <ul className={styles.tiles}>
            {([
              ["target", "Your own link", "untilfire.com/r/you"],
              ["calendar", "The calculator", "Paste it into any post"],
              ["money", "Live numbers", "Visits, signups, earnings"],
              ["card", "Monthly payouts", "PayPal or Wise"],
            ] as const).map(([icon, title, line]) => (
              <li key={title}>
                <span className={styles.chip}><Icon name={icon} size={20} /></span>
                <b>{title}</b>
                <span className="uf-t-small">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.inner} aria-labelledby="faq" style={{ paddingTop: "var(--uf-s7)", paddingBottom: "var(--uf-s7)" }}>
        <h2 id="faq" className="uf-t-h3" style={{ margin: "0 0 var(--uf-s2)" }}>Questions</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className={styles.qa}>
            <summary className="uf-t-body" style={{ fontWeight: 700 }}>{q}</summary>
            <p className="uf-t-small" style={{ margin: "var(--uf-s2) 0 0", color: "var(--uf-ink-2)" }}>{a}</p>
          </details>
        ))}
      </section>

      {!signedIn && (
        <section className={styles.closeBand}>
          <div className={`${styles.inner} ${styles.close}`}>
            <h2 className="uf-t-h2" style={{ margin: 0 }}>Your readers want a date. Give them one.</h2>
            <Button variant="secondary" size="lg" onClick={onStart}>Get your link</Button>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * The key visual: a creator's post with the real calculator in it, and the
 * moment a reader subscribes. The whole program in one picture. The widget
 * is the live embed, scaled down, so it always shows the current calculator.
 */
function KeyVisual() {
  const earned = formatCents(Math.floor((perYear * 3000) / 10_000));
  return (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.browser}>
        <div className={styles.browserBar}>
          <span /><span /><span />
          <em className="uf-t-data">janesaves.com/when-can-i-quit</em>
        </div>
        <div className={styles.post}>
          <b>How I figured out when I can quit</b>
          <i style={{ width: "92%" }} /><i style={{ width: "74%" }} />
          <div className={styles.embedScale}>
            <iframe src="/embed/your-name" title="" tabIndex={-1} loading="lazy" />
          </div>
        </div>
      </div>
      <div className={styles.toast}>
        <span className={`uf-t-data ${styles.toastAmount}`}>+{earned}</span>
        <span className="uf-t-small">A reader subscribed</span>
      </div>
    </div>
  );
}
