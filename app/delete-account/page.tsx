import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/app/components/legal/LegalPage";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Delete your account | UntilFire",
  description: "How to delete your UntilFire account and data, what is deleted, and what is kept.",
  alternates: { canonical: siteUrl("/delete-account") },
};

/**
 * The account-deletion link Google Play shows on the store listing: the steps,
 * what goes and what stays. Keep it in step with the privacy page and with
 * the delete flows (website Profile, phone app delete-account screen).
 */
const sections: LegalSection[] = [
  {
    title: "How to delete your account",
    body: [
      "In the app: open Profile, then Data and account, then Delete account. Follow the steps and confirm.",
      "On the website: sign in at untilfire.com/login, open Profile in your dashboard, then Delete account. This works without the app installed.",
      "Before deleting: cancel a Pro subscription that would renew (on the website, or in your phone's store settings if you bought it there) and disconnect your banks. The delete screen walks you through both.",
      "Can't sign in? Email hello@untilfire.com from the address on your account and we'll delete it for you within 30 days.",
    ],
  },
  {
    title: "What is deleted",
    body: [
      "Everything in your account, straight away: your email and name, income, spending, budgets, transactions, balances, goals, your plan and its assumptions, connected bank data and your onboarding answers.",
    ],
  },
  {
    title: "What is kept, and for how long",
    body: [
      "Database backups that may still hold a copy expire on the backup schedule, within 30 days.",
      "Payment records Stripe must keep for tax and accounting stay with Stripe; purchases made through Apple or Google stay with them under their own terms.",
      "Usage and error events never include your amounts, names or email address, and are not linked back to you after deletion.",
    ],
  },
];

export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Delete your UntilFire account"
      updated="23 October 2026"
      intro="UntilFire (the website at untilfire.com and the UntilFire app, by John Ng) lets you delete your account and all its data at any time. Here is how, and what happens to your data."
      sections={sections}
    />
  );
}
