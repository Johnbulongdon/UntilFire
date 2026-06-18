// Curated metadata for the most common ETFs and index funds people hold.
// Used by the "Rate my portfolio" tool to classify holdings for the rules-based
// adviser verdict. Pure data + pure helpers only — safe to import from edge routes.

export type AssetClass =
  | 'us-equity'
  | 'intl-equity'
  | 'em-equity'
  | 'global-equity'
  | 'sector-equity'
  | 'single-stock'
  | 'bond'
  | 'reit'
  | 'commodity'
  | 'crypto'
  | 'cash'

export type Region = 'us' | 'intl-developed' | 'em' | 'global' | 'none'

export interface FundInfo {
  name: string
  assetClass: AssetClass
  region: Region
  isBond: boolean
  // Annual expense ratio as a percent, e.g. 0.03 means 0.03%.
  expenseRatio: number
  // Funds that overlap heavily share an overlapGroup, used to flag redundancy.
  overlapGroup?: string
  // True for broadly diversified single funds that are fine to hold at 100%.
  broad?: boolean
}

// Keyed by uppercase ticker.
const FUNDS: Record<string, FundInfo> = {
  // US total market
  VTI: { name: 'Vanguard Total Stock Market', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.03, overlapGroup: 'us-total', broad: true },
  ITOT: { name: 'iShares Core S&P Total US Stock', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.03, overlapGroup: 'us-total', broad: true },
  SCHB: { name: 'Schwab US Broad Market', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.03, overlapGroup: 'us-total', broad: true },
  VTSAX: { name: 'Vanguard Total Stock Market (MF)', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.04, overlapGroup: 'us-total', broad: true },
  FZROX: { name: 'Fidelity ZERO Total Market', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.0, overlapGroup: 'us-total', broad: true },
  FSKAX: { name: 'Fidelity Total Market Index', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.015, overlapGroup: 'us-total', broad: true },

  // S&P 500
  VOO: { name: 'Vanguard S&P 500', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.03, overlapGroup: 'us-sp500', broad: true },
  IVV: { name: 'iShares Core S&P 500', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.03, overlapGroup: 'us-sp500', broad: true },
  SPY: { name: 'SPDR S&P 500', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.0945, overlapGroup: 'us-sp500', broad: true },
  FXAIX: { name: 'Fidelity 500 Index', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.015, overlapGroup: 'us-sp500', broad: true },
  VFIAX: { name: 'Vanguard 500 Index (MF)', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.04, overlapGroup: 'us-sp500', broad: true },
  SWPPX: { name: 'Schwab S&P 500 Index', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.02, overlapGroup: 'us-sp500', broad: true },
  VV: { name: 'Vanguard Large-Cap', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.04, overlapGroup: 'us-sp500', broad: true },

  // Nasdaq / growth
  QQQ: { name: 'Invesco QQQ (Nasdaq-100)', assetClass: 'sector-equity', region: 'us', isBond: false, expenseRatio: 0.2, overlapGroup: 'us-nasdaq' },
  QQQM: { name: 'Invesco Nasdaq-100', assetClass: 'sector-equity', region: 'us', isBond: false, expenseRatio: 0.15, overlapGroup: 'us-nasdaq' },
  VUG: { name: 'Vanguard Growth', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.04, overlapGroup: 'us-growth' },
  SCHG: { name: 'Schwab US Large-Cap Growth', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.04, overlapGroup: 'us-growth' },

  // US value / dividend
  VTV: { name: 'Vanguard Value', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.04, overlapGroup: 'us-value' },
  SCHD: { name: 'Schwab US Dividend Equity', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.06, overlapGroup: 'us-dividend' },
  VYM: { name: 'Vanguard High Dividend Yield', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.06, overlapGroup: 'us-dividend' },
  DGRO: { name: 'iShares Core Dividend Growth', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.08, overlapGroup: 'us-dividend' },
  VIG: { name: 'Vanguard Dividend Appreciation', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.05, overlapGroup: 'us-dividend' },

  // US mid / small / factor
  VO: { name: 'Vanguard Mid-Cap', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.04 },
  VB: { name: 'Vanguard Small-Cap', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.05 },
  VBR: { name: 'Vanguard Small-Cap Value', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.07, overlapGroup: 'us-scv' },
  AVUV: { name: 'Avantis US Small-Cap Value', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.25, overlapGroup: 'us-scv' },
  IJR: { name: 'iShares Core S&P Small-Cap', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.06 },
  IWM: { name: 'iShares Russell 2000', assetClass: 'us-equity', region: 'us', isBond: false, expenseRatio: 0.19 },

  // International developed
  VXUS: { name: 'Vanguard Total International Stock', assetClass: 'intl-equity', region: 'global', isBond: false, expenseRatio: 0.05, overlapGroup: 'intl-total', broad: true },
  IXUS: { name: 'iShares Core MSCI Total Intl', assetClass: 'intl-equity', region: 'global', isBond: false, expenseRatio: 0.07, overlapGroup: 'intl-total', broad: true },
  VEU: { name: 'Vanguard FTSE All-World ex-US', assetClass: 'intl-equity', region: 'global', isBond: false, expenseRatio: 0.04, overlapGroup: 'intl-total' },
  VEA: { name: 'Vanguard FTSE Developed Markets', assetClass: 'intl-equity', region: 'intl-developed', isBond: false, expenseRatio: 0.03, overlapGroup: 'intl-dev' },
  IEFA: { name: 'iShares Core MSCI EAFE', assetClass: 'intl-equity', region: 'intl-developed', isBond: false, expenseRatio: 0.07, overlapGroup: 'intl-dev' },
  SCHF: { name: 'Schwab International Equity', assetClass: 'intl-equity', region: 'intl-developed', isBond: false, expenseRatio: 0.06, overlapGroup: 'intl-dev' },
  AVDV: { name: 'Avantis Intl Small-Cap Value', assetClass: 'intl-equity', region: 'intl-developed', isBond: false, expenseRatio: 0.36 },
  VSS: { name: 'Vanguard FTSE All-World ex-US Small', assetClass: 'intl-equity', region: 'global', isBond: false, expenseRatio: 0.07 },

  // Emerging markets
  VWO: { name: 'Vanguard FTSE Emerging Markets', assetClass: 'em-equity', region: 'em', isBond: false, expenseRatio: 0.08, overlapGroup: 'em-total' },
  IEMG: { name: 'iShares Core MSCI Emerging Markets', assetClass: 'em-equity', region: 'em', isBond: false, expenseRatio: 0.09, overlapGroup: 'em-total' },
  AVEM: { name: 'Avantis Emerging Markets Equity', assetClass: 'em-equity', region: 'em', isBond: false, expenseRatio: 0.33, overlapGroup: 'em-total' },
  AVES: { name: 'Avantis Emerging Markets Value', assetClass: 'em-equity', region: 'em', isBond: false, expenseRatio: 0.36 },

  // Global all-in-one
  VT: { name: 'Vanguard Total World Stock', assetClass: 'global-equity', region: 'global', isBond: false, expenseRatio: 0.06, overlapGroup: 'global-total', broad: true },

  // Bonds
  BND: { name: 'Vanguard Total Bond Market', assetClass: 'bond', region: 'us', isBond: true, expenseRatio: 0.03, overlapGroup: 'us-bond', broad: true },
  AGG: { name: 'iShares Core US Aggregate Bond', assetClass: 'bond', region: 'us', isBond: true, expenseRatio: 0.03, overlapGroup: 'us-bond', broad: true },
  BNDX: { name: 'Vanguard Total International Bond', assetClass: 'bond', region: 'global', isBond: true, expenseRatio: 0.07 },
  VGIT: { name: 'Vanguard Intermediate-Term Treasury', assetClass: 'bond', region: 'us', isBond: true, expenseRatio: 0.04 },
  VGSH: { name: 'Vanguard Short-Term Treasury', assetClass: 'bond', region: 'us', isBond: true, expenseRatio: 0.04 },
  TLT: { name: 'iShares 20+ Year Treasury', assetClass: 'bond', region: 'us', isBond: true, expenseRatio: 0.15 },
  VTEB: { name: 'Vanguard Tax-Exempt Bond', assetClass: 'bond', region: 'us', isBond: true, expenseRatio: 0.05 },
  VTIP: { name: 'Vanguard Short-Term TIPS', assetClass: 'bond', region: 'us', isBond: true, expenseRatio: 0.04 },

  // Real estate
  VNQ: { name: 'Vanguard Real Estate', assetClass: 'reit', region: 'us', isBond: false, expenseRatio: 0.13 },
  SCHH: { name: 'Schwab US REIT', assetClass: 'reit', region: 'us', isBond: false, expenseRatio: 0.07 },
  VNQI: { name: 'Vanguard Global ex-US Real Estate', assetClass: 'reit', region: 'global', isBond: false, expenseRatio: 0.12 },

  // Commodities / gold
  GLD: { name: 'SPDR Gold Shares', assetClass: 'commodity', region: 'none', isBond: false, expenseRatio: 0.4 },
  IAU: { name: 'iShares Gold Trust', assetClass: 'commodity', region: 'none', isBond: false, expenseRatio: 0.25 },

  // Crypto (commonly held tickers)
  IBIT: { name: 'iShares Bitcoin Trust', assetClass: 'crypto', region: 'none', isBond: false, expenseRatio: 0.25 },
  GBTC: { name: 'Grayscale Bitcoin Trust', assetClass: 'crypto', region: 'none', isBond: false, expenseRatio: 1.5 },

  // Cash / money market proxies
  VMFXX: { name: 'Vanguard Federal Money Market', assetClass: 'cash', region: 'us', isBond: true, expenseRatio: 0.11 },
  SGOV: { name: 'iShares 0-3 Month Treasury', assetClass: 'cash', region: 'us', isBond: true, expenseRatio: 0.09 },
  BIL: { name: 'SPDR 1-3 Month T-Bill', assetClass: 'cash', region: 'us', isBond: true, expenseRatio: 0.1357 },

  // A few common single stocks (so concentration is flagged correctly)
  AAPL: { name: 'Apple', assetClass: 'single-stock', region: 'us', isBond: false, expenseRatio: 0 },
  MSFT: { name: 'Microsoft', assetClass: 'single-stock', region: 'us', isBond: false, expenseRatio: 0 },
  NVDA: { name: 'NVIDIA', assetClass: 'single-stock', region: 'us', isBond: false, expenseRatio: 0 },
  AMZN: { name: 'Amazon', assetClass: 'single-stock', region: 'us', isBond: false, expenseRatio: 0 },
  GOOGL: { name: 'Alphabet', assetClass: 'single-stock', region: 'us', isBond: false, expenseRatio: 0 },
  TSLA: { name: 'Tesla', assetClass: 'single-stock', region: 'us', isBond: false, expenseRatio: 0 },
  META: { name: 'Meta Platforms', assetClass: 'single-stock', region: 'us', isBond: false, expenseRatio: 0 },
}

export function getFund(ticker: string): FundInfo | undefined {
  return FUNDS[ticker.trim().toUpperCase()]
}

export function isKnownTicker(ticker: string): boolean {
  return Boolean(getFund(ticker))
}
