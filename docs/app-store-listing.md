# App Store listing: UntilFire for iPhone

Ready to paste into App Store Connect once the app exists there. Limits are
Apple's. Facts come from the privacy policy (`app/privacy/page.tsx`) and the
code; check them again if either changes.

## Basics

- **Name** (30): UntilFire: Freedom Date
- **Subtitle** (30): Budget daily. Retire sooner.
- **Category:** Finance. Secondary: Productivity.
- **Price:** Free, with UntilFire Pro as an auto-renewing subscription
  (`com.untilfire.pro.monthly`, `com.untilfire.pro.yearly`; same price as the
  website: $9 a month, $79 a year).
- **Privacy policy URL:** https://www.untilfire.com/privacy
- **Terms (EULA) URL:** https://www.untilfire.com/terms
- **Support URL:** https://www.untilfire.com (email hello@untilfire.com)
- **Age rating:** 4+ (no objectionable content; "Unrestricted web access" no;
  "Gambling" no).

## Promotional text (170)

See the year work becomes optional, then spend one minute a day keeping it on
track. Your budget, your banks and your freedom date, in one calm app.

## Description

UntilFire shows you the year work becomes optional, and helps you move it
closer.

Answer a few questions and see your freedom date, your freedom number, and
the cities where the same money would set you free sooner.

Then make it a habit. Each day, Today gives you a short list of one-tap
checks from your recent money: a category to pick, a need or a want, a bill
due tomorrow, what is safe to spend. Clear it, and your budget and freedom
date are up to date. Days are counted, never streaked, so a missed day never
resets anything.

- Freedom date and a path you can drag through
- Budget, calendar of bills and paydays, net worth and goals
- What-ifs: spend less, earn more, work part-time, move abroad
- Contributions: where each month's saving should go, in order
- Connect your banks securely through Plaid
- The same account on untilfire.com

UntilFire Pro connects every bank and adds payday and big-spend checks to
Today. Pro renews automatically until you turn it off in Settings.

UntilFire is a planning tool, not financial advice.

## Keywords (100)

fire,retire early,budget,financial freedom,net worth,savings,fi,coast fire,money,planner

## App Privacy answers

Data linked to the person, not used for tracking (no tracking at all):

- **Contact info:** email address (account).
- **Financial info:** transactions, balances and other financial info the
  person enters or connects through Plaid (app functionality).
- **Purchases:** purchase history for UntilFire Pro (app functionality).
- **Identifiers:** user ID (app functionality, analytics).
- **Usage data:** product interaction (PostHog, analytics).
- **Diagnostics:** crash and error data (PostHog, app functionality).

Not collected: location (city is chosen, not detected), contacts, health,
photos, browsing history, search history, sensitive info.

## Screenshots (6.9-inch iPhone, 1320 × 2868; 3 to 10)

Take them on the development build, light mode, with a realistic account:

1. Home: the freedom date hero card and the four round buttons.
2. A Today item (need or want) mid-list.
3. "All caught up" with this month's days.
4. Onboarding: the reveal year.
5. Onboarding: the globe on "Where do you live?".
6. Money: spent this month and the icon grid.
7. Plan: the tiles.
8. Pro screen.

Caption idea per shot: "See your freedom date" · "One minute a day" · "Every
day counts" · "Free sooner abroad".

## Review notes for Apple

- Sign-in: email code, Google or Apple. Create a review account with a
  real inbox or a Sign in with Apple test, and give Apple the details in App
  Store Connect only (never in this public repo).
- Bank connection uses Plaid; reviewers can use Plaid's sandbox credentials if
  the build points at sandbox, otherwise say the feature needs a real bank.
- Pro: auto-renewing subscriptions, with Restore purchases on the Pro screen
  and Terms and Privacy linked beside the price.
