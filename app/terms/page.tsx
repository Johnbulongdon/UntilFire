import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/app/components/legal/LegalPage";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use | UntilFire",
  description: "The terms for using UntilFire: estimates not advice, your account, Pro, and ending.",
  alternates: { canonical: siteUrl("/terms") },
};

/** The creator program has its own terms at /invite/terms; these cover the product. */
const sections: LegalSection[] = [
  {
    title: "Who runs UntilFire",
    body: ["UntilFire is run by John Ng, an individual based in Hong Kong. In these terms, “we” means John Ng. You can reach us at hello@untilfire.com."],
  },
  {
    title: "Estimates, not advice",
    body: [
      "UntilFire shows estimates based on the numbers you give it and on assumptions about returns, inflation, taxes and costs of living. Real results will differ. Nothing in UntilFire is financial, investment, tax or legal advice, and it isn't a recommendation to buy, sell or hold anything.",
      "Check important decisions with a qualified professional.",
    ],
  },
  {
    title: "Your account",
    body: [
      "You need to be 18 or over. Keep your sign-in secure; you're responsible for what happens under your account. Give accurate information, and only connect bank accounts you're allowed to access.",
    ],
  },
  {
    title: "Your data",
    body: [
      "What you put into UntilFire stays yours. You let us store and process it to run the service, as the privacy policy describes. You can export it or delete your account at any time.",
    ],
  },
  {
    title: "Pro",
    body: [
      "The calculator and core features are free. Pro is a paid subscription that renews until you cancel. Bought on the website, you can cancel it any time in Profile on untilfire.com, on a computer or your phone, and keep Pro until the end of the period you've paid for. Bought in the iOS app, it's billed by Apple and managed in your Apple account settings, under Apple's terms.",
      "Prices are shown before you pay. If a price changes, we'll tell you before your next renewal.",
    ],
  },
  {
    title: "Fair use",
    body: [
      "Don't misuse UntilFire: no attempts to access other people's data, disrupt the service, scrape it, or use it for anything unlawful.",
    ],
  },
  {
    title: "Availability",
    body: [
      "We work to keep UntilFire running and accurate, but it's provided as it is, without guarantees that it will always be available, error-free, or that bank connections will always sync. Banks and other providers can change or stop their connections.",
    ],
  },
  {
    title: "Liability",
    body: [
      "To the extent the law allows, UntilFire isn't liable for losses that come from decisions made using its estimates, or for indirect losses. Where liability can't be excluded, it's limited to what you paid UntilFire in the 12 months before the claim. Nothing here limits rights you have by law that can't be waived.",
    ],
  },
  {
    title: "Ending",
    body: [
      "You can stop using UntilFire and delete your account at any time. We may suspend an account that breaks these terms. If we ever close UntilFire, we'll give notice and time to export your data.",
    ],
  },
  {
    title: "Governing law",
    body: ["These terms are governed by the laws of the Hong Kong Special Administrative Region, and its courts handle any dispute, unless the law where you live gives you the right to bring a claim there."],
  },
  {
    title: "Changes",
    body: ["We may update these terms. If a change matters, we'll tell you before it applies; using UntilFire after that means you accept the new terms."],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="11 October 2026"
      intro="These terms cover using UntilFire, on the website at untilfire.com and in the iOS app. They're written to be read; if anything is unclear, ask us."
      sections={sections}
    />
  );
}
