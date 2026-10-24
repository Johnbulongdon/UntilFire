import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/app/components/legal/LegalPage";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy | UntilFire",
  description: "What UntilFire collects, why, who helps run it, and how to export or delete your data.",
  alternates: { canonical: siteUrl("/privacy") },
};

/**
 * Written from what the code does: Supabase for accounts and data, Plaid for
 * banks, Stripe and Apple for Pro, PostHog for analytics, Resend for email, OpenRouter
 * for categorising, Vercel for hosting. Change this page with any new service
 * or new kind of data, and keep the App Store privacy answers in step.
 */
const sections: LegalSection[] = [
  {
    title: "Who runs UntilFire",
    body: ["UntilFire is run by John Ng, an individual based in Hong Kong, who is responsible for your data under this policy. Contact: hello@untilfire.com."],
  },
  {
    title: "What we collect",
    body: [
      "Account: your email address, and a display name if you add one. If you sign in with Google or Apple, we receive the email address they share with us.",
      "What you enter: income, spending, budgets, transactions, balances, goals, your plan and its assumptions, and your answers to the onboarding questions.",
      "Connected banks: if you connect a bank, Plaid sends us account names, balances, holdings and transactions for the accounts you choose. We never see or store your bank username or password.",
      "Payments: if you subscribe to Pro on the website, Stripe handles your card. We store whether you subscribe and your Stripe customer reference, never your card number. If you subscribe in the iOS app, Apple handles the payment; we store whether you subscribe, when it renews and Apple's reference for the purchase.",
      "Usage: which pages and features are used, device and browser type, and errors, so we can fix problems and improve the product. We don't send your amounts, names or email address in these events.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "To run UntilFire for you: calculate your freedom date, show your budget and net worth, import transactions, send the emails you've asked for, and keep the app and website in step.",
      "We don't sell your data, and we don't use it for advertising.",
    ],
  },
  {
    title: "Who helps us run UntilFire",
    body: [
      "Supabase stores accounts and data. Vercel hosts the website. Plaid connects banks. Stripe takes payments on the website and Apple in the iOS app. PostHog records usage and errors. Resend sends email. OpenRouter runs the model that suggests a category for a transaction, given its description and amount only.",
      "Each receives only what it needs for that job, under its own privacy terms.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "Export: download your transactions as CSV or everything as JSON from Profile, on the website or in the app, free on any plan.",
      "Disconnect a bank at any time from Money. UntilFire stops reading it straight away.",
      "Delete your account from Profile, on the website or in the app. First cancel a Pro subscription that would renew and disconnect your banks; then your account and everything in it is deleted. This can't be undone.",
      "Emails: every email has an unsubscribe link, except ones about your account itself, such as sign-in codes.",
    ],
  },
  {
    title: "How long we keep it",
    body: [
      "For as long as you have an account. When you delete it, your data is removed from our database straight away; copies in backups expire on the backup schedule. Payment records Stripe must keep for tax and accounting stay with Stripe.",
    ],
  },
  {
    title: "Security",
    body: [
      "Data is encrypted in transit and at rest, and each person's data is walled off by database rules so only they can read it. The iOS app can be locked with Face ID. No system is perfectly secure; tell us at hello@untilfire.com if you find a problem.",
    ],
  },
  {
    title: "Children",
    body: ["UntilFire is not meant for anyone under 18, and we don't knowingly collect their data."],
  },
  {
    title: "Changes",
    body: ["If this policy changes in a way that matters, we'll say so on the website or by email before it takes effect. The date at the top shows the latest version."],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="11 October 2026"
      intro="UntilFire helps you see when work becomes optional. To do that it holds sensitive information about your money, so this page says plainly what we collect, why, and how you stay in control of it. It covers the website at untilfire.com and the UntilFire iOS app."
      sections={sections}
    />
  );
}
