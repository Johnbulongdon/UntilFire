# Changelog

## 2026-10-31 — October update email pictures

- Add the October monthly update email's banner and four feature previews (new look, Until payday, Today, Where could you retire?) under public/email/october/, so the admin draft "Monthly update — October 2026" can load them. No app behaviour change.

## 31 October 2026 — Until payday after everyday costs

- Home now estimates cash left after bills, card payments and normal everyday costs, using spending history or the saved category budget without counting repeating bills twice.
- Replace chart inspection with the approved mint summary, compact breakdown and three-row bill ledger linking to Money.
- Add an editable estimate and optional collapsed cushion (zero by default); adjustments apply to the current visit and update Home Today. No automatic savings deduction or budget mutation.
- Match the phone card and shared forecast rule; missing estimates remain visibly unknown.


## Unreleased — website audit follow-ups

- Add a branded 404 page with "Find my freedom date" and "Explore cities", instead of the plain Next.js default.
- "Try one improvement": tapping the savings bar now sets the amount there (it was the most rage-clicked spot), and the bar uses theme tokens so it reads in dark mode.

## Unreleased — landing refinements and city globe

- Add the approved draggable city globe with shared living-cost estimates, keyboard/city controls and lazy map loading.
- Add restrained backdrop entrance, pointer response and parallax with reduced-motion support.
- Preserve approved hero copy; tighten phone spacing and reassurance.
- Clarify savings slider, animate its result, and enlarge small labels/controls.
- Show Free/Pro connection allowances visually; quiet directory badges without changing backlinks.

## Unreleased — Connected landing page

- Replaced the rejected single-story rotator with the approved compact, continuously scrolling multi-card review rail. Added swipe/drag, manual arrows, pause controls, seam wrapping, optional approved membership dates and reduced-motion handling. Generated fictional portraits/quotes are explicit local-preview content; no reviews are published while the approved list is empty.

- Selected conversion options 1 and 2: clearer hero supporting message and a compact free/no-account/optional-bank reassurance row. Added a multi-story rotating component for option 3, with pause/manual navigation and reduced-motion support. No fabricated reviews: approved story data is empty pending quotes and attribution. Explicit localhost-only layout preview uses labeled placeholders. Options 4 (founder) and 5 (savings-result redesign) are excluded.

- Expanded the free starting-plan invitation into a mint closing section with a visual plan summary and onboarding action; reduced directory badge footprint without dropping links.

- The landing ends with grouped UntilFire, calculator and city-guide navigation plus legal links. Removed the long educational/FAQ appendage and its FAQ schema; detailed content remains on the existing destination pages.

- Approved option 2: centered headline, one connected pastel product preview without page tabs, selectable example bill dates and categories, and a whole-dollar savings scenario powered by the existing projection helper. Initial estimate still opens the existing free onboarding.
- A dedicated wrapping Listed on tray preserves all directory URLs, issued badge images and verification attributes. Failed third-party images retain readable links. Phone layouts stack the preview and keep the header action compact.


## 2026-10-29 — Starting budget (50/30/20)

- Website only (D-116). With no budget yet, Money › Budget suggests 50% needs, 30% wants and 20% saving of take-home pay, built from what you usually spend. No limit is ever higher than your usual spending: only wants that aren't bills are trimmed, by one shared percentage; needs over 50% stay and wants give way. "Use this" saves it, "Set my own" opens guided setup. With no spending yet, the three totals show as a guide. Nothing is saved, and the freedom date doesn't move, until "Use this".

## 2026-10-29 — Website interaction fixes

- Website only. A failed plan load now shows "Try again" instead of the new-user welcome form, and auto-save waits for a good load, so a brief network blip cannot overwrite a saved plan. Save failures (including account toggles, debt start balances and shares) show a visible message; opening a page no longer flashes "Saved".
- Dark mode: buttons that hardcoded white text on the ink accent (Pricing Pro, Categories, Transactions, review and spend-range pills, freedom report, share and savings calculators) use the card colour.
- Calculator: Enter moves on from amount boxes and choice steps; one city match is picked on Enter; an empty city says Skip; disabled Continue explains what is missing. Amounts show commas while typing, the amount field has a rounded focus outline, the slider is ink-filled and 44px tall. When age is skipped, the reveal says the age is assumed; currency wording is neutral and the sign-up backdrop uses the visitor's currency. Duplicate step labels are removed.
- Transactions: the savings card is one row, "Over by" reads "Short after bills", quick add is a centred dialog on desktop with the amount focused, pill Save and one close button. Delete uses Undo (six seconds, announced) instead of a browser popup; category-change failures are shown. The floating Feedback pill is gone (sidebar and header keep Feedback) and toasts sit above the Add bar.
- Consistency: Apple sign-in shows "Soon" before it is tapped, "Skip to content" on the dashboard and landing page, Money and Plan content capped at 1,152px on desktop, reveal and onboarding motion at 300ms or less, "Choose a debt" instead of "Tap a debt".

## Unreleased — Next Horizon

- Website: the first-visit logo screen is gone (D-117). Every page, including city and calculator pages from search, shows straight away; the logo stays in the header.
- Share cards: state, ranking and region guides get the yellow share card (their images were non-route files and returned 404), X gets the same picture, and Pricing, calculators, country, comparison and creator pages share with the site card instead of no picture. robots.txt allows /api/og/ so X can fetch them.
- Pricing no longer lists an "AI FIRE adviser", which never existed; Pro lists the AI needs and wants tagging it really includes.

- City guides use Next Horizon: each city page drops its own sage-green palette for the yellow freedom-number card, mint/blue tiles, a numbered plan card and black pill actions. The city share image is now the yellow card and works again (it was a non-route file, so links returned 404). Move-to-a-cheaper-city pages use theme tokens, so dark mode works; positive and negative results keep their own colours and words.

- Slogan rollout (D-109): search and social titles, descriptions, structured data, the install-app description, email footer and demo video now say "See beyond your balance. Open up your life." instead of "Personal finance that sets you free."

- Homepage "Listed on" tray restores the directory badges that live listings require, in a quiet light tray that stays readable in dark mode.

- Browser interaction: try the example plan, clearer onboarding selection and directional transitions, section/editor/button feedback, structural Money loading, and live savings feedback. Decimal slider undo restores the exact original plan. Narrow onboarding removes decorative panels while retaining money summaries.

- Until payday uses approved C: inspect each bill on the chart or list, with details above it and no visible slider. Cash calculations remain unchanged.

- Lighter category palette B across the shared web/phone category system; existing saved hue families stay recognizable without rewriting account data.

- Approved yellow horizon/path logo and Inter wordmark across web, native, admin, email and share previews, with downloadable SVG/PNG, palette and font exports.
- Monthly onboarding with separate Housing and Investing, a freedom-date canvas, own monthly picture and a single saving-improvement action before saving an account.
- Colourful Home cards, black pill actions and matched phone welcome controls. Financial calculations retain the shared engine; local-currency display values round-trip to USD once.
- Native icon and splash assets require a new store build; this branch is not a production release.


## 2026-10-27 — Aligned phone welcome actions

- On the phone welcome screen, I already have an account uses the standard full-width, 56-point button and 17-point label, matching Get started. Retain the quieter secondary styling, spacing and existing sign-in behavior. The shared Button component is unchanged.


## 2026-10-27 — Financial consistency repairs

- Web and phone: connected accounts replace typed figures even at zero; unavailable or unconvertible amounts cannot revive stale money. Paid-off linked loans also stay at zero.
- Web and phone: freedom today requires today's pension bridge. Fractional dates do not precede a year whose bridge is still short. Known zero-interest loans remain zero; current included balances set interest weights, with defaults only for unknown rates.
- Personal needs, safety coverage and contribution needs apply joint-account ownership consistently.
- Household totals read current user_budget inputs, convert linked balances before summing/deduplication, filter budget metadata, preserve zero and include non-spending safety cash at cash returns. Required read failures stop aggregation; unavailable or insufficient history uses saved budgets.
- Household history requires three common complete spending months for every member. Only confirmed account links deduplicate purchases; repeated same-day purchases retain their count.
- Add behavioral calculation regressions and PR CI. No database migration or dependency/native API change. Release pending review.

## 2026-10-27 — Bank and budget save reliability

- Bank sync now rejects failed core transaction writes, failed edit-preservation reads and failed cursor saves instead of reporting a successful import. Pending edits must be preserved before removed rows are deleted. The previous cursor remains retryable after a transaction failure. First-time bank imports also keep a starting cursor until transactions are saved and return a retry message instead of claiming completion.
- Website Needs & wants loads every transaction page and stops on loading errors. A category save requires a loaded budget, preserves unrelated settings and rejects a conflicting edit from another tab or phone. Repeated clicks wait for the current save.
- Existing-row and refund/purchase reads are paged in a stable order; ID lookups use bounded batches. The shared backend serves website and phone; the phone already guards profile-read errors and pages its dashboard history. No native release or database migration.

## 2026-10-27 — Queue welcome-screen button alignment

- Add the reported Android welcome-screen sign-in button alignment issue to Next (X4), with reproduction and verification criteria. Planning only; no UI fix shipped.

## 2026-10-27 — Shared Now / Next / Later roadmap

- Put three current priorities, ordered follow-ups, deferred ideas, completion criteria and blockers at the front of the roadmap. Preserve the detailed backlog and historical checks.
- Agent entry points and project memory now direct every agent to the same queue and require status/evidence updates in the work PR. D-110 records the rationale. Documentation only; no app behavior change.

## 2026-10-27 — Positioning recorded: see beyond your balance

- Current product guidance now uses “See beyond your balance. Open up your life.” with “See your whole financial picture, understand your choices, and build toward the life you want.”
- D-109 preserves the previous slogan, “Personal finance that sets you free,” and the founder's rationale. D-02 retains the free-first-value experience constraints; its headline emphasis is superseded.
- Documentation only. Runtime marketing copy alignment and comprehension testing remain tracked in the roadmap; no website or deployment change.

## 2026-10-27 — Startup without a video player

- Replace the first-session MP4 splash with the existing vector sun mark on the app background. Keep a brief rise/fade and immediate pointer, key or scroll skip. A CSS deadline dismisses it even before hydration; reduced motion skips the introduction. No media element means no native play controls or black video rectangle.


## 2026-10-26 — Today leads Home

- Website and phone: Home opens with Today. Safe to spend today is a line under the list (it opens Money), not a "Got it" to tap, and a day with nothing to answer counts as soon as you open it.
- Website Home is one column in the same order on every screen, centred at a readable width on desktop.
- Get set up sits under your next move instead of floating over the page; the cards use quiet "Plan ›" / "Money ›" links, the freedom date shows once, and chart labels no longer clip.
- Phone: Today is Home's first card; the pinned Today bar stays on the other tabs.

## 2026-10-26 — Today's done gets a small celebration

- Website Home: answering the last Today item plays a short check animation (ring fills, dot pops, check draws, a few sparks), once. A day already done when you open the page, and anyone with reduced motion on, sees the finished check with no motion. No streaks or loss states.

## 2026-10-25 — Calmer category bars

- Money › Transactions category bars: Past months is now a darker stretch inside each bar instead of a faint dotted box, and the black budget line is only as tall as the bar, so the row reads as one shape (D-107).

## 2026-10-25 — Needs and wants are sorted for you

- Today no longer asks Need or Want about every purchase. The category decides (eating out and delivery are wants, groceries and gas are needs), and Today only asks about a shop that sells both, like Target or Amazon, once per shop and only for $20 or more (D-106).
- The first time bank spending shows up, Today shows one "We sorted N buys for you" card with a way to see all of it.
- New Needs & wants screen (phone: Money › Budget; website: Money › Categories) to move a category, or eating out, to the other side, and to change shops you answered.
- Every purchase shows Need or Want; editing one offers "Always for this shop".

## 2026-10-25 — App psychology pass

- Home's "Your next move" is the one card with a green frame and an icon. While Get set up is open, its next step is Home's only ask (phone hides the next move; website shows the setup step in that slot).
- Home's freedom card shows how far you've come: "23% there" and the next quarter mark, from the same projection as the date.
- Linking a bank shows the work: connected, transactions read, payday found, bills found, date updated. The exchange-token API now returns `accounts_count` and `found`.
- Phone onboarding ends on a "Your plan" screen (the year and first moves) after the reminder ask; the "Free sooner abroad" reveal is gone from onboarding.
- Plan: Compare and Scenarios are one "What if" with a switch (website: Life changes / Investing; phone: Changes / Life / Investing). Phone Plan has four tiles plus a Learn row (D-105).

## 2026-10-25 — Phone onboarding asks what gets in the way

- Two new skippable phone onboarding screens after Age: the biggest money worry, and rent/own plus how you invest (multi-select, includes Dividends). Home's next move starts from the worry with a "Because you said…" line; renters are asked for their lease date. "Which do you know better?" became a switch on Spending. Phone only (D-104).

## 2026-10-24 — Bank connect spinner

- Connect a bank shows a spinner in the button while Plaid's screen loads, instead of a faded "Connecting…" that looked frozen. `Button` gained a `busy` prop (spinner plus label, taps blocked) for other slow actions.

## 2026-10-24 — Android connects banks in the app

- On Android, Connect a bank now opens Plaid's own screen inside the app instead of the website, the same as iPhone. The native Plaid library was already in the Android build; only the switch was iPhone-only. The website sends Plaid the Android package name (`com.untilfire.app`), which must be allowed in the Plaid dashboard. Ships as an over-the-air update, no new store build.

## 2026-10-24 — Android Google sign-in "Unmatched Route"

