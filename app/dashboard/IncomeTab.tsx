"use client";

import { TAX_ESTIMATES_AVAILABLE } from "@/lib/release-gates";

import { useState } from "react";
import MoneyField from "@/components/ui/MoneyField";
import { convertUSDAmount } from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import { paycheck, pensionFor, type PlanSettings } from "@/lib/plan-settings";
import { MoneyHead, MoneyList, MoneyRow } from "./MoneyCards";
import Button from "@/components/ui/Button";
import type { ExtraPayMonth } from "@/lib/pay-months";

/**
 * Money → Income (D-59): your pay, from salary to take-home, and what your
 * employer adds on top. Take-home is the income everything else reads
 * (Budget, Home, the freedom date); with a salary set it is worked out here
 * whenever the salary or the pension changes, and Budget can still override it.
 * The pension taken before tax and the employer's money are saved too, because
 * neither reaches your take-home but both are saving.
 */
export default function IncomeTab({ income, setIncome, plan, onPlanChange, taxKey, taxLabel, usTaxHome, displayCurrency, displayRates, paidThisMonth = 0, paidLastMonth = 0, onOpenTransactions, extraPay = [], onOpenContributions }: {
  /** Months with an extra payday (lib/pay-months), from this month on. */
  extraPay?: ExtraPayMonth[];
  onOpenContributions?: () => void;
  /** Income transactions this calendar month and last, in USD: real pay, which goes up and down. */
  paidThisMonth?: number; paidLastMonth?: number;
  onOpenTransactions?: () => void;
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
  const pay = TAX_ESTIMATES_AVAILABLE && gross > 0 ? paycheck(gross, pension, taxKey) : null;
  const pensionName = pensionFor(displayCurrency, usTaxHome).payroll;
  // Worked out from salary, show it exactly; set by hand (or changed in Budget since), show what the plan uses.
  const yearTakeHome = pay && Math.abs(pay.takeHome / 12 - income) < 1 ? pay.takeHome : income * 12;
  // A salary or pension change works take-home out again, and sets the income everything reads.
  const update = (patch: Partial<PlanSettings>) => {
    const next = { ...plan, ...patch };
    onPlanChange(next);
    if (TAX_ESTIMATES_AVAILABLE && (next.grossAnnual ?? 0) > 0) setIncome(Math.round(paycheck(next.grossAnnual!, next.pensionAnnual ?? 0, taxKey).takeHome / 12));
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
        {TAX_ESTIMATES_AVAILABLE && <MoneyRow dot="var(--uf-green)" icon="💼" name="Salary" meta="Before tax, a year" value={gross > 0 ? `${money(gross)} ›` : "Add ›"}
          onClick={() => toggle("gross")} after={open === "gross" && field("Salary a year", gross, (v) => update({ grossAnnual: v }))} />}
        <MoneyRow dot="#c58a4a" icon="🔒" name={`${pensionName}, before tax`} meta="Taken from pay before tax, so it is saving"
          value={pension > 0 ? `−${money(pension)} ›` : "Add ›"}
          onClick={() => toggle("pension")} after={open === "pension" && field("Before tax a year", pension, (v) => update({ pensionAnnual: v }))} />
        {pay && !pay.unknown && <MoneyRow dot="#e34948" icon="🏛️" name="Income tax" meta={taxLabel || pay.label} value={`−${money(pay.incomeTax)}`} />}
        {pay && pay.us && <MoneyRow dot="#8a6fd1" icon="🧾" name="Social Security and Medicare" meta="On the full salary" value={`−${money(pay.socialSecurity)}`} />}
        <MoneyRow dot="var(--uf-ink-3)" icon="💵" name="Take-home" strong
          meta={pay ? (pay.unknown ? "Set your tax home in Plan to work out tax" : "Worked out from your salary") : "The amount that reaches your account each month"}
          value={pay ? money(yearTakeHome) : `${money(income)} a month ›`}
          onClick={pay ? undefined : () => toggle("takehome")}
          after={open === "takehome" && !pay && field("Take-home a month", income, (v) => setIncome(Math.round(v ?? 0)))} />
        <MoneyRow dot="var(--uf-teal)" icon="🏢" name="Employer adds" meta={`Into your ${usTaxHome ? "retirement accounts" : pensionName.toLowerCase()}, on top of your pay`}
          value={employer > 0 ? `+${money(employer)} ›` : "Add ›"} valueTone={employer > 0 ? "var(--uf-pos-ink)" : undefined}
          onClick={() => toggle("employer")} after={open === "employer" && field("Employer adds a year", employer, (v) => update({ employerAnnual: v }))} />
      </MoneyList>
      {(() => {
        const d0 = new Date(), now = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}`;
        const here = extraPay.find((m) => m.month === now);
        const next = extraPay.find((m) => m.month > now);
        const monthName = (ym: string, year = false) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-US", { month: "long", ...(year ? { year: "numeric" } : {}) });
        const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (here) return (
          <div style={{ background: "var(--uf-yellow)", color: "#151719", borderRadius: 24, padding: 18, display: "grid", gap: 8 }}>
            <span className="uf-t-small" style={{ fontWeight: 700, color: "#5C5130" }}>This month</span>
            <b style={{ fontSize: 18 }}>{monthName(here.month)} has {here.paydays} paydays</b>
            <span className="uf-t-small" style={{ color: "#5C5130" }}>An extra {money(here.amount)} lands on {day(here.extraDate)}. Your budget only counts on {here.paydays - 1}.</span>
            {onOpenContributions && <div><Button size="sm" onClick={onOpenContributions}>Send it to savings</Button></div>}
            {next && <span className="uf-t-small" style={{ color: "#5C5130" }}>Next one: {monthName(next.month, true)}</span>}
          </div>
        );
        if (next) return <MoneyList><MoneyRow dot="var(--uf-ink-3)" icon="🎁" name={`Extra payday in ${monthName(next.month, true)}`} meta={`${money(next.amount)} more than a usual month, on ${day(next.extraDate)}`} value="" /></MoneyList>;
        return null;
      })()}
      {income > 0 && (
        <>
          <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700, marginTop: 8 }}>What really came in</div>
          <MoneyList footer={<span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>Pay goes up and down. Your freedom date uses your usual {money(income)} a month.</span>}>
            {paidThisMonth > 0 || paidLastMonth > 0 ? <>
              <MoneyRow dot="var(--uf-green)" icon="📅" name="This month so far" meta="Income in your transactions" value={money(paidThisMonth)} />
              {paidLastMonth > 0 && <MoneyRow dot="var(--uf-ink-3)" icon="🗓️" name="Last month"
                meta={Math.abs(paidLastMonth - income) < Math.max(1, income * 0.02) ? "Same as usual"
                  : paidLastMonth > income ? `${money(paidLastMonth - income)} more than usual` : `${money(income - paidLastMonth)} less than usual`}
                value={money(paidLastMonth)} valueTone={paidLastMonth > income * 1.02 ? "var(--uf-pos-ink)" : undefined} />}
            </> : (
              <MoneyRow dot="var(--uf-ink-3)" icon="📥" name="No pay in your transactions yet" meta="Add or import your paychecks to see what really came in"
                value={onOpenTransactions ? "Add ›" : ""} onClick={onOpenTransactions} />
            )}
          </MoneyList>
        </>
      )}
    </div>
  );
}
