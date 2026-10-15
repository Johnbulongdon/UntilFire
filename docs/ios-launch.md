# iOS app: launch checklist

What is already built into `mobile/` and the website, and what has to happen
once the Apple Developer Program is bought. Written so the paid year starts
with setup and testing, not coding (founder's request, 13 Oct 2026).

## Built and switched off until the app's own build

These run only in the app's own build (development or App Store), never in
Expo Go, and turn on by themselves there (`mobile/src/lib/native-build.ts`).

- **Sign in with Apple:** Apple's button on the sign-in sheet; Supabase
  `signInWithIdToken` with a nonce (`state/auth.tsx`). `usesAppleSignIn` and
  the `expo-apple-authentication` plugin are in `app.json`.
- **Native bank connection:** Plaid's Link SDK v13 (`lib/plaid-native.ts`),
  using the website's `/api/plaid/create-link-token` and
  `/api/plaid/exchange-token` with the app's sign-in. In Expo Go the
  temporary website bridge is used instead (`components/BankBridge.tsx`).
- **Pro through Apple (D-75):** the Pro screen (`app/pro.tsx`) buys with
  expo-iap (StoreKit 2, `lib/apple-iap.ts`). The website checks each purchase
  with Apple (`/api/apple/verify`) and Apple's renewal notices
  (`/api/apple/notifications`) and keeps them in `subscriptions` with
  `source = 'apple'`. No RevenueCat. The admin Users page shows who bills.

## Purchase day, in order

1. Enrol in the Apple Developer Program; note the Team ID.
2. **Database:** done. `0050_apple_subscriptions.sql` was applied to the
   live database on 13 Oct 2026.
3. **Supabase:** Authentication, Providers, Apple: enable it and add
   `com.untilfire.app` as an authorised client ID.
4. **App Store Connect:** create the app (bundle ID `com.untilfire.app`),
   then a subscription group "UntilFire Pro" with `com.untilfire.pro.monthly`
   ($9) and `com.untilfire.pro.yearly` ($79), and a 30-day free trial as an
   introductory offer if wanted. Note the app's numeric Apple ID.
5. **Vercel env vars:** `APPLE_APP_ID` (that numeric ID), and optionally
   `APPLE_BUNDLE_ID` and `APPLE_PRO_PRODUCT_IDS` if they differ from the
   defaults. Redeploy.
6. **App Store Server Notifications (V2):** set both production and sandbox
   URLs to `https://www.untilfire.com/api/apple/notifications`.
7. **Own build:** `eas build --profile development --platform ios` (EAS makes
   the certificates and registers the iPhone). Install it, then test Sign in
   with Apple, Connect a bank, and buying Pro with a sandbox tester (App Store
   Connect, Users and Access, Sandbox).
8. **Plaid:** allow the iOS app in the Plaid dashboard. For banks that sign in
   through their own app (OAuth), add a redirect URI on untilfire.com with an
   `apple-app-site-association` file and the Associated Domains capability.
9. Remove the website branch of `BankBridge`.
10. **App Review login:** in Supabase, Authentication, Users, add
    `appreview@untilfire.com` with a 6-digit numeric password and auto-confirm.
    Sign in with it on the phone (email, then the password as the code), answer
    the questions and add a few transactions so the review sees a real Home.
    In App Store Connect's Review Notes give the email, the code, and "connect
    a bank with Plaid's sandbox: First Platypus Bank, user_good / pass_good".
11. **Over-the-air updates:** run `eas update:configure` once (it adds the
    update URL to `app.json`), then hotfixes ship with
    `eas update --channel production`.
12. **Listing:** paste `docs/app-store-listing.md`, take the screenshots it
    lists, then `eas build --profile production` and `eas submit`.

## Known follow-ups

- Optional: crash reports (Sentry) and over-the-air updates (EAS Update).
