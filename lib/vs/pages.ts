import { PRO_ANNUAL_USD } from "@/lib/pricing";
import type { IconName } from "@/components/ui";

/**
 * Comparison pages (/vs/<slug>). They lead with UntilFire, are visual first,
 * and link nowhere off the site (founder's call, 2026-10-11). Every competitor
 * fact still comes from that company's own public pricing or home page,
 * checked on CHECKED_ON. When a price or plan changes, change it here and move
 * the date. A wrong ✓ or ✗ about a named competitor costs more trust than the
 * row earns, so a row we can't verify stays off the table; their real
 * strengths go in `niches`, never as a false ✗. Ties are fine and go last;
 * a row where a rival beats UntilFire does not go in the table (founder's
 * call, 2026-10-11).
 *
 * Sources (kept here, not linked from the pages by design):
 *   projectionlab.com/pricing, boldin.com/pricing, ficalc.app,
 *   firecalc.com, monarch.com/pricing
 */

export const CHECKED_ON = "October 10, 2026";
export const CHECKED_ON_ISO = "2026-10-10";

/** yes / no / a short qualifier shown as a partial mark. */
export type Mark = true | false | string;

export type VsPage = {
  slug: string;
  /** Competitors in column order; UntilFire is always the first column. */
  rivals: string[];
  title: string;
  description: string;
  h1: string;
  lead: string;
  /** Short name for the hub card. */
  card: string;
  rows: { label: string; marks: Mark[] }[];
  /** Price per year per column. Omitted where every rival is free. */
  prices?: { perYear: number; note: string }[];
  niches: { tool: string; line: string }[];
  faqs: { q: string; a: string }[];
};

export const WINS: { icon: IconName; title: string; line: string }[] = [
  { icon: "bank", title: "Your real money", line: "Spending, budgets and balances feed your plan automatically." },
  { icon: "target", title: "One next move", line: "Every month, the single step that brings your date closer." },
  { icon: "calendar", title: "A date, in minutes", line: "No 100-field setup. Your freedom date from three numbers." },
];

const BANKS = "18,000+ banks";
const FREE_ANSWER = "UntilFire's FIRE calculator is free with no login, and gives you a freedom date from your income, spending and savings.";

