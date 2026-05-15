// Pure data and logic for the FIRE Type Quiz. No React dependencies.
// The quiz produces a 4-letter code: [P|A][S|E][R|G][B|F]
//   Axis 1 PA: Planner vs Adventurer
//   Axis 2 SE: Security vs Expansion
//   Axis 3 RG: Reducer vs Grower
//   Axis 4 BF: Builder vs Freedom-seeker

export type Axis = "PA" | "SE" | "RG" | "BF";
export type AxisLetter = "P" | "A" | "S" | "E" | "R" | "G" | "B" | "F";

export interface QuizOption {
  label: string;
  axis: Axis;
  value: AxisLetter;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: [QuizOption, QuizOption];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "pa1",
    prompt: "Your ideal money plan feels like…",
    options: [
      { label: "A clear roadmap with milestones", axis: "PA", value: "P" },
      { label: "A flexible path with room to change my mind", axis: "PA", value: "A" },
    ],
  },
  {
    id: "pa2",
    prompt: "When life changes, you usually want to…",
    options: [
      { label: "Update the plan and keep moving", axis: "PA", value: "P" },
      { label: "Reconsider the destination entirely", axis: "PA", value: "A" },
    ],
  },
  {
    id: "se1",
    prompt: "The best thing money can buy is…",
    options: [
      { label: "Peace of mind", axis: "SE", value: "S" },
      { label: "More upside and opportunity", axis: "SE", value: "E" },
    ],
  },
  {
    id: "se2",
    prompt: "If you received a $10k bonus, you'd most want to…",
    options: [
      { label: "Strengthen savings or reduce risk", axis: "SE", value: "S" },
      { label: "Invest in growth, learning, or a bigger opportunity", axis: "SE", value: "E" },
    ],
  },
  {
    id: "rg1",
    prompt: "To speed up FIRE, you'd rather…",
    options: [
      { label: "Trim recurring expenses", axis: "RG", value: "R" },
      { label: "Increase income or returns", axis: "RG", value: "G" },
    ],
  },
  {
    id: "rg2",
    prompt: "Your financial superpower is more likely…",
    options: [
      { label: "Spotting waste", axis: "RG", value: "R" },
      { label: "Finding upside", axis: "RG", value: "G" },
    ],
  },
  {
    id: "bf1",
    prompt: "Your dream post-FIRE life is closer to…",
    options: [
      { label: "Building projects or creative work without pressure", axis: "BF", value: "B" },
      { label: "Owning your time completely", axis: "BF", value: "F" },
    ],
  },
  {
    id: "bf2",
    prompt: "You'd feel most successful if money let you…",
    options: [
      { label: "Work only on things I choose", axis: "BF", value: "B" },
      { label: "Stop organizing life around work", axis: "BF", value: "F" },
    ],
  },
];

// Score answers into a 4-letter code.
// answers[0..7] map to QUIZ_QUESTIONS[0..7].
// For each axis pair, the majority vote wins; tie goes to the later answer.
export function scoreQuiz(answers: AxisLetter[]): string {
  const pickAxis = (i0: number, i1: number, a: AxisLetter, b: AxisLetter): AxisLetter => {
    const countA = [answers[i0], answers[i1]].filter((v) => v === a).length;
    const countB = [answers[i0], answers[i1]].filter((v) => v === b).length;
    if (countA > countB) return a;
    if (countB > countA) return b;
    return answers[i1]; // tie → later answer
  };

  const pa = pickAxis(0, 1, "P", "A");
  const se = pickAxis(2, 3, "S", "E");
  const rg = pickAxis(4, 5, "R", "G");
  const bf = pickAxis(6, 7, "B", "F");

  return `${pa}${se}${rg}${bf}`;
}

