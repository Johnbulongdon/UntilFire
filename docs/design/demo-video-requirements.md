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
- Warning/negative accents use red (`#ef4444`) or yellow (`#eab308`), never orange.
- Background `#08080e`, cards `#111118`, borders `#23232d`.

## Logo — hard rules

- Teal/blue **half-sun above a horizon line with exactly 5 rays**.
- Wordmark "untilfire" in Syne.
- Always `www.untilfire.com` (never bare `untilfire.com`).
- No pill/button CTA on the end card.

## Content

- **The video must show the real product UI** — screen-capture style:
  enter inputs → get freedom date → see the plan (matches the Product Hunt
  demo item in `docs/ROADMAP.md`). Abstract motion graphics may frame it,
  but the product itself is the star.
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
