# Sprint 22 — Beta Trust and Learning Signals

**Goal:** Learn from beta users without hurting the first value moment.

## Slices

### Slice 1 — Feedback behavior (done)
- FeedbackWidget is opt-in only; the button is always visible but never auto-opens
- No stars, no ratings, no NPS prompt
- Closes on Escape key or backdrop click; dismissible at any point
- SurveyModal in dashboard/page.tsx is present but `setSurveyOpen` is never called — intentionally dead, startup stays calm

### Slice 2 — Analytics contract (done)
Expanded `lib/analytics-events.ts` and `lib/analytics.ts` with typed, privacy-safe post-result events:

| Event | When fired |
|---|---|
| `result_share_opened` | User opens share modal |
| `result_share_completed` | User completes a share (platform + card_kind) |
| `result_save_clicked` | User clicks "Save my plan" (placement: hero/monthly_move/next_move) |
| `result_email_captured` | Email submitted successfully in no-login flow |
| `feedback_opened` | User opens FeedbackWidget |
| `feedback_submitted` | Feedback POST succeeds (feedback_type included) |
| `feedback_dismissed` | User closes widget without submitting |

New types: `SharePlatform`, `ShareCardKind`. All events versioned via `withVersion()`.

No raw FIRE numbers or income values are ever sent to PostHog.

### Slice 3 — Founder-facing verification checklist

- [ ] Open calculator as a new visitor → no feedback prompt, no survey, no paywall before the result
- [ ] Reach the reveal screen → "Send feedback" button is visible in bottom-right
- [ ] Click feedback button → modal opens with type selector and textarea; no stars
- [ ] Submit feedback → PostHog shows `feedback_submitted` with `feedback_type` and `source: dashboard_widget`
- [ ] Dismiss without submitting → PostHog shows `feedback_dismissed`
- [ ] Share result → PostHog shows `result_share_opened` then `result_share_completed` with correct `platform` and `card_kind`
- [ ] Click "Save my plan" at any of 3 placements → PostHog shows `result_save_clicked` with correct `placement`
- [ ] Submit email in no-login flow → PostHog shows `result_email_captured`
