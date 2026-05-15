export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "SGD",
  "HKD",
] as const;

export const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CNY: 7.27,
  AUD: 1.56,
  CAD: 1.36,
  SGD: 1.3,
  HKD: 7.78,
};

export function convertUSDAmount(
  amountUSD: number,
  currency: string,
  rates: Record<string, number>,
) {
  if (!Number.isFinite(amountUSD)) return 0;
  if (!currency || currency === "USD") return amountUSD;
  const rate = rates[currency];
  return rate ? amountUSD * rate : amountUSD;
}

export function formatUSDInCurrency(
  amountUSD: number,
  currency: string,
  rates: Record<string, number>,
  options?: {
    compact?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
) {
  const converted = convertUSDAmount(amountUSD, currency, rates);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    notation: options?.compact ? "compact" : "standard",
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits:
      options?.maximumFractionDigits ?? (options?.compact ? 1 : 0),
  }).format(converted);
}

export function getCurrencySymbol(currency: string) {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);

  return parts.find((part) => part.type === "currency")?.value ?? "$";
}
