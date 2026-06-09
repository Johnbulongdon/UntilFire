import sheet1 from "@/lib/fire-personality-art-sheet-1";
import sheet2 from "@/lib/fire-personality-art-sheet-2";
import sheet3 from "@/lib/fire-personality-art-sheet-3";
import sheet4 from "@/lib/fire-personality-art-sheet-4";

export type FirePersonalityCode =
  | "PERB" | "PEGF" | "ASGF" | "PSRF"
  | "PSGB" | "AERB" | "AEGB" | "AERF"
  | "ASRF" | "PERF" | "PEGB" | "ASGB"
  | "PSRB" | "PSGF" | "ASRB" | "AEGF";

export interface FirePersonalityMetrics {
  mode: "starter" | "advanced";
  goal?: "retire-early" | "financial-freedom" | "exploring";
  age?: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  yearsToFire: number;
  portfolio?: number;
}

interface PersonalityArtwork {
  sheet: string;
  column: 0 | 1;
  row: 0 | 1;
}

export interface FirePersonalityProfile {
  code: FirePersonalityCode;
  name: string;
  headline: string;
  quote: string;
  blurb: string;
  accent: string;
  artwork: PersonalityArtwork;
}

export const FIRE_PERSONALITY_PROFILES: Record<FirePersonalityCode, FirePersonalityProfile> = {
  PERB: {
    code: "PERB",
    name: "Spreadsheet Nerd",
    headline: "The Analytical Optimizer",
    quote: "Every cell tells a story.",
    blurb: "You chase FIRE with dashboards, ratios, and a plan that gets sharper every week.",
    accent: "#1b7f5c",
    artwork: { sheet: sheet2, column: 0, row: 0 },
  },
  PEGF: {
    code: "PEGF",
    name: "Digital Nomad",
    headline: "The Remote Maximizer",
    quote: "Wi-Fi first. Borders second.",
    blurb: "You build freedom by keeping life portable and letting geography work for you.",
    accent: "#b8872b",
    artwork: { sheet: sheet1, column: 0, row: 0 },
  },
  ASGF: {
    code: "ASGF",
    name: "Beach Bum",
    headline: "The Lifestyle Escapist",
    quote: "The good life should start early.",
    blurb: "You want FIRE to feel lighter, sunnier, and closer to the version of life you actually want.",
    accent: "#0ea5a8",
    artwork: { sheet: sheet2, column: 1, row: 0 },
  },
  PSRF: {
    code: "PSRF",
    name: "Minimalist Monk",
    headline: "The Calm Simplifier",
    quote: "Simplicity compounds too.",
    blurb: "You create optionality by cutting noise, lowering burn, and staying centered on what matters.",
    accent: "#3f3f46",
    artwork: { sheet: sheet1, column: 1, row: 0 },
  },
  PSGB: {
    code: "PSGB",
    name: "Chess Player",
    headline: "The Strategic Climber",
    quote: "You do not rush the right move.",
    blurb: "You treat FIRE like a sequence of thoughtful decisions that pay off over time.",
    accent: "#5f6368",
    artwork: { sheet: sheet2, column: 0, row: 1 },
  },
  AERB: {
    code: "AERB",
    name: "Mad Scientist",
    headline: "The Experimental Builder",
    quote: "Try it. Measure it. Improve it.",
    blurb: "You are willing to run bold financial experiments if they can accelerate the mission.",
    accent: "#248f5d",
    artwork: { sheet: sheet1, column: 0, row: 1 },
  },
  AEGB: {
    code: "AEGB",
    name: "Serial Hustler",
    headline: "The Momentum Machine",
    quote: "If one lane works, build three more.",
    blurb: "You push FIRE forward with energy, leverage, and a bias toward action.",
    accent: "#3d8f4d",
    artwork: { sheet: sheet3, column: 0, row: 0 },
  },
  AERF: {
    code: "AERF",
    name: "Free Spirit",
    headline: "The Boundless Explorer",
    quote: "Freedom should feel alive.",
    blurb: "You want a financial plan that expands life rather than narrowing it.",
    accent: "#7c72d9",
    artwork: { sheet: sheet3, column: 1, row: 0 },
  },
  ASRF: {
    code: "ASRF",
    name: "Cool Minimalist",
    headline: "The Quiet Essentialist",
    quote: "Enough is a superpower.",
    blurb: "You keep your path clean, intentional, and stripped of anything that does not serve the goal.",
    accent: "#737373",
    artwork: { sheet: sheet3, column: 0, row: 1 },
  },
  PERF: {
    code: "PERF",
    name: "Income Maximizer",
    headline: "The Upside Hunter",
    quote: "Scale solves more than cutting ever will.",
    blurb: "You push FIRE fastest by increasing earning power and staying pointed at the upside.",
    accent: "#b8891f",
    artwork: { sheet: sheet1, column: 1, row: 1 },
  },
  PEGB: {
    code: "PEGB",
    name: "Efficiency Nerd",
    headline: "The Systems Tuner",
    quote: "Tiny frictions become big wins.",
    blurb: "You build wealth by tightening systems, improving process, and making consistency easy.",
    accent: "#56716b",
    artwork: { sheet: sheet3, column: 1, row: 1 },
  },
  ASGB: {
    code: "ASGB",
    name: "Patient Investor",
    headline: "The Slow Compounder",
    quote: "Time is the loudest edge.",
    blurb: "You trust patient allocation, long horizons, and steady compounding over drama.",
    accent: "#567f37",
    artwork: { sheet: sheet4, column: 0, row: 0 },
  },
  PSRB: {
    code: "PSRB",
    name: "Blueprint Maker",
    headline: "The Methodical Architect",
    quote: "I do not guess. I build.",
    blurb: "You approach FIRE like a blueprint: secure, systematic, and built to last.",
    accent: "#3b6da8",
    artwork: { sheet: sheet4, column: 1, row: 0 },
  },
  PSGF: {
    code: "PSGF",
    name: "Open-Road Planner",
    headline: "The Route Designer",
    quote: "The map matters as much as the destination.",
    blurb: "You want a plan that gives direction, but still leaves room for movement and discovery.",
    accent: "#5b7480",
    artwork: { sheet: sheet4, column: 0, row: 1 },
  },
  ASRB: {
    code: "ASRB",
    name: "MacGyver",
    headline: "The Resourceful Fixer",
    quote: "There is always a way through.",
    blurb: "You make FIRE happen by adapting fast, improvising well, and using what is already in reach.",
    accent: "#7a7a7a",
    artwork: { sheet: sheet4, column: 1, row: 1 },
  },
  AEGF: {
    code: "AEGF",
    name: "Wanderer",
    headline: "The Compass Chaser",
    quote: "Freedom starts with direction.",
    blurb: "You are motivated by possibility, movement, and a life that opens wider over time.",
    accent: "#284d86",
    artwork: { sheet: sheet2, column: 1, row: 1 },
  },
};

