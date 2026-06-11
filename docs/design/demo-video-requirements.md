# Demo Video Requirements (source of truth)

Confirmed with John on 2026-06-11 after the original requirements document was
lost to an ephemeral-container wipe. **Every future video iteration must be
checked against this file before delivery.** If a requirement changes in chat,
update this file in the same session.

## Format

- **Horizontal 1920x1080 (16:9)** — for YouTube, landing page embed, Product Hunt.
- 30 fps. ~40s total, cut to the backing track (`bg_sound.m4a`, 120 BPM, 40.9s,
  beat every 15 frames, grid `14 + 15k`). Music file is provided by John per
  session (binary uploads do not survive container restarts — re-request if missing).

## Palette — hard rules

- **All sun imagery is blue/teal (`#22d3a5` family). No orange anywhere in the
  video.** Not in the sunrise, not in copy highlights, not in headlines.
- **No red/orange warning accents either** (confirmed 2026-06-11 for the leaks
  scene) — negatives are neutral grey; positives/recoveries are teal.
- Background `#08080e`, cards `#111118`, borders `#23232d`.

## Logo — hard rules

- Teal/blue **half-sun above a horizon line with exactly 5 rays**.
- Wordmark "untilfire" in Syne.
- Always `www.untilfire.com` (never bare `untilfire.com`).
- No pill/button CTA on the end card.

## Content — v8 emotional motion-graphics is the approach (confirmed 2026-06-11)

- **SUPERSEDED: the "real product UI" requirement.** John's final direction:
  *"use v8 as a basis, i really liked version 8 … it's not more about the
  actual dashboard but the emotion it gives."* The video is emotional
  motion-graphics storytelling about FIRE freedom — NOT dashboard
  recordings, NOT onboarding screenshots.
- **Opening sequence (confirmed 2026-06-11, v15):** start on full black; the
  question "What if work was optional?" appears **word by word in order**,
  then fades out; "introducing... UntilFire" appears on black; then the
  full-size logo animates in and **its light turns the bg white** (radiance
  expanding from the sun, like the rays light it up); logo + wordmark settle;
  everything after runs on a white background with dark text.
- v8 scene structure to preserve after the opening:
  1. Question hook — "What if work was optional?" (black, word-by-word).
  2. Compounding bar chart — messy bars shuffle/morph into the growth curve.
  3. Bank logos — **big logos in a continuously scrolling marquee**
     (two rows, opposite directions), not a static grid.
  4. Spending leaks — leaks found, then **animated removal**: rows get
     struck through and swiped away with teal checks while a
     "+$X/mo recovered" counter climbs. **No red/orange in this scene** —
     neutral grey bars, teal for the recovery.
  5. End card — power copy + teal half-sun + wordmark + www.untilfire.com.
- Approved copy (long dwell, ≥2s per punchy line):
  - Hook: "What if work was optional? What would you do?"
  - "Don't let money stop you from being a good person."
  - "Let your money hire you to chase your dreams."
- Lead with freedom/work optionality. No city/tax comparisons as the hero.

## Typography

- Syne ExtraBold/Bold — display lines
- DM Sans — body/UI labels
- DM Mono — all money figures

## Motion rules (accumulated from review rounds)

- The screen must **never freeze** — ambient particles, beat pulses, slow scale
  drift on every hold.
- Small words must never fight a chart for attention — dim the chart
  (saveLayer) while a number/label owns the screen, or sequence them.
- Cut/animate on the 120 BPM beat grid; bar pops accelerate audibly.
- Keep the bar "shuffle" morph (messy bars reorganize into the compound curve).
- Filmstrip pan between scenes (exit left, enter right).

## Renderer

`scripts/demo-video/render.mjs` (CanvasKit offscreen + ffmpeg-static).
Real institution logos come from `scripts/demo-video/icons.json` (simple-icons).
Render frames are gitignored; commit code + assets, never `/tmp`-only work.