// All 16 type names and taglines
const TYPE_NAMES: Record<string, { name: string; tagline: string }> = {
  PSRB: { name: "The Methodical Architect", tagline: "You build FIRE like a blueprint — secure, systematic, and purposeful." },
  PSRF: { name: "The Steady Minimalist",    tagline: "Stability and simplicity are your superpowers. You'll reach FIRE by eliminating everything that doesn't serve you." },
  PSGB: { name: "The Strategic Builder",    tagline: "You want FIRE to feel structured, stable, and useful — not just an exit, but a launchpad." },
  PSGF: { name: "The Disciplined Escapist", tagline: "You plan carefully but ultimately want complete freedom. Your numbers are solid — your destination is open." },
  PERB: { name: "The Calculated Opportunist", tagline: "You seek growth but only after you've run the numbers. You bet on upside without ignoring the downside." },
  PERF: { name: "The Focused Climber",      tagline: "You're ambitious and systematic. You'll maximize every input and walk away when the math says it's time." },
  PEGB: { name: "The Growth Engineer",      tagline: "You treat FIRE like a portfolio optimization problem — and you're determined to find the winning allocation." },
  PEGF: { name: "The Ambitious Nomad",      tagline: "You want to grow fast and go free. Systems, income, and optionality are your edge." },
  ASRB: { name: "The Flexible Craftsman",   tagline: "You stay adaptable and lean. You'll reach FIRE by cutting what doesn't matter and building what does." },
  ASRF: { name: "The Laid-Back Optimizer",  tagline: "You're efficient without being rigid. FIRE for you means doing less of what you don't love — starting now." },
  ASGB: { name: "The Adaptive Creator",     tagline: "You grow your way to FIRE and build something meaningful once you're there." },
  ASGF: { name: "The Easy Rider",           tagline: "You go with the flow but keep your eye on growth. FIRE means full flexibility — no agenda required." },
  AERB: { name: "The Bold Experimenter",    tagline: "You explore, iterate, and cut losses fast. Your FIRE path looks more like a startup than a spreadsheet." },
  AERF: { name: "The Free Spirit",          tagline: "Rules are suggestions. You'll find your own route to FIRE and make freedom the whole point." },
  AEGB: { name: "The Dynamic Builder",      tagline: "You're wired to pursue growth and create. FIRE is less about stopping — more about doing things on your terms." },
  AEGF: { name: "The Open Adventurer",      tagline: "Expansion, freedom, and adaptability define you. Your FIRE future is wide open — and that's exactly how you want it." },
};

export function getTypeMeta(code: string): { name: string; tagline: string } {
  return TYPE_NAMES[code] ?? { name: "The FIRE Seeker", tagline: "Your FIRE path is uniquely yours." };
}

// Composable axis copy — each letter contributes a strength and a watch-out
export const AXIS_STRENGTHS: Record<AxisLetter, string> = {
  P: "You think in systems and milestones — rare in a world of vague intentions",
  A: "You adapt quickly when conditions change, avoiding the sunk-cost traps that derail most plans",
  S: "You make steady, low-regret decisions that compound reliably over time",
  E: "You're wired to find upside — your wealth grows faster than average because you keep leaning in",
  R: "You spot inefficiency others miss, making every dollar work harder",
  G: "You focus on income and returns, which are the fastest levers for compressing your timeline",
  B: "You're motivated by building something meaningful — FIRE is a means, not just an end",
  F: "You prioritize personal freedom above all — that clarity makes every sacrifice feel intentional",
};

export const AXIS_WATCH_OUTS: Record<AxisLetter, string> = {
  P: "You may over-plan before acting — sometimes a good-enough plan today beats a perfect plan later",
  A: "You may change course too often, resetting the compound curve each time",
  S: "You may leave growth on the table by defaulting to safety when calculated risk would pay off",
  E: "You may underestimate downside risk — not every asymmetric bet lands",
  R: "You may under-invest in income growth, which has higher leverage at lower savings rates",
  G: "You may underspend on protecting what you've built — insurance, diversification, downside buffers",
  B: "You may stay 'one more project' away from true freedom, postponing the actual exit",
  F: "You may resist commitments that compound wealth — some constraints are investments, not cages",
};
