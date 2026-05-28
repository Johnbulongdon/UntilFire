# UNTAAAA-87 Progress — 2026-05-11

Owner: CTO Backup (Codex)

## Scope completed this heartbeat
- Extracted `CityScreen` from `app/page.tsx` into `app/components/landing/CityScreen.tsx`.
- Exported and reused `CityState` type from the new component module.
- Preserved existing wizard flow wiring at call site (`screen === "city"`) with unchanged transition behavior (`city -> income`).
- Normalized user-facing copy in city screen where previous glyph corruption appeared (`25x`, middle-dot separator, spacing around hyphenated phrases).

## Files changed
- `app/components/landing/CityScreen.tsx` (new)
- `app/page.tsx`

## Verification run
- `npx eslint app/components/landing/CityScreen.tsx app/page.tsx`
  - Result: pass with pre-existing warnings in `app/page.tsx` only (`useCallback`, `customEffectiveRate`, `stateKey`, `WaitlistInline`).
  - No new lint errors introduced.
- `node scripts/check-mojibake.mjs`
  - Result: `No mojibake patterns detected.`
- `npx tsc --noEmit`
  - Result: still failing on pre-existing type contract mismatch:
    - `app/page.tsx(818,23): TS2353: 'annualCost' does not exist in type 'CalculatorPrefill'.`

## Publish-readiness handoff
- This remediation slice is structurally complete and reviewable for wizard decomposition.
- Remaining blocker for full compile-clean acceptance is **not caused by this slice**:
  - Unblock owner: calculator-prefill contract owner (likely `lib/journey.ts` / caller payload alignment).
  - Required action: reconcile `annualCost` field shape between `saveCalculatorPrefill` callsite and `CalculatorPrefill` type.

## Next action
1. Land this `CityScreen` extraction as a small commit.
2. Run one focused follow-up slice to resolve `CalculatorPrefill` type mismatch, then re-run `npx tsc --noEmit` for green publish gate.
