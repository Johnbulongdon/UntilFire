# UntilFire — User Journey Map
Last updated: May 2026

---

## Journey Overview

UntilFire has two distinct user journeys:

1. **The Freedom-Date Journey** — anonymous user discovers their FIRE number/freedom date and one next move (about 60 seconds)
2. **The Guided Plan Journey** — signed-in or Pro user keeps following monthly moves toward work optionality

The first journey is the acquisition funnel. The second journey is retention and monetisation. The product should feel like it does the journey with the user, not like it simply hands over a number.

---

## Journey 1: The Calculator (Anonymous)

### Stage 0 — Discovery

**How users arrive:**
- Reddit link (r/financialindependence, r/personalfinance, r/FIRE)
- X/Twitter post from @GetUntilFire
- Direct Google search ("FIRE calculator", "when can I retire calculator")
- Word of mouth — someone shares their FIRE number
- City SEO landing pages (future)

**User mental state:** Curious, slightly sceptical. Has heard of FIRE but never calculated their own number. Expecting either a generic result or a complicated form.

**Success metric**: User clicks the CTA.

---

### Stage 1 — Hero Screen

**What user sees:**
- Freedom-led headline: "Find your freedom date — then bring it closer"
- Single button: "Find my freedom date"
- Social proof: "2,400+ FIRE seekers this month"
- Market stats: $5.8B market, 2.2M Reddit members, 25% Gen Z targeting early retirement

**User thought:** "OK so this is actually a real thing, not just a random calculator. And I don't have to sign up. Let me try it."

**Friction points:** None intentional. If the page loads slowly, user may bounce.

**Success metric**: Click "Calculate my FIRE number" → proceed to City screen.

---

### Stage 2 — City Selection (Step 1 of 3)

**What user sees:**
- Search input: "Start typing your city or country"
- Dropdown appears as user types — shows flag, city name, estimated annual expenses, FIRE target
- After selecting: city info card shows annual expenses, FIRE target (25×), vs. US average delta
- Custom city option always visible at bottom of dropdown: "Enter my monthly expenses"

**User thought:** "Let me find my city... oh there it is / oh it's not there let me use the custom one. And I can see the estimated expenses — looks about right."

**Friction points:**
- City not in list → mitigated by custom city fallback
- Estimated expenses feel wrong → user can override with custom entry

**Key interactions:**
1. User types city name → dropdown filters in real time
2. User selects city → info card appears, Continue button enables
3. If city not found → user clicks "📍 [city] — enter my monthly expenses"
4. Custom panel appears → user enters monthly amount → clicks "Use this"

**Success metric**: City selected (or custom amount confirmed) → Continue clicked.

---

### Stage 3 — Income Input (Step 2 of 3)

**What user sees:**
- Number input + slider for annual gross income (default $90,000)
- Slider range: $20k–$500k (accepts higher via direct input)
- Real-time updates showing:
  - Gross income
  - After-tax take-home
  - Monthly take-home
  - Tax breakdown (federal / state / FICA for US; flat rate for international)
  - Real hourly rate ("$32.88/hr based on 2,080 working hours/yr")

**User thought:** "Oh interesting — I actually only take home $68k of my $90k. And my real hourly rate is only $32? That's lower than I thought."

**Emotional beat:** A small trust moment — income and tax context makes the result feel credible, but it should not distract from the main promise: “this app will show me the path.”

**Friction points:**
- User earns over $500k — slider maxes out visually but number input accepts any value
- International users may not recognise the tax calculation as relevant — it's simplified to a flat effective rate for them

**Success metric**: User enters their income and clicks Continue.

---

### Stage 4 — Savings Input (Step 3 of 3)

**What user sees:**
- Number input + slider for monthly savings (default $1,500)
- Real-time savings rate % and benchmark label (Very low / Average / Good / FIRE pace)
- Progress bar: 0% → 20% (Good) → 50% (FIRE pace)
- Stat cards: monthly savings amount + savings rate %

**User thought:** "My savings rate is 26% — that's 'Average'. I wonder what happens if I bump it up to 30%... Let me try."

**Emotional beat:** The savings rate label creates a mild competitive impulse — most users nudge the slider to get a better label before proceeding.

**Friction points:**
- User doesn't know how much they're saving → they estimate (acceptable — not asking for precision)
- User saves in non-USD currency → we're asking for USD equivalent (minor friction for international)

**Success metric**: User enters savings and clicks "Show my FIRE number 🔥".

---

### Stage 5 — The Reveal (The Big Moment)

**What user sees:**

