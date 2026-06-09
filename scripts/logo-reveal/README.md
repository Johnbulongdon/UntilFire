# UntilFire animated logo reveal

Hand-authored Lottie (Bodymovin) animation of the UntilFire mark: the sun arc
draws on, rays fan out left→right, the horizon line draws from the centre out,
and the **UntilFIRE** wordmark floats up one letter at a time, each emerging
from the horizon line.

Brand-accurate: Manrope ExtraBold (weight 800), `-5` letter-spacing, single
teal `#20D4BF`, transparent background.

## Shipped assets (in `public/logo/`)

| File | What it is | Use it for |
| --- | --- | --- |
| `untilfire-logo-reveal.json` | Lottie, **logo-sized** line, transparent | The one to ship — splash/loading reveal, hero, headers |
| `untilfire-logo-reveal-fullwidth.json` | Lottie, full-bleed line | Wide banners / covers where edges are the screen edges |
| `untilfire-logo-reveal.png` | True-alpha **APNG** | Quick drop-in where Lottie isn't available (emails, previews) |

The Lottie is ~24 KB, scales to any size, and plays once.

## Using the Lottie in the app

```tsx
import Lottie from "lottie-react"; // npm i lottie-react
import reveal from "@/public/logo/untilfire-logo-reveal.json";

export function LogoReveal() {
  return <Lottie animationData={reveal} loop={false} autoplay style={{ width: 360 }} />;
}
```

Native canvas size is 1000×360; it scales freely. Set `loop={false}` for a
one-time reveal (recommended) or `loop` it for a looping header.

## Regenerating / tweaking

The animation is generated programmatically (no After Effects). It renders the
wordmark glyph-by-glyph with Skia/CanvasKit, embeds each letter as a PNG asset,
and hand-builds the Lottie JSON.

```bash
# from the repo root
npm i canvaskit-wasm                 # full build provides Skottie
node scripts/logo-reveal/generate.mjs            # → scripts/logo-reveal/dist/untilfire-logo-logo.json
LINE_MODE=full node scripts/logo-reveal/generate.mjs   # full-width variant

# optional: build the APNG + checkerboard preview from the rendered frames
pip install Pillow
python3 scripts/logo-reveal/assemble.py          # → dist/untilfire-logo-*.png + preview-*.gif
```

Then copy the chosen outputs from `scripts/logo-reveal/dist/` into `public/logo/`.

### Knobs (env vars on `generate.mjs`)

| Var | Default | Meaning |
| --- | --- | --- |
| `LINE_MODE` | `logo` | `logo` = contained line, `full` = edge-to-edge |
| `STAGGER` | `2` | frames between successive letters (lower = snappier) |
| `RISE` | `18` | px each letter floats up |
| `MOVE` | `12` | frames for a letter's rise |
| `FADE` | `8` | frames for a letter's fade-in |
| `FIRST_T` | `48` | frame the first letter starts on |

The current shipped assets use the defaults above ("snappier" timing).

`Manrope-800.ttf` is the static ExtraBold instance of Manrope (OFL), kept here
so the build is reproducible without fetching fonts.