- On Android, Google sign-in briefly opened an "Unmatched Route" page: the return link (untilfire://auth?code=...) also reached the app's page router, which has no auth page. The sign-in itself already finished in the background. The router now ignores that link (`mobile/src/app/+native-intent.tsx`), with a small `auth` page as a backup that steps straight back. iPhone never saw it, because its sign-in sheet catches the link itself.

## 2026-10-24 — Phone app updates go out by themselves

- Every merge that changes the phone app is sent to the preview version of the app within minutes, like the website (D-102). Saying "ship" sends that same update to everyone; phones pick it up quietly on their next open.
- Changes that need a new store build (new native package or native setting) are caught and flagged instead of being sent.

## 2026-10-24 — Android Explore crash

- On Android the phone app's Explore opens as the city list and has no Map toggle. The map uses Google Maps on Android, which needs an API key the app doesn't have, so opening Explore crashed (Sentry UNTILFIRE-APP-1/-2, build 13, seen on Play's pre-launch test devices). iPhone keeps the map (Apple Maps, no key). Add an Android Maps key later only if the map earns its place.

## 2026-10-23 — Android build fix

- The Android app now needs Android 7.1 (API 25) or newer, which the Plaid bank library requires. The first two Android builds failed at the manifest step because the app allowed Android 7.0. It targets Android 16 (API 36), as Google Play requires.

## 2026-10-23 — Get set up checklist

- Home has a "Get set up" checklist: income, bank, payday, bills and budget, each ticked by itself from your data, with "2 of 5 done" (D-101). On the website it sits in the bottom-right corner and folds to a small pill; on the phone it is a slim card at the top of Home that opens all five.
- Finishing a step shows what it changed: "Your date moved 2043 → 2041", or your new Until payday amount after payday or bills.
- After a bank links, the paycheck and repeating bills it shows are offered as one-tap confirms ("We found 3 bills"). Untick any that aren't bills; they aren't offered again.
- Once all five are done, "You're set up" shows your date once and the checklist is gone for good. It replaces the old "Get started" card.

## 2026-10-23 — Node.js security patch

- After Stripe's Node.js security notice, the website now states its Node line (24.x, the same as the Vercel setting) in `package.json`, so a fresh deploy picks up Vercel's patched 24 runtime. The journey screenshot workflow pins the patched Node 22.23.4.

## 2026-10-23 — Delete-account page

- New public page untilfire.com/delete-account with the steps to delete an account in the app or on the website, what is deleted and what is kept. Google Play links to it from the store listing.

## 2026-10-22 — Android build of the phone app

- The phone app can now be built for Android and replaces the June website wrapper inside the existing Play listing, under the same package `com.untilfire.app` (D-100).
- Android is free-only for now: no Pro screen or "See Pro", and a second bank says "One bank on the free plan". Pro bought on the website still works there.
- Android says "Lock with fingerprint" (or face unlock) and sends "Update" to Google Play.

## 2026-10-22 — Lease questions on the website

- Home's Today strip asks "Your lease: stay or move?" 30 days before the notice deadline, and "Do you rent or pay a mortgage?" while anything is on the old combined tag, the same as the phone. An answer on either counts on both. Move opens Plan → Compare.
- Plan → Compare offers "Renew at +x%" and "Move, $y less rent" from the year the lease ends, when the Rent bill has a lease. Tries only; the freedom date stays on real spending (D-88).

## 2026-10-22 — Phone app sends its funnel to PostHog

- App Store and preview builds now send the phone's funnel (onboarding questions, freedom date, sign-up, Pro screen, purchase) into the same PostHog project as the website. Before, the key was missing from the build, so nothing arrived.
- The phone's events use the website's property names (`step_id`, `years_to_fire_bucket`, `auth_provider`), so one funnel or breakdown covers both; split them with `surface = ios_app`.

## 2026-10-22 — Journeys map covers the whole app

- Admin → Journeys now also shows the Home tour (website and phone), every Money and Plan page with their sub-pages, and the phone's Profile pages, as paths that branch off Home or Profile. Longer paths get rows of their own on the map. Every PR that changes the journeys now screenshots the signed-in and phone screens as a test, without replacing the live pictures.

## 2026-10-22 — Cancel Pro in three short steps

- Profile → Cancel Pro opens three steps: one reason (five choices, no "Other"), what stays free (your freedom date, budget, plan, one bank), and a goodbye with the date Pro ends and "No more charges". Cancelling is one tap from every step; nothing ends early (D-99).
- After cancelling, Profile shows "Pro · ends Nov 12, 2026 · Won't renew" with a Keep Pro button that undoes it. Before, it kept saying "$9 a month".
- The Stripe portal stays for invoices and the card, renamed "Invoices and card". Pro billed by Apple says to change it in iPhone Settings.
- Stripe webhook: reads the period end from the subscription item (Stripe's current API), which it failed on before, and records whether Pro will renew.
- Admin → Journeys: the Cancel Pro journey shows the new steps; the portal has its own "Invoices and card" journey.

## 2026-10-22 — Zoom the journey map with the mouse wheel

- Admin → Journeys: scrolling over the map now zooms in and out toward the mouse pointer, and a trackpad pinch does the same. The page no longer scrolls while the pointer is on the map. The buttons and keys still work.

## 2026-10-22 — Share your freedom year

- The calculator's Freedom age page has a "Share my freedom year" button. Phones open the share sheet; computers copy the link. The link's preview reads "Free to stop working in 2041" and leads friends to the calculator. It shares the year only, never amounts, age or city (D-98).

## 2026-10-22 — Try a different savings pace

- Add an editable monthly savings slider before reveal sign-up on desktop and phone browsers. Income stays fixed; spending, target and date recalculate together using the existing projection. Keep one original/updated-plan button and carry the selected numbers into sign-up. Native Expo onboarding is unchanged.


## 2026-10-21 — Journey canvas panning

- Prevent text selection and native image dragging inside the map so dragging labels pans without getting stuck. Show a grabbing cursor during a pan and reset it on release or cancellation. Keep screenshot inspection and keyboard controls.

## 2026-10-21 — Connected admin journey canvas

- Replace the repeated numbered Journeys rows with one dotted canvas of shared screens, branching transitions and visible return loops. Keep website and phone states distinct.
- Add drag-to-pan, zoom, Fit map, keyboard movement, path highlighting and a text connection list. Retain screenshot inspection with a focused, Escape-dismissable dialog.
- Give Journeys more room in the admin shell; preserve the existing journey manifest, screenshot capture and admin access checks.

## 2026-10-21 — Save and sign up are one page

- The calculator's last step is now the sign-up card itself: "{year} is just your starting point" over a blurred view of the real Home (its own cards, filled with the visitor's numbers where it has them), with Save with Google, Save with Apple and an email code. Back to results, Adjust inputs and Share stay underneath. There is no separate stop at /login after the calculator.
- /login uses the same card and blurred Home on every visit, not only after the calculator. A direct visit reads "Start your journey to freedom" (it can be a first visit, so no "Welcome back").
- Apple is a placeholder until it is set up in Supabase: tapping it says it is coming soon. Email shows on the card instead of behind "Use email instead" (still behind `NEXT_PUBLIC_EMAIL_SIGNIN`, D-18).
- The admin Journeys map merges "Save" and "Sign up" into one step.

## 2026-10-21 — Journeys: zoom and the last boxes

- Clicking a screenshot on the admin Journeys tab now opens it full size (Esc or click to close) instead of opening the page.
- New pictures: the phone's launch screen for "Open app", "Home, Pro on" and the Pro profile (the browser is told the test account has Pro; nothing is saved), and Stripe checkout and the billing portal (the script stops on Stripe's page; nothing is paid or cancelled). The Stripe pages need the test account's Stripe customer saved once in `subscriptions.stripe_customer_id`, so runs reuse it instead of creating customers.

## 2026-10-20 — Phone app screens on the Journeys tab

- Phone app steps are now real screenshots: each run builds the app for the browser from `mobile/`, walks onboarding with sample answers, then opens Home, Profile, Pro, Data and account and Delete as the test account. Opening Delete deletes nothing.
- The website's email-code step and the landing page steps are screenshotted too; the code request is stubbed, so no email is sent. Google, Stripe, "Home, Pro on" and the phone's blank "Open app" redirect stay as boxes.

## 2026-10-20 — More Journeys screenshots

- The screenshot run now answers the calculator with sample numbers, capturing every question and result page, and signs in as a test account (`journeys-bot@untilfire.com`, unsubscribed from emails) for Home, Profile, the upgrade box and the delete-account confirm box. It never pays or deletes.
- PRs that change the journeys run the capture as a dry run first.

## 2026-10-20 — Start buttons open the calculator

- "Start free" on the FIRE number pages, "Get started free" on Pricing and "Use with my profile" on Purchase Impact now open the calculator. They went to the dashboard or sign-up, so signed-out visitors landed on an empty Home and skipped onboarding. Signed-in visitors still go straight to the dashboard. Guarded by `npm run test:start-ctas`.

## 2026-10-20 — Admin Journeys tab

- New admin tab maps 14 user journeys (website and phone app, new and returning), with arrows, step labels and what to tap. Desktop and phone sizes.
- Steps live in `lib/journeys.ts`; `npm run test:journeys` fails when a step's page or the phone onboarding order changes. Signed-out pages are re-screenshotted after each production deploy (`.github/workflows/journeys.yml`); signed-in, Google, Stripe and phone app steps are labelled boxes for now.

## 2026-10-20 — Safety cash in retirement progress

- Include the safety pot in web and phone freedom progress; spending cash stays separate.
- Cash grows at saved APY (0% if unknown), adjusted for 3% inflation, instead of investment returns. Early-access checks and Coast FIRE milestones use separate cash and investment returns.
- Show investments and safety cash below the Home chart. The spending-based target and safety-months measure stay unchanged.

## 2026-10-20 — Fixed Home layout (review branch)

- Approved loading revision: use the existing sun animation directly on the app surface, with a static logo for reduced motion or playback failure. Loading text remains available to screen readers only.

- Remove dashboard reordering, resizing, hiding, inventory and restore controls instead of repairing the editor. Use the standard Home for old customized accounts too; preserve stored preferences.
- Retire the old phone layout editor route. Keep the approved continuous number-entry fix and the previously requested tax pause.
- Replace component-only visual evidence with full app-route captures; review-only captions stay outside the app. Other proposed replay repairs remain draft pending review.

## 2026-10-19 — Replay repairs and tax-estimate pause (review branch)

- Pause tax estimators, retirement-tax adjustments, passport tax comparisons, and public tax-derived examples pending QA. Preserve saved tax settings.
- Ask for take-home income; keep onboarding inputs mounted while typing and support decimal entry and Enter to submit.
- Home derives its duration and age from the same exact freedom date as Plan, including already-reached targets.
- Give dashboard edit controls their own row and 44px targets; label selected conditional cards honestly and offer Add cards / Restore default dashboard.
- Wait for saved profile/layout data before showing financial or setup results; serialize layout writes and show retryable save errors.
- City search selects existing text on focus, offers Clear search, and supports keyboard/click selection. State-page Start opens the calculator; suppress duplicate landing-entry events.
- Local verification is recorded in docs/handoffs/2026-10-19-replay-repairs.md. Not merged or deployed.

All notable changes to UntilFire are documented here.

The site deploys to production on every merge to `main`, so there is no
unreleased queue: each section is the day its changes shipped. Add new entries
under today's date, creating the heading if it is not there yet.

## 2026-10-18

### Home: Until payday (D-90)
- The month card is now "Until payday": cash in your spending accounts less
  bills before your next paycheck, drawn as a line from your last paycheck to
  the next, dropping at each bill with its icon. A shortfall reads "−$164" in
  red with the area under zero striped. Without a bank balance or a paycheck,
  the card shows day-to-day spending against the budget instead.
- Safe to spend today uses the same until-payday number.
- "Everyday" is now "Day-to-day" in Budget and on Home.
- Fixes: the "You" label no longer sits on the freedom curve, the pace dot is
  round again, the next move's split no longer repeats "Emergency fund", and
  the savings rate is the plan's (it ran high mid-month).

### Profile (website)
- Sign out now sits at the bottom of Profile and asks before signing out,
  like the phone. Export and Delete account are folded into one "Data and
  account" row; the delete confirmation shows only after "Delete account…".
- The sidebar no longer has its own Sign out link; Sign out lives in Profile.

### Sign-up page
- After the calculator, sign-up reads "{year} is just your starting point"
  over a blurred dashboard drawn from the visitor's own numbers, with one
  button, "Start your journey to freedom" (Google). Email sits behind "Use
  email instead". "Free, no card, delete anytime" is gone.

### Home: one next move, and every card is a door (D-89)
- Freedom date: a curve to the FIRE number with 25%, 50% and Coast FIRE marks,
  replacing the 5-year bars.
- Your next move: over-budget categories, then a budget, then the contribution
  ladder's first step, then the best what-if. "Not now" hides it for a week.
- Left this month: a pace line against an even pace and the next three bills.
- Today on the website: need or want, bills due tomorrow and safe to spend
  today, sharing progress with the phone.
- Net worth, safety pot (6 segments) and savings rate tiles replace the
  glance row; "Months on plan" is gone.
- Phone: the freedom chart becomes a curve with 25% and 50% marks, Home shows
  your next move, and Left this month adds a pace line and the next big bill.

### Flags on Windows
- Website: country flags are drawn as images everywhere (FIRE number pages,
  geo-arbitrage, landing city picker, Plan assumptions, Home's move chip),
  not emoji, which Windows shows as letters like "AU". The tax-country
  dropdown drops its flags, since a dropdown can only hold text.

## 2026-10-17

### Launch readiness: security, crashes, store setup
- Phone: the sign-in session lives in the iOS Keychain / Android Keystore
  instead of plain storage; signed-in people move over without signing out.
- Website: per-instance rate limits on the AI, email, feedback, survey,
  household invite and Plaid link routes (three AI routes needed no login),
  plus a `frame-ancestors 'none'` content security policy.
- Phone: crash reporting through Sentry, in real builds only. Reports carry
  the account id only, mask money amounts and drop console and tap text.
- Version check: `/api/app-version` publishes the oldest phone version the
  website supports; older apps show "Update UntilFire".
- iOS privacy manifest, expo-updates for quick fixes (EAS project linked).
- Banks that log in on their own site (Plaid OAuth): iOS returns through the
  `/plaid-oauth` universal link (needs `PLAID_IOS_REDIRECT_URI` and
  `APPLE_TEAM_ID`), Android by package name.
- App Review login: a fixed code for `REVIEW_LOGIN_EMAIL` only, off unless
  `REVIEW_LOGIN_EMAIL` and `REVIEW_LOGIN_CODE` are set.
- Phone: Profile shows the app version (and any quick-fix update); tapping
  it opens "What's new", kept in `mobile/src/lib/update-log.ts`.

### Lease tracking
- Housing's "Rent/Mortgage" is now two sub-categories, Rent and Mortgage.
  Bank rent payments arrive tagged Rent; Today asks once about older
  "Rent/Mortgage" rows.
- A Rent bill or Rent transaction offers "When does your lease end?": end
  date, notice to give (30/60/90 days) and the expected rise. The bill then
  shows the days left to decide and a timeline to the lease end. The
  website's Upcoming form has the same three fields on a Rent bill.
- Today asks "Stay or move?" 30 days before the notice deadline, and once
  more in the last week if the answer was "Not sure".
- What if (phone) adds "Move, $X less rent" and "Renew at +X%" when a lease is
  set. The freedom date itself doesn't move on a guessed rise (D-88).

## 2026-10-16

### Phone app
- Categories shows one month at a time (‹ month ›, back 12 months), each
  category against its usual month, sorted by spend; tap one to see its
  transactions for that month.
- New day-to-day card: Food + Transport in a typical month, the money to keep
  in checking apart from the emergency fund, and how much of it is usually wants.
- Transactions: picking a category now changes the summary to that category's
  total, usual and bars, and the filter stays on when you change month.
- Money shows the top three categories under "Spent this month".
- Emergency fund shows a target (six months of needs). Without need budgets,
  needs come from what your needs usually cost instead of 60% of the budget.
  The safety chip and Home's Safety tile now use the same figure, so they
  match the emergency fund page they open.
- Account first: signed out, the app opens on the welcome screen instead of
  Home, and both its buttons go to sign-in. A new account answers the
  onboarding questions next, and their plan saves to the account; an account
  with a plan goes straight to Home. Signing out returns to the welcome screen.
- Profile reordered: everyday account rows and settings first, Help, then one
  "Data and account" row (export, replay onboarding, delete account last) and
  Sign out on its own at the bottom.
- FIRE type quiz: each question has its own picture, and the five answers are
  matching pictured rectangles (the two sides, "a little more this" either way,
  and "both equally") instead of five wordy buttons, over soft background
  panels. The progress bar now sits below the iPhone status bar.
- FIRE type result: each strength and watch-out is its own box with a picture
  and one short line, instead of two dense paragraphs.
- Fix: a bill already paid this month (a matching transaction within 3%, same
  name) is no longer set aside again in Budget's "left for everyday spending",
  "free to spend until payday", or Home's free-to-spend card.
- Calendar: "Mark paid" and "Mark received" now offer Undo, so a mistaken tap
  can be taken back.
- Categories: merge a category into another. Its transactions, bills, merchant
  rules and (if the target has none) budget move across, and the old one is
  removed. Leftover labels nothing defines any more, like an old "Dog" still on
  transactions or the budget, now show under "Your own" so they can be merged.
- Budget and Categories are one screen, Budget: a month switcher, what's
  left, then one row per category with spent against its budget (or a "+ Set
  budget" button). Tap a row for its transactions; ••• holds Change budget,
  Merge and Remove. The separate Categories page is gone.

## 2026-10-15

### Household
- Fix: an invitation that could not be accepted (expired, cancelled, already
  used) no longer sends the invitee back to the error page on every dashboard
  visit.
- The invitation link now asks "Join John's household?" before joining,
  instead of joining as soon as it opens.
- Partners can no longer read each other's transactions, accounts, goals or
  other raw rows through the database; the combined freedom date is unchanged
  (D-84, migration 0057).
- Fix: confirming a shared checking account no longer subtracts its balance
  from the household's investments. Linked investment accounts now count in the
  combined total the same way they do on each person's own dashboard.
- Security: the waitlist is no longer readable with the public key (0057).

### Dashboard
- New (D-83): savings withdrawal countdown. Tap a savings account in Money to
  set its monthly withdrawal limit; the account then shows "4 of 6 withdrawals
  left this month" and lists this month's transfers out (migrations 0055,
  0056). The phone shows the same line under Net worth.
- New: Money → Offers, "Where to keep your money": savings, bank and
  brokerage accounts UntilFire lists, each with its rate, any current bonus
  and a line saying who earns from the link (D-81). Admin → Offers adds,
  edits, shows and hides offers and counts clicks.
- New (D-82): Plan → Assumptions has "Live in" and "Retire in". A retirement
  city now scales your own spending by how its prices compare with where you
  live, instead of replacing it with the city's average.
- New: "When do you move?" When you're free (the default) or earlier, in a
  year you choose, with an optional take-home there. Pay never follows a city
  unless you type it.
- Fix: choosing a retirement city or a tax home no longer overwrites where you
  live.
- Home's freedom chart is one bar a year, as on the phone. A planned move
  shows as a route chip under the date and a flag on the move year, with the
  years in the new city striped.
- Admin: the Census sync also stores household income by rank for each city
  (migration 0054), ready for suggesting pay after a move (D-82).
- New: "Suggest by rank" in the move form fills take-home in the new city at
  the same household-income rank as where you live, after its taxes (D-82).
  US cities only; labelled and editable.

### iOS app (in development)
- The freedom date uses the same retirement-city and move rules (D-82).
- Fix: Home no longer says you'd be free sooner without your rent or other
  essentials. The line only picks optional repeating payments, and the
  Recurring list marks housing, food, care and anything tagged Need as
  "Essential" without a "sooner" number.

## 2026-10-13

### Dashboard
- Fix: saving on the dashboard no longer erases profile fields it does not
  own, such as the app's finished Today days.

### iOS app (in development)
- New: Today, a short daily list of one-tap items made from your recent money
  (a category, need or want, a big spend, a bill tomorrow, payday, your number
  for the day). One item per screen; finishing marks the day, and days are
  counted, never streaked (D-73). Optional 9pm reminder.
- New look (D-74): a light top bar of chips on every tab, a colour per tab,
  chunky buttons everywhere, the Today bar above the tabs, Home as a teal hero
  card with four round actions, Money as an icon grid, Plan as tiles.
- New onboarding: sunrise welcome, a globe you spin to pick your city, pay on a
  wheel, savings on a keypad, five reveals one at a time, and a welcoming join
  page. The monthly check-in reminder is retired.
- Adding a transaction asks need or want, so it is filed straight away.
- Fix: the app called untilfire.com, which redirects to www and drops the
  sign-in on the way, so banks, net worth and household came back empty. It
  now calls www.untilfire.com directly.
- New (D-76): Sunny, the logo's sun with a face, on the welcome sunrise, the
  year reveal (with a chime and confetti), "All caught up", a goal reached, and
  empty and error screens. A first-visit Home tour where Sunny points at each
  part. One drawn two-tone icon set in place of system symbols and emoji.
- Today: Undo for five seconds after each answer; "Anything to add?" daily
  without a bank; one-time steps to connect a bank and name a goal. Home says
  once why the date moved after sign-in. Free accounts see Pro before a second
  bank.
- The globe is drawn with Skia on the UI thread, with momentum, and fits the
  screen. Onboarding answers sit mid-screen; the FIRE type quiz has five big
  answer rows; currency pickers show flags; calmer bounces.
- Pro through Apple in-app purchase (D-75), Sign in with Apple and native
  Plaid, built and switched on in the app's own build; until then "Connect a
  bank" opens untilfire.com. The admin Users page shows Apple and Stripe
  subscribers.
- Fix (D-77): Today answers and Review approvals move on instantly with a
  tick instead of waiting for the save; a failed save puts the item back.
- New (D-77): Home's actions are Add, Budget, Invest and What if; Review is
  redesigned (grouped by day, category sheet, swipe to skip); the Invest
  ladder is drawn to scale; the globe no longer cuts a line across the land.
- Fix (D-77): a bigger city globe that zooms further, a faster Review with
  subcategories (tap, or hold and drag), the freedom ring filling from empty,
  and no globe flashing.
- New (D-77): "I already have an account" on Welcome; Calendar shows category
  icons; Home's freedom chart is a bar per year; Pro purchases are picked up
  from launch and never hang; screens show loading instead of looking empty.
  Launch audit in docs/launch-gaps.md.

## 2026-10-11

### Privacy policy and terms
- New: plain-English privacy policy at /privacy and terms of use at /terms,
  linked from the homepage footer. Both cover the website and the iOS app.

### Deleting your account
- Before an account can be deleted, a Pro subscription that would renew has
  to be cancelled and every connected bank disconnected. Profile says so up
  front, and the request explains what is left if anything is.

### iOS app (in development)
- A native iOS app in `mobile/`, built with Expo, signed in with the same
  UntilFire account. Not in the App Store yet.
- The app now has Before you buy and Worth a look on Home, and Household in
  Profile (invite, accept, disconnect, and the shared date on Home).

### Compare UntilFire
- New: side-by-side pages for UntilFire vs ProjectionLab & Boldin, FI Calc,
  FIRECalc and Monarch Money, with a hub at /vs linked from the homepage.
  Each shows what you get, what it costs per year, and where each tool
  specialises.

## 2026-10-10

### What if…
- New in Plan: Compare. Try life changes on top of your plan, in your own
  numbers: work less, take a break, pay for college, buy a home, a side income,
  a windfall or a one-off cost. See your new freedom date against your plan,
  what each change costs, and what comes out of savings year by year.
- Changes can start when you reach Coast or end when you're free, and move
  with your plan. Save the what-ifs you want to come back to.

### Freedom badges in Explore
- Turn on 🏅 Badges in Explore to see, for every city, how you could be free
  by 59½: 🥉 keep working full time, 🥈 stop saving now, or 🥇 work half time.
- Stars show how you could live there: ★ frugal, ★★ medium, ★★★ wealthy.
  Hover a medal to read it, or open a city for the full picture.

### A more honest freedom age
- Your age at freedom is now rounded rather than rounded down, and the year
  is the year your date actually falls in. Both used to read a little early.
- Money you need before your pension opens is counted from the start of
  each year, so the check that you can reach enough is stricter.
- Most dates stay put; some move a year later. None move earlier.

### Calendar shows your real cash
- The daily balance is all your cash, savings included, with a line saying
  what you have today in each account. What is safe to invest still keeps
  your emergency fund aside.
- Coming in and going out are for the month you are looking at, so one
  salary counts once.
- Bills you already paid this month are no longer taken off again.
- Day-to-day spending now follows your Budget (less listed bills) rather
  than last month's tagged needs, here and in what is safe to invest.
- A brighter month: each day is shaded from Tight to Plenty by the cash
  you will have, with payments as dots and your invest day marked.
- Click a day to see it beside the month: what was recorded on a past day,
  what is expected on a future one, and add an upcoming payment right there.
  On a phone it opens as a sheet. Payment names now show on the month.

## 2026-10-09

### Calendar: your cash, day by day
- Money → Upcoming is now Calendar. The month shows every payment on its
  day and the cash you will have at the end of each day until you next
  invest, with your emergency fund left aside. Tap a day to add a payment;
  it can repeat. The list is still there under List.
- Your invest day is on the calendar with what is safe to invest. Mark it
  as done and nothing more shows as safe until next payday, so the same
  money is never invested twice.

### Every mortgage, with its own rate
- Money → Debts takes as many mortgages as you have, each with its own
  balance, rate and payment, and the year it is paid off. Your freedom date
  counts each at its rate, and saves its payment once it is paid off.

### Share your plan on one page
- Plan → Freedom Date → Share one-page plan: your freedom date, the numbers
  it uses, the formula, the path, whether you can reach your money before your
  pension opens, how the age moves with spending and growth, and what it
  leaves out. Save as PDF, with or without the UntilFire name.
- Or share it lighter, with no branding: a poster or a life timeline as a
  PNG (straight to the share sheet on a phone), or a Reddit-ready comment to
  copy as Markdown.

### An exact plan after a simple start
- Money → Income: salary to take-home, with the pension taken before tax and
  what your employer adds. Both count as saving in your freedom date.
- Plan → Freedom Date has "Your goal": what you plan to spend once free (it
  sets your FIRE number), pay growth (off until you choose), and when your
  pension opens. Confirm the age and the date checks you can reach enough
  money before then, and moves later if you cannot.
- Plan → Contributions shows where your saving goes: pension, employer,
  tax-free account (Roth IRA, ISA, NISA, TFSA) and the rest. Your split
  replaces the old fixed one once you set it; mortgage interest uses your rate (set
  it on Money → Debts).
- The calculator's savings step says what counts: stocks, funds, retirement
  accounts and cash savings.

### Explore keeps the globe in view
- On a computer, Explore fits the window: the globe stays put and only the
  city cards scroll, in their own column. Phones scroll as before.
- Scroll over the globe to zoom in and out.
- Zoomed in, each pin keeps its flag and adds the city's name (🇵🇹 Porto
  2041); before, the flag dropped off and the pins showed only a number.
- Zooming in leans toward where your pointer is, like a map app.
- The globe zooms in further (40×, was 12×), enough to pull apart
  neighbours like Dallas and Fort Worth.
- Zoomed in, every country shows its states or provinces (Natural Earth,
  grouped to regions where a road map would), under firmer country borders,
  and land has a light tint instead of plain white. The border data loads only
  once you zoom in.
- The globe is about three times smoother to drag: the land is drawn on a
  canvas, only borders in view are projected, a drag moves once per frame,
  and the list catches up when the globe settles. Fixed: the currency symbol
  was worked out afresh for every pin on every frame.
- The map and the list follow each other: tap a pin and its card scrolls into
  view; tap a card and the globe turns to the city. Zoomed in, the list shows
  only the cities in view ("15 cities in view · Show all").
- Explore opens on the US (or the whole world if you use another currency).
- Cards are compact, so a column shows five or six places; Open and Plan
  sit inside the card you chose.
- Without your numbers, one line offers to add them instead of an open form;
  filters wrap instead of scrolling sideways.

### Explore: one globe, your currency
- US and abroad are one globe now: one pin per country until you zoom in
  (the US is a single pin), then every city, with state lines up close. US
  and Abroad are filters that also turn the globe.
- The map is on the left and the cards on the right.
- Money shows in your currency: the app's default currency, or the one you
  used in the calculator.
- Fixed: flags showed as letters ("us") on Windows; they're drawn now.

### Explore replaces Expat FIRE
- Plan → Expat FIRE is now Explore: the same map and city cards as the
  public Explore page, at your plan's numbers. "Plan for" a city still sets
  your retirement city. The public Expat FIRE calculator now opens Explore.
- Your numbers carry over: after the calculator shows your result, Explore
  already knows them. Each city is priced at your way of spending, so your
  own city gives the same year as your result.
- Cards show income tax as an effective-rate range (US: federal, payroll and
  state on $50k–$150k earned), not one state rate.
- Fixed: Explore's year could be a year later than the calculator's for the
  same numbers. An age you skipped is no longer saved as 30.

### Explore: every city on one map
- New Explore page (in the top bar): every US and international city on a
  map, with a card for each. Pins and cards show the monthly cost, or, once
  you add what you've saved and save each month, the year (or your age) each
  city could set you free.
- Star a city to keep it on the map and in your Starred list. Abroad, the
  globe shows one pin per country until you zoom in.
- Each card links to that city's page, and "Plan" starts the calculator
  with the city filled in. Your numbers and stars stay in this browser.

### Fixes on Insights, Freedom Date and Goals
- Insights: this month shows "so far" with no savings rate until it ends,
  instead of −999%. A month that spent over twice its income shows "< −100%".
- Freedom Date: Before you buy has its own price field, then one sentence
  with the result. More tools is now three simple rows below it.
- Goals: your goals come first; the Your why questions fold into one row.

### Onboarding shows only the questions
- Once you tap Start, the homepage's about section (how it works, calculator
  and city links, FAQ) no longer appears below each question. It still shows
  on the landing screen.

