export type BodyNode =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

export type LearnArticle = {
  slug: string
  title: string
  description: string
  category: string
  publishedAt: string
  readTime: string
  body: BodyNode[]
}

export type LearnStageId =
  | 'starting-out'
  | 'building-momentum'
  | 'approaching-fire'
  | 'living-in-fire'

export type LearnCalculatorLink = {
  href: string
  label: string
}

export type LearnStage = {
  id: LearnStageId
  label: string
  shortLabel: string
  description: string
  whatMattersNow: string
  articleSlugs: string[]
  calculatorLinks: LearnCalculatorLink[]
  nextActionLabel: string
  nextActionHref: string
}

type LearnArticleMeta = {
  primaryStage: LearnStageId
  secondaryStages?: LearnStageId[]
  relatedCalculators: LearnCalculatorLink[]
}

function p(text: string): BodyNode { return { type: 'p', text } }
function h2(text: string): BodyNode { return { type: 'h2', text } }
function h3(text: string): BodyNode { return { type: 'h3', text } }
function ul(items: string[]): BodyNode { return { type: 'ul', items } }
function ol(items: string[]): BodyNode { return { type: 'ol', items } }

export const learnArticles: LearnArticle[] = [
  {
    slug: 'what-is-fire-financial-independence-retire-early',
    title: 'What Is FIRE? Financial Independence, Retire Early Explained',
    description: 'A complete introduction to the FIRE movement — what financial independence means, how early retirement works, and the key numbers behind it.',
    category: 'FIRE Basics',
    publishedAt: '2026-05-01',
    readTime: '7 min read',
    body: [
      h2('What does FIRE stand for?'),
      p('FIRE stands for Financial Independence, Retire Early. It is a personal finance movement built around one core idea: save and invest aggressively enough that your portfolio generates enough passive income to cover your living expenses — indefinitely. At that point, paid work becomes optional.'),
      p('The FIRE movement grew out of the early retirement community in the 1990s, popularised in large part by the book Your Money or Your Life by Vicki Robin and Joe Dominguez. It accelerated dramatically through the 2010s as bloggers like Mr. Money Mustache demonstrated that retiring in your 30s or 40s was achievable on ordinary incomes.'),
      h2('How does FIRE actually work?'),
      p('FIRE has a simple mechanical core. You track your annual spending, multiply it by 25, and that is your target portfolio size. The multiplier comes from the 4% safe withdrawal rule: a diversified portfolio can support annual withdrawals of 4% of its starting value — inflation-adjusted — over a 30-year retirement without running out.'),
      p('For example, if you spend $50,000 per year, your FIRE number is $1,250,000. When your investment portfolio reaches that number, you are theoretically financially independent. The mechanics involve low-cost index funds, tax-advantaged accounts like 401(k)s and Roth IRAs, and maximising the gap between income and spending.'),
      h2('Why savings rate is the most powerful lever'),
      p('The critical variable in FIRE is your savings rate — the percentage of take-home income you invest each month. Because a higher rate simultaneously grows your portfolio faster and proves you can live on less, it has a compounding effect on your timeline.'),
      ul([
        '10% savings rate → ~40 years to financial independence',
        '30% savings rate → ~25 years',
        '50% savings rate → ~17 years',
        '70% savings rate → ~8 years',
      ]),
      p('These timelines hold across a wide range of income levels because the ratio is what matters, not the raw amount. A household earning $80,000 and saving $40,000 builds wealth faster than one earning $200,000 and saving $20,000.'),
      h2('The different types of FIRE'),
      p('The FIRE movement has branched into several variants, each targeting a different lifestyle and timeline:'),
      ul([
        'Lean FIRE — annual spending below $40,000; smaller portfolio required but less margin for lifestyle changes.',
        'Regular FIRE — $50,000–$80,000 per year; the comfortable middle path for most households.',
        'Fat FIRE — $100,000+ per year; maximum flexibility but a longer savings timeline.',
        'Barista FIRE — partial financial independence with part-time work covering some expenses while the portfolio grows.',
        'Coast FIRE — invest enough early that compound growth alone reaches your target by traditional retirement age.',
      ]),
      h2('Is FIRE realistic?'),
      p('FIRE is achievable for a much wider range of households than the critics assume, but it requires honest accounting. The key inputs are income stability, controllable expenses, a long enough timeline, and a willingness to invest in low-cost diversified funds rather than saving cash. It is not a guaranteed outcome — market returns matter, and sequence-of-returns risk is real. But the framework is sound, and millions of people have used it to reach meaningful financial independence before traditional retirement age.'),
      p('The best place to start is calculating your current savings rate and running a FIRE projection. Even if full FIRE takes 20 years, seeing the trajectory clearly makes the trade-offs easier to reason about.'),
    ],
  },
  {
    slug: 'how-much-money-do-i-need-to-retire',
    title: 'How Much Money Do You Need to Retire?',
    description: 'The honest answer to the most common retirement question — how to calculate your number, what variables actually move it, and how to stress-test your target.',
    category: 'Planning',
    publishedAt: '2026-05-01',
    readTime: '6 min read',
    body: [
      h2('The short answer: 25× your annual spending'),
      p('The most widely used formula for a retirement savings target is multiplying your expected annual spending by 25. This comes from the 4% safe withdrawal rule: if your portfolio is 25 times your yearly expenses, withdrawing 4% per year should keep your portfolio intact — inflation-adjusted — for at least 30 years.'),
      p('If you plan to spend $60,000 per year in retirement, your target is $1,500,000. If you plan to spend $40,000, the target is $1,000,000. The number is sensitive to spending, not income — which is why reducing expenses has a compounding effect on your FIRE timeline.'),
      h2('What variables actually move your retirement number'),
      p('Three variables drive most of the movement in your retirement target:'),
      ul([
        'Annual spending — every $1,000/month less in spending removes $300,000 from your required portfolio using the 25x formula.',
        'Withdrawal rate — 4% requires a 25x portfolio; 3.5% requires 28.5x; 5% requires only 20x but carries more depletion risk over long horizons.',
        'Retirement length — the 4% rule was calibrated for 30 years. Retiring at 40 with a 50-year horizon suggests targeting 3.5% or lower.',
      ]),
      p('Housing, transportation, and food are typically the largest spending categories, which is why FIRE planners pay close attention to cost of living and city choice.'),
      h2('The role of Social Security and other income'),
      p('Social Security, rental income, or part-time work all reduce the portfolio you need. If you expect $1,500 per month in Social Security starting at 67, your portfolio only needs to cover the gap between your spending and that income — not your full spending target. A household spending $60,000 per year with $18,000 in expected Social Security income only needs a portfolio to cover $42,000 annually, reducing the target from $1,500,000 to around $1,050,000.'),
      h2('Inflation and tax drag'),
      p('Many retirement estimates underestimate taxes. Traditional 401(k) and IRA withdrawals are taxed as ordinary income. Capital gains taxes apply to taxable brokerage accounts. A realistic plan accounts for an effective tax rate on withdrawals of 10–20%, depending on your income bracket and state. This means your gross withdrawal target should be higher than your net spending target.'),
      p('Inflation — historically around 2–3% annually — erodes purchasing power over a 30-50 year retirement. Most sound FIRE projections assume nominal returns of 7% and subtract 3% for inflation to arrive at a real return of around 4%, which aligns with the 4% withdrawal rule.'),
      h2('How to stress-test your number'),
      p('A single-point estimate is not enough. A thorough stress test includes:'),
      ul([
        'Run scenarios at 6%, 7%, and 8% market returns to see how sensitive your date is to performance.',
        'Use Monte Carlo simulation: a 90%+ success rate across thousands of scenarios is a reasonable minimum target.',
        'Test with 10–15% reduced spending to measure how much flexibility protects the plan.',
        'Model part-time income in early years to understand how it reduces portfolio pressure.',
        'Account for healthcare costs — a significant wildcard for early retirees before Medicare eligibility.',
      ]),
    ],
  },
  {
    slug: 'what-is-the-4-percent-rule',
    title: 'What the 4% Rule Actually Means',
    description: 'A plain-English guide to the 4% rule, where it is useful, and where it can mislead new FIRE planners.',
    category: 'FIRE Basics',
    publishedAt: '2026-04-29',
    readTime: '5 min read',
    body: [
      h2('Where the 4% rule comes from'),
      p('The 4% rule originates from the Trinity Study, a 1998 paper by three finance professors at Trinity University. They examined historical US stock and bond returns from 1926 to 1995 and tested how various withdrawal rates would have held up across all 30-year periods in that dataset. A 4% annual withdrawal rate, adjusted for inflation each year, survived 95%+ of those 30-year windows.'),
      p('The rule became the de facto shortcut for retirement planning because it turns an abstract goal into a concrete number. Spend $40,000 per year? Target $1,000,000. Spend $80,000? Target $2,000,000. The simplicity is the point.'),
      h2('What the 4% rule assumes'),
      p('The original study was built on several assumptions that are important to understand:'),
      ul([
        'A roughly 60/40 stock-to-bond portfolio',
        'A 30-year retirement horizon',
        'US historical market returns (the best-performing equity market in history)',
        'Annual inflation-adjusted withdrawals at a fixed percentage',
        'No taxes, fees, or flexibility in spending during downturns',
      ]),
      p('Early retirees in their 30s or 40s face 50-60 year time horizons — considerably longer than the dataset the rule was built on. Real retirees also adjust spending during downturns, take part-time work, or cut discretionary expenses. That flexibility dramatically improves outcomes compared to a rigid 4% withdrawal.'),
      h2('When the 4% rule understates risk'),
      p('The original study used historical US data — the best-performing equity market in history. International data suggests withdrawal rates around 3–3.5% are safer for global portfolios. Starting retirement in a period of high valuations (measured by the Shiller CAPE ratio) historically correlates with lower subsequent returns, making higher withdrawal rates riskier.'),
      p('Sequence-of-returns risk is a major factor the rule does not address directly. A major market decline in the first few years of retirement — before the portfolio has had time to recover — can permanently impair a portfolio even if long-term average returns are fine.'),
      h2('How to use the 4% rule well'),
      p('Treat the 4% rule as a starting estimate, not a guarantee. Practical adjustments:'),
      ul([
        'Target 3.5% or lower if retiring before age 50, to account for the longer horizon.',
        'Build 10–15% spending flexibility into your plan — the ability to cut spending in a down year dramatically improves long-run outcomes.',
        'Supplement with Monte Carlo simulations across different market scenarios to understand your real probability of success.',
        'Consider a bond tent or cash buffer to reduce exposure to sequence-of-returns risk in the first years of retirement.',
        'Account for taxes: traditional account withdrawals are taxed as ordinary income, which effectively raises the withdrawal rate needed for net spending.',
      ]),
    ],
  },
  {
    slug: 'why-savings-rate-matters-more-than-income',
    title: 'Why Savings Rate Matters More Than Income',
    description: 'High income helps, but the percentage you keep is what moves your FIRE date the fastest.',
    category: 'FIRE Basics',
    publishedAt: '2026-04-29',
    readTime: '4 min read',
    body: [
      h2('The savings rate formula'),
      p('Savings rate is simply the percentage of your take-home income that you invest each month. A household earning $6,000 per month and saving $2,400 has a 40% savings rate. The same household saving $600 has a 10% savings rate — and will take roughly three times as long to reach financial independence.'),
      p('Income raises your ceiling, but savings rate controls momentum. A household keeping 40% of take-home pay often reaches financial independence faster than one earning more but saving only 10%.'),
      h2('How savings rate affects your timeline'),
      p('Savings rate has a compound effect on your FIRE timeline: it simultaneously increases how much you invest and reduces how large a portfolio you need. The approximate timelines:'),
      ul([
        '10% savings rate → ~40 years to financial independence',
        '20% → ~37 years',
        '30% → ~28 years',
        '40% → ~22 years',
        '50% → ~17 years',
        '65% → ~10–12 years',
        '75%+ → ~7–8 years',
      ]),
      p('These estimates hold across a wide range of income levels because the ratio is what matters, not the dollar amount.'),
      h2('Where to find savings rate gains'),
      p('The most high-leverage places to improve savings rate, in rough order of impact:'),
      ul([
        'Housing — typically 30–40% of a household budget; a $500/month reduction adds ~10% to savings rate.',
        'Transportation — car payments, insurance, fuel, and parking are often the second-largest category.',
        'Food — dining out regularly can add $500–$1,000/month versus cooking at home.',
        'Geographic arbitrage — moving to a lower cost-of-living city can add 15–20 percentage points in one move.',
      ]),
      p('A household that addresses even two of these categories can often add 15–20 percentage points to its savings rate without dramatically reducing quality of life.'),
      h2('The savings rate ceiling'),
      p('The goal is not deprivation. It is building a durable monthly surplus that compounds for years. A 30–40% savings rate sustained over 15–20 years is enough to reach financial independence for most households. A very high savings rate (60–70%+) is possible for high earners with low fixed costs, but is not the only path.'),
    ],
  },
  {
    slug: 'coast-fire-vs-full-fire',
    title: 'Coast FIRE vs Full FIRE: Which Path Fits You?',
    description: 'Two different paths to financial independence, and how to tell which one fits your current season of life.',
    category: 'Planning',
    publishedAt: '2026-04-29',
    readTime: '5 min read',
    body: [
      h2('What is Coast FIRE?'),
      p('Coast FIRE is the point at which your existing investment portfolio, left untouched, will compound to your full FIRE number by traditional retirement age — without any additional contributions. Once you hit your Coast FIRE number, you only need to earn enough to cover your current expenses. You can stop aggressive saving and let compounding do the rest.'),
      p('For example, if you need $1,200,000 to retire at 65 and you are 35, your money has 30 years to grow. At a 7% annual return, you need roughly $157,000 invested today for it to grow to $1,200,000 by 65. That $157,000 is your Coast FIRE number at 35.'),
      h2('What is Full FIRE?'),
      p('Full FIRE means building a portfolio large enough to cover your spending now — you no longer need to work at all. Full FIRE is a cleaner end state, but it usually requires a longer accumulation phase and a larger portfolio target. The timeline depends on income, savings rate, market returns, and annual spending.'),
      h2('Why Coast FIRE appeals to many people'),
      p('Coast FIRE is often appealing when you want more flexibility before fully retiring. Key reasons people target it first:'),
      ul([
        'Work flexibility — you can shift to lower-stress, part-time, or creative work without abandoning long-term independence.',
        'Reduced financial anxiety — traditional retirement is fully funded regardless of what happens next.',
        'Optionality — you can keep saving aggressively to reach full FIRE sooner, or ease off.',
        'Portfolio insurance — even if something derails aggressive saving, the base is already secured.',
      ]),
      p('Many people find that reaching Coast FIRE dramatically reduces financial anxiety even while they are still working. Knowing that traditional retirement is funded is meaningful insurance.'),
      h2('How to calculate your Coast FIRE number'),
      p('The formula: Coast FIRE number = FIRE target ÷ (1 + annual growth rate)^years to retirement.'),
      p('Using the example above: $1,200,000 ÷ (1.07)^30 = $157,000. The variables are your full FIRE target, assumed annual return, and how many years until you want to stop working. A lower growth rate assumption or earlier target retirement age raises the Coast FIRE number.'),
      h2('Which path is right?'),
      p('The right path depends on your timeline, expenses, job flexibility, and how much optionality you want along the way. Coast FIRE is often the first achievable milestone on the way to Full FIRE — tracking it as a stepping stone can make a long FIRE journey feel more manageable.'),
    ],
  },
  {
    slug: 'lean-fire-vs-fat-fire',
    title: 'Lean FIRE vs Fat FIRE: Choosing Your Retirement Lifestyle',
    description: 'The tradeoffs between retiring lean on a minimal budget versus retiring with full financial flexibility — and how to decide which target fits your life.',
    category: 'Planning',
    publishedAt: '2026-05-01',
    readTime: '6 min read',
    body: [
      h2('What is Lean FIRE?'),
      p('Lean FIRE targets a minimal retirement lifestyle, typically defined as annual spending below $40,000 (or below $25,000 for very lean planners). The appeal is mathematical: a lower spending target requires a much smaller portfolio. At $30,000 per year, your FIRE number is $750,000. At $25,000, it is $625,000.'),
      p('Lean FIRE planners often live in lower cost-of-living areas, own their home outright, and have minimal discretionary spending. Many find that a lean lifestyle is not a sacrifice — simplified living can reduce stress, increase free time, and align better with personal values.'),
      h2('What is Fat FIRE?'),
      p('Fat FIRE targets $100,000 or more per year in retirement spending — full lifestyle flexibility including travel, dining, and comfortable housing. At $120,000 per year, the FIRE number is $3,000,000. Fat FIRE requires either a very high income, a very long accumulation period, or both.'),
      p('Fat FIRE is often the goal for households with children, high current lifestyle costs they do not want to reduce, or professions where income is high enough that aggressive saving is feasible without lifestyle sacrifice.'),
      h2('The spectrum in between'),
      p('Most FIRE planners target somewhere in the middle. A quick reference across the full range:'),
      ul([
        'Lean FIRE — under $40,000/year; portfolio target roughly $625k–$1M',
        'Regular FIRE — $50,000–$80,000/year; portfolio target $1.25M–$2M',
        'Fat FIRE — $100,000+/year; portfolio target $2.5M+',
      ]),
      p('"Regular FIRE" in the $50,000–$80,000 range allows for a comfortable middle-class lifestyle without requiring either extreme frugality or an exceptionally high income.'),
      h2('How to choose your target'),
      p('The honest question is: what does your ideal retirement day actually look like? A practical way to find your number:'),
      ol([
        'Write out a realistic monthly budget for your desired retirement lifestyle.',
        'Annualize it: monthly expenses × 12.',
        'Multiply by 25 to get your starting FIRE number.',
        'Adjust upward for healthcare, travel, and any categories likely to grow from today\'s spending.',
        'Test whether the timeline to reach that number is motivating — if not, consider starting with a Lean FIRE floor.',
      ]),
      p('Many people start with Lean FIRE as a reachable floor and plan to grow into Fat FIRE over time through continued part-time work or investment growth beyond their initial target.'),
      h2('Geographic arbitrage and the spending target'),
      p('One powerful lever: retirement location. Retiring to a low cost-of-living city, region, or country can transform a Fat FIRE lifestyle budget into a Lean FIRE portfolio requirement. A $100,000 annual budget in San Francisco might only require $45,000 in Mexico City or Chiang Mai — reducing the required portfolio from $2,500,000 to $1,125,000.'),
    ],
  },
  {
    slug: 'barista-fire',
    title: 'Barista FIRE: Semi-Retirement and the Middle Path',
    description: 'How Barista FIRE works, why it suits many people better than full early retirement, and how to calculate your own partial-retirement number.',
    category: 'Planning',
    publishedAt: '2026-05-02',
    readTime: '5 min read',
    body: [
      h2('What is Barista FIRE?'),
      p('Barista FIRE is the point at which your investment portfolio is large enough that, combined with a modest part-time income, you can comfortably cover your living expenses without depleting your investments. The name comes from a popular example: working at Starbucks for part-time income and health insurance while your portfolio grows to full FIRE.'),
      p('It is a middle path between full financial independence and traditional employment. You work less, in lower-stress roles, and with more schedule flexibility — while your portfolio continues compounding. Eventually the portfolio catches up and you transition to full FIRE.'),
      h2('How to calculate your Barista FIRE number'),
      p('The formula: determine your annual spending, subtract your expected part-time income, and apply the 25x multiplier to the remaining gap.'),
      p('Example: if you spend $60,000 per year and earn $20,000 from part-time work, your portfolio only needs to cover $40,000 — requiring a portfolio of $1,000,000 instead of $1,500,000. That gap of $500,000 in required portfolio can save several years of accumulation.'),
      h2('Why Barista FIRE suits people well'),
      p('Barista FIRE works well for several reasons beyond just the math:'),
      ul([
        'Preserves social structure and a sense of purpose — full early retirement can feel disorienting for many people.',
        'Reduces sequence-of-returns risk — a small part-time income dramatically lowers how much you withdraw from investments in the early years.',
        'Maintains health insurance access — part-time employer coverage can be a significant benefit before Medicare eligibility at 65.',
        'Keeps optionality — you can keep saving toward full FIRE or coast once the portfolio is large enough.',
      ]),
      h2('Related concepts: Semi-FIRE and Slow FI'),
      p('Barista FIRE is closely related to "Semi-FIRE" and "Slow FI." Semi-FIRE typically refers to reducing work — going part-time or shifting to a less demanding career — without fully stopping. Slow FI emphasizes enjoying the journey rather than sprinting to the finish line, accepting a longer timeline in exchange for a more balanced life during the accumulation phase.'),
      h2('Is Barista FIRE right for you?'),
      p('Barista FIRE is a strong choice if:'),
      ul([
        'You dislike your current work but would enjoy a different kind of work at lower intensity.',
        'You want more time flexibility before a full portfolio is built.',
        'Healthcare costs are a concern and part-time employer coverage is accessible.',
        'You find the idea of complete retirement unappealing or psychologically risky.',
      ]),
      p('It is less appealing if your goal is a complete break from employment, or if genuinely flexible part-time work is unavailable in your area or industry.'),
    ],
  },
  {
    slug: 'roth-ira-vs-401k-for-fire',
    title: 'Roth IRA vs 401(k) for Early Retirement: Which Account Wins?',
    description: 'The tax math behind choosing between Roth IRA, Traditional 401(k), and Roth 401(k) for FIRE — including the early withdrawal strategies most planners miss.',
    category: 'Tax & Accounts',
    publishedAt: '2026-05-02',
    readTime: '7 min read',
    body: [
      h2('Why account type matters for early retirees'),
      p('Most retirement account advice assumes a traditional retirement at 65. FIRE planners face a different problem: accessing invested money in their 30s, 40s, or 50s without triggering penalties. The 10% early withdrawal penalty on traditional IRAs and 401(k)s applies to distributions before age 59½ — which means early retirees need a strategy to bridge the gap.'),
      h2('Traditional 401(k): the tax-deferred account'),
      p('Traditional 401(k) contributions reduce your taxable income today. A $20,500 annual contribution at a 24% marginal rate saves $4,920 in taxes upfront. The trade-off: all withdrawals in retirement are taxed as ordinary income.'),
      p('For early retirees with low retirement spending, this can work out well — if your taxable income in retirement is below the standard deduction, you pay very little tax. The early access problem: a 72(t) SEPP (Substantially Equal Periodic Payments) allows penalty-free distributions before 59½, but locks you into a fixed payment schedule for 5 years or until you turn 59½, whichever is longer.'),
      h2('Roth IRA: the tax-free growth account'),
      p('Roth IRA contributions are made with after-tax dollars, but qualified withdrawals are completely tax-free. More importantly for FIRE planners: your contributions (not earnings) can be withdrawn at any time, penalty-free. This makes the Roth IRA an ideal bridge account for early retirees who want flexible access before 59½.'),
      p('Annual contribution limits are lower ($7,000 in 2024, $8,000 if 50+) and income phase-outs apply above $146,000 for single filers. High earners can use the backdoor Roth conversion to bypass income limits.'),
      h2('The Roth conversion ladder strategy'),
      p('The most powerful tool for early retirees is the Roth conversion ladder. In the years after retiring but before needing the money, you convert traditional 401(k) or IRA funds to a Roth IRA. You pay income tax on the converted amount in the year of conversion. After 5 years, those converted funds are available penalty-free. If you convert enough each year to stay in a low tax bracket (0% or 10%), you can move large amounts into Roth accounts very efficiently.'),
      h2('Which account to prioritise'),
      p('A practical FIRE account priority order:'),
      ol([
        'Contribute enough to the 401(k) to capture the full employer match (this is a guaranteed 50–100% instant return).',
        'Max out the Roth IRA ($7,000 in 2024) for tax-free growth and contribution access flexibility.',
        'Return to the 401(k) up to the annual contribution limit.',
        'Add to a taxable brokerage account for additional flexibility and early-access liquidity.',
      ]),
      p('If you are in a high income bracket today and expect lower retirement spending, the Traditional 401(k) is often better because the tax deduction is worth more now than the tax savings in retirement. If your income will stay high in retirement, the Roth is usually better.'),
      h2('Taxable brokerage accounts for FIRE'),
      p('Many FIRE planners also hold taxable brokerage accounts for flexibility. Long-term capital gains are taxed at 0% for single filers with income below $47,025 (2024). Early retirees with low spending can often harvest capital gains tax-free — selling appreciated assets and repurchasing them to reset cost basis, reducing future tax exposure.'),
    ],
  },
  {
    slug: 'sequence-of-returns-risk',
    title: 'Sequence of Returns Risk: The Retirement Threat Most People Miss',
    description: 'Why the order of market returns matters as much as the average return — and how to protect a FIRE portfolio from early market crashes.',
    category: 'Risk & Strategy',
    publishedAt: '2026-05-03',
    readTime: '6 min read',
    body: [
      h2('What is sequence of returns risk?'),
      p('Sequence of returns risk is the danger that a major market decline early in retirement will permanently damage a portfolio — even if long-run average returns are perfectly fine. Two retirees with identical average returns over 30 years can have completely different outcomes if the bad years happen early for one and late for the other.'),
      p('The mechanism: when markets fall and you are still withdrawing money for living expenses, you are forced to sell assets at low prices. That reduces the number of shares available to recover when markets rebound. The portfolio never fully participates in the recovery.'),
      h2('A concrete example'),
      p('Imagine a $1,000,000 portfolio with a 4% ($40,000) annual withdrawal. Scenario A sees -30% in year one, then steady 7% returns. Scenario B sees steady 7% returns, then -30% in year fifteen. The average return over 30 years is nearly identical — but Scenario A typically depletes the portfolio 8–12 years earlier because the early crash happened when the portfolio was at its largest and the withdrawals represented a larger fraction of remaining assets.'),
      h2('Why early retirees face higher exposure'),
      p('Traditional retirees at 65 with a 30-year horizon face meaningful sequence risk. Early retirees at 40 with a 50-year horizon face it even more acutely — they have more years of withdrawals ahead of them and their portfolio needs to survive through multiple market cycles.'),
      h2('Strategies to reduce sequence risk'),
      p('The most effective strategies, roughly in order of impact:'),
      ul([
        'Flexible spending — reducing withdrawals by 10–15% during significant market declines dramatically improves long-run outcomes without requiring extreme austerity.',
        'Cash buffer — keep 1–2 years of expenses in a high-yield savings account; draw from it during downturns instead of selling investments.',
        'Bond tent — hold a higher allocation to bonds in the 5 years before and after retirement, then gradually shift back to equities over the following decade.',
        'Part-time income — even modest earned income in early retirement reduces portfolio withdrawal pressure significantly.',
        'Delay Social Security — deferring to 70 locks in a higher guaranteed monthly income that acts as a buffer against market volatility.',
      ]),
      h2('How Monte Carlo simulation addresses sequence risk'),
      p('A single-scenario projection assumes average returns every year — it misses sequence risk entirely. Monte Carlo simulation runs thousands of scenarios with different return sequences and reports what percentage of outcomes leave money remaining. A retirement plan with a 90%+ success rate in Monte Carlo simulation has accounted for sequence risk, whereas a plan that only shows average returns has not.'),
    ],
  },
  {
    slug: 'how-fire-assumptions-change-your-retirement-date',
    title: 'How FIRE Assumptions Change Your Retirement Date',
    description: 'Small changes in savings, spending, and withdrawal assumptions can move your timeline by years. Here is how to read them clearly.',
    category: 'Planning',
    publishedAt: '2026-04-30',
    readTime: '5 min read',
    body: [
      h2('Your FIRE date is a set of assumptions'),
      p('A FIRE date is not one fixed truth. It is the output of assumptions about income, savings, spending, growth, and withdrawal rate. Change one variable and the date moves — sometimes by years.'),
      h2('The key variables that move your date'),
      p('Understanding which assumptions matter most helps you focus on the right levers:'),
      ul([
        'Savings rate — going from 20% to 30% can move the date 4–6 years forward because it improves both portfolio growth and reduces the portfolio target.',
        'Spending target — every $1,000/month less removes roughly $300,000 from the required portfolio.',
        'Market return assumption — test at 6%, 7%, and 8% to see how sensitive your date is. If the date shifts by 10+ years, raising your savings rate is safer than relying on market performance.',
        'Withdrawal rate — switching from 4% to 3.5% adds roughly 12.5% to the required portfolio.',
        'Retirement length — a 40-year-old needs a 50-year plan, not 30 years; this may push toward a more conservative withdrawal rate.',
      ]),
      h2('Spending assumptions'),
      p('Spending assumptions matter just as much as savings rate. A lower recurring spending target reduces the portfolio required to retire, while a higher target pushes the goal further away. Many planners find that their retirement spending estimate shrinks over time as they build a clearer picture of what actually makes them happy.'),
      h2('How to use the calculator to test assumptions'),
      p('Run the FIRE calculator at several different settings to understand your range, not just a point estimate:'),
      ol([
        'Set a conservative baseline: 6% return, current spending, 3.5% withdrawal rate.',
        'Set a base case: 7% return, slightly reduced spending, 4% withdrawal rate.',
        'Set an optimistic case: 8% return, significantly reduced spending, 4% withdrawal rate.',
        'Note how wide the gap is between conservative and optimistic. That gap is your uncertainty range.',
        'If the gap is large, focus on raising your savings rate rather than assuming market returns.',
      ]),
      p('The point of the calculator is to help you test tradeoffs and decide what to change next. Seeing the range clearly makes the decision about which lever to pull much easier.'),
    ],
  },
  {
    slug: 'compound-interest-and-fire',
    title: 'Compound Interest and FIRE: Why Starting Early Changes Everything',
    description: 'The mathematics of compound growth, why time in the market beats everything else, and how to use compounding deliberately in your FIRE plan.',
    category: 'FIRE Basics',
    publishedAt: '2026-05-03',
    readTime: '5 min read',
    body: [
      h2('How compound interest works'),
      p('Compound interest is earning returns on your returns. In year one, a $10,000 investment at 7% grows to $10,700. In year two, the 7% applies to $10,700 — producing $749 rather than $700. The difference seems small, but over decades it becomes enormous.'),
      ul([
        '$10,000 at 7% → $19,672 after 10 years',
        '$10,000 at 7% → $38,697 after 20 years',
        '$10,000 at 7% → $76,123 after 30 years',
      ]),
      p('No additional contributions. The Rule of 72 is a useful shortcut: divide 72 by your interest rate to estimate the years to double. At 7%, money doubles roughly every 10 years. At 10%, every 7.2 years.'),
      h2('Why starting early matters more than investing more later'),
      p('A 25-year-old who invests $5,000 per year for 10 years (total: $50,000) and then stops will often end up with more money at 65 than a 35-year-old who invests $5,000 per year for 30 years (total: $150,000) — because the early investor gets 40 years of compounding instead of 30. The 10-year head start is worth more than 3x the contributions.'),
      p('This is the fundamental argument for starting your FIRE savings as early as possible, even at a modest level. Every year of delay shrinks your compounding runway.'),
      h2('Index funds and compound growth'),
      p('The most accessible way to capture compound growth is through low-cost index funds. A total market index fund reinvests dividends automatically, compounds across thousands of companies, and charges minimal fees. A 0.05% expense ratio vs a 1% expense ratio on a $500,000 portfolio over 20 years is a difference of over $100,000 in ending wealth, purely from reduced fee drag on compounding.'),
      h2('Compounding works against you too'),
      p('Compound interest accelerates debt in the same way. A credit card balance at 20% annual interest compounds just as relentlessly as a stock portfolio at 7%. Paying off high-interest debt is a guaranteed compound return equal to the interest rate — which typically beats expected market returns on a risk-adjusted basis.'),
      h2('Practical implications for FIRE planning'),
      p('The core disciplines for maximising compound growth:'),
      ul([
        'Stay invested through downturns — missing the 10 best market days in a decade typically cuts long-run returns by 30–50%.',
        'Reinvest dividends automatically via index funds rather than taking cash.',
        'Minimise fee drag — a 1% expense ratio versus 0.05% costs over $100,000 on a $500,000 portfolio over 20 years.',
        'Pay off high-interest debt before investing aggressively — guaranteed return equal to the interest rate.',
        'Start as early as possible — time in market beats timing the market, always.',
      ]),
    ],
  },
  {
    slug: 'index-funds-101-what-to-invest-in',
    title: 'Index Funds 101: What to Invest In for FIRE',
    description: 'The safest, simplest way to invest for FIRE is through low-cost index funds. Here is what they are, why they work, and which ones to choose.',
    category: 'Investing',
    publishedAt: '2026-06-17',
    readTime: '6 min read',
    body: [
      h2('What is an index fund?'),
      p('An index fund is a mutual fund or ETF that holds all (or a representative sample) of the stocks in a market index. The S&P 500 index fund, for example, holds the 500 largest US companies in the same proportions as the index itself. When you buy one share, you own a slice of all 500 companies.'),
      p('The core advantage: automatic diversification, passive management, and ultra-low fees. An index fund tracking the S&P 500 might charge 0.03–0.05% per year, versus 1% or more for an actively managed fund that tries to "beat" the market.'),
      h2('Why index funds dominate FIRE'),
      p('Most professional fund managers fail to beat the market consistently after fees. A 2022 S&P Dow Jones report found that 88% of large-cap fund managers underperformed the S&P 500 over 15 years. By holding an index fund, you guarantee yourself market-level returns minus minimal fees — which beats most professionals.'),
      p('For FIRE specifically, this matters enormously. A 0.5% annual fee difference on a $500,000 portfolio is $2,500 per year. Over 20 years, that compounds to nearly $100,000 in lost wealth. Index funds eliminate that leak.'),
      h2('The three core index funds for a simple portfolio'),
      ul([
        'Total US Market Index (VTI, VTSAX, FSKAX) — all ~3,500 US-listed stocks. Includes large, mid, and small caps.',
        'Total International Index (VXUS, VTIAX, FTIHX) — all major developed and emerging markets outside the US.',
        'Bond Index (BND, VBTLX, FXNAX) — US government and investment-grade corporate bonds. Lowers volatility.',
      ]),
      p('A simple three-fund portfolio (60% US, 30% international, 10% bonds) requires only three trades and rebalances once per year. This is the foundation of most FIRE plans.'),
      h2('ETFs vs mutual funds'),
      p('Index funds come in two wrapper types: ETFs (exchange-traded funds) and mutual funds. For FIRE purposes, it does not matter much. ETFs trade intraday like stocks; mutual funds settle at day-end. Both offer low fees. Choose whichever your brokerage makes easiest.'),
      h2('Where to buy index funds'),
      p('Most brokerages offer low-cost index funds: Vanguard (VTI, VTSAX), Fidelity (FSKAX, FTIHX), and Schwab (SWTSX). Avoid high-fee platforms or robo-advisors that layer fees on top of index funds. Pick a brokerage, open an account, and invest directly.'),
      h2('Getting started'),
      ol([
        'Open a brokerage account (Vanguard, Fidelity, or Schwab).',
        'Decide your target allocation (e.g., 70% US, 20% international, 10% bonds).',
        'Buy index funds in those proportions — your first purchase is the hardest, second-guessing yourself.',
        'Set up automatic monthly contributions if possible.',
        'Rebalance annually if the allocation drifts more than 5%.',
      ]),
      p('That is it. You do not need to pick stocks, time the market, or monitor daily. Index funds make investing simple enough for anyone.'),
    ],
  },
  {
    slug: 'asset-allocation-stocks-vs-bonds',
    title: 'Asset Allocation 101: Stocks vs Bonds and Why the Mix Matters',
    description: 'How to split your portfolio between stocks and bonds to match your age, risk tolerance, and timeline.',
    category: 'Investing',
    publishedAt: '2026-06-17',
    readTime: '7 min read',
    body: [
      h2('What is asset allocation?'),
      p('Asset allocation is the split of your portfolio across different asset classes: primarily stocks and bonds. A "60/40 portfolio" holds 60% stocks and 40% bonds. A "90/10 portfolio" holds 90% stocks and 10% bonds. The allocation determines your risk, volatility, and expected returns.'),
      h2('Stocks vs bonds: the basic trade-off'),
      ul([
        'Stocks: higher expected returns (~7–10% annually), higher volatility, riskier over short periods.',
        'Bonds: lower expected returns (~3–5% annually), lower volatility, safer over short periods.',
      ]),
      p('Stocks are claims on company earnings; bonds are loans to governments or companies. In a downturn, stocks crash first and hardest. Bonds often hold steady or gain value, reducing overall portfolio pain.'),
      h2('Why bonds matter in a FIRE portfolio'),
      p('A common beginner mistake is going 100% stocks because stocks have higher returns. But in FIRE, you will need to withdraw money during downturns. If your portfolio drops 40% in a crash and you have 40% bonds that drop only 10%, the bond portion keeps your portfolio afloat and allows you to avoid selling stocks at rock bottom.'),
      p('This is called a "sequence-of-returns" risk hedge. It protects against retiring into a bear market.'),
      h2('Common allocation rules of thumb'),
      ul([
        'Age-based rule: stock allocation % = 110 − your age. A 35-year-old would hold ~75% stocks, 25% bonds.',
        'Target-date rule: as you approach FIRE, gradually shift more to bonds (e.g., 80% at 10 years away, 60% at 5 years away).',
        'Risk tolerance rule: only hold bonds if seeing a 30% drawdown would cause you to panic-sell. FIRE requires staying invested through downturns.',
      ]),
      h2('Testing your allocation'),
      p('Pressure-test your allocation by looking at historical downturns:'),
      ol([
        'Check the 2008 financial crisis: a 60/40 portfolio dropped ~20%, versus ~57% for 100% stocks.',
        'Check 2022: bonds and stocks both crashed, but a 60/40 had less pain than 100% stocks.',
        'Ask yourself: if my portfolio drops 20%, will I panic and sell? If yes, hold more bonds.',
      ]),
      h2('Rebalancing keeps allocation on track'),
      p('Over time, stocks outpace bonds (higher returns), so your allocation drifts. A 60/40 allocation can become 70/30 without rebalancing. Once yearly, sell some stocks and buy bonds to return to your target. This forces you to "buy low" and "sell high."'),
      h2('The practical allocation for FIRE'),
      p('For most FIRE seekers aged 30–50 with a 10–20 year timeline:'),
      ul([
        '70% total stock market index (US + international)',
        '30% bond index',
      ]),
      p('This allocation has weathered most downturns and allowed FIRE practitioners to retire on schedule. Adjust only if you have a shorter timeline (add bonds) or very high risk tolerance (increase stocks).'),
    ],
  },
  {
    slug: 'tax-loss-harvesting-explained',
    title: 'Tax-Loss Harvesting: Free Money From Your Taxable Account',
    description: 'How to deliberately realise losses to offset gains and reduce taxes — a simple strategy that saves thousands over a FIRE lifetime.',
    category: 'Investing',
    publishedAt: '2026-06-17',
    readTime: '5 min read',
    body: [
      h2('What is tax-loss harvesting?'),
      p('Tax-loss harvesting is selling a losing investment deliberately — not to exit a position, but to lock in a loss you can use to offset investment gains (or ordinary income). The goal: reduce your tax bill without changing your portfolio.'),
      p('Example: you hold a total stock market fund worth $10,000 that has dropped to $9,000. You sell it for a $1,000 loss. You immediately buy a similar (but not identical) total stock market fund to stay invested. You now have a $1,000 tax loss to use.'),
      h2('How tax-loss harvesting saves money'),
      p('If you realised $3,000 in capital gains this year (from selling winners), you can use the $1,000 loss to offset them. Net gain: $2,000, which is taxed instead of $3,000. If your tax rate is 20%, you save $200 in taxes.'),
      p('If your losses exceed gains, you can carry forward up to $3,000 of losses to offset ordinary income (salary, etc.) each year. Excess losses carry forward indefinitely.'),
      h2('The wash-sale rule: the main gotcha'),
      p('If you sell a fund for a loss and buy the same fund back within 30 days (30 days before or after the sale), the IRS disallows the loss. This is the wash-sale rule.'),
      p('How to avoid it: sell the total US market fund at a loss, then buy an international market fund or a different total market fund (same asset class, different fund). Both track market-level returns, so your portfolio stays the same, but the funds are different enough to avoid wash-sale violations.'),
      h2('When to tax-loss harvest'),
      p('The best time is December, when many investors have losses they can realise before year-end. But losses happen randomly — whenever a fund is down, you have an opportunity.'),
      ul([
        'After a market crash (2022, 2020, etc.), almost every position is down. This is the easiest time to harvest losses.',
        'If a single holding has underperformed, you can harvest that loss while staying broadly invested.',
        'If you are rebalancing anyway (e.g., selling bonds to buy stocks), check if the selling will generate losses.',
      ]),
      h2('Real-world example'),
      p('Year 1: you invest $10,000 in a total stock fund. By year 2, it is worth $8,000 (market downturn). You sell for an $2,000 loss and immediately buy an international stock fund for $8,000. Portfolio value: unchanged. Tax benefit: you can now offset $2,000 in gains or ordinary income.'),
      p('In year 3, the market recovers, and your international fund is now worth $10,500. You have realised a gain but still owe no tax because you offset the $2,000 gain with your harvested loss.'),
      h2('Who should tax-loss harvest'),
      p('Tax-loss harvesting is most valuable for:'),
      ul([
        'High earners in high tax brackets (25%+ tax rate).',
        'People with taxable brokerage accounts (401k and Roth accounts cannot use losses).',
        'FIRE seekers with large portfolios — the dollar savings scale with portfolio size.',
      ]),
      p('If you have a small taxable account or low tax bracket, the benefit is smaller. But it is free money: if you are rebalancing anyway, harvesting losses takes 5 minutes and saves hundreds over time.'),
    ],
  },
  {
    slug: 'rebalancing-your-portfolio-annually',
    title: 'Rebalancing Your Portfolio: Why Once a Year Is Enough',
    description: 'How to keep your allocation on track without obsessing over it — a simple annual ritual that maintains your intended risk.',
    category: 'Investing',
    publishedAt: '2026-06-17',
    readTime: '5 min read',
    body: [
      h2('What is rebalancing?'),
      p('Rebalancing is returning your portfolio to your target allocation. If your target is 70% stocks and 30% bonds, but market performance has pushed you to 75% stocks and 25% bonds, rebalancing means selling stocks and buying bonds to get back to 70/30.'),
      p('Why? Because drifting allocation changes your risk without your permission. And rebalancing forces you to sell winners (stocks) and buy losers (bonds) — a mechanical "buy low, sell high."'),
      h2('How often should you rebalance?'),
      p('Most FIRE practitioners rebalance once per year. Some rebalance only when the allocation drifts more than 5% from target. Rebalancing more often (monthly or quarterly) adds trading costs and taxes without meaningful benefit.'),
      h2('When to rebalance'),
      p('The best time is December, right before year-end. You can:'),
      ul([
        'Rebalance back to your target allocation.',
        'Harvest tax losses on any positions down in value.',
        'Make annual contributions to tax-advantaged accounts.',
      ]),
      p('Combine these tasks into one annual ritual, and you are done investing for the year.'),
      h2('A rebalancing example'),
      p('Start of year: target allocation is 70% stocks ($70,000) and 30% bonds ($30,000). Total: $100,000.'),
      p('End of year: stocks have grown to $76,000, bonds to $29,000. Total: $105,000. Current allocation: 72% stocks, 28% bonds.'),
      p('You have drifted 2% toward stocks. To rebalance: sell $2,100 in stocks, buy $2,100 in bonds. New balance: $73,900 stocks, $31,100 bonds. You are back to 70/30.'),
      h2('Rebalancing in taxable accounts'),
      p('Rebalancing in taxable accounts triggers capital gains taxes. If you are selling stocks at a big gain, you will owe taxes. To minimise this:'),
      ul([
        'Rebalance by directing new contributions toward underweight assets (stocks if bonds grew too much).',
        'Harvest losses when available to offset rebalancing gains.',
        'Use tax-advantaged accounts (401k, Roth) for most of your investing if possible.',
      ]),
      h2('Rebalancing in tax-advantaged accounts'),
      p('In 401ks and Roth IRAs, rebalancing has no tax cost. You can sell and buy freely. These accounts are the ideal place to rebalance aggressively.'),
      h2('The mechanical discipline'),
      p('Rebalancing is one of the few times you will feel forced to "sell winners and buy losers." This is exactly right. A disciplined annual rebalance captures the mathematical benefit of contrarian investing: you are systematically buying depressed assets and selling inflated ones.'),
      p('Mark it on your calendar. Once a year, spend 15 minutes rebalancing. Let the portfolio ride the rest of the year.'),
    ],
  },
  {
    slug: 'diversification-why-eggs-in-many-baskets',
    title: 'Diversification: Why Eggs in Many Baskets Beats One',
    description: 'How diversification reduces risk, why it matters more than perfect stock picking, and the simple way to diversify properly.',
    category: 'Investing',
    publishedAt: '2026-06-17',
    readTime: '6 min read',
    body: [
      h2('What is diversification?'),
      p('Diversification is holding many different investments so that losses in one area are offset by gains in another. Instead of putting all money into one stock or sector, you spread it across geographies, industries, and asset types.'),
      p('A diversified FIRE portfolio holds thousands of companies across the US, Europe, and Asia, plus bonds. If tech stocks crash, utilities and international holdings might steady the ship.'),
      h2('Why most individual stock picks fail'),
      p('The average individual stock investor underperforms the market by roughly 2% per year. That is not because they are unlucky — it is because picking winners is harder than it looks. Studies show that 95% of stock pickers fail to beat a simple index fund after fees over 15 years.'),
      p('Diversification solves this by giving up on beating the market. Instead, you accept market-level returns by holding all companies, not trying to pick the winners. This is a massive win.'),
      h2('Types of diversification'),
      ul([
        'Company diversification: holding many stocks reduces the impact of any one company failing.',
        'Sector diversification: holding tech, finance, healthcare, energy, etc. ensures a downturn in one sector does not tank your portfolio.',
        'Geographic diversification: US, Europe, and emerging markets do not move in lockstep. Spreading across geographies cushions regional downturns.',
        'Asset class diversification: stocks and bonds move differently. Bonds often gain when stocks crash, reducing overall volatility.',
      ]),
      h2('How index funds provide instant diversification'),
      p('A single share of a total US market index fund holds pieces of 3,500+ companies. A total international index adds 8,000+ more. One bond fund holds thousands of bonds. Index funds are the easiest way to achieve full diversification.'),
      p('Compare this to owning 10 individual stocks: you are betting on 10 humans to run those companies well. One bad CEO, one accounting scandal, one industry shift — and your concentrated bet can crater.'),
      h2('The math of diversification: lowering volatility'),
      p('Studies show:'),
      ul([
        '1 stock: volatility ~35% per year (wild swings)',
        '10 stocks: volatility ~18% per year',
        '100 stocks: volatility ~11% per year',
        'Entire market (index): volatility ~11% per year',
      ]),
      p('After about 30 stocks, you capture most of the volatility reduction of the market. An index fund with 3,500 stocks captures all of it.'),
      h2('Diversification does not prevent bear markets'),
      p('Diversification reduces volatility but does not prevent losses. In a 2008-style crash, even a fully diversified portfolio drops 30–50%. Diversification just means your losses are smaller than they would be if you were concentrated in stocks or one sector.'),
      h2('The FIRE approach to diversification'),
      p('Hold:'),
      ul([
        '70% global stock index (60% US, 10% international, or split how you prefer)',
        '30% bond index',
      ]),
      p('This portfolio is diversified across thousands of companies, dozens of countries, and two asset classes. You can hold it for decades with confidence. No stock picking, no sector bets, no concentration risk.'),
    ],
  },
  {
    slug: 'dividend-investing-vs-total-return-for-fire',
    title: 'Dividend Investing vs Total Return: Which Strategy Wins for FIRE?',
    description: 'The honest comparison between dividend-focused investing and total-return index investing for FIRE — and why the math usually favours total return despite dividend investing\'s intuitive appeal.',
    category: 'Investing',
    publishedAt: '2026-06-18',
    readTime: '7 min read',
    body: [
      h2('The dividend investing appeal'),
      p('Dividend investing has an intuitive appeal for FIRE retirees: rather than selling shares to fund living expenses, you live off the dividend income your portfolio generates. The portfolio principal remains untouched. You never have to sell. It feels safer, more sustainable.'),
      p('This framing is emotionally powerful — and mathematically misleading. Understanding why requires unpacking what a dividend actually is and how it relates to total return.'),
      h2('What a dividend actually is'),
      p('When a company pays a $1 dividend, its stock price drops by approximately $1 on the ex-dividend date. The dividend is not additional wealth — it is a transfer of value from share price to cash in your brokerage account. Receiving a $1 dividend from a $50 stock leaves you with a $49 stock and $1 cash: total value unchanged at $50 (before taxes).'),
      p('Selling $1 worth of a $50 stock (0.02 shares) leaves you with 0.98 shares worth $49 and $1 cash: same result. The dividend and the sale are economically equivalent. This is the dividend irrelevance theorem in corporate finance, first formalised by Modigliani and Miller.'),
      h2('The tax problem with dividends'),
      p('Dividends create a tax event whether you want the income or not. A dividend investor holding $1,000,000 in high-yield dividend stocks yielding 4% receives $40,000 in dividends — and owes taxes on all of it, even if they only needed $20,000 to live on. The excess dividend is reinvested, but it was taxed first.'),
      p('A total-return investor can control when they realise gains. By selling only what they need, they can manage their tax bracket, harvest losses to offset gains, and keep income below thresholds that trigger higher rates on Social Security or capital gains. This flexibility is a concrete advantage, not a theoretical one.'),
      h2('Yield vs total return'),
      p('High-dividend-yield stocks tend to cluster in mature, slow-growth industries: utilities, telecoms, consumer staples, REITs. Low or no-dividend stocks include fast-growing technology, healthcare, and consumer discretionary companies. A portfolio screened for high yield systematically excludes high-growth sectors.'),
      p('Over the past 30 years, a total US market index fund has outperformed most high-dividend indices on total return (price appreciation plus dividends). The extra yield came at the cost of lower capital appreciation — the trade-off was not favourable.'),
      h2('Where dividend investing does have merit'),
      ul([
        'Psychological clarity: some retirees genuinely spend less from dividends than from shares, avoiding the discipline problem of share-selling in downturns. If dividends stop the panic-selling, the psychological benefit is real.',
        'Simplicity in certain accounts: in taxable accounts late in life, spending dividends without triggering rebalancing-related capital gains can simplify the tax picture.',
        'Income stability: dividend-focused portfolios tend to have lower price volatility, which some retirees prefer.',
      ]),
      h2('The practical conclusion for FIRE investors'),
      p('For accumulation-phase FIRE investors, total-market index funds dominate: lower taxes, better diversification, higher long-run total return. For the decumulation phase, a pure dividend strategy is not optimal — but a blend of dividend-paying stocks and index funds is reasonable if it helps you stay invested.'),
      p('The worst outcome is building a portfolio around high-dividend stocks in tax-advantaged accounts (wasting the tax control benefit) while holding concentrated sector exposure that trails the total market over 20 years. If you want dividends, get them through a total-market or balanced index fund rather than a dedicated dividend fund.'),
    ],
  },
  {
    slug: 'mini-retirement-sabbatical-before-fire',
    title: 'Mini-Retirements and Sabbaticals: Taking Time Off Before You Reach FIRE',
    description: 'How to structure a planned career break, what it costs your FIRE timeline, and why strategic sabbaticals can make the journey more sustainable without derailing financial independence.',
    category: 'Planning',
    publishedAt: '2026-06-18',
    readTime: '6 min read',
    body: [
      h2('The case for not waiting until the end'),
      p('The standard FIRE narrative is linear: work hard, save aggressively, reach the number, then live freely. This framing can make the accumulation phase feel like deferred living — decades of sacrifice followed by the reward. Mini-retirements challenge this structure by distributing rest and freedom across the journey rather than concentrating them at the end.'),
      p('Tim Ferriss popularised the term in The 4-Hour Work Week. The underlying insight predates him: a year off at 35 costs far less in lifetime earnings than a year off at 65, because at 35 you have decades of future income to offset the gap. The opportunity cost of a sabbatical declines sharply as your portfolio grows.'),
      h2('The FIRE math of a one-year sabbatical'),
      p('A one-year sabbatical has three costs to your FIRE timeline:'),
      ul([
        'Lost savings: the contributions you would have made during the year.',
        'Lost compounding: those contributions missing from the portfolio for the remaining accumulation period.',
        'Sabbatical spending: if you spend more than usual during the break, that adds to the gap.',
      ]),
      p('Example: you earn $120,000 and save $48,000 per year (40% savings rate). A one-year sabbatical costs roughly $48,000 in lost savings. If you are 10 years from FIRE and that $48,000 would have compounded at 7%, the real cost is closer to $94,000 in future portfolio value. That translates to roughly 0.5–1 year of additional working time added to your FIRE date.'),
      p('For most people, one year off adds 1–2 years to the FIRE timeline. Whether that trade-off is worth it depends entirely on what you use the time for.'),
      h2('Types of sabbaticals FIRE planners take'),
      ul([
        'Recovery sabbatical: pure rest after burnout. Typically 3–6 months. High value if the alternative is health damage, career self-sabotage, or quitting impulsively.',
        'Project sabbatical: time to build something — a creative project, a business, travel writing, a language. May generate some income.',
        'Geographic sabbatical: move somewhere cheaper for a year. Lower cost of living can partially offset the income gap.',
        'Parental break: one partner takes an extended leave during early childhood, often partially funded by parental leave benefits.',
      ]),
      h2('How to fund a sabbatical without touching retirement accounts'),
      p('The cleanest approach is a dedicated sabbatical fund — a separate savings account funded alongside your FIRE portfolio. Contribute a small percentage of income each year (5–10%), and let it accumulate until it covers 12–18 months of expenses. This keeps the retirement portfolio intact and prevents the psychological damage of "setting back" FIRE progress.'),
      p('The sabbatical fund has a secondary benefit: it functions as a career optionality fund. Knowing you have 12 months of runway makes it easier to negotiate, change roles, or walk away from toxic situations without panic.'),
      h2('The negotiated sabbatical'),
      p('Many employers offer unpaid leave for long-tenured employees, or will agree to a 3–6 month sabbatical to retain a valued person rather than lose them entirely. If your FIRE date is 5+ years away, a negotiated sabbatical preserves career continuity (employer relationship, benefits, return right) while providing real time off. The cost is lower than a full resignation and the runway to return if needed.'),
      h2('When to take the sabbatical vs just reaching FIRE'),
      p('If you are within 2–3 years of FIRE, the math usually favours grinding through and reaching the number cleanly. The timeline cost of a sabbatical is highest when compounding has the most time to work. If you are 8–15 years from FIRE and burning out, the timeline cost of a break is smaller and the personal cost of not taking one may be higher than it appears in a spreadsheet.'),
    ],
  },
  {
    slug: 'fire-milestones-100k-250k-500k-meaningful-checkpoints',
    title: 'FIRE Milestones: Why $100k, $250k, and $500k Are Inflection Points',
    description: 'How compounding creates natural momentum milestones on the FIRE path — and why reaching each one accelerates the journey in measurable, concrete ways.',
    category: 'FIRE Basics',
    publishedAt: '2026-06-18',
    readTime: '5 min read',
    body: [
      h2('The milestone psychology'),
      p('The FIRE journey is long. A 15-year accumulation phase contains thousands of individual saving and investing decisions, and the early years feel slow: contributions matter more than returns when the portfolio is small. Milestones give the journey structure — clear evidence that compounding is working and the timeline is moving.'),
      p('The milestones that matter most are not arbitrary round numbers but inflection points where compounding behaviour meaningfully changes.'),
      h2('The $100,000 milestone: compounding becomes visible'),
      p('At a 7% annual return, $100,000 generates approximately $7,000 in portfolio growth per year. For someone saving $20,000 per year, their portfolio is now growing from returns alone at a rate equivalent to 35% of their annual savings contribution. Compounding is no longer invisible.'),
      p('Below $100,000, the market\'s annual return on your portfolio is smaller than a single good month of savings. Above $100,000, market returns start to matter as much as your contribution behaviour. This is the point where "the money starts working for you" becomes literally true rather than aspirational.'),
      h2('The $250,000 milestone: returns approach savings'),
      p('At $250,000 and 7% returns, the portfolio generates roughly $17,500 per year from returns alone. For a household saving $40,000 per year, market growth is now contributing 44% of the portfolio\'s annual increase. Contribution behaviour still dominates, but returns are a major factor.'),
      p('This milestone also marks roughly 25% of a $1,000,000 FIRE target — the first quarter. Reaching it typically takes 7–10 years for most FIRE-track households. The next $250,000 often takes 4–6 years, and the final $500,000 can come in as few as 5–8 years.'),
      h2('The $500,000 milestone: returns exceed savings'),
      p('At $500,000 and 7%, the portfolio returns approximately $35,000 per year. For a household saving $40,000 annually, the portfolio is now growing nearly as much from returns as from contributions. This is the compounding inflection point: the portfolio has effectively become a second income source.'),
      p('From this point forward, market crashes become more psychologically difficult (the dollar amounts are larger) but mathematically less threatening (you have more runway before the portfolio runs out, and returns in recovery years are also larger). Staying invested becomes the dominant skill.'),
      h2('The $1,000,000 milestone: functional financial independence for many'),
      p('At $1,000,000 and a 4% withdrawal rate, the portfolio supports $40,000 per year indefinitely — enough for many FIRE households to cover essential expenses. Even before reaching a full FIRE number, $1,000,000 creates real optionality: the ability to take lower-stress work, negotiate more aggressively, or fund a career change without financial panic.'),
      h2('How to use milestones without over-indexing on them'),
      p('The danger of milestone thinking is over-checking: watching daily portfolio values and reacting emotionally to fluctuations. Milestones work best as annual checkpoints — a signal to reflect on the trajectory, not a scoreboard to watch daily.'),
      ul([
        'Set a milestone target for each year, not each quarter.',
        'Celebrate the milestone when reached, then return attention to the inputs you control: savings rate, spending, contribution consistency.',
        'Do not recalculate your FIRE date more than once a quarter. Frequent recalculation reinforces market-return anxiety rather than savings-rate clarity.',
      ]),
    ],
  },
]

