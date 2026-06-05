// months to reach target from current savings + monthly contributions
export function monthsToFire(
  savings: number,
  monthlyContrib: number,
  target: number,
  annualRate: number
): number {
  if (savings >= target) return 0;
  const r = annualRate / 12;
  if (r === 0) return monthlyContrib > 0 ? (target - savings) / monthlyContrib : Infinity;
  const mr = monthlyContrib / r;
  const denom = savings + mr;
  if (denom <= 0) return Infinity;
  return Math.log((target + mr) / denom) / Math.log(1 + r);
}

export type PurchaseImpactResult = {
  futureValue: number;     // what that money would be worth at retirement
  delayDays: number;       // how many days FIRE is pushed out
  delayMonths: number;     // fractional months
  baselineMonths: number;  // months to FIRE without purchase
};

export function calcPurchaseImpact(
  price: number,
  currentSavings: number,
  monthlyContrib: number,
  fireTarget: number,
  annualReturn: number
): PurchaseImpactResult | null {
  if (price <= 0 || fireTarget <= 0 || monthlyContrib < 0) return null;

  const baseline = monthsToFire(currentSavings, monthlyContrib, fireTarget, annualReturn);
  const delayed  = monthsToFire(currentSavings - price, monthlyContrib, fireTarget, annualReturn);

  if (!isFinite(baseline) || !isFinite(delayed)) return null;

  const delayMonths = Math.max(0, delayed - baseline);
  const yearsToFire = baseline / 12;
  const futureValue = price * Math.pow(1 + annualReturn, yearsToFire);

  return {
    futureValue,
    delayDays: Math.round(delayMonths * 30.4375),
    delayMonths,
    baselineMonths: baseline,
  };
}

export function formatDelay(days: number): string {
  if (days < 1) return "less than a day";
  if (days < 31) return `${days} day${days !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30.4375);
  const remDays = Math.round(days - months * 30.4375);
  if (months < 12) {
    return remDays > 0 ? `${months}mo ${remDays}d` : `${months} month${months !== 1 ? "s" : ""}`;
  }
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years}yr ${remMonths}mo` : `${years} year${years !== 1 ? "s" : ""}`;
}

export function formatFV(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