### Export your data
- Profile → Your data → Export your data: your transactions as a spreadsheet
  file (CSV), or everything as one file (JSON): transactions, upcoming bills,
  budget, goals, accounts, net worth history and your plan. Free, anytime,
  whether or not you're on Pro. Bank connection details are never included.
- Sign-in, pricing, the bank connect step and the FAQ now say you can export
  or delete your data anytime.

### Upcoming, Categories and Budget are back on desktop
- Fixed: on a computer, Cashflow's Upcoming, Categories and Budget pages had
  no way in. The sidebar now lists all of Money's pages on one level:
  Transactions, Upcoming, Categories, Budget, Net Worth, Debts and Insights.
- Each page under Money and Plan in the sidebar has a small icon.

### Small fixes across the dashboard
- On phones the top bar shows the logo once and the page you are on, with
  Feedback next to dark mode instead of a button floating over your rows.
- Going over a category budget is drawn in dark stripes, so a bill still due
  in an amber or red category no longer looks like overspending.
- The Money and Plan sub-tabs fit narrow phones better; when they still
  scroll, the strip fades at the side with more and keeps your tab in view.

### Calm Net Worth
- Net Worth is one headline and short lists: what you have, what you owe,
  your safety net and your banks, each account on one row with its bank's
  logo.