**Phase 1 — Calculating (~3 seconds):**
- "Running your projection…"
- 4 calculation steps light up one by one (620ms each):
  - Your inputs → Trustworthy assumptions → Compound growth → Guided monthly move
- Progress bar fills to 100%
- 800ms pause at 100% (anticipation beat)

**Phase 2 — The Number:**
- Number slams in from 55% scale with spring animation
- Count-up over 2.2 seconds from $0 to FIRE target
- Orange glow effect pulses on the number
- Below the number: "Work could become optional in [year]" with optional age if known
- Small caption: transparent assumptions, with city/tax shown as trust detail only

**After reveal (once count-up completes):**
- "Your spending is costing you X years of freedom" or equivalent impact statement
- One highlighted next monthly move: what to do and how much closer it brings freedom
- Supporting delta cards: cut dining / save more / earn more / invest bonus
- CTA after value: save the result or continue the plan
- Secondary: "← Adjust inputs"

**User emotional arc:**
1. **Anticipation** — the calculating phase builds suspense
2. **Impact** — the slam animation makes the number feel significant
3. **Reality check** — the retire year and age make it personal
4. **Curiosity** — delta cards create "what if" thinking
5. **Action** — CTA captures the motivated state

**The critical moment**: Users who see a retire date that feels achievable (under 20 years) convert to signups at a much higher rate. Users who see 35+ years are at risk of abandoning unless the delta cards show meaningful improvement options.

**Success metrics:**
- Completion rate (savings screen → reveal): target >75%
- Share rate: target >10% of completions
- Signup rate (reveal → dashboard): target >25%

---

### Stage 6 — Post-Reveal Paths

**Path A: Signs up immediately**
- Clicks "Make this more accurate — it's free →"
- Google OAuth screen
- → Dashboard with FIRE number locked in
- → Prompted to add real expense data

**Path B: Shares number**
- Copies share text / uses native share
- Posts on Reddit/X: "just ran my FIRE number, it's $X..."
- Drives organic referrals (viral loop)

**Path C: Adjusts inputs**
- Clicks "← Adjust inputs" → returns to savings screen
- Experiments with different savings amounts
- May also restart with a different city
- Eventually follows Path A or B

**Path D: Bounces**
- Number feels too far away, no clear next step
- Retention lever: waitlist signup at bottom of page

---

## Journey 2: The Tracker (Logged-In User)

### Onboarding (Day 1)

1. User arrives at dashboard post-OAuth
2. Sees their FIRE target from the calculator
3. Prompted to: "Add your first expense to start tracking"
4. Connects expense log → starts logging

### Weekly Usage

1. Log expenses as they happen (or in bulk weekly)
2. Dashboard shows: current savings rate, FIRE progress %, projection chart
3. FIRE date updates in real time as expenses are logged
4. Insights appear (planned: AI-powered)

### Monthly Usage

1. Review monthly spending report
2. Compare actual savings rate vs. target
3. See how FIRE date moved (earlier or later)
4. Adjust savings targets if needed

### Paid Conversion Point

1. User sees "AI Roadmap" feature locked behind Pro ($4.99/mo)
2. Prompt: "Get a personalised monthly plan to retire faster"
3. User enters payment details → unlocks AI advisor

---

## Emotional Journey Map

```
DISCOVERY    →    HERO    →    CITY    →    INCOME    →    SAVINGS    →    REVEAL
                                                                           
Curiosity        Interest      Exploration   Insight       Reflection      IMPACT
"Is this         "60 seconds,  "Oh, my       "I only take  "My savings     "OH WOW.
real?"           no signup.    city is       home $68k?    rate is         I can retire
                 Let's go."    here!"        That's real." average..."     in 2041."
                                                                           
                                                                              ↓
                                                                           ACTION
                                                                        "I'm signing up."
                                                                        "I'm sharing this."
                                                                        "I need to save more."
```

---

## Drop-Off Points & Mitigations

| Stage | Drop-off risk | Mitigation |
|---|---|---|
| Hero → City | Low intent visitor | Strong headline, social proof, zero friction |
| City → Income | City not in list | Custom city fallback with manual monthly input |
| Income → Savings | User doesn't know exact savings | Default value ($1,500), note saying "estimate is fine" |
| Savings → Reveal | None significant | Button copy "Show my FIRE number 🔥" creates excitement |
| Reveal → Signup | Long timeline discourages | Delta cards show how to improve; waitlist captures non-converters |
| Dashboard → Retention | Logging friction | Quick-add expense buttons, weekly recap email (planned) |
| Free → Paid | Price sensitivity | AI roadmap feature must feel meaningfully valuable |
