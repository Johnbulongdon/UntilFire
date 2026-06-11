# UntilFire product demo video

See `docs/design/demo-video-requirements.md` for the requirement spec
(horizontal 16:9, no orange, v8 emotional motion-graphics approach).

**Current master: `render.mjs` — 1920x1080 horizontal motion graphics.**
The video is emotional storytelling about FIRE freedom (v8 basis), not
product screenshots: teal sunrise hook → compounding bar chart shuffle →
bank-logo marquee → spending-leaks removal → end card.

41s @ 30fps, rendered offscreen with CanvasKit and encoded with ffmpeg.
Cut on a 120 BPM beat grid (beat every 15 frames, grid `14 + 15k`) to match
the chosen backing track (`bg_sound.m4a`, 40.9s — kept outside the repo;
binary uploads do not survive container restarts, re-request if missing).

## Scenes (1230 frames total)

| frames     | scene                                                              |
|------------|--------------------------------------------------------------------|
| 0–270      | hook ("What if work was optional?") + teal sunrise                  |
| 240–540    | compounding bar chart, messy→growth shuffle morph                   |
| 510–780    | 15 real bank/fintech logos, big two-row scrolling marquee           |
| 750–1020   | spending leaks found, then swiped away (teal checks, $ recovered)   |
| 990–1230   | end card: power copy, teal half-sun (5 rays), www.untilfire.com     |

Scenes overlap by 30 frames — a filmstrip pan (exit left, enter right)
bridges each pair.

## Render

```bash
npm i canvaskit-wasm ffmpeg-static        # if not already installed
SPOT=630 node scripts/demo-video/render.mjs   # render single frame N for QA
node scripts/demo-video/render.mjs            # full render → output.mp4 (silent)
# add music afterwards:
ffmpeg -i output.mp4 -i bg_sound.m4a -c:v copy -c:a aac -shortest untilfire-demo.mp4
```

Frames land in `scripts/demo-video/frames/` (gitignored).

## Assets

- `fonts/` — Syne (display), DM Sans (body), DM Mono (numbers); static
  instances of the Google variable fonts.
- `icons.json` — brand hex and 24x24 SVG path for 15 institutions, keyed by
  display name, extracted from the `simple-icons` npm package.

## Style contract (from user feedback)

- Logo is a **teal/blue half-sun with exactly 5 rays** above a horizon line.
- **No orange anywhere; no red/orange "warning" accents either.** Negatives
  are neutral grey, positives/recoveries are teal.
- Always use `www.untilfire.com`.
- No pill CTA button on the end card.
- Punchy copy lines must dwell ≥2 seconds.
- The screen must never freeze — ambient particles, beat pulses, marquee
  scroll, and slow scale drift keep every hold alive.
- Never let small text fight a chart: dim the chart (saveLayer) while a
  big number/label owns the screen.
- Keep the bar "shuffle" morph (messy bars reorganize into the compound curve).
- Bank logos: big, always in motion (scrolling marquee), not a static grid.
- Leaks scene: rows are struck through and swiped away with teal checks
  while a "+$X/mo recovered" counter climbs.
