export const PREVIEW_BARS = [28, 38, 33, 48, 42, 62, 57, 72, 66, 80, 76, 95] as const;

export const FIRE_GOALS = [
  { id: "early", emoji: "ER", title: "Early Retirement", desc: "Exit the workforce fully - the classic FIRE path." },
  { id: "coast", emoji: "CF", title: "Coast FIRE", desc: "Work part-time or passion projects while investments compound." },
  { id: "gen", emoji: "GW", title: "Generational Wealth", desc: "Build a lasting financial legacy for your family." },
  { id: "nomad", emoji: "NL", title: "Nomadic Lifestyle", desc: "Travel freely with a portfolio that funds the journey." },
] as const;

export type IncomeMode = "annual" | "monthly" | "biweekly" | "hourly" | "takehome";

export const INCOME_MODES: { key: IncomeMode; label: string; unit: string; hint: string }[] = [
  { key: "annual", label: "Annual", unit: "/year", hint: "Yearly gross salary" },
  { key: "monthly", label: "Monthly", unit: "/month", hint: "Monthly gross (x12)" },
  { key: "biweekly", label: "Bi-weekly", unit: "/paycheck", hint: "26 paychecks/yr" },
  { key: "hourly", label: "Hourly", unit: "/hr", hint: "2,080 hrs/yr" },
  { key: "takehome", label: "Take-home", unit: "/month", hint: "Skip tax calc - enter what lands in your bank" },
];