const articleMetaBySlug: Record<string, LearnArticleMeta> = {
  'what-is-fire-financial-independence-retire-early': {
    primaryStage: 'starting-out',
    secondaryStages: ['building-momentum'],
    relatedCalculators: [
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
      { href: '/calculators/savings-rate', label: 'Savings Rate Calculator' },
    ],
  },
  'how-much-money-do-i-need-to-retire': {
    primaryStage: 'approaching-fire',
    secondaryStages: ['building-momentum'],
    relatedCalculators: [
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
      { href: '/calculators/coast-fire', label: 'Coast FIRE Calculator' },
    ],
  },
  'what-is-the-4-percent-rule': {
    primaryStage: 'living-in-fire',
    secondaryStages: ['approaching-fire'],
    relatedCalculators: [
      { href: '/calculators/4-percent-rule', label: 'Safe Withdrawal Calculator' },
      { href: '/calculators/coast-fire', label: 'Coast FIRE Calculator' },
    ],
  },
  'why-savings-rate-matters-more-than-income': {
    primaryStage: 'starting-out',
    secondaryStages: ['building-momentum'],
    relatedCalculators: [
      { href: '/calculators/savings-rate', label: 'Savings Rate Calculator' },
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
    ],
  },
  'coast-fire-vs-full-fire': {
    primaryStage: 'building-momentum',
    secondaryStages: ['approaching-fire'],
    relatedCalculators: [
      { href: '/calculators/coast-fire', label: 'Coast FIRE Calculator' },
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
    ],
  },
  'lean-fire-vs-fat-fire': {
    primaryStage: 'building-momentum',
    secondaryStages: ['approaching-fire'],
    relatedCalculators: [
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
      { href: '/calculators/coast-fire', label: 'Coast FIRE Calculator' },
    ],
  },
  'barista-fire': {
    primaryStage: 'living-in-fire',
    secondaryStages: ['approaching-fire'],
    relatedCalculators: [
      { href: '/calculators/coast-fire', label: 'Coast FIRE Calculator' },
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
    ],
  },
  'roth-ira-vs-401k-for-fire': {
    primaryStage: 'building-momentum',
    secondaryStages: ['living-in-fire'],
    relatedCalculators: [
      { href: '/calculators/savings-rate', label: 'Savings Rate Calculator' },
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
    ],
  },
  'sequence-of-returns-risk': {
    primaryStage: 'approaching-fire',
    secondaryStages: ['living-in-fire'],
    relatedCalculators: [
      { href: '/calculators/4-percent-rule', label: 'Safe Withdrawal Calculator' },
      { href: '/dashboard', label: 'Run Monte Carlo in Dashboard' },
    ],
  },
  'how-fire-assumptions-change-your-retirement-date': {
    primaryStage: 'approaching-fire',
    secondaryStages: ['building-momentum'],
    relatedCalculators: [
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
    ],
  },
  'compound-interest-and-fire': {
    primaryStage: 'starting-out',
    secondaryStages: ['building-momentum'],
    relatedCalculators: [
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
      { href: '/calculators/savings-rate', label: 'Savings Rate Calculator' },
    ],
  },
  'index-funds-101-what-to-invest-in': {
    primaryStage: 'building-momentum',
    secondaryStages: ['starting-out'],
    relatedCalculators: [
      { href: '/?source=learn-index-funds', label: 'FIRE Calculator' },
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
    ],
  },
  'asset-allocation-stocks-vs-bonds': {
    primaryStage: 'building-momentum',
    secondaryStages: ['approaching-fire'],
    relatedCalculators: [
      { href: '/calculators/4-percent-rule', label: 'Safe Withdrawal Calculator' },
      { href: '/dashboard', label: 'Test Your Allocation' },
    ],
  },
  'tax-loss-harvesting-explained': {
    primaryStage: 'approaching-fire',
    secondaryStages: ['building-momentum'],
    relatedCalculators: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/?source=learn-tax-loss', label: 'FIRE Calculator' },
    ],
  },
  'rebalancing-your-portfolio-annually': {
    primaryStage: 'building-momentum',
    secondaryStages: ['approaching-fire', 'living-in-fire'],
    relatedCalculators: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/calculators/4-percent-rule', label: 'FIRE Calculator' },
    ],
  },
  'diversification-why-eggs-in-many-baskets': {
    primaryStage: 'starting-out',
    secondaryStages: ['building-momentum'],
    relatedCalculators: [
      { href: '/?source=learn-diversification', label: 'FIRE Calculator' },
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
    ],
  },
  'dividend-investing-vs-total-return-for-fire': {
    primaryStage: 'building-momentum',
    secondaryStages: ['approaching-fire', 'living-in-fire'],
    relatedCalculators: [
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
      { href: '/?source=learn-dividends', label: 'FIRE Calculator' },
    ],
  },
  'mini-retirement-sabbatical-before-fire': {
    primaryStage: 'building-momentum',
    secondaryStages: ['starting-out', 'approaching-fire'],
    relatedCalculators: [
      { href: '/calculators/savings-rate', label: 'Savings Rate Calculator' },
      { href: '/?source=learn-sabbatical', label: 'FIRE Calculator' },
    ],
  },
  'fire-milestones-100k-250k-500k-meaningful-checkpoints': {
    primaryStage: 'starting-out',
    secondaryStages: ['building-momentum'],
    relatedCalculators: [
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
      { href: '/?source=learn-milestones', label: 'FIRE Calculator' },
    ],
  },
}

