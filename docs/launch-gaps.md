# iOS launch gaps (October 13, 2026)

These gaps come from two code audits of `mobile/`: App Store readiness, and
consumer polish measured against Copilot, Monarch, Rocket Money and
Dollarwise. Choices already recorded in D-73 to D-77 were left out. Each
item gives its file and line as evidence. No item here was tried on a device.

**Verdict:** buying the Apple Developer Program now makes sense. Several of
the hardest gaps, such as in-app purchases, banks that log in through their
own site, the privacy manifest, and testing with real testers, can only be
closed with an account. Batches 1 and 2 below can be built first, without
one.

## Fixed on October 13, 2026 (QA round 5)

- The expo-audio plugin no longer adds a microphone prompt or a
  background-audio mode, since the app only plays chimes (`app.json`).
- The "Character preview" row in Profile only shows in development builds.
- A root `ErrorBoundary` shows "Something went wrong" with a "Try again"
  button, instead of the app closing on a screen that throws.

## Fixed on October 14, 2026 (Batch 1, items 1 to 6)

- **Welcome screen:** it now has "I already have an account". After sign-in,
  an account that is already set up builds its plan from the account and
  opens Home. An account that was never set up answers the questions.
- **Buying Pro:**
  - A listener now runs from app launch while signed in, so purchases
    completed outside the Pro screen are confirmed and finished.
  - Either Pro plan counts toward a purchase.
  - After 2 minutes, a deferred purchase or Ask to Buy says "Waiting on
    Apple" instead of hanging.
  - In the App Store build, Pro can be bought only at Apple's own prices.
- **Loading states:** Today shows loading, or a sign-in prompt, with a close
  button. Transactions and Calendar show the shared loading and offline state
  instead of "Loading…" or "A clear month ahead".
- **Hidden from the App Store build:** "Give a month" no longer shows in the
  App Store build, and character-lab redirects to Home outside development.
- **Still to check on a device:** item 7, whether sign-up navigates twice.

## Batch 1: before TestFlight (no developer account needed)

1. **Sign-in for existing customers.** The welcome screen only offers
   "Get started" (`onboarding/index.tsx:41`). A web subscriber on a new phone
   has to answer 8 questions before they can sign in. Add "I already have an
   account".
2. **Purchases that are never finished.** The purchase listener exists only
   inside `buyPro` (`lib/apple-iap.ts:59`), so nothing picks up an unfinished
   purchase at launch. `buyPro` can also hang forever for Ask to Buy, deferred
   purchases, or the other product (`apple-iap.ts:60`).
3. **Fallback prices.** When StoreKit doesn't load, Pro shows the website's
   $9 and $79 prices and still offers to buy (`pro.tsx:25,39`). Turn buying
   off until Apple's prices arrive.
4. **Debug screen reachable by link.** `character-lab` is still in the
   production stack (`_layout.tsx`), so a deep link can open it. Remove it
   from release builds.
5. **The "Give a month" referral** links to a web trial, which App Review may
   treat as steering people to pay outside Apple
   (`give-a-month.tsx:47`, guideline 3.1.1). Hide it in the iOS build, or
   move it to App Store offer codes.
6. **Screens that are blank or that tell users nothing is due before data
   has loaded:**
   - Today returns nothing inside a modal (`today.tsx:86`).
   - Transactions shows "Loading…" forever when offline
     (`transactions.tsx:203`).
   - Calendar says "A clear month ahead" before it has loaded
     (`calendar.tsx`).
7. **A race after sign-up.** `sign-in.tsx:37` and `save-plan.tsx:23` both
   navigate when the session changes. Check on a device that it doesn't jump
   twice.

## Batch 2: trust and retention (no account needed)

8. **The freedom date jumps after sign-in.** `seedFromOnboarding` saves all
   savings as cash and all spending as one "other" budget
   (`lib/mutations.ts:230`). The full engine then almost always gives a
   different year from the onboarding estimate. The `DateMoved` note only
   explains the jump after it has happened. Fix it at the source, so the
   seeded account reproduces the date the person was shown.
