import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import { REFERRAL_RATE_LABEL, REFERRAL_MONTHS } from "@/lib/referrals";
import InviteClient from "./InviteClient";

const url = siteUrl("/invite");
const description = `Share UntilFire's free FIRE calculator with your readers. When one subscribes, you earn ${REFERRAL_RATE_LABEL} of what they pay for ${REFERRAL_MONTHS} months, paid monthly by PayPal or Wise.`;

export const metadata: Metadata = {
  title: `Creator program: earn ${REFERRAL_RATE_LABEL} for a year | UntilFire`,
  description,
  alternates: { canonical: url },
  openGraph: { title: `UntilFire creator program: earn ${REFERRAL_RATE_LABEL} for a year`, description, url, siteName: "UntilFire", type: "website" },
};

export default function InvitePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--uf-ground)", padding: "var(--uf-s6) var(--uf-s4) var(--uf-s7)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <InviteClient />
      </div>
    </main>
  );
}
