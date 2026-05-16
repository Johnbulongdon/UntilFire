export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD", "SGD", "HKD",
  "CHF", "NZD", "SEK", "NOK", "DKK", "KRW", "INR", "THB", "MYR",
  "IDR", "PHP", "VND", "TWD", "MXN", "BRL", "ZAR", "AED", "SAR",
  "TRY", "PLN", "CZK", "HUF", "ILS", "NGN", "PKR",
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",       EUR: "Euro",              GBP: "British Pound",
  JPY: "Japanese Yen",    CNY: "Chinese Yuan",      AUD: "Australian Dollar",
  CAD: "Canadian Dollar", SGD: "Singapore Dollar",  HKD: "Hong Kong Dollar",
  CHF: "Swiss Franc",     NZD: "New Zealand Dollar",SEK: "Swedish Krona",
  NOK: "Norwegian Krone", DKK: "Danish Krone",      KRW: "South Korean Won",
  INR: "Indian Rupee",    THB: "Thai Baht",         MYR: "Malaysian Ringgit",
  IDR: "Indonesian Rupiah",PHP: "Philippine Peso",  VND: "Vietnamese Dong",
  TWD: "Taiwan Dollar",   MXN: "Mexican Peso",      BRL: "Brazilian Real",
  ZAR: "South African Rand", AED: "UAE Dirham",     SAR: "Saudi Riyal",
  TRY: "Turkish Lira",    PLN: "Polish Zloty",      CZK: "Czech Koruna",
  HUF: "Hungarian Forint",ILS: "Israeli Shekel",    NGN: "Nigerian Naira",
  PKR: "Pakistani Rupee",
};

export const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.92,    GBP: 0.79,    JPY: 149.5,   CNY: 7.27,
  AUD: 1.56,    CAD: 1.36,    SGD: 1.34,    HKD: 7.78,
  CHF: 0.89,    NZD: 1.63,    SEK: 10.42,   NOK: 10.55,
  DKK: 6.89,    KRW: 1330,    INR: 83.5,    THB: 35.1,
  MYR: 4.72,    IDR: 15800,   PHP: 57.5,    VND: 24800,
  TWD: 31.9,    MXN: 17.15,   BRL: 5.05,    ZAR: 18.6,
  AED: 3.67,    SAR: 3.75,    TRY: 32.5,    PLN: 4.02,
  CZK: 23.1,    HUF: 360,     ILS: 3.72,    NGN: 1580,
  PKR: 278,
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