9. **Tapping a notification does nothing.** There is no response listener,
   so the 9pm Today reminder opens wherever the app was last left.
10. **Nothing daily for people who skip sign-up.** They allowed
    notifications, but nothing is scheduled without an account
    (`today-reminder.ts:42`).
11. **The Face ID lock is a sibling view of the app**
    (`_layout.tsx`, `AppLock.tsx:35`):
    - Modals (Today, Transaction, Pro, Review) may sit above it, so balances
      could show in the app switcher.
    - It locks on every `inactive` change: Control Center, the Apple
      purchase sheet, Plaid and Google sign-in all trigger it.
12. **The session and account cache sit in plain AsyncStorage**
    (`lib/supabase.ts:15`). Finance apps at this level keep them in the
    Keychain (expo-secure-store).
13. **The path to Pro can't be measured.** There are no paywall-viewed or
    purchased events (`lib/analytics.ts`). There's no trial or introductory
    offer, and the feature list repeats itself (`pro.tsx:20-22`). Without
    this funnel, $3k MRR can't be tracked.

## Batch 3: after buying the developer account

14. **Set up App Store Connect.** Create the app record and the
    `com.untilfire.pro.monthly` and `com.untilfire.pro.yearly` products. Add
    the ascAppId and team ID to `eas.json:22`.
15. **Privacy manifest.** Declare the required-reason APIs (AsyncStorage,
    PostHog, Plaid) in `app.json` `ios.privacyManifests`. Without this,
    Apple can reject the upload (ITMS-91053).
16. **A login for App Review.** Sign-in is only email code, Apple or Google
    (`state/auth.tsx`). Add a fixed-code reviewer account with seeded data,
    and Plaid sandbox notes in the Review Notes.
17. **Banks that log in on their own site, such as Chase.** These need a
    `redirect_uri` in `app/api/plaid/create-link-token/route.ts:27` and an
    `apple-app-site-association` file served from untilfire.com.
18. **Production settings:**
    - Set `EXPO_PUBLIC_POSTHOG_KEY` as an EAS environment variable; without
      it, analytics are off in production (`eas.json:17`).
    - Install expo-updates so there's a hotfix path; `eas.json` sets
      channels but nothing uses them.
    - Add the `expo-iap` plugin.
19. **Manage subscription.** The Pro screen sends everyone to Apple's
    subscriptions page, including people billed through the website
    (`pro.tsx:89`).
20. **Privacy labels.** Declare email and user ID, financial info, usage and
    crash data linked to the user, and feedback text.

## Nice to have

- A home-screen widget showing the freedom date or "Today · N to do", and an
  in-app rating prompt (expo-store-review).
- Reminders are only scheduled 7 days ahead, so someone who stops opening
  the app goes silent after a week (`today-reminder.ts:28`).
- Dynamic Type clipping: boxes with a fixed size, such as Home's actions at
  width 72, `ReviewBar` at `h-11`, and Home's 50px freedom date.
- Review's swipe-to-skip has no VoiceOver action.
- The splash screen is light only, and Home's `panel()` reads the theme only
  once.
- The freedom date is written three ways: "Mar 2041" on Home, "2041" on the
  Plan hub and "March 2041" on the Freedom page.
- Some buttons are bare words, against D-74's rule that actions are chunky
  buttons (`sign-in.tsx:71,126,129`, `DetailScreen.tsx:25`).

## Already in good shape

- **App config:** the bundle ID, the 1024px opaque icon, the Face ID purpose
  string, and `usesNonExemptEncryption: false`.
- **Sign-in and Pro:**
  - Sign in with Apple sits alongside Google.
  - Pro is sold through StoreKit, with Restore, the renewal terms, and links
    to Terms and Privacy.
  - Account deletion is in the app.
- **Code hygiene:** no `console` calls, no development URLs, and every
  request goes to www.untilfire.com. Offline is handled with NetInfo.
- **Asking at the right time:** notification permission is asked only after
  the reveal, with a "Not now", and feedback is only ever user-initiated.
