import { getLocale, takeHomePay } from "@/lib/fire/tax";

/**
 * Plan settings beyond the basics (D-59): what you plan to spend once free,
 * pay growth, money paid into a pension outside take-home pay, and when that
 * pension opens. Saved with the profile; anything unset leaves the plan as it
 * was, so existing plans keep their date until the person sets something.
 */
export type PlanSettings = {
  /** Salary before tax a year, in USD, from Money → Income. Set, take-home is worked out from it. */
  grossAnnual?: number;
  /** A year's spending once free, in USD. */
  retirementAnnualSpend?: number;
  /** Pay growth a year above inflation, as a fraction. Unset or 0 means flat pay. */
  payGrowth?: number;
  /** Paid into a pension each year outside take-home pay, in USD: by your employer, and by you before tax. */
  employerAnnual?: number;
  pensionAnnual?: number;
  /** From the profile, not saved here. */
  currentAge?: number;
  /** The age the pension opens, once confirmed. Unset, no bridge check. */
  accessAge?: number;
  /** Mortgage interest, as a fraction. Unset, 6.5%. */
  mortgageRate?: number;
  /** After-tax saving into a tax-free account a year, in USD (Plan → Contributions). The rest of saving is taxable. */
  taxFreeAnnual?: number;
  /** Set from the country: only paid-in money is reachable early (a Roth IRA). */
  taxFreeGainsLocked?: boolean;
};

/**
 * Pay growth above inflation, as rough long-run guides rather than forecasts:
 * a person picks the one nearest their work, or types their own.
 */
export const PAY_GROWTH_PRESETS = [
  { key: "flat", label: "Flat", rate: 0 },
  { key: "steady", label: "Steady", rate: 0.01 },
  { key: "growing", label: "Growing field", rate: 0.02 },
  { key: "fast", label: "Fast track", rate: 0.03 },
] as const;

/**
 * When pension money opens, by country: the local name and the earliest age
 * it can be drawn without a penalty. A starting point the person confirms or
 * changes, since rules differ by scheme and change over time. No age means
 * the money can be drawn at any age (with tax), so there is nothing to bridge.
 */
const PENSIONS: Record<string, { name: string; payroll: string; age?: number }> = {
  US: { name: "401(k) and IRA", payroll: "401(k)", age: 59.5 },
  GB: { name: "Workplace pension", payroll: "Workplace pension", age: 57 },
  JP: { name: "iDeCo and company DC", payroll: "Company DC", age: 60 },
  AU: { name: "Super", payroll: "Super", age: 60 },
  NZ: { name: "KiwiSaver", payroll: "KiwiSaver", age: 65 },
  SG: { name: "CPF", payroll: "CPF", age: 55 },
  CA: { name: "RRSP", payroll: "Group RRSP" },
  DE: { name: "Company pension", payroll: "Company pension", age: 62 },
};
const CURRENCY_COUNTRY: Record<string, string> = { USD: "US", GBP: "GB", JPY: "JP", AUD: "AU", NZD: "NZ", SGD: "SG", CAD: "CA" };

/** The pension rule to suggest: a US tax home wins, then the money's currency, then a plain default. */
export function pensionFor(currency: string, usTaxHome: boolean): { name: string; payroll: string; age?: number } {
  if (usTaxHome) return PENSIONS.US;
  return PENSIONS[CURRENCY_COUNTRY[currency] ?? ""] ?? { name: "Pension", payroll: "Pension", age: 60 };
}

/** 59.5 → "59½". */
export const ageLabel = (age: number) => (age % 1 === 0.5 ? `${Math.floor(age)}½` : String(Math.round(age)));

/**
 * A year's pay, from salary to take-home (D-59). Income tax is on pay after the
 * pension taken before tax; US Social Security and Medicare are on the full
 * salary. Elsewhere the country's effective rate stands for all of it. Where
 * the tax home is unknown, nothing is taken off and `unknown` says so.
 */
export function paycheck(grossAnnual: number, pensionAnnual: number, jurisdiction: string) {
  const locale = getLocale(jurisdiction);
  const taxed = takeHomePay(Math.max(0, grossAnnual - pensionAnnual), locale, 2025);
  const socialSecurity = locale.kind === "us" ? takeHomePay(grossAnnual, locale, 2025).fica : 0;
  const incomeTax = taxed.fedTax + taxed.stateTax;
  return {
    incomeTax, socialSecurity, label: taxed.jurisdictionLabel, unknown: !!taxed.unknownJurisdiction, us: locale.kind === "us",
    takeHome: Math.max(0, grossAnnual - pensionAnnual - incomeTax - socialSecurity),
  };
}

/** The tax-free account to suggest by country, or null where there is no common one. */
export function taxFreeFor(currency: string, usTaxHome: boolean): { name: string; gainsLocked: boolean } | null {
  if (usTaxHome || currency === "USD") return { name: "Roth IRA", gainsLocked: true };
  const byCountry: Record<string, string> = { GB: "ISA", JP: "NISA", CA: "TFSA" };
  const name = byCountry[CURRENCY_COUNTRY[currency] ?? ""];
  return name ? { name, gainsLocked: false } : { name: "Tax-free account", gainsLocked: false };
}
