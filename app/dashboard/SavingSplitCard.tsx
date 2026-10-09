"use client";

import { useState } from "react";
import MoneyField from "@/components/ui/MoneyField";
import { convertUSDAmount } from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import { pensionFor, taxFreeFor, type PlanSettings } from "@/lib/plan-settings";
import { MoneyHead, MoneyList, MoneyRow } from "./MoneyCards";

/**
 * Where your saving goes (D-59), as the freedom date counts it: the pension
 * before tax and your employer's money (both from Money → Income), then what
 * you save from take-home, into a tax-free account first and the rest to a
 * taxable one. Which account money sits in decides what you can reach before
 * your pension opens, so the split moves the date, not only the total.
 */
export default function SavingSplitCard({ plan, onChange, afterTaxSaving, takeHomeAnnual, usTaxHome, displayCurrency, displayRates, onOpenIncome }: {
  plan: PlanSettings;
  onChange: (next: PlanSettings) => void;
  /** Saved from take-home a year, in USD: take-home less spending and the mortgage. */
  afterTaxSaving: number;
  takeHomeAnnual: number;
  usTaxHome: boolean;
  displayCurrency: string;
  displayRates: Record<string, number>;
  onOpenIncome: () => void;
}) {
  const [open, setOpen] = useState(false);
  const local = (usd: number) => Math.round(convertUSDAmount(usd, displayCurrency, displayRates));
  const money = (usd: number) => formatMoney(local(usd), { currency: displayCurrency });
  const toUsd = (n: number) => (displayCurrency === "USD" ? n : n / (displayRates[displayCurrency] || 1));

  const pension = plan.pensionAnnual ?? 0, employer = plan.employerAnnual ?? 0;
  const saving = Math.max(0, afterTaxSaving);
  const taxFree = Math.min(saving, plan.taxFreeAnnual ?? 0);
  const rest = saving - taxFree;
  const total = pension + employer + saving;
  const pay = (plan.grossAnnual ?? 0) > 0 ? plan.grossAnnual! + employer : takeHomeAnnual + pension + employer;
  const account = taxFreeFor(displayCurrency, usTaxHome);
  const pensionName = pensionFor(displayCurrency, usTaxHome).payroll;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <MoneyHead label="Saving a year" value={money(total)}
        sub={pay > 0 ? `${Math.round((total / pay) * 100)}% of your pay, with your employer's` : undefined} />
      <MoneyList>
        <MoneyRow dot="#c58a4a" icon="🔒" name={`${pensionName} · you`} meta="Before tax, from Income" value={pension > 0 ? `${money(pension)} ›` : "Add ›"} onClick={onOpenIncome} />
        <MoneyRow dot="var(--uf-teal)" icon="🏢" name={`${pensionName} · employer`} meta="On top of your pay, from Income" value={employer > 0 ? `${money(employer)} ›` : "Add ›"} onClick={onOpenIncome} />
        {account && <MoneyRow dot="var(--uf-green)" icon="🌱" name={account.name} meta={account.gainsLocked ? "What you pay in can come out any time" : "Can come out any time"}
          value={taxFree > 0 ? `${money(taxFree)} ›` : "Add ›"} onClick={() => setOpen((o) => !o)}
          after={open && (
            <div style={{ maxWidth: 320 }}>
              <MoneyField label={`${account.name} a year (${displayCurrency})`} value={plan.taxFreeAnnual ? String(local(plan.taxFreeAnnual)) : ""}
                onChange={(v) => onChange({ ...plan, taxFreeAnnual: v === "" ? undefined : Math.max(0, toUsd(Number(v) || 0)) })} />
            </div>
          )} />}
        <MoneyRow dot="#2a78d6" icon="📊" name="Investing account" meta="The rest of what you save from take-home" value={money(rest)} />
        <MoneyRow dot="var(--uf-ink-3)" icon="🛒" name="Left to spend" meta="Take-home less what you save" strong value={money(Math.max(0, takeHomeAnnual - saving))} />
      </MoneyList>
    </div>
  );
}
