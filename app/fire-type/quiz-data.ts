// Pure data and logic for the FIRE Type Quiz. No React dependencies.
// The quiz produces a 4-letter code: [P|A][S|E][R|G][B|F]
//   Axis PA: Planner vs Adventurer
//   Axis SE: Security vs Expansion
//   Axis RG: Reducer vs Grower
//   Axis BF: Builder vs Freedom-seeker

export type Axis = "PA" | "SE" | "RG" | "BF";
export type AxisLetter = "P" | "A" | "S" | "E" | "R" | "G" | "B" | "F";

// Answer position on a 5-point scale:
// 0=strong left, 1=slight left, 2=neutral, 3=slight right, 4=strong right
export type QuizAnswer = 0 | 1 | 2 | 3 | 4;

export interface QuizQuestion {
  id: string;
  prompt: string;
  leftLabel: string;
  rightLabel: string;
  axis: Axis;
  leftLetter: AxisLetter;
  rightLetter: AxisLetter;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "pa1",
    prompt: "When managing money, you feel most in control when…",
    leftLabel: "A clear roadmap with milestones",
    rightLabel: "A flexible direction I adapt as I go",
    axis: "PA",
    leftLetter: "P",
    rightLetter: "A",
  },
  {
    id: "pa2",
    prompt: "When life changes direction, you…",
    leftLabel: "Update the plan and keep moving",
    rightLabel: "Question whether the destination still fits",
    axis: "PA",
    leftLetter: "P",
    rightLetter: "A",
  },
  {
    id: "se1",
    prompt: "The best thing money can buy is…",
    leftLabel: "Peace of mind and a reliable buffer",
    rightLabel: "Bigger opportunities and upside",
    axis: "SE",
    leftLetter: "S",
    rightLetter: "E",
  },
  {
    id: "se2",
    prompt: "A $10k windfall would most likely go toward…",
    leftLabel: "Savings, debt paydown, or reducing risk",
    rightLabel: "A growth investment or major opportunity",
    axis: "SE",
    leftLetter: "S",
    rightLetter: "E",
  },
  {
    id: "rg1",
    prompt: "To reach FIRE faster, you'd rather…",
    leftLabel: "Cut recurring costs and reduce waste",
    rightLabel: "Grow income or find better returns",
    axis: "RG",
    leftLetter: "R",
    rightLetter: "G",
  },
  {
    id: "rg2",
    prompt: "When you review your finances, your first move is usually to…",
    leftLabel: "Spotting inefficiency and trimming it",
    rightLabel: "Spotting potential and capturing it",
    axis: "RG",
    leftLetter: "R",
    rightLetter: "G",
  },
  {
    id: "bf1",
    prompt: "Your dream post-FIRE life looks more like…",
    leftLabel: "Building projects on my own terms",
    rightLabel: "Complete freedom from structure",
    axis: "BF",
    leftLetter: "B",
    rightLetter: "F",
  },
  {
    id: "bf2",
    prompt: "The real point of financial independence, for you, is…",
    leftLabel: "It lets me work only on what I choose",
    rightLabel: "It lets me stop organizing life around work",
    axis: "BF",
    leftLetter: "B",
    rightLetter: "F",
  },
];

// Weights indexed by position: strong left=+2, slight left=+1, neutral=0, slight right=-1, strong right=-2
const WEIGHTS: Record<QuizAnswer, number> = { 0: 2, 1: 1, 2: 0, 3: -1, 4: -2 };

// Score answers into a 4-letter code.
// Weighted sum per axis: positive → leftLetter, negative → rightLetter, zero → tie-break on last answer.
export function scoreQuiz(answers: QuizAnswer[]): string {
  const axisSums: Partial<Record<Axis, number>> = {};
  answers.forEach((ans, i) => {
    const q = QUIZ_QUESTIONS[i];
    axisSums[q.axis] = (axisSums[q.axis] ?? 0) + WEIGHTS[ans];
  });

  const resolveLetter = (axis: Axis): AxisLetter => {
    const q = QUIZ_QUESTIONS.find((q) => q.axis === axis)!;
    const sum = axisSums[axis] ?? 0;
    if (sum > 0) return q.leftLetter;
    if (sum < 0) return q.rightLetter;
    // Tie: use direction of last answer for this axis (neutral pos 2 satisfies ≤ 2 → left)
    const lastIdx = [...QUIZ_QUESTIONS.entries()]
      .filter(([, q]) => q.axis === axis)
      .at(-1)![0];
    return answers[lastIdx] <= 2 ? q.leftLetter : q.rightLetter;
  };

  return `${resolveLetter("PA")}${resolveLetter("SE")}${resolveLetter("RG")}${resolveLetter("BF")}`;
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
