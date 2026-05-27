# UntilFire — User & Buyer Personas
Last updated: May 2026

---

## Overview

UntilFire has three primary personas and two secondary personas. The product must nail the primary personas before optimising for secondary ones.

**Positioning guardrail:** Location, cost-of-living, and tax detail help these personas trust the answer. They are not the core promise. The core promise is that UntilFire does the journey with them: freedom date, next move, and ongoing progress.

| Persona | Name | Age | Income | Key motivation |
|---|---|---|---|---|
| P1 — The Curious Calculator | Alex | 28 | $95k | "Am I even on track?" |
| P2 — The Serious Planner | Sarah | 34 | $160k | "Show me the real plan" |
| P3 — The Global Worker | Wei | 31 | $120k | "What path works for my life?" |
| S1 — The Nomad Optimizer | Diego | 29 | $85k | "Which city makes FIRE fastest?" |
| S2 — The Late Starter | Mark | 42 | $110k | "Is it too late for me?" |

---

## Primary Persona 1 — The Curious Calculator

**Name**: Alex Chen  
**Age**: 28  
**Location**: Austin, TX  
**Job**: Software engineer, 3 years into career  
**Income**: $95,000 gross  
**Savings rate**: ~15% (contributing to 401k, not much else)  
**Net worth**: ~$35,000  

### Background
Alex heard about FIRE on a podcast and Googled it. Has a vague sense that retiring early could be possible but has never actually run the numbers. Knows roughly what they earn and spend but hasn't tracked it precisely. Not a finance nerd — just an engineer who likes clear answers.

### Goals
- Understand if FIRE is achievable for them personally
- Know what number they're actually aiming for
- Get a sense of how long it will take at their current savings rate
- Feel motivated, not overwhelmed

### Frustrations with existing tools
- ProjectionLab has too many inputs — gives up before seeing results
- Generic calculators give a number but no path
- Most tools require account signup before showing anything useful
- Math is opaque — they don't know if the answer is realistic or what to do next

### How they find UntilFire
- Reddit post in r/financialindependence: "just ran my FIRE number, it's $1.4M, here's the tool I used"
- X/Twitter link from @GetUntilFire sharing a city comparison infographic

### What they need from UntilFire
- A result in under 60 seconds without signing up
- Their actual FIRE number, not a range
- Some context on what that means ("you could retire in 2043 — age 45")
- One obvious next move and a reason to come back and track progress

### Behaviour in the product
- Comes via referral link, starts wizard immediately
- Selects Austin from dropdown quickly
- Enters exact income (knows this)
- Guesses on savings (~$1,000–$1,500/mo)
- Watches the reveal animation — gets an emotional hit
- Shares the number with a friend
- Signs up for the dashboard if the number feels meaningful

### Quote
> "I always knew I was saving something. I just didn't know if it was enough or if FIRE was even realistic for me. Seeing the actual number made it real."

---

## Primary Persona 2 — The Serious Planner

**Name**: Sarah Mitchell  
**Age**: 34  
**Location**: San Francisco, CA  
**Job**: Senior product manager at a tech company  
**Income**: $160,000 base + $40,000 RSUs  
**Savings rate**: ~35%  
**Net worth**: ~$320,000 (brokerage, 401k, some crypto)  

### Background
Sarah has been tracking her finances for 2 years using a spreadsheet. She knows her FIRE number roughly — somewhere around $2.5M — but wants a tool that accounts for her specific San Francisco cost of living and California state taxes, not just a generic multiplier. She's looked at ProjectionLab but found it overwhelming for a first pass.

### Goals
- Validate her own calculations with a credible, tax-aware tool
- Understand the impact of her SF cost of living vs. potentially relocating
- Track her month-to-month progress toward her FIRE date
- Get actionable insights, not generic tips

### Frustrations with existing tools
- Monarch Money is too budgeting-focused — doesn't show the FIRE projection clearly
- ProjectionLab requires too much setup time for a quick answer
- Generic tools don't account for CA state tax or SF cost of living
- She distrusts tools that use oversimplified assumptions

### How they find UntilFire
- Recommended by a colleague who used it
- Found via a Reddit comment in r/financialindependence

### What they need from UntilFire
- Accurate California tax calculation (federal + state + FICA)
- Correct SF cost-of-living data
- Clear comparison: SF vs. other cities she's considering (Austin, Denver, Lisbon)
- Dashboard to track actual monthly progress
- Feels credible — shows the math, not just a magic number

### Behaviour in the product
- Reads the tax breakdown carefully, checks it against her own calculations
- Runs the calculator 2-3 times — once for SF, once for Austin, once for Denver
- Signs up for the dashboard immediately after seeing the reveal
- Connects her expense log and checks back weekly
- Very likely to pay $4.99/mo if the dashboard updates her FIRE date in real time

### Quote
> "The California tax math was right. That's what made me trust it. Every other calculator ignores state taxes and gives me a number that's $300k off."

---

## Primary Persona 3 — The Global Worker

