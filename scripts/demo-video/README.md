# UntilFire product demo video

See `docs/design/demo-video-requirements.md` for the requirement spec
(horizontal 16:9, no orange, v8 emotional motion-graphics approach).

**Current master: `render.mjs` — 1920x1080 horizontal motion graphics.**
The video is emotional storytelling about FIRE freedom (v8 basis), not
product screenshots: black-open question → "introducing... UntilFire" logo
light-up reveal → compounding bar chart shuffle → bank-logo marquee →
spending-leaks removal → end card.

40.9s @ 30fps — exactly the backing track length, music starts at frame 1.
Cut on a 120 BPM beat grid (beat every 15 frames, grid `14 + 15k`) to match
the chosen backing track (`bg_sound.m4a`, 40.9s — kept outside the repo;
binary uploads do not survive container restarts, re-request if missing).
No section lasts over 8 seconds, and no hold is ever frozen.

## Scenes (1227 frames total)

| frames     | scene                                                              |
|------------|--------------------------------------------------------------------|
| 0–195      | black, question words appear one by one, then fade out              |
| 195–435    | "introducing... UntilFire" → light blooms from 1px to white bg      |
| 405–645    | bar chart wiggle-shuffles into stacked invest(slate)+growth(teal)   |
| 615–855    | 15 real bank/fintech logos, big two-row scrolling marquee           |
| 825–1065   | spending leaks found, then swiped away (teal checks, $ recovered)   |
| 1035–1227  | end card: power copy, teal half-sun (5 rays), www.untilfire.com     |

The question scene hard-cuts to the introducing scene (both black at the
boundary); all later scenes overlap by 30 frames with a filmstrip pan
(exit left, enter right).

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
- Music starts at frame 1; total video length = track length.
- No section over 8 seconds; the screen must never freeze — ambient
  particles, beat pulses, marquee scroll, and slow scale drift keep every
  hold alive.
- The sun's ray beat-pulse is a keeper — preserve it in every sun.
- Black→white transition must bloom from 1px at the center with a soft
  falloff — never a pre-sized circle popping in.
- Show, don't tell: no text cards describing what the visuals already show.
- Keep the bar "shuffle" morph — bars wiggle as they reorganize into the
  compound curve, then split into two stacked colors:
  contributions (slate) + growth/returns (teal), with a small legend.
- Bank logos: big, always in motion (scrolling marquee), not a static grid.
- Leaks scene: rows are struck through and swiped away with teal checks
  while a "+$X/mo recovered" counter climbs.
