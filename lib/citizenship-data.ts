// Passport FIRE Index — how citizenship (not just where someone currently
// lives) shapes the path to financial independence. STATE_TAX in
// fire-data.ts is about residence; this is about the rules that follow a
// person regardless of where they live: worldwide vs. territorial taxation,
// what retirement accounts their passport gives them access to, and how
// freely they can actually invest.
//
// Read as directional, not authoritative. Tax and pension rules change
// yearly and vary by individual circumstance — this is general, simplified
// content meant to start a conversation about strengths and weaknesses, not
// to state precise thresholds or give personalized advice.
//
// Scored out of 100: tax burden (40 pts), retirement account access (30
// pts), investment freedom (30 pts). Reviewed and approved 2026-08-28.

export type CitizenshipScore = {
  code: string;
  flag: string;
  name: string;
  tax: number;
  retirement: number;
  investment: number;
  strengths: string[];
  weaknesses: string[];
};

export const CITIZENSHIP_SCORES: CitizenshipScore[] = [
  {
    code: "us", flag: "🇺🇸", name: "United States",
    tax: 12, retirement: 26, investment: 24,
    strengths: [
      "401(k), Traditional/Roth IRA, and HSA are genuinely excellent, flexible tax-advantaged wrappers",
      "Deepest, cheapest index fund and ETF market in the world — domestically",
      "Long-term capital gains get favorable rates (0/15/20%) versus ordinary income",
    ],
    weaknesses: [
      "One of two countries that taxes citizens on worldwide income no matter where they live",
      "PFIC rules punitively tax foreign mutual funds/ETFs — expats often can't use local funds",
      "Many non-US brokers refuse US citizens outright due to FATCA reporting burden",
    ],
  },
  {
    code: "uk", flag: "🇬🇧", name: "United Kingdom",
    tax: 27, retirement: 24, investment: 27,
    strengths: [
      "Residence-based taxation — moving abroad and becoming non-resident generally exits the UK tax net",
      "ISA wrapper: tax-free growth with no lock-up age, unusually flexible for FIRE",
      "SIPP + workplace pension auto-enrollment gives real tax relief on top",
    ],
    weaknesses: [
      "Pension access (not ISA) is still locked until a minimum age, currently rising",
      "Capital gains allowance has been shrinking in recent years",
      "Statutory residence test rules add real complexity when moving in or out",
    ],
  },
  {
    code: "ca", flag: "🇨🇦", name: "Canada",
    tax: 26, retirement: 27, investment: 27,
    strengths: [
      "TFSA: tax-free growth AND withdrawal, no age restriction — arguably the best FIRE wrapper on this list",
      "RRSP adds a second, larger tax-deferred bucket on top of TFSA",
      "Strong, cheap domestic ETF market with easy global access",
    ],
    weaknesses: [
      "Deemed disposition (\"exit tax\") on unrealized gains when ceasing Canadian residency",
      "Provincial tax stacks on top of federal, so effective rate varies a lot by province",
      "TFSA contribution room is modest relative to high incomes",
    ],
  },
  {
    code: "au", flag: "🇦🇺", name: "Australia",
    tax: 24, retirement: 16, investment: 23,
    strengths: [
      "Mandatory employer superannuation contributions are a strong forced-savings floor",
      "50% capital gains discount on assets held over 12 months",
      "Solid domestic ETF market, reasonably easy global access",
    ],
    weaknesses: [
      "Superannuation is locked until preservation age (~60) — a direct conflict with early retirement specifically",
      "Means most FIRE savings has to happen outside super, in normally-taxed accounts",
      "Franking credit and CGT rules add real complexity for DIY investors",
    ],
  },
  {
    code: "nz", flag: "🇳🇿", name: "New Zealand",
    tax: 33, retirement: 18, investment: 22,
    strengths: [
      "No capital gains tax on most personal investments — a rare, major structural advantage",
      "Relatively simple, low-complexity tax system overall",
      "KiwiSaver has more early-withdrawal provisions than Australia's super (first home, hardship)",
    ],
    weaknesses: [
      "KiwiSaver is still mostly locked until 65 for a standard early exit",
      "Small domestic market — most investors end up relying on international brokers",
      "No CGT can cut both ways: some property/asset classes get taxed as income instead",
    ],
  },
  {
    code: "sg", flag: "🇸🇬", name: "Singapore",
    tax: 36, retirement: 20, investment: 28,
    strengths: [
      "Territorial taxation — foreign-sourced income is generally untaxed",
      "No capital gains tax at all, very low income tax rates",
      "Major global financial hub — excellent, cheap access to nearly every market",
    ],
    weaknesses: [
      "CPF is mandatory and its withdrawal ages/purposes are fairly restrictive",
      "CPF's investment scheme (CPFIS) has a narrower fund selection than a normal brokerage",
      "High cost of living can offset the tax advantage for the FIRE number itself",
    ],
  },
  {
    code: "ae", flag: "🇦🇪", name: "UAE",
    tax: 40, retirement: 10, investment: 22,
    strengths: [
      "Zero personal income tax and zero capital gains tax",
      "100% of income and gains can compound with no tax drag at all",
      "Increasingly deep international brokerage access for residents",
    ],
    weaknesses: [
      "No real structured pension system for most residents — end-of-service gratuity isn't a retirement plan",
      "Zero tax also means no tax-advantaged wrapper to nudge or reward saving behavior",
      "Retail investment infrastructure is less mature than Singapore, US, or UK",
    ],
  },
  {
    code: "de", flag: "🇩🇪", name: "Germany",
    tax: 18, retirement: 17, investment: 24,
    strengths: [
      "Well-regulated EU access to UCITS ETFs, the standard efficient index-fund wrapper",
      "State pension (Gesetzliche Rentenversicherung) is stable and well-funded",
      "Straightforward flat withholding rate on capital gains (Abgeltungsteuer)",
    ],
    weaknesses: [
      "High overall income tax plus solidarity surcharge (and church tax, if applicable)",
      "Private pension options (Riester/Rürup) are notoriously inflexible and complex",
      "~26.4% flat tax on investment gains regardless of income level",
    ],
  },
  {
    code: "fr", flag: "🇫🇷", name: "France",
    tax: 14, retirement: 18, investment: 22,
    strengths: [
      "PEA wrapper gives real tax advantages for EU equities specifically",
      "Flat tax (PFU) of 30% on investment income is at least simple to reason about",
      "Good EU-regulated brokerage access",
    ],
    weaknesses: [
      "Among the highest combined tax-and-social-charge burdens in the developed world",
      "Pension system is heavily pay-as-you-go; private options (PER) are still maturing",
      "Wealth tax applies to real estate holdings above a threshold",
    ],
  },
  {
    code: "nl", flag: "🇳🇱", name: "Netherlands",
    tax: 22, retirement: 26, investment: 25,
    strengths: [
      "One of the world's best-funded, most robust occupational pension systems",
      "No traditional capital-gains tax on realized investment gains",
      "Good EU-regulated fund access",
    ],
    weaknesses: [
      "\"Box 3\" taxes a deemed/assumed return on net assets rather than actual gains — unusual and has faced legal challenges",
      "Can tax more than actual investment return in a flat or down year",
      "Rules have been in flux while courts and government revise the system",
    ],
  },
  {
    code: "jp", flag: "🇯🇵", name: "Japan",
    tax: 28, retirement: 20, investment: 26,
    strengths: [
      "NISA: a genuinely strong, recently expanded tax-free investing wrapper",
      "iDeCo adds a second tax-advantaged retirement bucket alongside NISA",
      "Moderate, straightforward ~20% flat tax on capital gains and dividends",
    ],
    weaknesses: [
      "National Pension + Employees' Pension Insurance contributions are mandatory and add up",
      "NISA and iDeCo both have contribution limits that cap how much of a FIRE plan they can cover",
      "Domestic brokerage UX and English-language support can be a real barrier for some",
    ],
  },
  {
    code: "mx", flag: "🇲🇽", name: "Mexico",
    tax: 25, retirement: 17, investment: 16,
    strengths: [
      "Gains on securities traded on the Mexican exchange (BMV) often get favorable individual tax treatment",
      "AFORE gives every worker an individual, portable retirement account by default",
      "Moderate overall income tax burden relative to many peers",
    ],
    weaknesses: [
      "Efficient global index investing is harder and costlier to access than from the US, UK, or Singapore",
      "Often requires a cross-border brokerage relationship, adding friction and complexity",
      "AFORE fees and long-run returns have been a persistent point of public debate",
    ],
  },
  {
    code: "ch", flag: "🇨🇭", name: "Switzerland",
    tax: 30, retirement: 25, investment: 26,
    strengths: [
      "No federal capital gains tax on private individual investment gains",
      "Three-pillar pension system (state + mandatory occupational + private) is well-structured and portable",
      "World-class private banking and brokerage access",
    ],
    weaknesses: [
      "Cantonal wealth tax applies on top of income tax, varying a lot by canton",
      "Overall cost of living inflates the FIRE number itself",
      "Occupational pension (Pillar 2) has real but limited early-access flexibility",
    ],
  },
  {
    code: "ie", flag: "🇮🇪", name: "Ireland",
    tax: 16, retirement: 18, investment: 15,
    strengths: [
      "EU-regulated brokerage access and euro-denominated investing",
      "Pension contributions get real tax relief",
      "English-language financial infrastructure is deep and easy to navigate",
    ],
    weaknesses: [
      "The \"deemed disposal\" rule taxes most ETFs on an 8-year mark-to-market basis, not on actual sale — a well-known FIRE-community pain point",
      "33% flat capital gains tax is high relative to many peers",
      "Pushes many DIY investors toward direct shares instead of low-cost index funds to avoid deemed disposal",
    ],
  },
  {
    code: "es", flag: "🇪🇸", name: "Spain",
    tax: 20, retirement: 17, investment: 23,
    strengths: [
      "Progressive savings-income tax bands keep smaller gains relatively lightly taxed",
      "Solid state pension system by regional standards",
      "Good EU-regulated brokerage access",
    ],
    weaknesses: [
      "Wealth tax applies in several regions on top of income and capital gains tax",
      "Private pension tax relief has been significantly cut back in recent reforms",
      "Capital gains/dividend bands top out around 28%",
    ],
  },
  {
    code: "it", flag: "🇮🇹", name: "Italy",
    tax: 18, retirement: 17, investment: 21,
    strengths: [
      "26% flat rate on most capital gains and investment income is at least simple to plan around",
      "State pension is deeply embedded and well understood",
      "Private pension funds (fondi pensione) offer real tax incentives",
    ],
    weaknesses: [
      "High overall income tax and social contributions on wages",
      "IVAFE adds a wealth-tax-like levy specifically on foreign-held financial assets",
      "Bureaucratic complexity is a common complaint from DIY investors",
    ],
  },
  {
    code: "pt", flag: "🇵🇹", name: "Portugal",
    tax: 22, retirement: 15, investment: 22,
    strengths: [
      "28% flat capital gains rate is moderate and predictable",
      "Good EU-regulated brokerage access",
      "Historically attractive to new residents via preferential tax regimes (rules have tightened, worth checking current status)",
    ],
    weaknesses: [
      "State pension system (Segurança Social) is the dominant pillar, with private options less central",
      "Preferential new-resident tax treatment has been narrowed in recent years",
      "Smaller domestic market means heavier reliance on international brokers",
    ],
  },
  {
    code: "se", flag: "🇸🇪", name: "Sweden",
    tax: 17, retirement: 24, investment: 26,
    strengths: [
      "The ISK account taxes a small deemed return instead of realized gains — simple, cheap, and genuinely FIRE-friendly",
      "Well-funded public pension system with an individual investment-choice component",
      "Easy EU and global brokerage access",
    ],
    weaknesses: [
      "High overall income tax burden outside the ISK wrapper",
      "Progressive municipal + national tax stacking can bite high earners",
      "Nordic cost of living pushes the FIRE number itself higher",
    ],
  },
  {
    code: "no", flag: "🇳🇴", name: "Norway",
    tax: 16, retirement: 23, investment: 24,
    strengths: [
      "The ASK account defers tax on gains within EU/EEA equities and funds until withdrawal",
      "State pension is backed in part by the sovereign wealth fund — unusually well-funded",
      "Strong occupational pension coverage",
    ],
    weaknesses: [
      "High overall tax burden, including a wealth tax on net assets above a threshold",
      "ASK's tax deferral benefit is narrower than Sweden's ISK (EU/EEA-listed only)",
      "High cost of living inflates the FIRE number itself",
    ],
  },
  {
    code: "dk", flag: "🇩🇰", name: "Denmark",
    tax: 10, retirement: 24, investment: 23,
    strengths: [
      "ATP plus strong occupational pension coverage makes for one of the best-funded retirement systems anywhere",
      "Transparent, well-regulated financial system",
      "Good EU and global brokerage access",
    ],
    weaknesses: [
      "Among the highest overall tax burdens in the world, including on investment income",
      "Progressive rates on capital income specifically, not just wages",
      "High cost of living inflates the FIRE number itself",
    ],
  },
  {
    code: "be", flag: "🇧🇪", name: "Belgium",
    tax: 26, retirement: 17, investment: 22,
    strengths: [
      "No general capital gains tax on private individual securities transactions",
      "Good EU-regulated brokerage access",
      "Second/third-pillar private pensions come with real tax incentives",
    ],
    weaknesses: [
      "A stock-exchange transaction tax (TOB) applies to trades, adding friction",
      "Dividend withholding tax runs around 30%",
      "State pension alone is modest; private pillars matter more here than in some peers",
    ],
  },
  {
    code: "at", flag: "🇦🇹", name: "Austria",
    tax: 19, retirement: 16, investment: 23,
    strengths: [
      "27.5% flat rate on capital gains and investment income is simple to plan around",
      "Good EU-regulated brokerage access",
      "Stable, low-drama financial and regulatory environment",
    ],
    weaknesses: [
      "State pension (ASVG) is the dominant pillar; private pensions are less developed",
      "Moderate-to-high income tax on wages",
      "Fewer tax-advantaged investing wrappers than peers like Sweden or Canada",
    ],
  },
  {
    code: "pl", flag: "🇵🇱", name: "Poland",
    tax: 25, retirement: 20, investment: 21,
    strengths: [
      "19% flat \"Belka tax\" on capital gains is simple and moderate",
      "IKE and IKZE offer real tax-advantaged retirement investing accounts",
      "Growing, increasingly sophisticated domestic brokerage market",
    ],
    weaknesses: [
      "Mandatory ZUS contributions are a significant chunk of gross pay",
      "IKE/IKZE contribution limits are relatively modest",
      "Smaller domestic market than Western Europe means more reliance on international brokers for full diversification",
    ],
  },
  {
    code: "cz", flag: "🇨🇿", name: "Czech Republic",
    tax: 30, retirement: 17, investment: 21,
    strengths: [
      "Capital gains on securities held over 3 years are tax-exempt for individuals — genuinely FIRE-friendly",
      "15% flat income tax on most earners keeps things simple",
      "EU-regulated brokerage access",
    ],
    weaknesses: [
      "State pension is modest; private supplements matter more here than in some Western European peers",
      "Smaller domestic market than Western Europe",
      "The 3-year holding exemption rewards buy-and-hold but penalizes active rebalancing",
    ],
  },
  {
    code: "gr", flag: "🇬🇷", name: "Greece",
    tax: 22, retirement: 13, investment: 20,
    strengths: [
      "15% flat capital gains tax on listed securities is relatively low",
      "EU-regulated brokerage access",
      "Lower cost of living than most of Western Europe softens the FIRE number",
    ],
    weaknesses: [
      "State pension system has undergone major austerity-era reform, with adequacy widely debated",
      "Progressive income tax on wages is moderate-to-high",
      "Smaller, less liquid domestic market",
    ],
  },
  {
    code: "fi", flag: "🇫🇮", name: "Finland",
    tax: 15, retirement: 23, investment: 23,
    strengths: [
      "Well-regarded, earnings-related pension system (TyEL) with strong funding",
      "Transparent, well-regulated financial system",
      "Good EU and global brokerage access",
    ],
    weaknesses: [
      "Progressive capital income tax runs 30-34%, high relative to many peers",
      "High overall tax burden generally",
      "Fewer FIRE-specific tax wrappers than Sweden's ISK or the UK's ISA",
    ],
  },
  {
    code: "kr", flag: "🇰🇷", name: "South Korea",
    tax: 27, retirement: 19, investment: 23,
    strengths: [
      "Capital gains on listed shares are generally exempt for individual holders below large-holder ownership thresholds",
      "ISA-style tax-advantaged accounts exist for individual investing",
      "Sophisticated, liquid domestic market with decent global access",
    ],
    weaknesses: [
      "National Pension Service contributions are mandatory and meaningful",
      "Large-holder rules add real complexity once holdings cross certain thresholds",
      "Private pension (IRP) system is still maturing relative to peers like Canada or the UK",
    ],
  },
  {
    code: "tw", flag: "🇹🇼", name: "Taiwan",
    tax: 32, retirement: 15, investment: 21,
    strengths: [
      "No general capital gains tax on individual securities transactions",
      "Only a small securities transaction tax applies instead of a gains tax",
      "Strong, liquid domestic market",
    ],
    weaknesses: [
      "Mandatory labor pension system is relatively modest by international standards",
      "Smaller international brokerage footprint than Singapore or Hong Kong",
      "Regional geopolitical uncertainty is a real consideration for long-term planning",
    ],
  },
  {
    code: "cn", flag: "🇨🇳", name: "China",
    tax: 26, retirement: 12, investment: 10,
    strengths: [
      "Capital gains on A-shares are generally exempt for individual investors",
      "Large, liquid domestic equity and bond markets",
      "Growing menu of domestic tax-advantaged retirement products",
    ],
    weaknesses: [
      "Capital controls significantly restrict moving money and investing internationally — a major constraint on global diversification",
      "Pension portability and adequacy vary a lot by province and employment type",
      "Regulatory environment for private investment products has shifted meaningfully in recent years",
    ],
  },
  {
    code: "in_ind", flag: "🇮🇳", name: "India",
    tax: 21, retirement: 18, investment: 14,
    strengths: [
      "Long-term capital gains on listed equities get relatively favorable treatment up to an exemption threshold",
      "EPF is a mandatory, meaningful forced-savings mechanism for salaried employees",
      "NPS adds a voluntary tax-advantaged retirement account on top",
    ],
    weaknesses: [
      "The Liberalised Remittance Scheme caps how much can be moved abroad annually for international investing",
      "Global index-fund access is meaningfully harder than from the US, UK, or Singapore",
      "Short-term capital gains and STT add friction for active rebalancing",
    ],
  },
  {
    code: "th", flag: "🇹🇭", name: "Thailand",
    tax: 30, retirement: 13, investment: 17,
    strengths: [
      "Domestic capital gains on listed shares are generally exempt for individual investors",
      "Historically favorable treatment of unremitted foreign-sourced income (rules have been tightening — verify current status)",
      "Lower cost of living softens the FIRE number for many",
    ],
    weaknesses: [
      "Social Security Fund contributions are mandatory but adequacy is modest",
      "Provident funds depend on employer participation rather than being universal",
      "Foreign-income remittance rules have been in flux and add real complexity for expats",
    ],
  },
  {
    code: "my", flag: "🇲🇾", name: "Malaysia",
    tax: 31, retirement: 22, investment: 19,
    strengths: [
      "No general capital gains tax on shares (separate real property gains tax only)",
      "EPF is mandatory, well-established, and relatively generous by regional standards",
      "Historically territorial treatment of foreign-sourced income",
    ],
    weaknesses: [
      "Domestic market is smaller and less liquid than Singapore or Hong Kong",
      "International brokerage access is workable but costlier than regional hubs",
      "Foreign-income tax rules have shifted in recent years and need current verification",
    ],
  },
  {
    code: "id_idn", flag: "🇮🇩", name: "Indonesia",
    tax: 27, retirement: 12, investment: 13,
    strengths: [
      "Capital gains on listed shares are handled via a small final transaction tax rather than a gains-based tax",
      "Large, growing domestic equity market",
      "Lower cost of living softens the FIRE number for many",
    ],
    weaknesses: [
      "BPJS Ketenagakerjaan (mandatory social security) coverage and adequacy are still developing",
      "International brokerage access is more limited and costlier than regional hubs",
      "Currency volatility is a real factor for long-term planning",
    ],
  },
  {
    code: "ph", flag: "🇵🇭", name: "Philippines",
    tax: 26, retirement: 12, investment: 14,
    strengths: [
      "Listed-share sales are taxed via a stock transaction tax rather than a capital gains tax",
      "Growing domestic brokerage and mutual fund market",
      "Lower cost of living softens the FIRE number for many",
    ],
    weaknesses: [
      "SSS (mandatory social security) adequacy is modest by international standards",
      "Global index-fund access is meaningfully harder than from the US, UK, or Singapore",
      "Smaller, less liquid domestic market",
    ],
  },
  {
    code: "vn", flag: "🇻🇳", name: "Vietnam",
    tax: 28, retirement: 11, investment: 11,
    strengths: [
      "Small flat transaction tax on securities sales rather than a gains-based tax",
      "Fast-growing domestic equity market",
      "Lower cost of living softens the FIRE number for many",
    ],
    weaknesses: [
      "Capital controls and a less mature retail brokerage sector limit easy global diversification",
      "Social insurance system is still maturing in coverage and adequacy",
      "International money transfer rules add real friction for cross-border investing",
    ],
  },
  {
    code: "hk", flag: "🇭🇰", name: "Hong Kong",
    tax: 38, retirement: 16, investment: 27,
    strengths: [
      "No capital gains tax, no dividend tax, low and simple territorial income tax",
      "World-class financial hub with excellent, cheap global brokerage access",
      "Highly liquid domestic and regional markets",
    ],
    weaknesses: [
      "Mandatory Provident Fund (MPF) has faced real criticism over high fees and limited fund choice",
      "High cost of living inflates the FIRE number itself",
      "Regulatory and political landscape has shifted meaningfully in recent years — worth watching",
    ],
  },
  {
    code: "br", flag: "🇧🇷", name: "Brazil",
    tax: 19, retirement: 14, investment: 15,
    strengths: [
      "A small monthly stock-sale exemption threshold keeps modest trading tax-free",
      "PGBL/VGBL private pension products offer real tax advantages",
      "Large, reasonably liquid domestic equity market",
    ],
    weaknesses: [
      "INSS (mandatory public pension) long-term solvency and adequacy are widely debated",
      "International investing has historically been more restricted and costly, though rules have been easing",
      "High and complex overall tax burden on wages",
    ],
  },
  {
    code: "ar_lat", flag: "🇦🇷", name: "Argentina",
    tax: 15, retirement: 10, investment: 8,
    strengths: [
      "Sophisticated, financially literate population with strong grassroots investing culture",
      "Growing use of dollar-denominated and offshore assets as an inflation hedge",
      "Active domestic equity market despite macro headwinds",
    ],
    weaknesses: [
      "Chronic high inflation erodes real returns regardless of nominal tax treatment",
      "Recurring capital controls have periodically restricted currency conversion and moving money abroad",
      "Public pension system has faced repeated solvency and adequacy crises",
    ],
  },
  {
    code: "cl", flag: "🇨🇱", name: "Chile",
    tax: 28, retirement: 18, investment: 19,
    strengths: [
      "Capital gains on shares with market presence are generally exempt for individuals",
      "AFP system gives every worker a mandatory, portable individual retirement account",
      "Relatively open capital account and decent regional brokerage access",
    ],
    weaknesses: [
      "AFP returns and fees have been politically contentious for years, with reform proposals recurring",
      "Domestic market is smaller than Brazil's or Mexico's",
      "Currency risk is a real factor for peso-denominated savings",
    ],
  },
  {
    code: "co_col", flag: "🇨🇴", name: "Colombia",
    tax: 24, retirement: 16, investment: 14,
    strengths: [
      "Capital gains taxed at a flat rate distinct from (and generally lower than) ordinary income tax",
      "Dual public/private pension system lets workers choose the model that fits them",
      "Growing domestic brokerage market",
    ],
    weaknesses: [
      "International investing access is more limited and costlier than from larger regional hubs",
      "Currency volatility affects real purchasing power of peso-denominated savings",
      "Smaller, less liquid domestic equity market",
    ],
  },
  {
    code: "pe", flag: "🇵🇪", name: "Peru",
    tax: 23, retirement: 16, investment: 13,
    strengths: [
      "Capital gains on securities taxed at a moderate, predictable flat rate",
      "Dual public (ONP) / private (AFP) pension system offers real choice",
      "Relatively stable currency by regional standards",
    ],
    weaknesses: [
      "Global index-fund access is meaningfully harder than from larger regional hubs",
      "Smaller, less liquid domestic equity market",
      "AFP fees and coverage gaps have drawn public criticism, similar to Chile's system",
    ],
  },
  {
    code: "cr", flag: "🇨🇷", name: "Costa Rica",
    tax: 29, retirement: 14, investment: 15,
    strengths: [
      "Territorial taxation — foreign-sourced income is generally not taxed",
      "Occasional individual investors often owe little or no capital gains tax",
      "Politically stable with a strong rule-of-law reputation regionally",
    ],
    weaknesses: [
      "CCSS mandatory pension system is modest by international standards",
      "Smaller domestic market means heavy reliance on international brokerage access",
      "Higher cost of living than much of Latin America partly offsets the tax advantages",
    ],
  },
  {
    code: "pa_pan", flag: "🇵🇦", name: "Panama",
    tax: 34, retirement: 13, investment: 18,
    strengths: [
      "Territorial taxation — foreign-sourced income is not taxed",
      "No capital gains tax on most individual securities transactions",
      "Dollarized economy removes local-currency risk for USD-denominated savers",
    ],
    weaknesses: [
      "CSS mandatory pension system is modest",
      "Retail brokerage infrastructure is less deep than Singapore or Switzerland, though it's a real regional hub",
      "Long-term visa/residency rules matter a lot for who actually gets these tax benefits — worth verifying specifics",
    ],
  },
  {
    code: "il_isr", flag: "🇮🇱", name: "Israel",
    tax: 20, retirement: 22, investment: 22,
    strengths: [
      "New immigrants get a notable multi-year exemption on foreign-sourced income and assets (verify current terms)",
      "Mandatory employer + employee pension contributions are well-structured with real tax advantages",
      "Sophisticated domestic market with good international brokerage access",
    ],
    weaknesses: [
      "Capital gains generally taxed around 25%, moderate-to-high by global standards",
      "Overall income tax burden is moderate-to-high outside the new-immigrant exemption window",
      "High cost of living inflates the FIRE number itself",
    ],
  },
  {
    code: "sa", flag: "🇸🇦", name: "Saudi Arabia",
    tax: 39, retirement: 12, investment: 17,
    strengths: [
      "No personal income tax or capital gains tax for individuals",
      "100% of income and gains can compound with no tax drag",
      "Increasingly open, growing retail investment market",
    ],
    weaknesses: [
      "GOSI (mandatory pension) applies to citizens; most expatriate residents have no local retirement scheme at all",
      "Retail brokerage infrastructure is still developing relative to global hubs",
      "Zakat obligations apply in some individual circumstances — worth checking",
    ],
  },
  {
    code: "qa", flag: "🇶🇦", name: "Qatar",
    tax: 39, retirement: 10, investment: 16,
    strengths: [
      "No personal income tax or capital gains tax",
      "100% of income and gains can compound with no tax drag",
      "High average incomes make aggressive saving rates realistic for many residents",
    ],
    weaknesses: [
      "Pension system applies to Qatari nationals only — most expatriate residents have no local retirement scheme",
      "Smaller domestic market, relies heavily on international brokerage access",
      "No tax-advantaged wrapper exists to structure or incentivize saving behavior",
    ],
  },
  {
    code: "za", flag: "🇿🇦", name: "South Africa",
    tax: 22, retirement: 20, investment: 16,
    strengths: [
      "Capital gains are taxed via inclusion in taxable income at a meaningfully reduced effective rate",
      "Strong private-pension culture — Retirement Annuities and pension/provident funds carry real tax deductions",
      "Sophisticated domestic financial sector",
    ],
    weaknesses: [
      "Exchange controls have historically limited how much can be moved offshore annually, though allowances have expanded",
      "Currency volatility affects real purchasing power of rand-denominated savings",
      "High and rising cost pressures in some categories (electricity, security) can inflate the real FIRE number",
    ],
  },
  {
    code: "ke", flag: "🇰🇪", name: "Kenya",
    tax: 26, retirement: 13, investment: 11,
    strengths: [
      "Capital gains tax on listed securities is generally low to moderate",
      "Vibrant, fast-growing fintech and mobile-money ecosystem lowers the cost of participating in markets",
      "Lower cost of living softens the FIRE number for many",
    ],
    weaknesses: [
      "NSSF mandatory contribution and adequacy are still developing",
      "International brokerage access is more limited and costlier than from larger financial hubs",
      "Domestic market (Nairobi Securities Exchange) is comparatively small and less liquid",
    ],
  },
  {
    code: "ng", flag: "🇳🇬", name: "Nigeria",
    tax: 22, retirement: 17, investment: 10,
    strengths: [
      "Contributory Pension Scheme gives every formal-sector worker an individual, portable retirement account",
      "Relatively well-structured private Pension Fund Administrator system for the region",
      "Large, young population with a growing domestic investing culture",
    ],
    weaknesses: [
      "Currency volatility and periodic capital controls have complicated moving money abroad for international investing",
      "Naira depreciation has been a major real-world drag on long-term savings held locally",
      "Global index-fund access requires real effort and often a foreign brokerage relationship",
    ],
  },
  {
    code: "eg", flag: "🇪🇬", name: "Egypt",
    tax: 21, retirement: 12, investment: 10,
    strengths: [
      "Lower cost of living softens the FIRE number for many",
      "Capital gains treatment on listed securities has periods of full or partial exemption (status has shifted — verify current rules)",
      "Growing domestic equity market",
    ],
    weaknesses: [
      "State pension system's long-term adequacy and solvency are widely debated",
      "Currency controls and periodic sharp devaluations have been a real, recurring friction for holding and growing wealth",
      "International investing access is limited and costlier than from larger financial hubs",
    ],
  },
  {
    code: "tr", flag: "🇹🇷", name: "Turkey",
    tax: 14, retirement: 17, investment: 14,
    strengths: [
      "Auto-enrollment private pension system (BES) comes with real government matching contributions",
      "Mandatory pension contributions exist alongside the voluntary BES system",
      "Growing domestic equity market with decent liquidity",
    ],
    weaknesses: [
      "High, persistent inflation substantially erodes real investment returns regardless of nominal tax treatment",
      "Lira depreciation has been a major real-world factor for anyone holding lira-denominated assets",
      "Capital gains taxation varies by holding period and asset type, adding real planning complexity",
    ],
  },
];

