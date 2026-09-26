import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site";
import {
  formatCents, REFERRAL_CLAIM_MAX_ACCOUNT_AGE_DAYS, REFERRAL_COOKIE_DAYS, REFERRAL_HOLD_DAYS, REFERRAL_MIN_PAYOUT_CENTS,
  REFERRAL_MONTHS, REFERRAL_RATE_LABEL, REFERRAL_TERMS_VERSION,
} from "@/lib/referrals";

export const metadata: Metadata = {
  title: "Creator program terms | UntilFire",
  description: "How UntilFire's creator referral program works: what counts, what you earn, when you're paid.",
  alternates: { canonical: siteUrl("/invite/terms") },
  robots: { index: false, follow: true },
};

/**
 * The program's terms in plain words (D-27). Every number comes from
 * lib/referrals.ts, so the page cannot drift from what the code pays.
 * Accepting records REFERRAL_TERMS_VERSION; change the version with the text.
 */
export default function InviteTermsPage() {
  const terms: [string, string][] = [
    ["What you earn", `${REFERRAL_RATE_LABEL} of what each customer you refer pays UntilFire, excluding tax, for their first ${REFERRAL_MONTHS} months of paying. Nothing is earned during a free trial.`],
    ["Who counts as yours", `Someone who opens your link and creates a new UntilFire account within ${REFERRAL_COOKIE_DAYS} days, on the same browser. Accounts older than ${REFERRAL_CLAIM_MAX_ACCOUNT_AGE_DAYS} days, your own account, and people who were already referred by someone else do not count.`],
    ["Refunds and chargebacks", `Earnings are held for ${REFERRAL_HOLD_DAYS} days. A payment that is refunded or disputed in that time earns nothing.`],
    ["Payouts", `Monthly, by PayPal or Wise, once at least ${formatCents(REFERRAL_MIN_PAYOUT_CENTS)} is ready. You are responsible for any fees your provider charges to receive money, and for tax on what you earn.`],
    ["Honest promotion", "Say clearly that your link is an affiliate link. Don't promise anyone results, returns or a retirement date, and don't present UntilFire as financial advice. No spam, paid search ads on the UntilFire name, fake reviews or self-referrals."],
    ["Changes and ending", "UntilFire can change these terms for the future or end the program with 30 days' notice. Earnings already made keep the terms they were made under. A creator who breaks these terms can be removed, and unpaid earnings from the breach are forfeited."],
  ];
  return (
    <main style={{ minHeight: "100vh", background: "var(--uf-ground)", padding: "var(--uf-s6) var(--uf-s4) var(--uf-s7)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: "var(--uf-s5)" }}>
        <Link href="/invite" className="uf-t-small" style={{ color: "var(--uf-ink-3)", textDecoration: "none" }}>← Creator program</Link>
        <h1 className="uf-t-h1" style={{ margin: 0 }}>Creator program terms</h1>
        {terms.map(([title, body]) => (
          <section key={title}>
            <h2 className="uf-t-h3" style={{ margin: "0 0 var(--uf-s2)" }}>{title}</h2>
            <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)", lineHeight: 1.7 }}>{body}</p>
          </section>
        ))}
        <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-3)" }}>
          Version {REFERRAL_TERMS_VERSION}. Questions: <a href="mailto:hello@untilfire.com" style={{ color: "var(--uf-green)" }}>hello@untilfire.com</a>
        </p>
      </div>
    </main>
  );
}
