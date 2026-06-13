# Demo Video Requirements (source of truth)

Confirmed with John on 2026-06-11 after the original requirements document was
lost to an ephemeral-container wipe. **Every future video iteration must be
checked against this file before delivery.** If a requirement changes in chat,
update this file in the same session.

## Format

- **Horizontal 1920x1080 (16:9)** — for YouTube, landing page embed, Product Hunt.
- 30 fps. Total = track length (40.9s), cut to the backing track (`bg_sound.m4a`,
  120 BPM, beat every 15 frames, grid `14 + 15k`). Music file is provided by John
  per session (binary uploads do not survive container restarts — re-request if missing).
- **Music starts at frame 1** (confirmed 2026-06-11) — no delayed audio start.
- **No section over 8 seconds**, and no hold is ever frozen while the user
  reads — every hold keeps moving (particles, beat pulses, drift, scroll).

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
- **Opening sequence (confirmed 2026-06-11, v15/v16, refined v18/v20):** start
  on full black; the question "What if work was optional?" appears **word by
  word, each word landing exactly on a beat** (v18), then fades out;
  "introducing..." appears alone on black — **the name is introduced only
  once** (v20): no big "UntilFire" text before the logo, the logo + wordmark
  reveal IS the introduction; then the full-size logo animates in and **its
  light turns the bg white**. The black→white light
  must **fan out from the sun as an expanding wavefront** — white core grows
  from 1px while the soft leading edge stays a fixed-width band (v18; the
  earlier slow soft blob read as a weird vignette). Logo + wordmark settle;
  everything after runs on a white background with dark text.
- **The sun's ray beat-pulse is a confirmed keeper** — preserve it in every
  sun, including after the logo settles.
- **Show, don't tell (confirmed 2026-06-11):** no text cards describing what
  the visuals already show (e.g. no "$X/mo → freedom date" overlay on the
  chart, no closing text card on the leaks scene).
- v8 scene structure to preserve after the opening:
  1. Question hook — "What if work was optional?" (black, word-by-word,
     each word on a beat).
  2. Compounding bar chart — v8 dark-bg glowing-bars look (confirmed v19);
     **the freedom-date moment must NOT read as "lowering the bar"** (v20):
     after the $1.24M reveal, the 3 tallest bars **slide LEFT 3 year-slots —
     same height, earlier timeline** — leaving ghost outlines at Yr 10–12
     under the "3 years sooner" bracket. Never dim/shrink the result; show
     the same number arriving sooner.
  3. Bank logos — **big logos in a continuously scrolling marquee** filling
     the page (4 rows, alternating directions). **Every logo on screen must
     be unique at any given moment** (v20): disjoint icon sets per row, and
     each row's loop must be wider than the visible window. 36 icons live in
     `icons.json`. Tagline: "15,000+ banks. 0 manual entries."
  4. Spending leaks — a **phone-style notification stack** (confirmed v21;
     the old "You're leaking money" chip grid with X-crosses read cheap).
     Each charge is a notification row (app-icon circle, label, sub-line,
     amount). On each beat the top unresolved card **swipes right and
     dissolves into teal particles** — like clearing a notification — while
     the cards below **shift up** to fill the gap. Crosses land on an
     **accelerating rhythm** (gaps tighten, never a flat one-per-beat pace).
     Once the stack clears, the "+$X/mo recovered" counter rises to center
     stage. **No red/orange** — neutral icon colors, teal dissolve + recovery.
     Header is calm/neutral ("Found while syncing your banks."), not a
     "you're leaking money" shout.
  5. End card (v18/v20) — copy **frames the logo, never clusters at the
     top**: "Don't let money stop you" above the sun (slams on the 39.81s
     beat), smaller teal half-sun center, "from being a good person." BELOW
     the sun landing at **exactly 41s** — never earlier (waiting copy reads
     dead) — then wordmark + www.untilfire.com at the bottom.
- Approved copy:
  - Hook: "What if work was optional?" (each word on a beat)
  - End card: "Don't let money stop you / from being a good person."
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