export type CitizenshipBand = { cls: "strong" | "workable" | "friction"; label: string };

export function citizenshipScore(c: CitizenshipScore): number {
  return c.tax + c.retirement + c.investment;
}

export function citizenshipBand(score: number): CitizenshipBand {
  if (score >= 80) return { cls: "strong", label: "Strong footing" };
  if (score >= 60) return { cls: "workable", label: "Workable, with tradeoffs" };
  return { cls: "friction", label: "Real friction" };
}

// Approximate effective personal income-tax rate per citizenship, keyed to
// match STATE_TAX in fire-data.ts one-for-one (same "directional, not
// authoritative" caveat as the rest of this file). Not imported directly
// because STATE_TAX is about residence, not citizenship — the two happen to
// share the same country-level figure for every entry here except the US
// and Canada, which fire-data.ts only tracks per state/province.
export const CITIZENSHIP_TAX_RATE_LABEL: Record<string, string> = {
  us: "Varies by state (0–13.3%) + progressive federal (10–37%)",
  uk: "~20% effective",
  ca: "Varies by province (~10–15%) + progressive federal",
  au: "~22% effective",
  nz: "~20% effective",
  sg: "~10% effective",
  ae: "No personal income tax",
  de: "~22% effective",
  fr: "~24% effective",
  nl: "~25% effective",
  jp: "~18% effective",
  mx: "~7% effective",
  ch: "~20% effective",
  ie: "~20% effective",
  es: "~18% effective",
  it: "~25% effective",
  pt: "~15% effective",
  se: "~30% effective",
  no: "~28% effective",
  dk: "~35% effective",
  be: "~32% effective",
  at: "~22% effective",
  pl: "12% lower bracket",
  cz: "15% flat",
  gr: "~22% effective",
  fi: "~30% effective",
  kr: "~15% effective",
  tw: "~12% effective",
  cn: "~6% effective",
  in_ind: "~15% effective",
  th: "~5% effective",
  my: "~8% effective",
  id_idn: "~5% effective",
  ph: "~15% effective",
  vn: "~10% effective",
  hk: "~12% effective",
  br: "~18% effective",
  ar_lat: "~10% effective",
  cl: "~10% effective",
  co_col: "~8% effective",
  pe: "~15% effective",
  cr: "~15% effective",
  pa_pan: "~10% effective",
  il_isr: "~20% effective",
  sa: "No personal income tax",
  qa: "No personal income tax",
  za: "~18% effective",
  ke: "~20% effective",
  ng: "~15% effective",
  eg: "~15% effective",
  tr: "~20% effective",
};

