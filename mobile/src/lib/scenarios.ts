/**
 * Investment scenarios, ported from the website's InvestSimTab (app/dashboard/page.tsx),
 * where this data lives inside the page. `ret` is an illustrative one-year
 * return, not advice. If the website moves it into lib/, import it through
 * src/engine instead and delete this file.
 */
export type SimHolding = { ticker: string; name: string; pct: number; ret: number; color: string }
export type GeoMix = { na: number; eu: number; ap: number; em: number }
export type SimScenario = { name: string; risk: string; geo: GeoMix; stats: { vol: string; sharpe: string; dd: string; beta: string }; holdings: SimHolding[] }


export const SIM_TICKER_COLORS = ["#16A06A", "#14B8A6", "#6366F1", "#F59E0B", "#0EA5E9", "#8B5CF6", "#334155", "#EC4899", "#10B981", "#F43F5E"];

// Ticker picker for the edit-holdings modal. `ret` is an illustrative modeled
// 1-year return (historical CAGR), not advice. Keep tickers uppercase.
export const SIM_TICKER_LIBRARY: Record<string, { name: string; ret: number; color: string }> = {
  VOO:   { name: "Vanguard S&P 500 ETF",            ret: 24.2, color: "#16A06A" },
  VTI:   { name: "Vanguard Total Stock Market ETF",  ret: 23.8, color: "#15A05F" },
  SPY:   { name: "SPDR S&P 500 ETF",                ret: 24.1, color: "#22C55E" },
  IVV:   { name: "iShares Core S&P 500 ETF",        ret: 24.2, color: "#16A06A" },
  SCHB:  { name: "Schwab US Broad Market ETF",       ret: 23.7, color: "#15A05F" },
  QQQ:   { name: "Invesco Nasdaq-100 ETF",           ret: 31.5, color: "#14B8A6" },
  XLK:   { name: "Technology Select Sector SPDR",    ret: 29.0, color: "#0D9488" },
  SOXX:  { name: "iShares Semiconductor ETF",        ret: 35.0, color: "#0EA5E9" },
  ARKK:  { name: "ARK Innovation ETF",               ret: 18.0, color: "#38BDF8" },
  VT:    { name: "Vanguard Total World Stock ETF",   ret: 18.9, color: "#6366F1" },
  VXUS:  { name: "Vanguard Total Intl Stock ETF",    ret: 12.1, color: "#F59E0B" },
  VEA:   { name: "Vanguard Developed Markets ETF",   ret: 11.2, color: "#FB923C" },
  VWO:   { name: "Vanguard Emerging Markets ETF",    ret: 10.4, color: "#FBBF24" },
  EFA:   { name: "iShares MSCI EAFE ETF",            ret: 11.0, color: "#FB923C" },
  BND:   { name: "Vanguard Total Bond Market ETF",   ret: 2.1,  color: "#334155" },
  AGG:   { name: "iShares Core US Aggregate Bond",   ret: 2.0,  color: "#475569" },
  BNDX:  { name: "Vanguard Total Intl Bond ETF",     ret: 3.2,  color: "#64748B" },
  SCHD:  { name: "Schwab US Dividend Equity ETF",    ret: 9.8,  color: "#0EA5E9" },
  VIG:   { name: "Vanguard Dividend Appreciation",   ret: 16.5, color: "#0284C7" },
  VYM:   { name: "Vanguard High Dividend Yield ETF", ret: 8.4,  color: "#8B5CF6" },
  VNQ:   { name: "Vanguard Real Estate ETF",         ret: 11.8, color: "#A855F7" },
  GLD:   { name: "SPDR Gold Trust",                  ret: 26.3, color: "#EAB308" },
  IWM:   { name: "iShares Russell 2000 ETF",         ret: 11.5, color: "#EC4899" },
  AVUV:  { name: "Avantis US Small Value ETF",       ret: 14.0, color: "#DB2777" },
  AAPL:  { name: "Apple Inc.",                       ret: 20.0, color: "#6366F1" },
  MSFT:  { name: "Microsoft Corp.",                  ret: 14.0, color: "#4F46E5" },
  NVDA:  { name: "NVIDIA Corp.",                     ret: 70.0, color: "#16A06A" },
  GOOGL: { name: "Alphabet Inc.",                    ret: 35.0, color: "#EF4444" },
  AMZN:  { name: "Amazon.com Inc.",                  ret: 30.0, color: "#F97316" },
  TSLA:  { name: "Tesla Inc.",                       ret: 40.0, color: "#E11D48" },
};

export const SIM_INITIAL_SCENARIOS: SimScenario[] = [
  { name: "Current Plan", risk: "Balanced 70/30", geo: { na: 62, eu: 16, ap: 14, em: 8 }, stats: { vol: "13.1%", sharpe: "0.71", dd: "-18.2%", beta: "0.88" },
    holdings: [
      { ticker: "VOO", name: "Vanguard S&P 500 ETF", pct: 60, ret: 24.2, color: "#16A06A" },
      { ticker: "BND", name: "Vanguard Total Bond",  pct: 20, ret: 2.1,  color: "#334155" },
      { ticker: "VT",  name: "Vanguard Total World", pct: 20, ret: 18.9, color: "#6366F1" },
    ] },
  { name: "Aggressive Growth", risk: "High Growth 90/10", geo: { na: 78, eu: 9, ap: 9, em: 4 }, stats: { vol: "19.8%", sharpe: "0.68", dd: "-31.4%", beta: "1.18" },
    holdings: [
      { ticker: "QQQ", name: "Invesco Nasdaq-100 ETF", pct: 80, ret: 31.5, color: "#14B8A6" },
      { ticker: "VT",  name: "Vanguard Total World",   pct: 20, ret: 18.9, color: "#6366F1" },
    ] },
  { name: "Conservative Income", risk: "Capital Preservation", geo: { na: 74, eu: 14, ap: 8, em: 4 }, stats: { vol: "8.4%", sharpe: "0.79", dd: "-9.8%", beta: "0.61" },
    holdings: [
      { ticker: "BND",  name: "Vanguard Total Bond",  pct: 50, ret: 2.1,  color: "#334155" },
      { ticker: "VOO",  name: "Vanguard S&P 500 ETF", pct: 30, ret: 24.2, color: "#16A06A" },
      { ticker: "SCHD", name: "Schwab US Dividend",   pct: 20, ret: 9.8,  color: "#0EA5E9" },
    ] },
  { name: "Dividend Focus", risk: "Income Tilt", geo: { na: 58, eu: 20, ap: 14, em: 8 }, stats: { vol: "10.2%", sharpe: "0.83", dd: "-12.1%", beta: "0.74" },
    holdings: [
      { ticker: "SCHD", name: "Schwab US Dividend",      pct: 50, ret: 9.8,  color: "#0EA5E9" },
      { ticker: "VYM",  name: "Vanguard High Div Yield", pct: 30, ret: 8.4,  color: "#8B5CF6" },
      { ticker: "VXUS", name: "Vanguard Total Intl",     pct: 20, ret: 12.1, color: "#F59E0B" },
    ] },
];

// Dot-grid world map — ellipse "blobs" tagged by region, sampled on a 64×32 grid.

export function simWeightedRet(h: { pct: number; ret: number }[]) {
  const tot = h.reduce((a, x) => a + (x.pct || 0), 0) || 1
  return h.reduce((a, x) => a + (x.pct || 0) * x.ret, 0) / tot
}

/** A one-year return compounded over `years`, as the website's chart does. */
export const simCompound = (ret1y: number, years: number) => (Math.pow(1 + ret1y / 100, years) - 1) * 100