export const VS_PAGES: VsPage[] = [
  {
    slug: "projectionlab-vs-boldin",
    rivals: ["ProjectionLab", "Boldin"],
    title: "ProjectionLab vs Boldin vs UntilFire (2026 Comparison)",
    description: "ProjectionLab vs Boldin vs UntilFire: bank sync, real spending, monthly next moves and price compared side by side. See your freedom date free, no login.",
    h1: "ProjectionLab vs Boldin vs UntilFire",
    lead: "Planners model your future. UntilFire connects it to your money today.",
    card: "Two long-range planners, side by side.",
    rows: [
      { label: "Pulls in your spending automatically", marks: [true, false, false] },
      { label: "Links your bank accounts", marks: [BANKS, false, "Paid plan only"] },
      { label: "Tells you what to do next, every month", marks: [true, false, false] },
      { label: "Free to try, no account", marks: [true, "Account needed", "Account needed"] },
      { label: "Compares living costs in 300+ cities", marks: [true, false, false] },
      { label: "Tests life changes: a move, a baby, a break", marks: [true, "Paid plan only", true] },
      { label: "Has a free plan", marks: [true, true, true] },
    ],
    prices: [
      { perYear: PRO_ANNUAL_USD, note: "Bank sync included" },
      { perYear: 129, note: "No bank sync" },
      { perYear: 168, note: "From Oct 15, 2026" },
    ],
    niches: [
      { tool: "ProjectionLab", line: "Built for detailed modelers: Monte Carlo and deep tax scenarios." },
      { tool: "Boldin", line: "Built for people near retirement: Social Security and Roth timing." },
    ],
    faqs: [
      { q: "What's the difference between ProjectionLab, Boldin and UntilFire?", a: "ProjectionLab and Boldin are long-range planners. UntilFire connects your real accounts and spending to your plan, then gives you a freedom date and one next move each month." },
      { q: "Does ProjectionLab link to bank accounts?", a: "No. ProjectionLab doesn't link to your accounts, so you enter and update balances yourself. UntilFire links to 18,000+ banks, and one connection is free." },
      { q: "Is Boldin worth $168 a year?", a: `Boldin PlannerPlus rises from $144 to $168 a year for new subscribers after October 15, 2026. It suits people weighing Social Security and Roth timing. UntilFire Pro is $${PRO_ANNUAL_USD} a year with bank sync included.` },
      { q: "Is there a free alternative to ProjectionLab and Boldin?", a: `Yes. ${FREE_ANSWER}` },
    ],
  },
  {
    slug: "ficalc-alternative",
    rivals: ["FI Calc"],
    title: "FI Calc Alternative: UntilFire vs FI Calc (2026)",
    description: "UntilFire vs FI Calc: both free with no login. UntilFire adds your real spending, bank sync and one next move each month. Compare side by side.",
    h1: "UntilFire vs FI Calc",
    lead: "FI Calc tests a withdrawal plan. UntilFire gets you to the start line.",
    card: "A free withdrawal calculator vs a guided path.",
    rows: [
      { label: "Shows the date you can stop working", marks: [true, "Odds your money lasts"] },
      { label: "Pulls in your spending automatically", marks: [true, false] },
      { label: "Links your bank accounts", marks: [BANKS, false] },
      { label: "Tells you what to do next, every month", marks: [true, false] },
      { label: "Compares living costs in 300+ cities", marks: [true, false] },
      { label: "Tests life changes: a move, a baby, a break", marks: [true, "One-off costs only"] },
      { label: "Free to use, no sign-up", marks: [true, true] },
    ],
    niches: [
      { tool: "FI Calc", line: "Built for the withdrawal phase: a dozen withdrawal strategies tested against market history." },
    ],
    faqs: [
      { q: "What's the difference between FI Calc and UntilFire?", a: "FI Calc tests how a portfolio holds up under different withdrawal strategies. UntilFire starts earlier: it uses your real spending and savings to give you a freedom date and one next move each month." },
      { q: "Is FI Calc free?", a: "Yes. FI Calc is supported by donations. UntilFire's calculator is also free with no login; Pro adds unlimited bank connections." },
      { q: "Can I use UntilFire and FI Calc together?", a: "Yes. Use UntilFire to reach your freedom date, then test withdrawal strategies once you're close." },
    ],
  },
  {
    slug: "firecalc-alternative",
    rivals: ["FIRECalc"],
    title: "FIRECalc Alternative: UntilFire vs FIRECalc (2026)",
    description: "UntilFire vs FIRECalc: FIRECalc tests a plan against market history; UntilFire adds your real spending, bank sync and a monthly next move. Compare side by side.",
    h1: "UntilFire vs FIRECalc",
    lead: "FIRECalc asks if your plan would have survived. UntilFire helps you build it.",
    card: "A classic historical calculator vs a guided path.",
    rows: [
      { label: "Shows the date you can stop working", marks: [true, "Odds your money lasts"] },
      { label: "Pulls in your spending automatically", marks: [true, false] },
      { label: "Links your bank accounts", marks: [BANKS, false] },
      { label: "Tells you what to do next, every month", marks: [true, false] },
      { label: "Compares living costs in 300+ cities", marks: [true, false] },
      { label: "Saves your plan and keeps it current", marks: [true, false] },
      { label: "Free to use, no sign-up", marks: [true, true] },
    ],
    niches: [
      { tool: "FIRECalc", line: "Built for stress tests: your plan run against every market year since 1871." },
    ],
    faqs: [
      { q: "What's the difference between FIRECalc and UntilFire?", a: "FIRECalc tells you how often a retirement plan would have lasted in past markets. UntilFire uses your real spending and savings to give you a freedom date and one next move each month." },
      { q: "Does FIRECalc save my plan?", a: "No. FIRECalc says it doesn't store what you enter. UntilFire keeps your plan and updates it as your accounts change." },
      { q: "Is there a free FIRECalc alternative?", a: `Yes. ${FREE_ANSWER}` },
    ],
  },
  {
    slug: "monarch-money-alternative",
    rivals: ["Monarch Money"],
    title: "Monarch Money Alternative for FIRE: UntilFire vs Monarch (2026)",
    description: "UntilFire vs Monarch Money: both sync your banks and track spending. UntilFire turns it into a freedom date and a monthly next move, for less. Compare side by side.",
    h1: "UntilFire vs Monarch Money",
    lead: "Monarch shows where your money went. UntilFire shows when it sets you free.",
    card: "A budgeting app vs a freedom plan.",
    rows: [
      { label: "Links your bank accounts", marks: [BANKS, true] },
      { label: "Shows the date you can stop working", marks: [true, "Forecasts only"] },
      { label: "Tells you what to do next, every month", marks: [true, false] },
      { label: "Free to try, no account", marks: [true, "Paid, after a trial"] },
      { label: "Compares living costs in 300+ cities", marks: [true, false] },
      { label: "Tracks spending and budgets", marks: [true, true] },
    ],
    prices: [
      { perYear: PRO_ANNUAL_USD, note: "Calculator free forever" },
      { perYear: 99.99, note: "No free plan" },
    ],
    niches: [
      { tool: "Monarch Money", line: "Built for day-to-day budgeting across all your accounts." },
    ],
    faqs: [
      { q: "What's the difference between Monarch Money and UntilFire?", a: "Both connect your accounts and track spending. Monarch is built around budgeting. UntilFire turns the same data into a freedom date and one next move each month." },
      { q: "Does Monarch Money have a free plan?", a: `No. Monarch is $14.99 a month or $99.99 a year after a trial. UntilFire's calculator is free with no login, and Pro is $${PRO_ANNUAL_USD} a year.` },
      { q: "Is UntilFire a good Monarch alternative for FIRE?", a: "If your goal is financial independence, yes: UntilFire is built around your freedom date rather than your monthly budget." },
    ],
  },
];

export function getVsPage(slug: string) {
  return VS_PAGES.find((p) => p.slug === slug);
}