- Fixed: typed balances no longer show next to connected ones. A balance you
  typed appears only for a kind of account with nothing connected, so cash no
  longer reads $2,528 at the top and $660 lower down.
- The emergency fund is one row; tap it for the floor, the target and the
  accounts that hold it. Banks are rows with Sync now and Disconnect under
  Manage. The empty Holdings box and the summary strip are gone.

### Clearer category bars on Transactions
- Every budget is now a black line in the same place on each row, so going
  over always shows as amber hatching past it, in any category colour.
- Past months is a shaded band showing where your recent months landed, not
  a thin tick: wide when a category varies, narrow when it is steady.
- Fixed: after a move or a new lease, a category with rent listed in Upcoming
  counts from the first month that rent was paid, at today's amounts, so
  housing no longer compares US rent with months of rent paid abroad.

### Typing amounts in the calculator
- Pay, savings and net worth fields open the number keyboard on phones, keep
  what you type as you type it, and tidy it when you leave the field: leading
  zeros go and thousands separators appear ("0140000" becomes "140,000").
- A cleared field means "not answered" and waits for an amount, instead of
  counting as $0. Zero is still a valid answer.
- Saving more than your pay now says it was set to your pay, rather than
  changing the number silently.
- Net worth explains that investments, retirement accounts and cash all count
  as invested, and that your home is left out.
- Removed the old city-page calculator component, unused since the city
  guides (D-43).

## 2026-10-08

### A new way in: five questions under a rising sun
- The free calculator now asks one thing per screen: where you live, your
  take-home pay, what you save, what you have so far, and your age. A small
  landscape sits above each question; the sun rises and a path fills from
  home with every answer, and a tag shows what you just entered.
- Suggestions come from your earlier answers: pay around your city's living
  costs, saving as a share of your pay, and savings so far in months of pay.
  Every step has an "Other amount" field instead of an "enter a different
  amount" link.
- Where you live: search 390+ cities, a city near you from your time zone
  (nothing is sent anywhere), popular cities, or your own town, which uses
  your own spending. Skip is in the header.
- Age is its own step, on a wheel you can swipe, scroll, click or type into.
  It is still optional.
- Back is an arrow at the top left; each screen's footer holds only its main
  button.

### Calm Profile
- Profile opens on your name, email and plan, with Try Pro or Manage billing.
- Name, household, currency and banks are rows that open in place; sharing
  and deleting your account are rows too.

### Rent is not counted twice
- Fixed: a rent payment that looks like your Upcoming rent, but isn't linked to
  it yet, now counts as paying it while "Upcoming bill?" asks you. Housing no
  longer shows the rent as both paid and still due, and "Over by" no longer
  includes it twice.
- Housing and other bill categories compare whole past months, so rent paid
  later in the month no longer makes "Past months" look like $0.

### Cleanup
- Removed an unused old Learn component; Learn is `app/dashboard/LearnTab.tsx`.

### Calm Learn
- Learn opens on your stage, why you're there and how far through the four
  stages you are, then one article to read next.
- Each stage's articles are rows with full titles; ones you've opened are ticked.
- "Try it on your numbers" opens the matching Plan page instead of a public
  calculator.
- Fixed: long names in Money and Plan rows could make the page wider than a phone.

### Calm Citizenship
- Citizenship asks which passport you hold first, then shows its score, rank
  and weakest part, with one bar split into tax, retirement accounts and investing.
- What it means for you: accounts, capital gains and income tax as rows, then
  what to watch out for and what's good for FIRE.
- Other passports are a sortable list; tap one for its page.

### Calm Expat FIRE
- Expat FIRE opens on the soonest place work becomes optional, how many years
  before your plan's city, and a bar to that place's FIRE number.
- A list shows when each place opens up, one per country, with your plan's
  city always in it; the globe is one tap away.
- Drag the slider to see how many places are in reach by a year.
- A city's page shows how much sooner or later it makes your date and how its
  costs compare. "Plan for" makes it your retirement city.

### Answer-first city guides with map comparisons
- Apply the approved Austin layout to all 230 existing city guides: one FIRE
  estimate, a clear personal-plan action, coordinate-backed map comparisons,
  and expandable sources and scenarios. Preserve metadata and canonical links.
- Keep map labels distinct on phones and provide text comparison links when
  tiles fail. Do not invent neighbors or neighborhood-level precision.
- Carry the chosen city into existing onboarding and record the plan-link
  event; signup remains optional until the save-plan step.

### Location explorer
- Add a reusable public city/globe explorer with visible-area city choices,
  search/filter recovery, three-city comparisons, animated selection and
  reduced-motion controls. Phone map is optional; keyboard city buttons and
  comparison-removal focus provide an alternative to canvas interaction.
- Pilot on Austin and the public Expat FIRE calculator using main's current
  costs and shared FIRE calculations. On Austin it replaces the city guide's
  comparison map. The dashboard's Expat FIRE globe is unchanged.
- Bundle licensed US state boundaries; no external map service or API key.

## 2026-10-07

### Calm Plan
- Freedom date shows your progress to your FIRE number, what moves the date most with the month each move lands, and your assumptions as rows you tap to change.
- Before you buy says in one line how much later a purchase makes your freedom date.
- Goals show what you've saved toward all of them and what a month keeps them on time; deleting a goal asks first.
- Contributions open on the next amount, your mix now against your target, and the steps it goes through.

### Focused Budget
- Budget opens on what's left to spend this month and about how much a day, with a pace bar showing whether everyday spending is ahead of or under an even pace. Tap "See October" for the month as a calendar. If checking is tighter than your budget before payday, it says so.
- Fixed: when your budget was the limit, free to spend counted the whole month's remainder as spendable before payday, overstating the daily amount. It now takes the days before payday's share.
- Only categories that are over or heading over are listed; bills are one row and everyday categories fold into one. Edit budget shows them all.
- If an over category holds a payment you also made last month, Budget asks whether it's a bill.
- Money rows show category icons, as on Transactions. Deleting an upcoming payment asks first. The sidebar no longer repeats Cashflow's pages.
- Insights' summary cards follow your theme.

### Calm Money
- Budget, Upcoming, Net worth and Debts share one calm layout: a headline with one number and its bar, then simple rows with a dot, a name, the amount and a bar.
- Cashflow's sub-pages switch with pills.
- Upcoming shows the next 30 days as dots on a strip; tap a payment to mark it paid, link it, edit or delete it.
- Debts: add what a loan started at to see how much is paid off. Cards show their balance against the limit.
- Net worth uses connected balances throughout, matching Home.

### Calm Home
- A fresh Home shows four things: your freedom date with a bar to your FIRE number and a 5-year chart, this month's contribution as a step bar, this month's spending by category against your budget, and one row with net worth, safety runway and months on plan.
- The other Home cards are hidden by default, not removed; add them back with Edit. Layouts you saved keep what they had.
- The hero is no longer forced dark, and follows your theme.

### Copy and labels
- The welcome tour describes the app as it is today.
- Home's "what if" moves show amounts in your currency, and the consistency
  card counts months on plan instead of a streak.
- Money words are consistent: Income, Expenses, Saved, Needs, Wants.
- One name per thing (FIRE number, Upcoming payment, Debts), and labels in
  sentence case.
- Removed eight unused old components that still used the old wording.

### Free calculator and the rest of the app agree
- The free result's "retire abroad" ages are right for visitors outside the
  US: their figures are converted to dollars before comparing with city costs.
- The embeddable calculator shows the same freedom year as the free result.
- The Assets tab's emergency fund months match Home and Contributions.
- The purchase-impact calculator starts at the same 6.9% growth as the rest.

### Expat FIRE uses your numbers everywhere
- The globe's colours and hover card use your own target and growth, not a
  fixed 25x and 5%.
- If your city is not in the list, comparisons use your own spending
  instead of New York or a made-up $60,000.
- City costs include your lifestyle, so each card adds up, and money shows
  in your display currency.

### Money's numbers agree
- Net worth counts each debt once, everywhere: a linked loan or mortgage
  replaces what you typed, and credit card balances are included.
- The Net Worth page's progress matches Home's.
- Insights averages only finished months, and its categories include your
  custom ones.
- Budget's savings rate is after your mortgage payment, and a category is
  "over" when spending plus bills still due passes its budget, the same as
  Transactions.
- "Committed every month" and Insights' FIRE-target line use your own
  withdrawal rate and tax setting.

### Contributions math
- Paid weekly: each purchase is your week's money, not a quarter of it, and
  the employer match and loan overpayment take a week's share, not a
  month's every week.
- Debt counts as expensive when its rate beats your expected return before
  inflation (9.6% by default), so a cheap loan no longer jumps ahead of
  investing.
- Home's safety runway uses the emergency fund you set on Contributions, so
  the two agree.
- Home states the plan's monthly investing as an assumption. What to put in
  this month is the Next contribution card's.
- Contributions offers the debts from Liabilities and your connected loan and
  card accounts, so you don't have to type them twice.

### Plan's tools agree with your freedom date
- "What would this cost your freedom?" uses your real balances (connected
  accounts included), your savings after mortgage and debt, and the same
  target as your freedom date.
- The Tax Profile card shows the extra on your actual retirement target.
- Expat FIRE no longer counts linked accounts twice. It uses your withdrawal
  rate, taxes and lifestyle for each city, and its timeline grows at the rate
  you chose.

### Home's math matches your freedom date
- Debt is paid out of your savings instead of on top of investing all of
  them, so freedom dates for people with debt are no longer too early.
- "What if" moves and the spending warning use the same model as the
  freedom date, tax settings included.
- A connected account replaces the balance you typed for the same kind of
  money instead of adding to it, everywhere on Home and Net Worth.
- This month on Home is forecast like Transactions: rent on its day no
  longer reads as overspending, and "left" subtracts bills still due.
- The consistency streak only judges finished months.

### Upcoming bills match their payments
- Upcoming bills take a category and sub-category like a transaction; the
  category is guessed from the name ("Rent" is Housing) until you pick one.
- When a payment looks like one of your Upcoming bills, Worth a look asks
  once ("Upcoming bill? → Rent"). Say yes and it is linked by name from then
  on, so the bill is counted once in the forecast and budget line.
- Once linked, the bill marks itself paid when its payment arrives: a
  repeating bill moves to its next date, a one-off is completed.
- The forecast no longer counts rent twice when you pay it under another
  name (a person, or a card like BILT): past payments that match a bill's
  category and amount are kept out of your everyday spending rate.
- Repeating bills no longer end up under Completed: paying one moves it to
  its next date, and ones completed before now are back in Upcoming.
- "Link payment" on an Upcoming bill lets you pick the past expense that was
  that bill. Later payments with the same name and a similar amount or date
  mark it paid, even when paid early or late, and the forecast stops
  adding a bill you have already paid this month.

### The numbers agree with each other
- "On track to save" counts this month's expected income until all of it
  has arrived, instead of one paycheck against a whole month of expenses.
- A new account's forecast no longer spreads rent across every day left.
- Past months and the forecast both use your last six months.
- Over or under budget compares only budgeted categories; spending without
  a budget shows separately. "Bills exceed budget" now shows when it applies.
- A category's "left" subtracts bills still due this month, the same as
  Free to spend, and shows them as a striped "Still due" segment.
- Bills without a category are treated the same everywhere ("Rent" counts
  as Housing in Free to spend too), and rent you have linked and paid stops
  reducing Free to spend.
- The budget line shows bills at their real size. If bills add up to more
  than your budget, a chip says by how much instead of shrinking them.

## 2026-10-06

### Transactions shows any time range, with graphics instead of text
- One date control replaces the month arrows: this month, the last 3, 6 or 12
  months, this year, or a custom span. The arrows step by the range's length,
  and the page remembers the choice.
- A review bar shows how much is filed and how much still needs you; its
  green part starts the review, which is now free when it comes from your own
  history. Connected banks fold into one "synced" line that opens the list.
- A summary card shows spent or earned, what you saved and your savings rate,
  drawn as a running total against your usual pace, as bars, or as a calendar
  shaded by how much went out each day (up to 6 months on a phone). Category
  bars mark your usual and filter the list; tap several to combine them,
  and Clear appears while a filter is on.
- "Worth a look" flags rows that may be wrong: card bill payments, possible
  duplicates and unusually large charges, each answered in one tap.
- The list covers the whole range with a total per month, and its header
  shows what the rows on screen add up to.
- Categories move to eight colours that stay distinguishable for colour-blind
  readers and in dark mode; tap a category's dot to change it.
- After first use: the line and bar charts have a key, the review button
  reads "to review", info tips are no longer clipped inside the review bar,
  flagged rows show the amount in its original currency, the exchange-rate
  label is gone, and a duplicate now means the same day (or a bank and an
  import overlapping), not the same coffee two days running.
- Your budget now sits beside your past months: the line chart has a thin
  budget line (spread the way your months usually are, so rent on the 1st
  does not read as overspending), bars show a budget level, and each
  category bar has a budget track with what is left or over. "Usual" is
  now called "Past months", and how far you are from each is shown above
  the chart instead of inside it.
- Hover over (or tap) the line or bars to read the exact amounts for that
  day, week or month, against past months and your budget.
- Months with no income recorded use the expected income from your Budget
  tab, so the savings rate no longer swings to extreme numbers; the income
  figure is starred when it does.
- One set of words everywhere: Income, Expenses, Saved, Needs and Wants
  (the list filters said In/Out, the card said Spent/Earned).
- The line chart forecasts the rest of the period ("On track for $3,511",
  with how far over or under budget that lands), drawn as a dotted line,
  and has faint gridlines with amounts. Ranges longer than a month open on
  bars, which read better than a long running line.