export const learnStages: LearnStage[] = [
  {
    id: 'starting-out',
    label: 'Starting Out',
    shortLabel: 'Start here',
    description: 'Learn the core ideas first: what FIRE is, why savings rate matters, and how compounding and simple rules of thumb shape the journey.',
    whatMattersNow: 'Get the foundations right before you optimize. Learn the language, understand your savings rate, and run your first calculator with confidence.',
    articleSlugs: [
      'what-is-fire-financial-independence-retire-early',
      'why-savings-rate-matters-more-than-income',
      'compound-interest-and-fire',
      'diversification-why-eggs-in-many-baskets',
      'what-is-the-4-percent-rule',
      'fire-milestones-100k-250k-500k-meaningful-checkpoints',
    ],
    calculatorLinks: [
      { href: '/calculators/savings-rate', label: 'Savings Rate Calculator' },
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
    ],
    nextActionLabel: 'Run your first FIRE estimate',
    nextActionHref: '/?source=learn-stage-starting-out',
  },
  {
    id: 'building-momentum',
    label: 'Building Momentum',
    shortLabel: 'Build momentum',
    description: 'You understand the basics. Now learn how to invest: index funds, asset allocation, diversification, and tax efficiency. Then focus on account strategy and tradeoffs that move your FIRE date.',
    whatMattersNow: 'Invest your savings wisely using low-cost index funds. Master your allocation, rebalance annually, and reduce taxes. Combine this with account strategy (401k, Roth) to improve the machine.',
    articleSlugs: [
      'index-funds-101-what-to-invest-in',
      'diversification-why-eggs-in-many-baskets',
      'asset-allocation-stocks-vs-bonds',
      'roth-ira-vs-401k-for-fire',
      'rebalancing-your-portfolio-annually',
      'tax-loss-harvesting-explained',
      'coast-fire-vs-full-fire',
      'lean-fire-vs-fat-fire',
      'how-fire-assumptions-change-your-retirement-date',
      'dividend-investing-vs-total-return-for-fire',
      'mini-retirement-sabbatical-before-fire',
    ],
    calculatorLinks: [
      { href: '/calculators/coast-fire', label: 'Coast FIRE Calculator' },
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
      { href: '/calculators/savings-rate', label: 'Savings Rate Calculator' },
    ],
    nextActionLabel: 'Set up your investment account',
    nextActionHref: '/?source=learn-stage-building-momentum',
  },
  {
    id: 'approaching-fire',
    label: 'Approaching FIRE',
    shortLabel: 'Pressure-test',
    description: 'As FIRE gets closer, the important work shifts to target sizing, assumption pressure-testing, and protecting the plan from fragile assumptions.',
    whatMattersNow: 'Dial in the target. Stress-test spending, withdrawal assumptions, and downside risk before you trust the retirement date.',
    articleSlugs: [
      'how-much-money-do-i-need-to-retire',
      'how-fire-assumptions-change-your-retirement-date',
      'sequence-of-returns-risk',
      'what-is-the-4-percent-rule',
    ],
    calculatorLinks: [
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
      { href: '/dashboard', label: 'Open Dashboard Simulations' },
    ],
    nextActionLabel: 'Pressure-test your FIRE number',
    nextActionHref: '/calculators/4-percent-rule',
  },
  {
    id: 'living-in-fire',
    label: 'Living in FIRE',
    shortLabel: 'Stay resilient',
    description: 'Once work is optional, the focus shifts to withdrawal discipline, account sequencing, flexible spending, and making the plan hold up through real life.',
    whatMattersNow: 'Protect the portfolio. Withdrawal strategy, tax-aware access, and sequence risk now matter more than pure accumulation speed.',
    articleSlugs: [
      'what-is-the-4-percent-rule',
      'sequence-of-returns-risk',
      'barista-fire',
      'roth-ira-vs-401k-for-fire',
    ],
    calculatorLinks: [
      { href: '/calculators/4-percent-rule', label: 'Safe Withdrawal Calculator' },
      { href: '/dashboard', label: 'Open Dashboard Projections' },
    ],
    nextActionLabel: 'Review your withdrawal assumptions',
    nextActionHref: '/dashboard',
  },
]

