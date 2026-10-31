# Phone bank health

Implementation authorized 1 November 2026. Based on GitHub main 311d714; reconciled with main af157f1 before PR publication. Money → Banks owns connection management; Home has one quiet link. Approved Next Horizon pastels and existing primitives are retained.

## Contract

- GET /api/plaid/health validates the bearer session with getUser and queries only that user's plaid_items. Read-only item/get checks return Connected, Needs attention or Status unavailable, plus the stored last_synced_at. No secret access tokens or provider error payloads reach the phone.
- Last synced means the last successful transaction import into UntilFire, not a live bank balance, a screen refresh or a guarantee of the bank's newest activity. Home uses the oldest bank's timestamp; missing/invalid/future dates do not imply freshness.
- Opening a screen checks status only. Retry sync explicitly calls the existing owner-scoped /api/plaid/sync importer. Neither money calculations nor its transaction/refund write path changes.
- Reconnect creates a Link token in update mode for an already-owned Item. It passes no products, does not exchange a public token, create a duplicate Item or apply the new-bank free-plan limit. Android uses its existing package; iOS requires the existing redirect configuration. Expo Go/web explains that reconnect needs the installed app.
- Memory is account-scoped; sign-out/switch clears visible banks immediately without remounting navigation. Owner-generation checks reject late callbacks even after A → B → A. Operations serialize; check-status/foreground refresh cannot abort an explicit sync. An owner change before Link opens cancels the reconnect launch.
- Status checks are bounded, rate-limited and no-store. Per-bank failures retain that bank with unknown health. A failed overall check retains known timestamps but overrides cached Connected/reconnect claims. No new permissions, native modules, dependencies, runtime changes or database migration.

## Verification

- scripts/verify-bank-health.ts exercises actual handlers with mocked Supabase/Plaid: missing/invalid session, owner filtering, inaccessible Item, database/upstream failures, no secret output, repair with no subscription gate/products, Android/iOS redirects, timestamp/freshness cases.
- Local Expo web fixtures use the actual provider, BankConnection and BankFreshness with synthetic network responses. Checked connected/attention/unknown/updating, retry success/failure, unchanged last-sync on failure, serialized actions and late-response isolation. A → B → A during a delayed sync produced zero stale account imports.
- Theme screenshots, final type/lint, Journeys, existing Plaid regression tests and Android/iOS/web export outcomes are recorded in the PR. Test routes are removed from final source/builds.

Limit: browser fixtures cannot prove native Plaid credentials/OAuth/SDK presentation, Android hardware behavior or assistive-device interactions. Complete installed-app acceptance with a sandbox bank before production promotion. No live customer sync, reconnect or financial write was used for QA.

## Release

Implementation/PR only; this feature is not merged or shipped by this request. An authorized merge deploys the website endpoints and sends a phone preview through existing workflows. Verify the website deployment before testing the preview or promoting production. Use the existing fingerprint-gated Phone updates workflow; do not publish EAS updates manually.

API references checked 1 November: https://plaid.com/docs/link/update-mode/ and https://supabase.com/docs/reference/javascript/auth-getuser .