- The forecast and the budget line now use the bills you listed in
  Upcoming: each bill counts on its own due date, and everything else runs
  at your usual everyday rate. Before, a rent paid on the 1st was counted
  again from past months that paid it on the 28th.
- While a month is running, saved reads "On track to save", comparing a
  full month's income with the forecast, instead of a partial month.
- Once everything is filed, the review bar shows this month's expenses and
  what is free to spend until payday (the same figure as Home).
- Regular payments found in your history (rent paid through the same card
  every month, subscriptions) count as bills even when they are not listed
  in Upcoming, so they are no longer forecast twice.
- The budget line steps up on the date of every Upcoming payment, whatever
  its repeat (weekly, monthly, yearly or one-off, paid ones included), in
  past months as well as this one, instead of only monthly ones. A bill in
  Upcoming and the same payment found in your history count once.

### Reviewing suggested classifications learns from your history
- Suggestions now come from how you filed the same merchant before: category,
  sub-category and need/want, shown as "from your history (N×)". Reference
  numbers in descriptions are ignored, and Chinese merchant names match. The AI
  is only asked for need/want where history has no answer.
- What you approve is remembered automatically, because the approved
  transaction becomes next month's evidence. The unreliable "always classify"
  checkbox is replaced by "Apply to all N from this merchant".
- The review window keeps a fixed height as rows are approved or skipped. The
  category picker opens inline instead of being clipped, and sub-categories can
  be chosen. Rows that are already filed and tagged are no longer shown again.

## 2026-10-05

### Monthly update emails take a banner
- The admin email editor has two new optional fields for monthly updates: a
  banner image shown full width at the top (linked to the button's page), and
  the inbox preview line. With a banner, the repeated "Monthly update" label
  is dropped. September's banner is `public/email/september/banner.png`.
- Update items can carry an icon from the app's own set (PNG chips in
  `public/email/icons/`, since Gmail and Outlook drop SVG), chosen per item in
  the editor; the section headings get one too. September adds screenshots of
  the Next Contribution card, the household card and the Coast FIRE result.

## 2026-10-02

### Free to spend until payday
- Money → Cashflow → Budget now opens with how much is free to spend until
  your next paycheck: your checking balance less the bills due before payday,
  or what is left in your budget if that is lower. A runway shows the balance
  stepping down as each bill leaves; weekly, two-weekly and monthly pay all
  work. Choose which accounts count; credit card balances are shown, and their
  payments count from Upcoming.
- Home has a new "Free to spend" card that says it in one sentence ("Of the
  $2,400 in your account, $412 is yours to spend before Thursday"), with a
  bar of where the balance goes and what is left in each budget category.
  It can be moved or hidden like any Home card.

## 2026-09-27

### Sourced FIRE-by-state reference
- `/fire-number/fire-by-state` now states exactly what its figures measure:
  city-sample averages built from 2024 Census ACS rent data plus the documented
  non-housing baseline. It shows the review date, sample size, city range,
  calculation steps, limitations, official sources, FAQ and downloadable CSV.
- New York City is grouped into New York for state comparisons instead of
  appearing as a 52nd jurisdiction. Its distinct city tax key remains unchanged;
  the best-states ranking uses the same grouping, and the obsolete
  `/fire-number/states/newyorkcity` path redirects to New York.

### /invite, redesigned
- A dark hero where the key visual is the one bright thing, so the eye
  lands there first: a creator's post with the live calculator and a
  "+$23.70 · a reader subscribed" toast. The details follow on light bands
  (how you earn and the earnings estimate, four "what you get" tiles,
  three FAQs), and a dark band closes. Shorter than before, with every
  card in a row the same size.

### Creator program in the dashboard; a pitch page that shows the deal
- Profile → Creator program is a short card: your link, Copy and More.
  More opens `/invite`, which for a signed-in user shows their own program
  (join, link, stats, progress to the 40% tier, embed, payouts) above how it
  works. The link stays inside the app, so no "leave site?" prompt.
- `/invite` now shows the offer at a glance (30% · 12 months · 60 days for
  readers), the 30% → 40% → 10% ladder, an earnings estimate slider, the
  real calculator a creator can embed, what readers get, and a short FAQ.
- Profile section titles have icons and use theme colours, so dark mode
  reads properly.

### Creator program: no look-alike links, remove and hold
- Codes can't contain "untilfire", "official", "support", "staff" or "admin".
- `/admin` → Referrals can **Remove** a creator who breaks the terms (link
  stops, code freed, unpaid earnings forfeited) and **Hold** a code for a
  creator being pitched, which only their email can claim.
- The terms add: don't pick a link that suggests you're UntilFire or someone
  you're not. D-27 amended.

### Embeddable calculator: sliders and a growth curve
- `/embed/<code>` shows the freedom year first, then a curve of invested
  money rising to the dashed target line, then three sliders (take-home,
  spending, invested). The footer is one line: the reader's trial, "by
  UntilFire" and an "estimate" note whose assumptions show on hover. Fits
  the 520px snippet on phones and wide blog columns.
- `freedomPath` in `lib/quick-freedom.ts` draws the curve from the same
  growth and target as the year; test:referrals checks they end together.

### Calculators page, shorter and grouped
- `/calculators` groups the nine calculators by the question they answer,
  one line each, instead of long cards. The internal "how these fit
  together" note and the city cards are gone (one link to FIRE number by
  city instead); the FAQ is three collapsed questions. About a third of
  the old length.

### Learn page, one stage at a time
- `/learn` opens with four stage buttons (Starting Out, Building Momentum,
  Approaching FIRE, Living in FIRE). Each stage shows one line, three reads
  by title and read time, one calculator and a link to the full stage page.
  The per-stage paragraphs, tool sidebars and city cards are gone, no
  article repeats, and the page uses the warm site style. All four stages
  stay in the HTML for search.
- Calculator links say where they go: "Safe Withdrawal Calculator" (six
  places, all opening the FIRE Number calculator, which sets the
  withdrawal rate) is now "FIRE Number Calculator". Approaching FIRE
  points to the full FIRE Calculator, so stages 3 and 4 no longer share
  one link.

### One header across the public site
- Every public page now has the homepage's top bar: logo, How it works,
  Calculators, Learn, Pricing, and Get started (Dashboard when signed in).
  City and state pages, Learn, pricing and the invite page had none; the
  calculators each had their own. On phones the links fold into a menu.
- Get started from another page opens the homepage calculator with
  `source=nav-<page>`, keeping the per-calculator attribution the old bars sent.

## 2026-09-26

### Creator referral program: 30% for 12 months
- `untilfire.com/invite`: creators get a link (`/r/<code>`), choose PayPal
  or Wise, and see visits, signups, paying customers and earnings.
- Earnings are 30% of what each referred customer pays, excluding tax, for
  their first 12 months of paying, held 30 days for refunds, paid monthly
  once $20 is ready. `/invite/terms` spells it out.
- `/admin` → Referrals: what each creator is owed, "mark paid" with the
  PayPal or Wise transaction id, pause a creator, reverse a commission.
- Profile links to the program. Sign-in can now return to `/invite`. D-27.
- Readers who come through a creator's link get Pro 60 days free instead of
  30, and the landing page and upgrade screen say so.
- Creators can put a freedom-year calculator in their own posts
  (`/embed/<code>`, copy the code from `/invite`); readers who continue are
  credited to them.
- "Give a month, get a month" in Profile: friends get Pro 60 days free, and
  when one subscribes the sharer gets a month free, taken off their next bill.
- Creators see readers in their free trial and what they could earn, get
  their first payout at any amount, earn 40% from their 10th paying customer,
  and 10% for as long as a customer stays after their first year.

### Pro is $9 a month or $79 a year, with a 30-day free trial
- New prices for new subscribers. Anyone already on $3 or $30 keeps it.
- The free trial is 30 days, down from 90.
- Every price and trial mention reads `lib/pricing.ts`; the two hard-coded
  "3 months free" texts (landing page, Profile) now do too. D-26.

### Housekeeping
- State pages with one city say "1 city" (and "1 City" in the search title)
  instead of "1 cities".
- This changelog drops its fourteen "Unreleased" headings for plain ship
  dates: every merge deploys, so nothing here was ever unreleased.

### Search titles that show the answer
- Singapore, Dubai, London and Shanghai now show their FIRE number in the
  Google result ("Singapore FIRE Number: $1.8M (USD) Estimate"), like the US
  city pages already did. They rank on page one with almost no clicks under a
  generic "Calculator and Planning Guide" title.
- The savings rate calculator's title says what the answer looks like: "Save
  50%, Retire in 15 Years". `test:fire-number` checks the 15 and 42 years
  quoted against the projection.

### Coast FIRE calculator: the number first, with Social Security and couples
- The first result is now your Coast FIRE number (what you need invested today
  to stop paying in) and how much of it you have. Before, the page only showed
  the age you could stop.
- New inputs: Social Security or a pension, a year in today's money, and the
  age it starts. Income that starts after you retire leaves a gap your pot
  covers, and the target includes it. "Two of us" adds a partner's benefit.
- Two new FAQ answers (Social Security, couples) and a search description that
  mentions both, since those are what people search for. D-25.

### Dashboard button on the landing page when signed in
- Signed-in visitors who stay on the landing page (internal test accounts skip
  the automatic redirect) see "Dashboard" in the top bar in place of "Get
  started", one tap into the app. Signed-out visitors see no change.

### Fewer words on the dashboard Home and Plan
- Plan's assumptions show growth in one line ("6.9% growth a year after
  inflation, recommended. Change"), like the free result, with "At 6.9%, your
  freedom date is …" beneath. The open history list and the long
  recommendation box now sit behind Change.
- Home and Plan helper lines are cut to one short line each (safety runway,
  top tasks, consistency, next contribution, net worth comparison, purchase
  impact, More tools, freedom date not reached). The line under Home's
  progress card is gone.
- The tax card no longer sends people to Profile to set their city; the city
  lives in Plan.
- Fixed text: Home 260 to 206 words, Plan assumptions 109 to 73 (plus the
  recommendation box and the open list), freedom date 42 to 36, More tools
  56 to 44, tax 72 to 66, next contribution 47 to 40, comparison 74 to 60,
  purchase impact 63 to 52.

### Fewer words on the FIRE number and savings rate calculators
- Each factor in the FIRE number calculator is now a title, its control, and
  "Recommended: 3.5% · Use". What the factor means, and why we recommend what
  we do, sit behind a "?" beside the title. The intro and result card are
  shorter; the working stays.