// Capital gains tax, shown separately from income tax above — it matters
// more for a FIRE investor since FIRE spending comes from investment gains,
// not wages, and the two numbers often diverge a lot within the same
// country (Belgium: high income tax, no CGT at all; Ireland: moderate
// income tax, 33% flat CGT plus an 8-year ETF "deemed disposal" rule).
export const CITIZENSHIP_CGT_LABEL: Record<string, string> = {
  us: "0/15/20% by income bracket (long-term)",
  uk: "10–20% (24% on residential property)",
  ca: "50% of gain taxed at marginal rate",
  au: "Marginal rate, 50% discount if held over 12 months",
  nz: "No capital gains tax on most personal investments",
  sg: "No capital gains tax",
  ae: "No capital gains tax",
  de: "26.4% flat (Abgeltungsteuer)",
  fr: "30% flat (PFU)",
  nl: "No tax on realized gains — deemed return on net assets instead (Box 3)",
  jp: "~20% flat",
  mx: "Favorable for exchange-traded gains, ~10% otherwise",
  ch: "No federal tax on private capital gains",
  ie: "33% flat, plus an 8-year ETF \"deemed disposal\" rule",
  es: "19–28% progressive bands",
  it: "26% flat",
  pt: "28% flat",
  se: "30%, or a small deemed return inside an ISK account",
  no: "~37.8%, or deferred inside an ASK account",
  dk: "27–42% progressive",
  be: "No general tax on private securities gains",
  at: "27.5% flat",
  pl: "19% flat (\"Belka tax\")",
  cz: "Exempt after a 3-year holding period",
  gr: "15% flat on listed securities",
  fi: "30–34% progressive",
  kr: "Exempt for individual holders below large-holder thresholds",
  tw: "No general capital gains tax on securities",
  cn: "Generally exempt for individuals on A-shares",
  in_ind: "12.5% above an exemption threshold (long-term, listed equity)",
  th: "Generally exempt for individual investors on listed shares",
  my: "No general capital gains tax on shares",
  id_idn: "Final transaction tax on sale value, not a gains tax",
  ph: "Stock transaction tax on sale value, not a gains tax",
  vn: "Small flat transaction tax on sale value",
  hk: "No capital gains tax",
  br: "15–22.5%, with a small monthly sale exemption",
  ar_lat: "Varies; high inflation distorts real gains",
  cl: "Generally exempt for shares with market presence",
  co_col: "15% flat, separate from income tax",
  pe: "5% flat on listed securities",
  cr: "Generally exempt for occasional individual investors",
  pa_pan: "No capital gains tax on most securities transactions",
  il_isr: "~25% flat",
  sa: "No capital gains tax",
  qa: "No capital gains tax",
  za: "Effective ~18% max, via inclusion rate",
  ke: "5% flat on listed securities",
  ng: "10% flat, above an exemption threshold",
  eg: "Status has shifted between taxed/exempt — verify current rules",
  tr: "Varies by holding period and asset type",
};

