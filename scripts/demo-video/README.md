# UntilFire product demo video

40.9s vertical (1080x1920 @ 30fps) product demo, rendered offscreen with
CanvasKit and encoded with ffmpeg. Cut on a 120 BPM beat grid (beat every
15 frames, grid `14 + 15k`) to match the chosen backing track
(`bg_sound.m4a`, 40.9s — kept outside the repo; pass its path as an argument).

## Scenes

| frames     | scene                                                          |
|------------|----------------------------------------------------------------|
| 0–333      | hook ("What if work was optional?") + sunrise + power copy      |
| 333–675    | compounding bar chart, shuffle morph, $1.24M reveal             |
| 675–798    | 15 real bank/fintech logos (simple-icons), scan line            |
| 798–1002   | "where money leaks" card + $9,396/yr reframe                    |
| 1002–1227  | end card: teal half-sun logo (5 rays), wordmark, www.untilfire.com |

## Render

```bash
npm i canvaskit-wasm ffmpeg-static       # if not already installed
node scripts/demo-video/render.mjs spot  # 26 spot frames for QA
node scripts/demo-video/render.mjs       # full render, silent
node scripts/demo-video/render.mjs path/to/bg_sound.m4a  # with music
```

Output: `scripts/demo-video/untilfire-demo.mp4`. Frames land in
`scripts/demo-video/frames/` (gitignored).

## Assets

- `fonts/` — Syne (display), DM Sans (body), DM Mono (numbers); static
  instances cut from the Google Fonts variable TTFs with
  `python3 -m fontTools.varLib.instancer`.
- `icons.json` — name, brand hex, and 24x24 SVG path for 15 institutions,
  extracted from the `simple-icons` npm package.

## Style contract (from user feedback)

- Logo is a **teal/blue half-sun with exactly 5 rays** above a horizon line.
- Always use `www.untilfire.com`.
- No pill CTA button on the end card.
- Punchy copy lines must dwell ≥2 seconds.
- The screen must never freeze — ambient particles, beat pulses, and slow
  scale drift keep every hold alive.
- Never let small text fight a chart: dim the chart (saveLayer) while a
  big number/label owns the screen.
- Keep the bar "shuffle" morph (messy bars reorganize into the compound
  curve; last three collapse into red stubs).
