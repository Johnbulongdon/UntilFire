import type { OfferKind } from "./partner-offers";
/** Public provider terms, checked 13 November 2026. Referral activation is separate. */
export type DirectoryAccount = {
    slug: string;
    name: string;
    product: string;
    kind: OfferKind;
    country: string;
    logo: string;
    source: string;
    description: string;
    reward: string | null;
    rewardKind: "cash" | "stock" | null;
    cashValue: number;
    requirements: string;
    eligibility: string;
    checkedOn: string;
    reviewOn: string;
    endsOn: string | null;
};
export const DIRECTORY_ACCOUNTS: DirectoryAccount[] = [
    { slug: "sofi", name: "SoFi", product: "Checking & Savings", kind: "bank", country: "US", logo: "sofi", source: "https://www.sofi.com/banking/", description: "Everyday banking and savings together.", reward: "Up to $400", rewardKind: "cash", cashValue: 400, requirements: "Receive $5,000+ in qualifying direct deposits within 25 days of your first qualifying deposit for $400. Lower tiers pay less or nothing.", eligibility: "New or existing customers who have never received a qualifying SoFi direct deposit. Bank transfers and person-to-person payments do not qualify. First qualifying deposit by December 31, 2027.", checkedOn: "2026-11-13", reviewOn: "2026-12-13", endsOn: "2027-12-31" },
    { slug: "capital-one", name: "Capital One", product: "360 Checking", kind: "bank", country: "US", logo: "capital-one", source: "https://www.capitalone.com/bank/choose-your-offer/", description: "A checking account for everyday spending.", reward: "$250", rewardKind: "cash", cashValue: 250, requirements: "Open with code CHECKING250, then receive two qualifying direct deposits of $500+ each within 75 days.", eligibility: "Prior ownership of 360 Checking, Simply Checking or Total Control Checking on or after January 1, 2024 makes you ineligible. One promotional code per account; offers cannot be combined. Terms may change.", checkedOn: "2026-11-13", reviewOn: "2026-12-13", endsOn: null },
    { slug: "interactive-brokers", name: "Interactive Brokers", product: "Individual brokerage", kind: "brokerage", country: "US", logo: "interactive-brokers", source: "https://www.interactivebrokers.com/en/accounts/referrer.php", description: "Self-directed investing across global markets.", reward: "Up to $1,000 in stock", rewardKind: "stock", cashValue: 0, requirements: "An eligible referral can earn $1 in IBKR shares for each $100 in qualifying net deposits, up to the programme limit. Holding and vesting rules apply.", eligibility: "A qualifying referral link is required. Country, account and programme restrictions apply. Stock value can fall; this is not a cash bonus. Check the programme terms before applying.", checkedOn: "2026-11-13", reviewOn: "2026-12-13", endsOn: null },
    { slug: "fidelity", name: "Fidelity", product: "Cash Management Account", kind: "bank", country: "US", logo: "fidelity", source: "https://www.fidelity.com/spend-save/fidelity-cash-management-account/overview", description: "Cash management alongside your investing.", reward: null, rewardKind: null, cashValue: 0, requirements: "Review account features, fees and cash-sweep terms on Fidelity’s website.", eligibility: "No promotional bonus verified for this listing.", checkedOn: "2026-11-13", reviewOn: "2026-12-13", endsOn: null },
    { slug: "schwab", name: "Charles Schwab", product: "Investor Checking", kind: "bank", country: "US", logo: "schwab", source: "https://www.schwab.com/checking", description: "Checking linked to a Schwab brokerage account.", reward: null, rewardKind: null, cashValue: 0, requirements: "Review linked-account requirements and current terms.", eligibility: "No promotional bonus verified for this listing.", checkedOn: "2026-11-13", reviewOn: "2026-12-13", endsOn: null },
    { slug: "ally", name: "Ally", product: "Savings Account", kind: "savings", country: "US", logo: "ally", source: "https://www.ally.com/bank/online-savings-account/", description: "Online savings with tools to organize your cash.", reward: null, rewardKind: null, cashValue: 0, requirements: "Check the current variable rate, fees and account requirements.", eligibility: "No promotional bonus verified for this listing.", checkedOn: "2026-11-13", reviewOn: "2026-12-13", endsOn: null },
    { slug: "vanguard", name: "Vanguard", product: "Brokerage account", kind: "brokerage", country: "US", logo: "vanguard", source: "https://investor.vanguard.com/accounts-plans/brokerage-accounts", description: "Self-directed funds, ETFs and other investments.", reward: null, rewardKind: null, cashValue: 0, requirements: "Review investment choices, fees and account eligibility.", eligibility: "No promotional bonus verified for this listing. Investments can lose value.", checkedOn: "2026-11-13", reviewOn: "2026-12-13", endsOn: null },
    { slug: "chase", name: "Chase", product: "Checking & savings", kind: "bank", country: "US", logo: "chase", source: "https://www.chase.com/personal/offers/checking-and-savings", description: "Bank accounts with branch and online access.", reward: null, rewardKind: null, cashValue: 0, requirements: "See Chase’s current account offers and requirements.", eligibility: "No bonus amount verified for this listing.", checkedOn: "2026-11-13", reviewOn: "2026-12-13", endsOn: null },
];
export function directoryAccounts(now = new Date()): DirectoryAccount[] {
    const today = now.toISOString().slice(0, 10);
    return DIRECTORY_ACCOUNTS.map(p => (today >= p.reviewOn || (p.endsOn && today > p.endsOn))
        ? { ...p, reward: null, rewardKind: null, cashValue: 0, eligibility: "Promotion needs a fresh review. Check current provider terms." }
        : { ...p });
}
