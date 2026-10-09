"use client";

import { useState } from "react";
import MoneyField from "@/components/ui/MoneyField";
import { convertUSDAmount } from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import { paycheck, pensionFor, type PlanSettings } from "@/lib/plan-settings";
import { MoneyHead, MoneyList, MoneyRow } from "./MoneyCards";

/**
 * Money → Income (D-59): your pay, from salary to take-home, and what your
 * employer adds on top. Take-home is the income everything else reads
 * (Budget, Home, the freedom date); with a salary set it is worked out here
 * whenever the salary or the pension changes, and Budget can still override it.
 * The pension taken before tax and the employer's money are saved too, because
 * neither reaches your take-home but both are saving.
 */
export default function IncomeTab({ income, setIncome, plan, onPlanChange, taxKey, taxLabel, usTaxHome, displayCurrency, displayRates }: {
  /** Take-home a month, in USD. */
  income: number;
  setIncome: (monthly: number) => void;
  plan: PlanSettings;
  onPlanChange: (next: PlanSettings) => void;
  taxKey: string;
  taxLabel: string;
  usTaxHome: boolean;
  displayCurrency: string;
  displayRates: Record<string, number>;
}) {
  const local = (usd: number) => Math.round(convertUSDAmount(usd, displayCurrency, displayRates));
  const toUsd = (n: number) => (displayCurrency === "USD" ? n : n / (displayRates[displayCurrency] || 1));
  const money = (usd: number) => formatMoney(local(usd), { currency: displayCurrency });
  const [open, setOpen] = useState<null | "gross" | "pension" | "employer" | "takehome">(null);
  const toggle = (k: NonNullable<typeof open>) => setOpen((o) => (o === k ? null : k));

  const gross = plan.grossAnnual ?? 0, pension = plan.pensionAnnual ?? 0, employer = plan.employerAnnual ?? 0;
  const pay = gross > 0 ? paycheck(gross, pension, taxKey) : null;
  const pensionName = pensionFor(displayCurrency, usTaxHome).payroll;
  // Worked out from salary, show it exactly; set by hand (or changed in Budget since), show what the plan uses.
  const yearTakeHome = pay && Math.abs(pay.takeHome / 12 - income) < 1 ? pay.takeHome : income * 12;
  // A salary or pension change works take-home out again, and sets the income everything reads.
  const update = (patch: Partial<PlanSettings>) => {
    const next = { ...plan, ...patch };
    onPlanChange(next);
    if ((next.grossAnnual ?? 0) > 0) setIncome(Math.round(paycheck(next.grossAnnual!, next.pensionAnnual ?? 0, taxKey).takeHome / 12));
  };
  const field = (label: string, usd: number, onUsd: (v: number | undefined) => void) => (
    <div style={{ maxWidth: 320 }}>
      <MoneyField label={`${label} (${displayCurrency})`} value={usd > 0 ? String(local(usd)) : ""}
        onChange={(v) => onUsd(v === "" ? undefined : Math.max(0, toUsd(Number(v) || 0)))} />
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <MoneyHead label="Take-home a year" value={money(yearTakeHome)}
        sub={`${money(income)} a month${employer > 0 ? ` · plus ${money(employer)} from your employer` : ""}`} />
      <MoneyList>
        <MoneyRow dot="var(--uf-green)" icon="💼" name="Salary" meta="Before tax, a year" value={gross > 0 ? `${money(gross)} ›` : "Add ›"}
          onClick={() => toggle("gross")} after={open === "gross" && field("Salary a year", gross, (v) => update({ grossAnnual: v }))} />
        <MoneyRow dot="#c58a4a" icon="🔒" name={`${pensionName}, before tax`} meta="Taken from pay before tax, so it is saving"
          value={pension > 0 ? `−${money(pension)} ›` : "Add ›"}
          onClick={() => toggle("pension")} after={open === "pension" && field("Before tax a year", pension, (v) => update({ pensionAnnual: v }))} />
        {pay && !pay.unknown && <MoneyRow dot="#e34948" icon="🏛️" name="Income tax" meta={taxLabel || pay.label} value={`−${money(pay.incomeTax)}`} />}
        {pay && pay.us && <MoneyRow dot="#8a6fd1" icon="🧾" name="Social Security and Medicare" meta="On the full salary" value={`−${money(pay.socialSecurity)}`} />}
        <MoneyRow dot="var(--uf-ink-3)" icon="💵" name="Take-home" strong
          meta={pay ? (pay.unknown ? "Set your tax home in Plan to work out tax" : "Worked out from your salary") : "After tax, a month. Add a salary to work it out"}
          value={pay ? money(yearTakeHome) : `${money(income)} a month ›`}
          onClick={pay ? undefined : () => toggle("takehome")}
          after={open === "takehome" && !pay && field("Take-home a month", income, (v) => setIncome(Math.round(v ?? 0)))} />
        <MoneyRow dot="var(--uf-teal)" icon="🏢" name="Employer adds" meta="Into your pension, on top of your pay"
          value={employer > 0 ? `+${money(employer)} ›` : "Add ›"} valueTone={employer > 0 ? "var(--uf-pos-ink)" : undefined}
          onClick={() => toggle("employer")} after={open === "employer" && field("Employer adds a year", employer, (v) => update({ employerAnnual: v }))} />
      </MoneyList>
    </div>
  );
}