**Name**: Wei Zhang  
**Age**: 31  
**Location**: Shanghai, China (or recently relocated to Singapore/Dubai)  
**Job**: Product manager at a tech company  
**Income**: $120,000 USD equivalent  
**Savings rate**: ~40%  
**Net worth**: ~$180,000  

### Background
Wei is a high earner in Asia who understands FIRE conceptually but has never found a tool that works for their context. Most FIRE calculators are entirely US-centric — no Shanghai cost-of-living data, no Chinese tax rates, no sense of what $1M buys in Asia. Wei is also considering geo-arbitrage (retiring in Chiang Mai or Bali) and wants to model different scenarios.

### Goals
- Get a FIRE number that actually accounts for Shanghai/Singapore/Dubai living costs
- Model geo-arbitrage: what if I retire in Southeast Asia instead?
- Understand how their income compares once international taxes are applied
- Feel seen — most financial tools feel designed for Americans only

### Frustrations with existing tools
- Every tool defaults to US cities
- No international tax modeling
- Cost-of-living data is completely wrong for Asia
- The "Remote / Other" fallback in most tools gives meaningless results

### How they find UntilFire
- FIRE community forums in Chinese (小红书, V2EX, Telegram groups)
- Word of mouth from international tech workers
- "Search 'FIRE calculator Singapore'" and UntilFire shows up

### What they need from UntilFire
- Real cities: Shanghai, Singapore, Dubai, Bangkok, Bali
- Accurate international tax estimates (even flat effective rates are better than nothing)
- Custom city fallback if their specific city isn't listed
- Multi-city comparison: "What if I retire in Chiang Mai vs. Shanghai?"

### Behaviour in the product
- Immediately searches for their home city — relieved to find it
- Compares 2-3 different retirement cities
- Uses the custom city fallback if their exact city isn't listed
- Very high likelihood of signing up because no other tool serves them

### Quote
> "Finally. A FIRE calculator that knows Shanghai exists. And the cost-of-living estimate is actually reasonable."

---

## Secondary Persona 1 — The Nomad Optimizer

**Name**: Diego Ramirez  
**Age**: 29  
**Location**: Mexico City (origin), currently travelling  
**Job**: Remote software developer for a US company  
**Income**: $85,000 USD (paid in USD, living in LatAm/SEA)  
**Savings rate**: ~60% (geographic arbitrage)  
**Net worth**: ~$90,000  

### Background
Diego earns in USD but lives cheaply abroad — currently averaging ~$1,500/mo in expenses. He's aggressively pursuing FIRE and wants to model multiple scenarios: stay in Mexico City, move to Medellín, move to Chiang Mai. He's technically sophisticated and will notice if the numbers are wrong.

### Goals
- Model retirement in multiple low-cost cities
- Understand his real FIRE number given his nomadic lifestyle
- Find the city where FIRE happens fastest
- Custom input for months when he's between cities

### What they need from UntilFire
- Medellín, Playa del Carmen, Da Nang, Tbilisi, Chiang Mai — all in the list
- Custom city fallback for when he's somewhere unusual
- Fast iteration — can quickly re-run with different cities

---

## Secondary Persona 2 — The Late Starter

**Name**: Mark Johnson  
**Age**: 42  
**Location**: Chicago, IL  
**Job**: Sales director  
**Income**: $110,000  
**Savings rate**: ~8% (just started taking this seriously)  
**Net worth**: ~$45,000  

### Background
Mark discovered FIRE after a health scare made him reconsider his work-life balance. He's worried it's "too late" and needs honest, non-judgmental information about his actual timeline. He might be discouraged by the reveal screen if his number is 35+ years away — the product needs to focus on what he can change.

### Goals
- Understand his current trajectory honestly
- Know which levers matter most (income vs. expenses vs. savings rate)
- Get motivated to make changes, not feel hopeless
- Start tracking immediately

### What they need from UntilFire
- Honest FIRE date, even if it's discouraging
- Delta cards showing how small changes compound (critical for this persona)
- "Adjust inputs" path to model what happens if he saves more
- Dashboard to start tracking now

---

## Persona → Feature Mapping

| Feature | Alex (P1) | Sarah (P2) | Wei (P3) | Diego (S1) | Mark (S2) |
|---|---|---|---|---|---|
| Freedom date | ★★★ | ★★★ | ★★★ | ★★★ | ★★★ |
| Guided next move / monthly plan | ★★★ | ★★★ | ★★★ | ★★ | ★★★ |
| Dashboard / tracking | ★★ | ★★★ | ★★ | ★★ | ★★★ |
| FIRE reveal drama | ★★★ | ★★ | ★★★ | ★★ | ★★★ |
| Delta cards | ★★ | ★★★ | ★★ | ★★ | ★★★ |
| 263 city coverage | ★★ | ★★ | ★★★ | ★★★ | ★ |
| Custom city fallback | ★ | ★ | ★★★ | ★★★ | ★ |
| Tax assumptions | ★★ | ★★★ | ★★ | ★ | ★★ |
| Multi-city comparison | ★ | ★★ | ★★★ | ★★★ | ★ |

★★★ = Critical  ★★ = Important  ★ = Nice to have