- The savings rate calculator shows growth in one line ("6.9% growth a year
  after inflation, recommended. Change") and opens the history list on tap. The
  inputs and the answer now fit on one phone screen, where before the answer
  sat below the open list.
- Words at phone size: FIRE number first screen 100 to 62, calculator 306 to
  103; savings rate first screen 85 to 57. The explanations below each
  calculator are unchanged, for search.

### Fewer words on the free result
- The growth list is now one line per choice: its name, a five-dot meter for
  how often history did as well, and the rate. Only the selected row shows its
  reason and details. It went from 248 words to 44.
- The result's growth line reads "6.9% growth a year after inflation, as we
  recommend. Change", and "Change" opens the list. The two links it replaces
  are gone.
- The freedom number shows its future-dollars explanation only when you switch
  to future dollars, in one shorter line. The stack-up step keeps its bars and
  shows "4.8× the average saver"; its sources sit behind a "Sources" tap. The
  expat step says "Tap a city to compare."
- Words per step at phone size, counting the 6-word header: freedom age about
  58 to 41, freedom number 62 to 35, stack-up 130 to 52, expat 66 to 50.
  Design-system rule 7 records the limit for doing screens.

### Plan shows the freedom date its assumptions move
- Plan's Freedom Date tab now shows the freedom date at the top, and says how
  far the growth choice moved it from the default. The same date appears
  directly under the growth picker. Before this, choosing a different growth
  rate changed Home's date but nothing visible on Plan. Plan and Home compute
  the date with one shared function (`freedomProjection`), so they can't
  disagree. The expat comparisons now recompute when growth changes. The stale
  "Assumptions live in Profile" line is gone. `test:plan-freedom-date` covers it.
- One answer on growth: the recommendation is now the default, 6.9% (the S&P
  500's full record since 1928), instead of recommending 5% while defaulting to
  6.9%. The cautious 5% stays one tap away, labelled as extra margin. D-24.

### City links go straight to each city's page
- City lists (the FIRE number hub, state and region pages, cheapest and most
  expensive cities, nearby cities, Learn) now link Austin to
  `/fire-number/austin-tx` directly, instead of through the redirect from
  `/fire-number/austin` (#151). Links go through `cityPagePath`, and
  `test:city-page-seo` fails if a page builds `/fire-number/${key}` again.

### Growth after inflation, chosen from S&P 500 history
- Growth is now a choice among stretches of S&P 500 history, each starting at
  an event that explains it: since 1928 (the full record), 1946 (after World War
  II), 1972 (after the gold standard), 1982 (the long bull market), 2000 (the
  dot-com peak) and 2009 (after the 2008 crash). There is also a cautious 5%,
  and the worst 30 years on record. Each shows its return, why its start
  matters, and how often every 30-year stretch since 1928 did as well.
  Generated from Shiller's data and BLS inflation by
  `scripts/build-sp500-history.mjs`.
- The picker switches between before inflation (what an account statement
  shows) and after inflation, and explains the difference. The free result's
  freedom number switches between today's dollars and the freedom year's
  dollars, and says the date stays the same.
- The default is the measured since-1928 figure, 6.9% after inflation (it was
  typed as 7%), so default dates move one to three months later. We recommend 5%.
- The free result says what it assumes and where that comes from, switches to
  5% in one tap, and opens the history on request. The choice carries into the
  dashboard at sign-up.
- Plan's assumptions card, the savings rate calculator and Coast FIRE use the
  same history picker. The dashboard's saved growth rate could not be changed
  before; the dashboard's expat comparisons now use it too.
- The savings rate page's method note no longer describes the monthly model it
  stopped using. The landing hero's example now uses the same rate as its date.
- The free result's freedom age now rounds like its year (the engine was fixed
  yesterday; the result screen had its own copy). Recorded as D-24.

## 2026-09-25

### US city estimate sources
- The 226 generic US city FIRE guides now show when their cost baselines were
  reviewed, label the figures as USD, explain the Census housing and national
  non-housing inputs, and link to official source data. Each guide also links to
  its state comparison and the 4% rule calculator. Calculations are unchanged.

### What does FIRE mean
- The FIRE article now answers "What does FIRE mean?" in its first two
  sentences, for search snippets, with a quick FIRE number box (spending × 25)
  under the definition and four FAQs whose structured data matches them. Title:
  "What Does FIRE Mean? Financial Independence, Retire Early". The URL is unchanged.
  Articles can now carry an updated date and FAQs.

### FIRE number calculator
- Rebuilt on the design system with every factor named: yearly spending,
  withdrawal rate (with an optional stop age), tax on withdrawals and other
  income, each with what it means and a recommendation you can take with one
  tap. The working shows under the number (on phones a bar keeps the number in
  view while you change factors), and the page publishes the formula
  and a worked example. Starts at the plain 25× rule. Recorded as D-23.
- The page had two h1 headings; it now has one.

### One answer across calculators
- The savings rate, purchase impact and landing page projections now use the
  freedom date's own growth model (`yearsToTarget` in `lib/fire`) instead of
  their own monthly loops, so the same person gets the same years to FIRE on
  every page. Their results shift by up to about 8 months. City pages use the
  shared 7% real return instead of a typed copy. `test:fire-number` checks the
  pages agree.
- The age shown at your freedom date now rounds the same way as the year; it
  was a year ahead (for example 51 instead of 50 at 30 with 20.7 years to go).
- The purchase impact page's logo was white on a cream bar in light mode; it
  now follows the theme.

### Austin search entry
- Lead the Austin FIRE guide's search snippet with its estimated answer, label
  its planning amounts as USD, and add spending-sensitivity examples so visitors
  can pressure-test the 25x baseline before continuing to a calculator. Let
  curated city explanations stack on phones instead of compressing into a narrow
  column, and replace Austin's unrelated international recommendations with four
  Texas city comparisons. Consolidate the generic `/fire-number/austin` route
  into the state-qualified `/fire-number/austin-tx` canonical and remove the
  duplicate route from the sitemap.
- The Austin spending table puts the 25x FIRE target right after the scenario,
  so it shows on a phone without scrolling the table sideways.

### Net worth by age
- New page: `/calculators/net-worth-by-age`. Enter a net worth, and optionally an
  age, to see how it compares with US households your age, then a table of the
  median and 25th–99th percentiles for every age group in August 2026 dollars,
  where the numbers come from, and a FAQ whose structured data matches it. Same
  comparison, data and inflation factor as the result screen (D-19); nothing
  typed is recorded. Hands on to the freedom date. Listed in the sitemap and on
  the calculators page. Recorded as D-20.
- Net worth now compares with US households in five-year age groups (18–24,
  25–29 … 70–74, 75+) rather than ten-year ones, on the page, the result screen
  and Home: at 26 you are compared with 25–29, not with everyone under 35. The
  page table shows how many households were surveyed in each group and drops
  the top-1% column, which a few hundred households can't support. The build
  still checks the Fed's published ten-year medians from the same data.
  Single years from UntilFire's own users are a recorded future direction.
  Recorded as D-21.
- Share your net worth result: a button under the result shares a link whose
  preview image reads "Ahead of 72% of US households aged 25–29". It carries
  the age group and percentage only, never the amount; the link opens a
  noindex page that leads to the calculator. Share sheet on phones, copied
  link elsewhere. Recorded as D-22.

### Dark mode
- Primary buttons are readable in dark mode: their label now uses the card
  surface colour instead of white, which was 3.1:1 on the dark theme's green
  (under the 4.5:1 text needs); it is now 5.5:1 there and 4.5:1 in light mode.
  The same fix covers the green buttons built by hand: the landing page's two
  "Find my freedom date" buttons, the calculator's Continue / Show my freedom
  date, the result's "Save my starting point", Coast FIRE's header link and a
  dashboard action, and the selected city on the result's expat globe (the
  hover green is 7.1:1 in dark, where white was 2.4:1). The design system's note on the white label is updated to match.
- The UntilFire logo follows the theme on the five calculator pages and the
  dashboard sidebar and mobile header, where it was dark green on the dark
  theme. `/share` and `/learn/topics` keep the fixed-colour logo because their
  backgrounds stay light in both themes.

### SEO identity
- Replaced a learning-page link to the removed Monte Carlo feature with the
  existing free FIRE estimate. Recorded evidence-based organic growth priorities
  in `docs/seo-growth-priorities-2026-09-25.md`; no paid promotion is authorized.
- Lead homepage search/social metadata with UntilFire, explicitly provide the
  site name and add "Until Fire" as an alternate name in the existing markup.
- Remove the unimplemented `/?q=` SearchAction and an unverified usage-count
  claim; correct comments that treated sameAs as a guaranteed brand-ranking fix.
- Record the ongoing SEO evidence and measurement backlog in `docs/seo-workplan.md`.
  No product UI, calculation, redirect or indexing policy changes.
- Removed the site-wide FAQ structured data from the root layout. It described
  questions no page shows and appeared on every page, beside each page's own FAQ
  schema. The homepage now builds its FAQ schema from its visible FAQ; the other
  FAQ pages keep theirs. `test:seo` guards both.
- The no-income-tax states page now shows the two questions its FAQ structured
  data describes, generated from one source. The callout became "common
  questions"; the state list in the first answer comes from the page's own data,
  and it notes that Washington taxes large long-term capital gains.
- Delaware, Hawaii, Kentucky, South Dakota and West Virginia had no display
  name (Hawaii's was filed under the wrong code), so their state pages were
  published at bare codes ("FIRE Number in sd") and South Dakota's card on the
  no-income-tax page was blank and linked nowhere. They now have names and
  pages at `/fire-number/states/<name>`; the old code URLs redirect
  permanently. Hawaii's cities now appear in the West Coast region. `test:seo`
  fails if a US state with cities has no name.

## 2026-09-24

### SEO content
- Repaired learning-article dark-mode colors and added visible breadcrumb
  navigation backed by matching Article/WebPage/BreadcrumbList structured data.
  Article content, dates, canonical URLs and calculator links are unchanged.
  See `docs/seo-learn-template-2026-09-25.md`.
- Improved the savings-rate landing page's mobile navigation and result layout,
  connected input labels and visible keyboard focus, and added a post-result
  path to the full calculator with an acquisition-source label. Calculations,
  defaults, indexing and the free-before-signup flow are unchanged.
- Clarified Coast FIRE inflation, contribution timing and withdrawal assumptions;
  added return-sensitivity examples and model limits, removed a repeated FAQ
  heading, and aligned visible FAQ answers with structured data. Calculator logic
  and defaults are unchanged. See `docs/seo-coast-content-2026-09-25.md`.
- Clarified the savings-rate calculator's search description, formula and annual
  inputs. Replaced conflicting fixed retirement timelines with the actual model
  assumptions, clarified payroll contributions, and kept one main heading.
  Calculations and defaults are unchanged. See `docs/seo-audit-2026-09-24.md`
  for evidence boundaries, prior SEO decisions and the measurement plan.

### Documentation
- Recorded the concurrent-agent handoff SOP: flexible task scope, isolated workspaces,
  explicit ready PRs, Claude-owned sequential integration, combined verification,
  and deployment confirmation. This establishes an active-session routine, not a
  background automation or blanket merge authorization.
- Aligned shared agent rules, Claude's entry point, and the legacy instruction
  bundle; separated main as a baseline from the PR publishing destination.
  Reconciled both vault branch snapshots into one maintained repo knowledge base,
  with source inventory, active/superseded decisions and privacy exclusions.
- Added the project-memory index, current requirements and feature map, and dated
  launch context. Agent startup now includes relevant decision history; meaningful
  changes update their rationale and contracts in the same PR. Older plans remain
  historical evidence rather than competing instructions.
- Reconciled design exceptions and current navigation, and corrected household,
  Monte Carlo, and Contributions roadmap status. Added focused financial and
  accessible UI verification requirements without changing application behavior.

### Added — backfill from 22–23 September commits
- Plan → Contributions: budget-normalised allocation tilt and drift bands
  (`96e9d63`, `7396244`), Plaid holdings import (`f931d88`), saved plans and
  visit-triggered monthly snapshots (`2bd2640`), priority ladder (`a0267b1`),
  account-derived inputs and saved ladder settings (`9eece6f`, `cd163db`), and
  emergency-fund account selection (`eb7e549`).
- Matching Home Next contribution card using the shared ladder derivation
  (`8775078`). Monthly/weekly/daily allocation output already exists; monthly
  contribution email remains a follow-up. The September 24 entries supersede
  the earlier amount/cadence model.
  See `docs/design/next-contribution.md`.

### Fixed — backfill
- Plaid sync applies classification rules to future imports without overwriting
  user-set tags, preventing untagged imports from understating measured needs
  (`8775078`). Holdings import handles cash and closed positions (`fbead99`,
  `9a1c76f`).

### Historical implementation reconciled from vault notes
- PWA and Android TWA foundations exist (`9fe27fc`, `dcc3395`, June 29);
  this does not establish store publication or current device QA.
- Portfolio performance comparison and scenario comparison were added
  (`8299a8a`, June 18; `2524c64`, June 19). Old missing-feature lists are historical.
- Email-capture instrumentation was added in `7d3c88c` (July 16); verify actual
  coverage instead of reusing the later vault note's missing-instrumentation claim.
- Projection assumptions were unified in `f79d688` (September 2); display pricing
  was centralised in `lib/pricing.ts` by `dbec537` (September 15). Older mixed
  returns and $4.99 notes are historical. Live behavior/billing was not rechecked.

### Verification boundary
- These feature entries describe repository implementation at `8775078`, not
  newly verified production behavior. Publication was reconciled with main
  `2af3cb8` on September 24, preserving its two newer Contributions commits.
  This documentation change does not alter runtime code or apply migrations;
  a main update can trigger the repository's existing automatic deployment.
- Reproduced existing guard failures on unchanged runtime/test files:
  `test:calm-startup` fails its single explicit-opener assertion because feedback
  also opens from a URL parameter; `test:cashflow-mobile-save` fails two CSS
  assertions while sticky positioning and bottom padding exist as inline styles.
  Follow up with behavior/browser verification before revising those guards;
  this pass does not establish that either flow is correct or remove tests.
  *Followed up the same day: both flows were checked in a browser and both
  guards revised. See "Guards triaged" below.*

### Added
- **Every line behind the contribution figure.** The Contributions page shows a day-by-day ledger under the amount: the opening balance and the accounts it comes from, each expected payment in and out on its date, the running balance, contribution day, and the low point the figure is taken from. A bare total nobody can trace is a total nobody should move money on.
- It says out loud what it leaves out. Income that was due and never marked received is listed as **not counted**, with the reason. Spending the budget knows about but the Expected list doesn't is compared, because anything missing from that list is missing from the forecast.
- When nothing is safe to contribute, the Home card now says so and shows the day the balance runs short, instead of hiding itself at the moment it has a warning to give.
- **Out-of-date balances are shown, not hidden.** The contribution ledger lists every account whose balance is more than three days old, grouped by the day it was last refreshed — including accounts at zero, since a zero from four months ago may not be zero now — and says to sync in Money → Net Worth. The emergency-fund field says "as of" when its balance is old. Accounts only refresh when their connection is synced by hand, which is easy to forget for months.
- Foreign-currency accounts show their own balance beside the dollar figure, on the ledger and in the account picker.
- **Sign in with an emailed code, as well as Google (switched off until Supabase can send it).** Google was the only way in, and most people who went from their result to the sign-in page left it within seconds. The page now offers "Email me a sign-in code". The person types the code on the same page, so the calculator result they are saving stays in the browser that holds it. A link wouldn't do that when it's opened from a phone's mail app. It appears once `NEXT_PUBLIC_EMAIL_SIGNIN=on` is set, after Supabase has custom SMTP and a template with the code (steps in D-18). *Behaviour change:* `funnel_signup_completed` now reports how someone signed in this time, and `is_new_user` uses when the email was first confirmed, since an emailed code creates the account when it is sent. The Google callback page no longer says "Google login". Recorded as D-18.
- **How your net worth compares, on the result and on Home.** The free result's "How you stack up" screen now opens with "Your net worth is ahead of 52% of US households aged 35–44", with a line marking where you sit and the median. Without an age it compares with all US households and offers to add one. Home has a matching "How you compare" card after Freedom date, using the net worth Home already shows and the age from Plan → Freedom Date. The standard is the Federal Reserve's 2022 Survey of Consumer Finances, generated into `lib/net-worth-benchmarks.ts` by `scripts/build-net-worth-benchmarks.mjs`, which refuses to write unless every age group's median is within 2% of the Fed's published figure (all were within 0.3%). US dollars only; it always says how many have less, never "behind". Today's net worth is brought back to 2022 dollars with the BLS consumer price index before it is placed (factor 1.1446, through August 2026, from `lib/net-worth-inflation.ts`), and both screens say "adjusted for inflation to August 2026". On short screens this result screen tightens its spacing and scales the savings bars together, so Continue stays on screen down to a 375 × 667 phone. Recorded as D-19.
- **Each result screen is measured.** Between seeing a freedom date and clicking save there are six screens, and only the save click was recorded, so a result that never became a signup couldn't say where it stopped. `funnel_reveal_step_viewed` now fires once per screen per reveal, with the screen's id (`freedom_age` … `save`, or `unreachable`). Checked in a browser against a local PostHog stand-in: all six fire in order, once each, and going back doesn't re-send them. `test:reveal-step-tracking` guards it; on the previous code three of its checks fail.
- **Connected banks refresh themselves every day.** Balances and transactions used to update only when someone pressed Sync, so the contribution figure, the emergency fund and last month's needs could be months old. Every connection now syncs at 09:00 UTC (`/api/cron/plaid-sync`), an hour before the retention email, using the same code as the Sync button. The longest-unsynced connection goes first, and any the run has no time for go first the next day. Each run is recorded in `job_runs` as `plaid_sync`, and the admin page expects one a day. A connection waiting for its owner to log in again is named there without failing the run. Recorded as D-16.
- **Your month, in date order.** Money → Expected opens on a month view: every expected payment in and out on its day, repeats included (paid ones marked), then one **day-to-day spending** line for the budget spending that has no date, then In / Out / Left for the month. Step between months with ‹ ›. It is the dated half of the budget, and Plan → Contributions works from the same dates.

### Changed
- **Connecting a bank no longer asks for Investments unless the person picks an investment account.** Every new connection used to require both Transactions and Investments. Plaid bills each required product on every connection, so a bank-only connection paid the Investments fee. Link also only lists banks that offer every required product, with an account for each. Investments is now requested "if supported". Plaid adds it, and bills it, only when an investment account is chosen, and every bank is listed. Existing connections are unchanged. Recorded as D-17.
- **What "safe to contribute" means.** It is now the lowest the balance falls between contribution day and the next one — not the balance on the day. A bill due the day after contributing used to be ignored, which is exactly the one that bounces if everything was just invested.
- Expected **income** now counts (payday is when there is money to contribute), and repeating payments are expanded across the cycle rather than counted once.
- **The contribution forecast allows for day-to-day spending.** The budget's monthly spending, less the repeating bills already on the Expected list, is spread evenly per day as labelled estimate lines between dated payments — each showing its days × rate, so every row still adds up. Without it the balance only fell on bill days and the safe figure overstated what was spare. Recorded as D-10.
- **Day-to-day spending now comes from last month's needs, not the whole budget.** The per-day figure in the contribution forecast and the "Day-to-day needs" line in the Expected month view are last complete month's need-tagged spending over that month's days, less any need already on the Expected list. A need is matched by name, by the category of a repeating bill, or by an amount within 5% of one, which catches rent paid as transfers to a person. Wants and untagged spending such as last month's trip are left out and reported beside the figure, with a prompt to tag anything that is really a need. The ledger explains the month, the total, each counted category and each exclusion with its reason. With no tagged needs, the budget-based figure is still used. Both pages now work from the same unpaid Expected rows, so the committed-payments query no longer stops 70 days out; an annual bill paid last month is excluded on both. Recorded as D-11.
- **See what the day-to-day estimate is made of, and leave a one-off out.** The per-day figure in the contribution ledger opens a breakdown: on hover with a mouse, on tap or click, or with Enter. It lists each category of last month's needs with its amount and share, what is already a dated bill, and what isn't counted. Each category has a **Leave out** tick, which asks **just this month** or **always**. "Just this month" lapses by itself once the next month's spending becomes the basis; "always" lasts until the category is ticked back in. Contributions, Home and the Expected month view all use the same choice. On phones the breakdown opens as a sheet from the bottom. Recorded as D-14.
- **The homepage links to the FIRE Type quiz again.** "Take the FIRE Type quiz" sits beside "Find my freedom date" in the hero, as a secondary link. It stacks under the start button on phones. The link was lost in the May landing redesign. The quiz stays out of onboarding until its result feeds the product (D-13).
- **Choose your emergency-fund accounts in Money → Net Worth.** Every cash account on the Connected Bank Accounts card has an **Emergency fund** tick, with a summary line underneath showing the fund's total and which accounts it comes from. Contributions, Home and the Emergency Fund card all follow that one choice. Contributions says where its figure comes from and links to Net Worth instead of keeping its own picker. The tiles also show a foreign-currency account's own balance and the date of any balance more than three days old. *Behaviour change:* unticking every account now means none of them is the emergency fund. Before, an empty choice fell back to savings accounts, which re-ticked them the moment the last box was cleared. Stale IDs from a relinked bank still fall back to savings. Recorded as D-12.

### Fixed
- **Deleting an account left its bank connections running at Plaid.** Deleting the account removed the connection rows, and with them the only copy of each access token, but never told Plaid. Plaid bills a connection every month for as long as it exists, and keeps its access to the bank, so each deleted account's banks would have kept billing with no way left to stop them. The person would also have believed their bank was disconnected. Deleting an account, by the person or from admin, now disconnects every bank at Plaid first. If Plaid refuses, the account is not deleted and the message names the bank to retry. Disconnecting a single bank had the same gap whenever Plaid refused: the row went anyway. It now stays listed, with an error saying to try again. Checked end to end against a stubbed database with Plaid unreachable: deletion is refused and nothing is removed, and a user with no banks is deleted without calling Plaid. Recorded as D-17.
- **Net Worth told people to reconnect banks that were working.** The holdings request went to every connection. A bank with only current and savings accounts never granted investments access, so Plaid refused it, and Net Worth showed "Reconnect to enable holdings data" for that bank on every visit and logged an error each time. Holdings are now requested only from connections that hold an investment account. "Reconnect" appears only when reconnecting is what fixes the error (missing consent, or the bank asking to log in again). Data that isn't ready yet or isn't offered no longer shows anything to the user.
- **Connected balances were added up as if every currency were dollars.** HK$20,000 counted as $20,000 in net worth, cash, the emergency fund, the contribution forecast and the freedom-date projection. Balances are now converted to dollars once, where accounts are loaded, so every total uses one currency. A currency with no exchange rate is shown but left out of totals rather than counted at face value — the shared conversion helper returns an unknown currency unchanged, which would have counted one won as one dollar.
- **Net Worth's emergency fund now follows the accounts chosen in Plan → Contributions.** It counted savings accounts only, so ticking a checking account there changed one page and not the other. *Behaviour change:* someone with only checking accounts connected who has not chosen any now sees an emergency fund of $0 on Net Worth, where it previously fell back to the cash figure typed into their profile — the same rule Contributions already used.
- **Repeating payments drifted through the calendar.** Marking one paid added a fixed 30 days and wrote the date back through UTC, so in UTC+8 a bill due on the 28th rolled to the 27th, and a bill due on the 1st walked to the 31st, then the 30th. Months are now calendar months in local time, using the same helper the forecast uses.
- The Budget tab's "committed this month" had been counting bills up to 70 days out since the previous release, when the query behind it was widened for the contribution window. It counts this month's bills again.
- **Chinese merchant names never matched anything.** Matching kept only a–z letters, so 中国移动 reduced to nothing. It matched no bill, and a Chinese-named bill already on the Expected list was suggested again as a new recurring payment. Matching is now Unicode-aware: two-character names count in scripts written without spaces, and accents no longer block a match (Café Nero = CAFE NERO).
- "Hide $0" on the Connected Bank Accounts card hid accounts whose currency has no exchange rate, because they convert to $0, and with them the warning that they aren't counted. It now goes by the bank's own balance.
- The Connected Bank Accounts card's heading, total, account masks and controls used fixed colours. They were nearly invisible in dark mode, and the grey masks were below 3:1 in light. They now use the theme's ink tokens.
- **Custom categories never reached your account, and a deleted one came back.** The shared category hook built its save to `user_budget` but never executed it: a Supabase query only sends when awaited or `.then()`'d. Adding or deleting a category changed only the one device, and the refetch whenever the tab regained focus restored whatever the account still held, so a deleted category reappeared. The save now runs, and nothing is written until the account's copy has been read once, so a stale cache on one device cannot overwrite a newer list saved from another. Checked in a browser against a stubbed account: delete-then-refocus stays deleted, a stale cache with a slow server writes nothing early, and a new user's first category is saved. Broken since `f39a66f` (July 22).
- **Recent months were missing from every history-based figure once an account passed 1,000 transactions.** The database returns at most 1,000 rows per request. The dashboard read 36 months of history oldest-first in one request, so an account past that size stopped months short of today. Last month's needs came up empty, so the day-to-day estimate fell back to the budget, several times the real figure. The emergency-fund needs and the history averages were missing their most recent months too. Transactions, Reports, Categories, recurring-payment suggestions, CSV duplicate checks and the rule tagging after a bank sync had the same cap, losing their oldest rows instead. Every read of the expenses table now pages through all of it. Checked end to end: with more than 1,000 stubbed transactions the dashboard reads two pages and the estimate uses August's needs, where the old code read one page and never saw August.
- **Undoing a transaction you had just added didn't delete it.** The row left the list, but the delete was never sent, so the transaction was back after the next reload. It is now sent. If it fails, the row returns to the list with a "Couldn't undo — the transaction is still saved" message rather than silently disagreeing with the database. Checked in a browser: the DELETE is sent and the row stays gone after a reload, and a rejected delete restores the row and shows the message. On the old code no DELETE was sent.
- **The currency chosen in the calculator was never saved to a new account.** On a first dashboard visit it was applied on screen, but the profile save was written as `void supabase…upsert(…)`, and `void` does not send a query. The choice was lost on any other device or after clearing storage. It is now sent, and a failure is logged. Checked on the real dashboard against a stubbed account: the profile upsert now carries the chosen currency, where the old code sent nothing.
- The currency picker on the calculator's income step had no accessible name: its "Currency:" text was not a label, so a screen reader announced an unnamed combo box. It is now a real label.
- **The Emergency Fund card was unreadable in dark mode.** Its headline was dark text on a dark card, its two panels were pale boxes, and its labels, figures, status badges, HYSA note and progress bar used fixed light-theme colours. It now uses theme tokens, and each state's faint tint is mixed from them. Every text in the card measures at least 4.6:1 in light and 6.9:1 in dark, in all four states at 390 and 1280 px. The progress bar, which Home's emergency-fund card also uses, fills with the status ink shades (at least 4.2:1 against its track; amber was under 3:1 before). "Rebuilding" is now neutral rather than sky blue, matching its state pill, since the design system has no blue. The state still shows in words and icons, not only in colour.

### Security
- `rls_auto_enable()`, the function that turns on row level security for every new table, could be called through the API by anyone, signed in or not. It is SECURITY DEFINER, and it is no longer callable from the API. The event trigger that uses it still works: a table created afterwards still got row level security. `update_updated_at_column()` now runs with a fixed, empty `search_path`, and `updated_at` still moves on update. Both were checked on production inside rolled-back transactions. Migration `0042_function_security`, already applied.
- Leaked-password protection is still off. It needs Supabase's Pro plan, and the founder chose to wait (D-16).

### Added — guards
- `npm run test:account-currency` — conversion, the refusal to count an unconvertible balance, and how old a balance is.
- `npm run test:cashflow-forecast` — runs in UTC+8 and UTC−7, since the date bugs it guards against only exist away from Greenwich.
- Extended `test:cashflow-forecast` (needs-based estimate, multi-script name matching), `test:contribution-ladder` (estimate source and fallback), `test:contribution-plan` (saving the account choice from Net Worth) and `test:emergency-fund-accounts` (an empty choice means none).
- Replaced forecast and ladder fixtures copied from a real account's balances and budget with generic figures.
- `npm run test:expense-reads-paged` tests the paging helper (several pages, an exact multiple of the page size, a failed page failing the whole read) and scans `app/` and `lib/` for any read of `expenses` that neither pages nor bounds itself. On the code before this fix it flags all ten such reads.
- `npm run test:net-worth-compare` checks the weighted percentiles, where a value sits between cutpoints (ties at zero not counted as ahead), the age bands, rounding down and the "more than 99%" case, the wording and wiring on the result and Home, and that the committed table is the generated one with medians within 2% of the Fed's.
- `npm run test:email-signin` checks the new-user timing, the sign-in method, email and code handling, and that the form is switched off by default, keeps the whole sign-in in one tab and records which way in was chosen.
- `npm run test:plaid-billing` checks how connection removal is recorded (removed, already gone, refused), that both account-deletion routes disconnect every bank before deleting the user, that disconnect keeps a connection Plaid refused to remove, and that new connections require Transactions only. On the code before this fix, six of its checks fail.
- `npm run test:plaid-refresh` checks which connections are asked for holdings, which errors mean reconnect, how a nightly run is summarised, that the cron is daily and earlier than the retention email, that it refuses a request without the cron secret and logs to `job_runs`, and that the Sync button and the cron share one sync implementation.
- `npm run test:supabase-writes-execute` scans `app/` and `lib/` with the TypeScript AST for Supabase writes that are built but never sent: a bare or `void` statement whose chain reaches `.from(`/`.rpc(` and a write, and whose outermost call is not `.then`/`.catch`/`.finally`. It self-tests on sample code first, so it cannot pass by finding nothing. On the code before these fixes it flags all three writes that shipped this way.

### Guards triaged
Twelve `test:*` scripts failed on an untouched main. Each was traced with `git log -S` to the commit where its code diverged, and its behaviour was checked in a browser:
- **Stale — code moved, behaviour intact:** `seo`, `income-default`, `savings-period-input` and `fire-type-cta` read `app/page.tsx`, but the flow moved to `app/HomeClient.tsx` in `15d5a49`. `cashflow-mobile-save`: the styles went inline in `60dcf09`. `categories-management`: persistence moved into `useCustomCategories` in `f39a66f`. `manual-category-icons`: the summary's category list moved to the parent in `1fcc2ad`. `reveal-save-plan-cta`: the sandbox lacked the analytics call added in `eb53299`.
- **Stale — deliberate product change:** `calm-startup` (the `?feedback=` link from the monthly email, `6a76189`, is still user-initiated). `city-page-seo` (titles lead with the number, `9908ea5`). `achieved-fire-reveal` (the reveal was rebuilt as `RevealFlow`, `ea47d24`). `currency-selection` (the currency cards were removed as dead in `7d3c88c`). `savings-period-input` (savings capped at income, whole-unit steps, `b2344b8`).
- Each revised guard asserts the current behaviour, not new source text. Where a guard could be weakened, a negative control showed it still fails on the regression it exists for.
- **Real regressions found and fixed:** custom categories never syncing (above), the unlabelled currency select (above), and `categories-management` now also fails if the sync is left unexecuted.
- `test:seo`'s FIRE Type check had been passing against `HeroScreen.tsx`, which has not been rendered since the landing redesign (`274a215`), and the redesign had dropped the link. The guard now reads the hero that renders, and it passes because the link was restored (D-13).

## 2026-09-23

### Added
- **Next contribution.** A tab under Plan that works out where this period's money should go, and a Home card that says it without being gone looking for. The order is a published convention — emergency floor, employer match, expensive debt, emergency target, tax-advantaged, cheap-debt overpayment, then invest the rest — and every rung can be moved or switched off. The allocation maths is ported from the spreadsheet it replaces, guarded against the sheet's own figures.
- **Two cadences, not one.** *Money arrives* is payday; *Buy in* is how often it is then invested. Paid monthly while dollar-cost-averaging weekly is ordinary, and it is why cash sits in the brokerage between the two. The page carries a countdown to the next contribution date.
- **The contribution amount follows real cash.** Cash in accounts that are not your emergency fund, less anything due before the next contribution date. The subtraction is shown rather than just its answer, because with no bills recorded nothing is subtracted and the figure reads high — which is the direction that tells someone to invest their rent. A hand-set amount is still available and is marked as one.
- **The emergency fund reads the right accounts.** Savings and money market only; a current account is this month's spending and brokerage cash is waiting to be invested. Which accounts count is yours to choose, and the field says where its number came from.
- Monthly expenses follow the last complete month, the average, or a figure you set. Everything on the page saves as you type, to `profiles.contribution_plan`.

### Fixed
- **Plaid's sync now applies your need/want rules.** It wrote `tags: []` on every import and a rule was only ever applied at the moment it was set, so a rule made in March stopped applying in April. Everything counting needs — the emergency fund target, the ladder's monthly expenses — read low as a result. The sync never overwrites a tag you set yourself.

### Added — guards
- `npm run test:contribution-plan`, `test:contribution-waterfall`, `test:contribution-ladder`, `test:contribution-schedule`, `test:emergency-fund-accounts`, `test:classification-rules`.

## 2026-09-20

### Added
- **Transactions can carry a time of day, and never have to.** Plaid supplies one for the institutions that send it, a statement import recovers the one already sitting in its date column, and the add/edit form has an optional **Time** field next to the date. The time shows in the transaction list when there is one and nothing at all when there isn't — a blank stays blank rather than becoming midnight.
- Stored as an instant, not a wall clock, so "14:30" typed in Hong Kong still reads 14:30 there and shifts correctly for a household partner elsewhere. `date` remains the field everything groups and totals by; where the two disagree at a day boundary, the date wins.
- `npm run test:transaction-time` — covers the ways a time goes wrong quietly: Plaid's 00:00 placeholder must not become a confident midnight, `authorized_datetime` must win over `datetime`, a time buried in an ISO or WeChat date cell must be recovered, and a round trip through the form must come back unchanged.

## 2026-09-19

### Added
- **Home is arrangeable.** An **Edit** button turns Home's cards into draggable tiles: drag by the grip to reorder, press × to remove one, press the width control to make it narrow or wide, and put anything you removed back from the tray underneath. Saved per user in `profiles.dashboard_layout`. Defaults are exactly the current layout, so nothing changes until you change it.
- Dragging is pointer-based rather than HTML5 drag-and-drop, which never fires on touch. Reordering still happens through CSS `order`, so a card's contents never move in the DOM mid-drag. Card content is inert while editing, so a drag can't also press something inside a card.
- `npm run test:dashboard-layout` — covers the layout merge, which fails silently in every direction: a card added later must appear for someone who customised before it existed, an id since removed must drop, a corrupt value must fall back rather than empty the page, and a required card must stay visible however it was stored.

## 2026-09-18

### Added
- **Household (P1)** — invite one partner to share a household, from `Profile → Household`. They create their own account, keep their own login and their own numbers; joining adds a shared view on top rather than merging anything. Invite by email, one live invitation at a time (re-inviting supersedes rather than stacks, so a corrected address cannot leave an old link redeemable), 14-day expiry, and **Disconnect** — one symmetric action either person can take instantly without the other's approval, because at two members with symmetric visibility "I leave" and "I remove you" have the same outcome.
- Accepting requires the signed-in address to match the address the invitation was sent to, not just possession of the link. A forwarded link is not enough to obtain read access to someone's complete financial history; a mismatch names the expected address, since the usual cause is signing in with a different Google account.
- `/household/join` survives the signup round trip. Most invitees are signed out and many have no account, and `/login` takes no return path, so the token is stashed in `localStorage` and the dashboard hands it back once a session exists.
- Household invitation email (`CAMPAIGNS.HOUSEHOLD_INVITE`) — the only email that reaches someone who is not a user yet, so it carries no figures at all. A mistyped address reveals nothing beyond a first name and that they were invited.
- `npm run test:household-rls` — fails on any client-side read of a household-shared table that relies on RLS alone for scoping. Those reads silently start returning a partner's rows once the peer policies are active, with nothing in the diff to notice.

- **Household combined view (P3)** — a `Together` card on Home showing one freedom date for two people, with a You / Partner / Together breakdown. The date anchors on the younger partner's age and then reports both ages at that date, because a household reaches freedom together and the older partner arriving first isn't the question. Renders nothing without a household rather than showing an empty state.
- **Shared-account detection (P2)** — accounts both partners linked at the same institution with the same last four digits are proposed, never assumed: two different accounts can share those by coincidence, so a person confirms. Confirmed pairs count once in the household total; undecided pairs stay counted for both, with the card saying so, since overstating a household total beats silently halving it.
- **Household Pro (P4)** — one subscription covers both members, via a `SECURITY DEFINER` boolean rather than letting a partner read the owner's `subscriptions` row. They learn the household is Pro, not the amount, status, renewal date or Stripe IDs.

### Changed
- **FIRE profile moved from Profile to `Plan → Freedom Date`** as `Your assumptions` — age, retirement target city, lifestyle target and tax home. All four model something that hasn't happened yet, which is Plan by app-structure rule 2; they sat in account settings, and Plan and Expat FIRE had each grown an "Edit in Profile →" button to reach them. Both escape hatches are gone: the inputs now sit directly above the date they produce. The FIRE *type* stays in Profile, since a personality result is not a projection input.
- `test:profile-single-location` → `test:single-location`. It asserted the one canonical location input lives in ProfileTab; it now asserts the stronger invariant — exactly one such input across the whole dashboard, that it lives with the plan, that Profile holds no planning assumptions, and that no "Edit in Profile" escape hatch has reappeared.
- `net_worth_snapshots` on the dashboard's progress chart now filters `user_id` explicitly. It was the only client-side read scoped by RLS alone; under peer-read policies it would have interleaved both partners' histories and then truncated at `limit(120)` across them — a wrong line rather than an obviously merged one.

### Database
- `0016_household_accounts` applied — `households`, `household_members`, `household_invites`, `shared_account_links`, two `SECURITY DEFINER` helpers, and peer **read** access on nine financial tables. Writes stay owner-only everywhere: `goals`, `net_worth_snapshots` and `expected_payments` each had a single `FOR ALL` policy, which Postgres reuses as `WITH CHECK`, so each was split four ways to keep the peer clause on `SELECT` alone.
- A household holds exactly two people, enforced by `member_slot` + `UNIQUE (household_id, member_slot)` — a slot rather than a count trigger, because a unique index cannot be raced.
- `0035_household_revoke_anon` — Supabase grants EXECUTE on new `public` functions to `anon` individually, so `REVOKE ... FROM PUBLIC` in 0016 did not achieve what its comment claimed.

## 2026-09-12

### Added
- Per-month spending analysis on `Money → Insights` (`MonthInsight`) — pick any month with data, see its categories ranked by size, and switch individual categories off. The comparison baseline recomputes with the same exclusions applied to every other month, so excluding Travel drops both the headline and the median it is measured against rather than comparing a filtered month against an unfiltered one. Median rather than mean, since the outlier month is what the exclusions exist to see past. A conditional line translates the result into the FIRE target at 25× annual spending — phrased as "if every month looked like this one", because one month is not a rate.

## 2026-08-29

### Added
- "Your month" check-in card on Home (`DashTab`) — closes the monthly loop by combining last month's actual result (`consistencyMonths`, on-track or off-plan, savings vs. short) with this month's top recommendation (`topTasks[0]`) into one verdict, with a CTA that scrolls to the existing top-tasks card. Dismissible per calendar month (`uf_checkin_dismissed_YYYY-MM`), so it reappears as a fresh check-in each month rather than sitting as a permanent fixture.
- `funnel_next_move_opened` analytics event — fires when the check-in card's CTA is clicked, giving the top-tasks recommendations their first real click target (previously informational only).

## 2026-08-16

### Removed
- Monte Carlo "Confidence Check" page (`FIRE Calculator → Simulate`) — the success-probability copy overclaimed 10,000 simulations while the code ran 1,000, and "before your target age" was actually a flat 40-year horizon from today regardless of the user's real age. Removed rather than patched pending a redesign that ties it correctly into the plan's real freedom date. `MonteCarloCard`, `SimulationsTab`, and `lib/fire/monte-carlo.ts` deleted.

## 2026-07-10

### Added
- Transaction import now accepts Excel (.xlsx/.xls) files through the same column-mapping, duplicate-detection, and currency-inference pipeline as CSV
- Transaction import now accepts PDF bank/credit-card statements — transactions are reconstructed directly from the PDF's text layout (no columns to map) using `pdfjs-dist`, then fed through the same review/duplicate-detection flow as CSV/Excel. Card-payment lines (marked "CR") are excluded on import since they aren't purchases
- Each imported transaction now records which file it came from (`source_file`); the transactions list shows a small file-name badge on any row imported from CSV/Excel/PDF
- "Raw file sample" preview on the import map step now shows every parsed row in a scrollable panel with a sticky header, instead of hard-capping at 5 rows

### Fixed
- Excel imports with title/metadata rows before the real header (e.g. WeChat Pay Excel exports) now correctly detect the real header row instead of leaving all column-mapping dropdowns blank — ported the same header-row scan already used for CSV imports

## 2026-06-15

### Added
- CSV import modal: full column-mapping UI with a step machine (upload → map → review → importing → done), batch insert in chunks of 50
- CSV import: duplicate detection review step — matches on date + amount only (category excluded because manual and imported entries use different category names)
- AI transaction categorisation route now calls the Anthropic API server-side; no API key is exposed to the client
- Dark mode persistence across page loads (PR #54)
- Achievement milestones rendered as teal pin bubbles directly on the projection chart (standalone achievement card removed)
- FIRE Type result page: full redesign with Trading Card layout and dark page background
- FIRE Type avatars: 16 custom illustrated characters per FIRE type, extended to full-body compositions with bold flat art style
- FIRE Type light-reveal animation with trading card effect
- FIRE Type share card: clean white Poster design, fully flat (no drop shadows)
- Animated logo reveal assets and FIRE number landing pop/glow effect (PR #56)
- Expense categories expanded with Utilities (phone, internet, household bills) and additional sub-categories covering common budgeting patterns
- Emoji palette for category customisation expanded from ~30 to ~90 options
- Demo video v26: render script for 43-second UntilFire motion-graphics video

### Changed
- CSV import duplicate matching updated to drop the category field from the match key, fixing false negatives between manually entered and auto-imported transactions
- FIRE Type share card content simplified and avatar crop tightened for cleaner framing
- Wordmark: orange removed from "Fire" text on the FIRE Type page to fix branding inconsistency

## 2026-05-26

### Changed
- Dashboard emergency-fund logic now excludes brokerage cash reserved for investing from the emergency-fund "Current Savings" figure, while still counting that money in total cash/assets.
- Google login now resolves the production OAuth callback through `lib/site.ts`, keeps localhost callbacks local in dev, and manually follows the returned OAuth URL so the app stays explicit about the real UntilFire destination.
- `AUTH_SETUP.md` now documents that the Supabase **Site URL** should be the canonical UntilFire domain so Google shows the UntilFire URL instead of the raw `*.supabase.co` project URL on the consent screen.

### Verification
- `npm run build` passed after the dashboard emergency-fund update and Google-login callback cleanup.

## 2026-05-02

### Changed
- `supabase-setup.sql` rewritten to match the live app: drops the legacy `user_plans` schema and now creates `user_budget`, `expenses`, `subscriptions`, and `waitlist` with RLS policies + `updated_at` triggers. Idempotent — safe to re-run.
- `AUTH_SETUP.md` rewritten against the live architecture: documents Google OAuth via `/login` → `/auth/callback`, removes the stale `middleware.ts` references, and lists the env vars and fresh-setup steps that map to the rewritten SQL.

### Verification
- `npm run typecheck` passes against the rewritten docs/SQL changes (no TS files were modified).
- SQL parses to four tables (`user_budget`, `expenses`, `subscriptions`, `waitlist`), ten RLS policies, and three `updated_at` triggers — matches every `.from(...)` call in the active routes (`app/dashboard/page.tsx`, `app/dashboard/TransactionsTab.tsx`, `app/api/stripe/**`, `app/api/waitlist/route.ts`, `lib/supabase.ts getSubscription`).
- `middleware.ts` confirmed absent from the repo; route protection on `/dashboard` is the existing client-side session redirect, consistent with `docs/DECISIONS.md` (2026-03 Supabase + RLS decision).

### Known follow-ups
- Components in `/components` (`CalculatorForm`, `PlanList`, `LogStashForm`, `QuickAddButton`, `ProjectionChart`) are orphaned — they reference the dropped `user_plans` / `stash_history` tables but are not imported by any active route. Candidate for deletion in a follow-up cleanup task.
- `docs/CONTEXT.md` still lists `app/expenses/page.tsx` (does not exist; the live route is `app/transactions/page.tsx` redirecting into `/dashboard?tab=expenses`) and the orphaned components — flagged for the same cleanup pass.

## [0.2.0.0] - 2026-04-26

### Added
- Monte Carlo FIRE probability card: 1,000 simulations per render, σ=12% annual return volatility, 9-bucket histogram (0–5 yr through 40+), p10/p50/p90 percentile pills, interactive +$0–$5k/mo what-if slider
- `lib/monte-carlo.ts` — Box-Muller simulation engine, fully typed, tree-shakeable
- Full light mode across dashboard and Transactions tab — white card surfaces, `#f9f9fb` page background, `#1a1a2e` text, teal/orange accent palette preserved

### Changed
- Dashboard background migrated from dark (`#08080e`) to light (`#f9f9fb`) across all CSS variables and inline styles
- MonteCarloCard inserted between hero KPIs and projection charts in the Overview tab
- TransactionsTab: corrected button text colour (dark text on teal), category select colour, income/expense amount colour, month-nav arrow colours, tooltip background

## [0.1.0.0] - 2026-04-25

### Added
- Calculator → dashboard handoff via `uf_calc_prefill` localStorage
- Dashboard restructure: 3-tab layout (Overview | Calculator Hub | Budget & Transactions)
- Financial calculators hub: Coast FIRE, Savings Rate, APY, Compound Interest, 4% Rule
- FIRE Score as hero with full-width progress bar and year countdown
- City-discovery OG share card with dynamic image generation
- Transactions merged inline as dashboard tab
- SEO: OG image, JSON-LD, canonical URLs, sitemap, robots.txt
- Supabase + Google OAuth auth flow
- Stripe integration with Pro paywall (later opened to all users)

### Unreleased — onboarding feedback, 29 October
- Use whole-number improvement controls while retaining exact original plan values on undo.
- Fix stale city choices and convert entered answers when currency changes; correct Saved question wording.
- Hide Skip actions, show today's-dollar freedom target, and repair/shorten the year-grid reveal.
- Give existing sessions a Home action and failed/slow sign-ins visible recovery.

- Fix Saved-mode keystroke corruption by preserving typed input instead of recomputing it on each key.

### Unreleased — marked calendar B
- Replace the browser's Transactions heatmap and Calendar date cells with pastel bill labels, yellow income/payday markers, and exact selected-day details.
- Keep every same-day payment, date navigation, and existing cash/contribution actions; use compact display-currency amounts in narrow cells.

### Calendar date repair
- Calendar now shows scheduled bills and payday only; ordinary transactions stay in Transactions.
- Keep past and completed bills on their original scheduled dates instead of moving them onto today. Cash forecasting still accounts for overdue unpaid bills independently.

- Landing globe follow-up: slow automatic rotation, pause/resume control, interaction hold, reduced-motion and off-screen/hidden-tab suspension.

### Web style consistency
- Carry Next Horizon into Explore cards, referrals, portfolio and report exports, Learn/calculator cards, admin surfaces and navigation, budget/import dialogs and unsubscribe. Keep semantic states and financial behavior.
- Keep Log in visible beside Get started in desktop and phone public headers.

- Refine the web Until payday card with mint/white panels, clearer balance/payday hierarchy and aligned bill rows while preserving all forecast calculations and selection controls.