// The named retirement or tax-advantaged investing account a citizenship
// actually gives access to. This is the concrete thing behind the
// "retirement access" score, not just the point total.
export const CITIZENSHIP_ACCOUNT_LABEL: Record<string, string> = {
  us: "401(k) / Traditional & Roth IRA / HSA",
  uk: "ISA + SIPP / workplace pension",
  ca: "TFSA + RRSP",
  au: "Superannuation",
  nz: "KiwiSaver",
  sg: "CPF (+ CPFIS for investing)",
  ae: "None — no structured local retirement account",
  de: "Riester/Rürup private pension + state pension",
  fr: "PER + PEA (equities wrapper)",
  nl: "Occupational pension (2nd pillar)",
  jp: "NISA + iDeCo",
  mx: "AFORE",
  ch: "Three-pillar system (AHV + occupational + Pillar 3a)",
  ie: "PRSA / occupational pension",
  es: "Private pension plans (reduced tax relief)",
  it: "Fondi pensione (private pension funds)",
  pt: "Segurança Social + private options",
  se: "ISK (investment account) + public pension",
  no: "ASK (investment account) + public pension",
  dk: "ATP + occupational pension",
  be: "2nd/3rd pillar private pension",
  at: "ASVG state pension",
  pl: "IKE / IKZE",
  cz: "State pension + private supplement",
  gr: "State pension",
  fi: "TyEL earnings-related pension",
  kr: "National Pension + IRP",
  tw: "Labor pension",
  cn: "State pension (province-dependent)",
  in_ind: "EPF + NPS",
  th: "Social Security Fund + provident funds",
  my: "EPF",
  id_idn: "BPJS Ketenagakerjaan",
  ph: "SSS",
  vn: "Social insurance",
  hk: "MPF (Mandatory Provident Fund)",
  br: "INSS + PGBL/VGBL",
  ar_lat: "Jubilación (state pension)",
  cl: "AFP (individual account)",
  co_col: "Colpensiones or AFP (worker's choice)",
  pe: "ONP or AFP (worker's choice)",
  cr: "CCSS",
  pa_pan: "CSS",
  il_isr: "Mandatory employer + employee pension",
  sa: "GOSI (citizens only)",
  qa: "Nationals only — no scheme for most residents",
  za: "Retirement Annuities + pension/provident funds",
  ke: "NSSF",
  ng: "Contributory Pension Scheme (RSA via a PFA)",
  eg: "State pension",
  tr: "Mandatory pension + BES (voluntary, auto-enrolled)",
};