export function getLearnArticle(slug: string) {
  return learnArticles.find((article) => article.slug === slug)
}

export function isLearnStageId(value: string): value is LearnStageId {
  return learnStages.some((stage) => stage.id === value)
}

export function getLearnStage(stageId: LearnStageId) {
  return learnStages.find((stage) => stage.id === stageId)!
}

export function getLearnArticleMeta(articleOrSlug: LearnArticle | string): LearnArticleMeta {
  const slug = typeof articleOrSlug === 'string' ? articleOrSlug : articleOrSlug.slug
  return articleMetaBySlug[slug]
}

export function getStageArticles(stageId: LearnStageId) {
  const stage = getLearnStage(stageId)
  return stage.articleSlugs
    .map((slug) => getLearnArticle(slug))
    .filter((article): article is LearnArticle => Boolean(article))
}

export function getRelatedArticles(slug: string, limit = 3) {
  const meta = getLearnArticleMeta(slug)
  const sameStage = getStageArticles(meta.primaryStage).filter((article) => article.slug !== slug)
  const crossStage = learnArticles.filter((article) => {
    if (article.slug === slug) return false
    const articleMeta = getLearnArticleMeta(article)
    return articleMeta.secondaryStages?.includes(meta.primaryStage)
  })

  return [...sameStage, ...crossStage].filter((article, index, arr) =>
    arr.findIndex((candidate) => candidate.slug === article.slug) === index,
  ).slice(0, limit)
}
