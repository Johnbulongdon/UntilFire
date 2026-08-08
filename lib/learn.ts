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
    slug: 'renting-vs-buying-home-fire-path',
    title: 'Renting vs Buying a Home on the FIRE Path: The Honest Comparison',
    description: 'Why home ownership is not always the financially superior choice for FIRE investors — how to compare renting and buying honestly, and when each makes sense on the path to financial independence.',
    category: 'Planning',
    publishedAt: '2026-06-18',
    readTime: '7 min read',
    body: [
      h2('The cultural assumption about home ownership'),
      p('In American personal finance culture, buying a home is treated as an unambiguous milestone of financial maturity and wealth building. The alternative — renting — is often framed as "throwing money away." This framing is misleading and costs many FIRE investors years on their timeline by pushing them into homeownership that does not serve their financial goals.'),
      p('The honest comparison between renting and buying depends on your specific situation: the price-to-rent ratio in your city, your expected tenure, the opportunity cost of the down payment, and the flexibility value of each option. There is no universal right answer.'),
      h2('The true cost of ownership'),
      p('Most home ownership comparisons compare mortgage payments to rent — and stop there. The full cost of ownership includes:'),
      ul([
        'Mortgage interest: on a $400,000 mortgage at 7%, roughly $28,000 per year in interest in the early years.',
        'Property taxes: 1–3% of home value annually. On a $500,000 home, $5,000–$15,000 per year.',
        'Maintenance and repairs: 1–2% of home value annually on average. $5,000–$10,000 per year on a $500,000 home.',
        'Insurance, HOA fees, PMI if applicable.',
        'Opportunity cost: the down payment invested in index funds at 7% annual return versus tied up in home equity.',
      ]),
      p('A household putting $80,000 down on a $400,000 home foregoes $5,600 per year in returns at 7%. That is real money that does not appear in most rent-vs-buy calculators.'),
      h2('The price-to-rent ratio'),
      p('The price-to-rent ratio (home price divided by annual rent for a comparable property) is the most useful single metric for the rent-vs-buy decision. A price-to-rent ratio below 15 generally favours buying. Above 20, renting is usually more economically rational. Above 30 (common in coastal cities like San Francisco, New York, and Seattle), the financial case for buying is very weak.'),
      p('To calculate: if a home costs $600,000 and rents for $2,500/month ($30,000/year), the ratio is 20. In that market, the numbers marginally favour renting over buying for most horizons under 10 years.'),
      h2('Tenure is the most important variable'),
      p('Buying almost always becomes more financially rational the longer you stay. Transaction costs (agent commissions, closing costs) typically run 8–10% of the home value round-trip. On a $500,000 home, that is $40,000–$50,000 in friction costs that must be overcome by price appreciation and rental equivalent savings before you break even. Under 5 years, buying rarely wins economically. At 10+ years, it often does.'),
      p('For FIRE investors who plan to move cities for geographic arbitrage, or who want mobility for early retirement, the flexibility value of renting is significant and should be weighted in the analysis.'),
      h2('Home equity is illiquid'),
      p('Home equity does not generate income or compound unless you sell. A $300,000 equity position in a house produces $0 in returns unless it is accessed through a sale, HELOC, or reverse mortgage. The same $300,000 in index funds produces roughly $21,000 per year at 7% returns — which compounds. FIRE investors who accumulate wealth primarily in home equity rather than investable assets often find themselves "house rich, cash poor" at FIRE time.'),
      h2('When buying makes sense for FIRE investors'),
      ul([
        'Price-to-rent ratio below 15 in your market.',
        'You plan to stay 7+ years.',
        'You want to lock in housing costs against rent inflation.',
        'House hacking — renting out rooms or an ADU — turns the home into an investment that generates income.',
        'The home provides lifestyle value (outdoor space, school district, community) that renting cannot replicate.',
      ]),
      p('The FIRE-aware approach: if buying makes financial sense for your situation, buy. If it does not, rent confidently and invest the difference. The goal is financial independence, not homeownership.'),
    ],
  },
  {
    slug: 'wills-trusts-estate-planning-fire',
    title: 'Wills, Trusts, and Estate Planning: What FIRE Investors Need Before They Retire',
    description: 'Why early retirees need estate documents more urgently than most — the basics of wills, revocable living trusts, beneficiary designations, and powers of attorney for FIRE households.',
    category: 'Planning',
    publishedAt: '2026-06-18',
    readTime: '6 min read',
    body: [
      h2('Why FIRE retirees need estate documents earlier'),
      p('Most people think estate planning is for the elderly. For FIRE retirees, this is exactly wrong. A 40-year-old with a $1.5 million portfolio and no will has left enormous decisions to state intestacy law and court proceedings if something goes wrong. Early retirees have more to protect and more years of exposure than someone retiring at 65. The earlier you retire, the more important these documents become.'),
      p('Estate planning also addresses incapacity — not just death. A healthcare directive and durable power of attorney determine who makes medical and financial decisions if you become incapacitated. For someone who has retired at 40, a decade of disability without these documents can be catastrophic for both financial and personal outcomes.'),
      h2('The four core documents'),
      h3('1. Will (Last Will and Testament)'),
      p('A will specifies how your assets are distributed after death, names an executor to manage the process, and designates guardians for minor children. Without a will, your state\'s intestacy laws distribute assets — which may not reflect your wishes. Wills go through probate (a court process), which is public and can be time-consuming. A basic will costs $200–$500 from an online service or $500–$1,500 from an estate attorney.'),
      h3('2. Revocable Living Trust'),
      p('A revocable living trust holds your assets during your lifetime and passes them to beneficiaries at death without probate. Unlike a will, trusts are private and can be settled in weeks rather than months. For FIRE investors with significant investment assets across multiple accounts, a living trust simplifies the transfer process considerably. The trust does not change your tax situation during your lifetime — you still file taxes normally and control all assets. Cost: $1,500–$3,000+ through an attorney.'),
      h3('3. Durable Power of Attorney'),
      p('This document designates someone to manage your financial affairs if you become incapacitated. Without it, a court must appoint a conservator — an expensive, slow process. Your designated agent can access bank accounts, manage investments, and pay bills on your behalf. This is critical for any FIRE retiree who has left the workforce and cannot rely on an employer\'s HR processes to handle incapacity situations.'),
      h3('4. Healthcare Directive (Living Will + Healthcare Proxy)'),
      p('A healthcare directive specifies your medical treatment wishes if you cannot communicate them, and designates a healthcare proxy (also called a healthcare power of attorney) to make medical decisions. This is not about terminal illness planning — it covers any situation where you are temporarily unable to communicate, from a car accident to surgery complications.'),
      h2('Beneficiary designations: the documents that override your will'),
      p('Retirement accounts (401k, IRA, Roth IRA), life insurance, and many bank accounts pass directly to named beneficiaries — bypassing your will entirely. If your will leaves everything to your spouse but your IRA still names an ex-partner as beneficiary, the ex gets the IRA. Beneficiary designations should be reviewed after every major life event: marriage, divorce, birth of a child, or death of a named beneficiary.'),
      p('Also designate contingent beneficiaries (backup beneficiaries if the primary predeceases you). Missing contingent beneficiaries can send retirement accounts through probate, costing time and money.'),
      h2('When to update estate documents'),
      ul([
        'At FIRE — when you first build significant assets and leave the workforce.',
        'After marriage or divorce.',
        'After the birth or adoption of each child.',
        'After the death of a named executor, trustee, or beneficiary.',
        'After a significant change in assets or state of residence.',
        'Every 5 years as a routine review.',
      ]),
    ],
  },
  {
    slug: 'market-crash-psychology-staying-invested',
    title: 'Market Crash Psychology: How to Stay Invested When It Hurts',
    description: 'The behavioral finance behind panic selling, how much market crashes actually cost in lifetime returns, and practical strategies for staying invested through downturns on the FIRE path.',
    category: 'Psychology',
    publishedAt: '2026-06-18',
    readTime: '6 min read',
    body: [
      h2('Why staying invested is the hardest part'),
      p('The mathematics of index investing are simple. The human execution is not. Watching a $400,000 portfolio drop to $280,000 — a 30% decline — in three months is genuinely frightening. Every financial news headline in a bear market is designed to make the fear worse. The instinct to sell, stop the pain, and "wait until things calm down" is powerful and deeply human.'),
      p('This instinct is also extremely expensive. Timing the market — selling during crashes and buying back in during recoveries — systematically underperforms staying invested, for reasons that compound relentlessly over long timelines.'),
      h2('The cost of missing the best days'),
      p('A frequently cited statistic from J.P. Morgan Asset Management: an investor who stayed fully invested in the S&P 500 from 2003 to 2022 earned an annualised 9.8% return. An investor who missed just the 10 best days during that period earned 5.6%. Missing the 20 best days: 2.0%. Missing the 40 best days: a negative return.'),
      p('The brutal irony is that the best market days almost always occur during or immediately after the worst periods. The investor who sold during the 2009 crash and waited for certainty missed the March–June 2009 rally — one of the strongest 3-month periods in market history. The investor who sold in March 2020 missed the fastest recovery on record.'),
      h2('What panic selling actually costs'),
      p('Consider a $300,000 portfolio that drops 35% to $195,000. An investor panic-sells and moves to cash. The market recovers over 18 months to new highs — but the cash investor missed 50% of the recovery before feeling confident enough to reinvest. They buy back in when the portfolio would have been at $360,000, but they are sitting at $195,000. They have permanently impaired their portfolio by $165,000, not temporarily.'),
      p('The FIRE math is unforgiving here. At a 4% withdrawal rate, $165,000 in lost portfolio value represents $6,600 per year in reduced sustainable income — every year of retirement, forever.'),
      h2('Behavioral finance: why we panic sell'),
      p('Loss aversion — the psychological finding that losses feel roughly twice as painful as equivalent gains feel good — explains most panic selling. A $50,000 portfolio loss feels worse than a $50,000 gain feels good. Combined with recency bias (the most recent trend feels like it will continue indefinitely), investors in falling markets genuinely believe the portfolio will go to zero.'),
      p('The financial media amplifies this. Bear market coverage is relentlessly negative. No CNBC segment starts with "markets down 30% — great buying opportunity for patient investors." The coverage treats every down day as a crisis requiring action.'),
      h2('Practical strategies for staying invested'),
      ul([
        'Automate investing: automatic contributions on a fixed schedule invest regardless of market conditions. You do not make a decision each month — the system does. Automation removes the emotional trigger point.',
        'Do not check your portfolio daily. Weekly or monthly is enough. Daily checking during a crash produces anxiety without improving outcomes.',
        'Reframe the crash: during accumulation, a crash is a sale. Your future contributions buy more shares at lower prices. A 30% drop means your next $1,000 contribution buys 43% more shares than before the crash.',
        'Write a personal investment policy statement before a crash: what you will do when markets fall 20%, 30%, 40%. Having a pre-committed plan removes the in-the-moment decision.',
        'Keep 1–2 years of expenses in cash: knowing you do not need to sell investments for two years provides the psychological runway to ride out most downturns.',
      ]),
      h2('The long view'),
      p('Every major market crash in history — 1929, 1974, 1987, 2000, 2008, 2020 — was eventually followed by new highs. Every investor who stayed invested recovered. Every investor who sold at the bottom and waited for certainty bought back higher. The pattern has held for over a century. Nothing about it suggests the next crash will be different.'),
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
  'renting-vs-buying-home-fire-path': {
    primaryStage: 'building-momentum',
    secondaryStages: ['starting-out', 'approaching-fire'],
    relatedCalculators: [
      { href: '/calculators/savings-rate', label: 'Savings Rate Calculator' },
      { href: '/?source=learn-rent-vs-buy', label: 'FIRE Calculator' },
    ],
  },
  'wills-trusts-estate-planning-fire': {
    primaryStage: 'approaching-fire',
    secondaryStages: ['living-in-fire'],
    relatedCalculators: [
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
      { href: '/dashboard', label: 'Dashboard' },
    ],
  },
  'market-crash-psychology-staying-invested': {
    primaryStage: 'starting-out',
    secondaryStages: ['building-momentum', 'approaching-fire'],
    relatedCalculators: [
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
      { href: '/?source=learn-crash-psychology', label: 'FIRE Calculator' },
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
      'market-crash-psychology-staying-invested',
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
      'renting-vs-buying-home-fire-path',
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
      'wills-trusts-estate-planning-fire',
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