export function deriveFirePersonality(metrics: FirePersonalityMetrics): FirePersonalityProfile {
  const monthlyIncome = Math.max(0, metrics.monthlyIncome);
  const monthlyExpenses = Math.max(0, metrics.monthlyExpenses);
  const monthlySavings = Math.max(0, metrics.monthlySavings);
  const yearsToFire = Math.max(0, metrics.yearsToFire);
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
  const portfolioCoverMonths = monthlyExpenses > 0
    ? Math.max(0, metrics.portfolio ?? 0) / monthlyExpenses
    : 0;

  const firstLetter = metrics.mode === "advanced"
    || metrics.goal === "retire-early"
    || savingsRate >= 0.2
      ? "P"
      : "A";

  const secondLetter = monthlyIncome >= 8500
    || savingsRate >= 0.24
    || monthlyExpenses <= monthlyIncome * 0.68
      ? "E"
      : "S";

  const thirdLetter = metrics.goal === "retire-early"
    || yearsToFire <= 18
    || portfolioCoverMonths >= 12
      ? "G"
      : "R";

  const fourthLetter = metrics.mode === "advanced"
    || metrics.goal === "financial-freedom"
    || portfolioCoverMonths >= 6
      ? "B"
      : "F";

  const code = `${firstLetter}${secondLetter}${thirdLetter}${fourthLetter}` as FirePersonalityCode;
  return FIRE_PERSONALITY_PROFILES[code];
}
