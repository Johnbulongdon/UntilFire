import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.OUT_DIR || join(SCRIPT_DIR, "dist");
mkdirSync(OUT_DIR, { recursive: true });

// ──────────────────────────────────────────────
// 1. CanvasKit — full build (includes Skottie/MakeManagedAnimation).
//    Run from the repo root after `npm i canvaskit-wasm`.
// ──────────────────────────────────────────────
const CanvasKitInit = (await import("canvaskit-wasm/bin/full/canvaskit.js")).default;
const ck = await CanvasKitInit({ locateFile: f => `node_modules/canvaskit-wasm/bin/full/${f}` });

// ──────────────────────────────────────────────
// 3. Constants — both fixes applied here
// ──────────────────────────────────────────────
const hex = h => {
  const n = parseInt(h.replace("#",""), 16);
  return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255, 1];
};
const BG   = hex("#08080e");
const TEAL = hex("#20D4BF"); // single brand teal for all mark elements
const WORD = hex("#F8FAFC");

const W = 1000, H = 360, FR = 30, DUR = 108; // ~3.6 s play-once
const BX = 205, hy = 244, R = 95;
const FS = 130; // reduced from 150 to prevent right-edge clipping

// LINE_MODE=logo  → line spans the lockup with even margins (default, reusable logo)
// LINE_MODE=full  → line runs edge to edge (wide-banner treatment)
const LINE_MODE = process.env.LINE_MODE || "logo";
const RAY_W   = 11;  // chunky rays with round caps for an app-icon feel
const HORIZ_W = 4;   // horizon line weight, harmonised with the chunkier rays
const ARC_W   = 4;   // dome outline weight

// ──────────────────────────────────────────────
// 4. Pre-render each LETTER as its own cropped PNG (for staggered float-up)
// ──────────────────────────────────────────────
const fontData = readFileSync(join(SCRIPT_DIR, "Manrope-800.ttf"));
const typeface = ck.Typeface.MakeFreeTypeFaceFromData(fontData.buffer);
const font = new ck.Font(typeface, FS);
font.setSubpixel(true);

const paint = new ck.Paint();
paint.setColor(ck.Color4f(...WORD));
paint.setAntiAlias(true);

const text = "UntilFIRE";
const LETTERSPACE = -5; // brand spec letter-spacing
const glyphIds = font.getGlyphIDs(text);
const widths = font.getGlyphWidths(glyphIds, paint); // advance widths at FS

// Cumulative pen-x for each glyph, relative to the word's origin
const penX = [];
{ let acc = 0; for (let i = 0; i < glyphIds.length; i++) { penX.push(acc); acc += widths[i] + LETTERSPACE; } }

const GP = 3; // per-glyph crop padding (so anti-aliased edges aren't clipped)
function renderGlyph(gid) {
  const OV = 360, OH = 320, PX = 100, BASE = 200;
  const s0 = ck.MakeSurface(OV, OH); const c0 = s0.getCanvas();
  c0.clear(ck.Color4f(0, 0, 0, 0));
  const b0 = ck.TextBlob.MakeFromGlyphs([gid], font);
  c0.drawTextBlob(b0, PX, BASE, paint); b0.delete();
  const snap = s0.makeImageSnapshot();
  const raw = snap.readPixels(0, 0, { width: OV, height: OH, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB });
  snap.delete();
  let bx0 = OV, by0 = OH, bx1 = 0, by1 = 0, has = false;
  for (let y = 0; y < OH; y++) for (let x = 0; x < OV; x++) {
    if (raw[(y * OV + x) * 4 + 3] > 10) { has = true; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
  }
  s0.delete();
  if (!has) return null;
  const gw = (bx1 - bx0 + 1) + 2 * GP, gh = (by1 - by0 + 1) + 2 * GP;
  const s1 = ck.MakeSurface(gw, gh); const c1 = s1.getCanvas();
  c1.clear(ck.Color4f(0, 0, 0, 0));
  const b1 = ck.TextBlob.MakeFromGlyphs([gid], font);
  c1.drawTextBlob(b1, PX - bx0 + GP, BASE - by0 + GP, paint); b1.delete();
  const png = s1.makeImageSnapshot().encodeToBytes(); s1.delete();
  return {
    png, gw, gh,
    inkL: bx0 - PX,   // ink left  relative to pen origin
    inkT: by0 - BASE, // ink top   relative to baseline (negative = above)
    inkB: by1 - BASE, // ink bottom relative to baseline
  };
}

const glyphData = Array.from(glyphIds).map(renderGlyph);

// Word ink extents in word space (baseline = 0, pen origin = 0)
let wMinX = Infinity, wMaxX = -Infinity, wMinY = Infinity, wMaxY = -Infinity;
for (let i = 0; i < glyphData.length; i++) {
  const g = glyphData[i]; if (!g) continue;
  const IL = penX[i] + g.inkL;
  const IR = IL + (g.gw - 2 * GP);
  if (IL < wMinX) wMinX = IL;
  if (IR > wMaxX) wMaxX = IR;
  if (g.inkT < wMinY) wMinY = g.inkT;
  if (g.inkB > wMaxY) wMaxY = g.inkB;
}
const cw  = wMaxX - wMinX;
const chh = wMaxY - wMinY;
const restTopY = H / 2 - chh / 2; // comp y of the word's top ink at rest
console.log(`OK word="${text}" letters=${glyphData.length} cw=${Math.round(cw)} chh=${Math.round(chh)}`);

// ──────────────────────────────────────────────
// 5. Lottie helpers
// ──────────────────────────────────────────────
const ease = { i: { x: [0.22], y: [1] }, o: { x: [0.36], y: [0] } };

const kf = frames => ({
  a: 1,
  k: frames.flatMap((f, idx) =>
    idx < frames.length - 1
      ? [{ t: f.t, s: f.s, ...ease, h: 0 }]
      : [{ t: f.t, s: f.s }]
  )
});

const staticVal = v => ({ a: 0, k: v });

const trimPath = (startKfs, endKfs) => ({
  ty: "tm", s: startKfs, e: endKfs,
  o: staticVal(0), m: 1, nm: "Trim"
});

const stroke = (color, width) => ({
  ty: "st",
  c: staticVal(color),
  w: staticVal(width),
  o: staticVal(100),
  lc: 2, lj: 2, ml: 4, nm: "Stroke"
});

const fill = (color, opacity) => ({
  ty: "fl",
  c: staticVal(color),
  o: opacity ? opacity : staticVal(100),
  r: 1, nm: "Fill"
});

const rect = (x, y, w, h) => ({
  ty: "rc",
  p: staticVal([x + w / 2, y + h / 2]),
  s: staticVal([w, h]),
  r: staticVal(0),
  nm: "Rect",
  d: 1
});

const group = (name, items, transform) => ({
  ty: "gr", nm: name, it: [
    ...items,
    transform || {
      ty: "tr", p: staticVal([0, 0]), a: staticVal([0, 0]),
      s: staticVal([100, 100]), r: staticVal(0), o: staticVal(100),
      sk: staticVal(0), sa: staticVal(0)
    }
  ]
});

// ──────────────────────────────────────────────
// 6. Logo mark geometry
// ──────────────────────────────────────────────
// Sun dome: closed half-disc with flat base on horizon
const k = 0.5523 * R;
const sunDomePath = {
  ty: "sh",
  ks: staticVal({
    c: true,
    v: [[BX - R, hy], [BX, hy - R], [BX + R, hy]],
    i: [[0, 0], [-k, 0], [0, -k]],
    o: [[0, -k], [k, 0], [0, 0]]
  }),
  nm: "DomePath"
};

// Sun arc: same half-circle but as a stroke (open path, trim-path animates it)
const sunArcPath = {
  ty: "sh",
  ks: staticVal({
    c: false,
    v: [[BX - R, hy], [BX, hy - R], [BX + R, hy]],
    i: [[0, 0], [-k, 0], [0, -k]],
    o: [[0, -k], [k, 0], [0, 0]]
  }),
  nm: "ArcPath"
};

// Wordmark left edge (shared by the wordmark layer and the logo-mode line extent)
const wX = 395; // keeps the wordmark's right edge at ~970 (30px margin)

// Horizon line extent: logo-sized spans sun→wordmark with even margins; full = edge-to-edge
const lineX0 = LINE_MODE === "full" ? 0 : (BX - R - 14);   // ~96 in logo mode
const lineX1 = LINE_MODE === "full" ? W : (wX + cw + 14);  // ~984 in logo mode
const horizPath = {
  ty: "sh",
  ks: staticVal({
    c: false,
    v: [[lineX0, hy], [lineX1, hy]],
    i: [[0, 0], [0, 0]],
    o: [[0, 0], [0, 0]]
  }),
  nm: "HorizPath"
};

// Rays: 5 rays fanning from the sun centre, going upward
const RAY_COUNT = 5;
const rayAngles = [-60, -30, 0, 30, 60]; // degrees from vertical
const RAY_LEN = 44;       // shorter + thicker = more volume, less wispy
const RAY_START = R + 24; // start distance from BX,hy

function rayPath(angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  const x0 = BX + RAY_START * Math.cos(rad);
  const y0 = hy + RAY_START * Math.sin(rad);
  const x1 = BX + (RAY_START + RAY_LEN) * Math.cos(rad);
  const y1 = hy + (RAY_START + RAY_LEN) * Math.sin(rad);
  return {
    ty: "sh",
    ks: staticVal({ c: false, v: [[x0, y0], [x1, y1]], i: [[0,0],[0,0]], o: [[0,0],[0,0]] }),
    nm: "RayPath"
  };
}

// ──────────────────────────────────────────────
// 7. Build layers (first in array = frontmost)
// ──────────────────────────────────────────────
const layers = [];
let ind = 1;

// Layer 1: Horizon line (frontmost so it stays crisp over the mask) — draws centre-outward
layers.push({
  ty: 4, nm: "Horizon", ind: ind++, ip: 0, op: DUR, st: 0,
  shapes: [
    group("HorizGroup", [
      horizPath,
      trimPath(
        kf([{ t: 20, s: [50] }, { t: 42, s: [0] }]),
        kf([{ t: 20, s: [50] }, { t: 42, s: [100] }])
      ),
      stroke(TEAL, HORIZ_W)
    ])
  ],
  ks: { p: staticVal([0,0]), a: staticVal([0,0]), s: staticVal([100,100]), r: staticVal(0), o: staticVal(100) }
});

// Per-letter float-up. Each letter is its own image, matted to the area ABOVE the line
// (its own td:1 matte directly precedes it), and rises a little with a staggered offset
// so the wordmark settles in one letter at a time rather than all at once.
const num = (k, d) => process.env[k] !== undefined ? Number(process.env[k]) : d;
// Locked-in "snappier" timing: tight stagger, short quick rise per letter.
const RISE = num("RISE", 18);     // px each letter floats up
const STAGGER = num("STAGGER", 2); // frames between successive letters
const FIRST_T = num("FIRST_T", 48);// first letter starts here
const FADE = num("FADE", 8);      // fade-in length per letter
const MOVE = num("MOVE", 12);     // rise length per letter
const matteRect = () => group("MatteGroup", [
  rect(-40, -40, W + 80, hy + 41), // y ∈ [-40, hy+1], full width
  fill(WORD)
]);
glyphData.forEach((g, i) => {
  if (!g) return;
  const restPx = wX + (penX[i] + g.inkL - wMinX) - GP; // image top-left (anchor [0,0])
  const restPy = restTopY + (g.inkT - wMinY) - GP;
  const t0 = FIRST_T + i * STAGGER;
  // matte for this letter (td:1) — must immediately precede the letter layer
  layers.push({
    ty: 4, nm: `Matte${i}`, ind: ind++, td: 1, ip: 0, op: DUR, st: 0,
    shapes: [matteRect()],
    ks: { p: staticVal([0,0]), a: staticVal([0,0]), s: staticVal([100,100]), r: staticVal(0), o: staticVal(100) }
  });
  // the letter (tt:1)
  layers.push({
    ty: 2, nm: `L${i}`, ind: ind++, tt: 1, ip: 0, op: DUR, st: 0,
    refId: `g${i}`,
    ks: {
      p: kf([{ t: t0, s: [restPx, restPy + RISE] }, { t: t0 + MOVE, s: [restPx, restPy] }]),
      a: staticVal([0, 0]),
      s: staticVal([100, 100]),
      r: staticVal(0),
      o: kf([{ t: t0, s: [0] }, { t: t0 + FADE, s: [100] }])
    }
  });
});

// Layers 4-8: Five rays left→right
for (let i = 0; i < RAY_COUNT; i++) {
  const t0 = 24 + i * 6;
  const t1 = t0 + 12;
  layers.push({
    ty: 4, nm: `Ray${i+1}`, ind: ind++, ip: 0, op: DUR, st: 0,
    shapes: [
      group(`RayGroup${i}`, [
        rayPath(rayAngles[i]),
        trimPath(
          kf([{ t: t0, s: [0] }, { t: t1, s: [0] }]),
          kf([{ t: t0, s: [0] }, { t: t1, s: [100] }])
        ),
        stroke(TEAL, RAY_W)
      ])
    ],
    ks: { p: staticVal([0,0]), a: staticVal([0,0]), s: staticVal([100,100]), r: staticVal(0), o: staticVal(100) }
  });
}

// Layer 8: Sun arc stroke (trim-path draw-on)
layers.push({
  ty: 4, nm: "SunArc", ind: ind++, ip: 0, op: DUR, st: 0,
  shapes: [
    group("SunArcGroup", [
      sunArcPath,
      trimPath(
        kf([{ t: 6, s: [50] }, { t: 22, s: [0] }]),
        kf([{ t: 6, s: [50] }, { t: 22, s: [100] }])
      ),
      stroke(TEAL, ARC_W)
    ])
  ],
  ks: { p: staticVal([0,0]), a: staticVal([0,0]), s: staticVal([100,100]), r: staticVal(0), o: staticVal(100) }
});

// Layer 9: Sun fill dome (fade in)
layers.push({
  ty: 4, nm: "SunFill", ind: ind++, ip: 0, op: DUR, st: 0,
  shapes: [
    group("SunFillGroup", [
      sunDomePath,
      fill(TEAL, kf([{ t: 10, s: [0] }, { t: 24, s: [100] }]))
    ])
  ],
  ks: { p: staticVal([0,0]), a: staticVal([0,0]), s: staticVal([100,100]), r: staticVal(0), o: staticVal(100) }
});

// No background layer — output is transparent.

// ──────────────────────────────────────────────
// 8. Assemble Lottie JSON (transparent)
// ──────────────────────────────────────────────
const VARIANT = process.env.VARIANT || LINE_MODE;
const outName = `untilfire-logo-${VARIANT}`;
const lottieAssets = [];
const skAssets = {}; // id → raw png bytes for the Skottie renderer
glyphData.forEach((g, i) => {
  if (!g) return;
  lottieAssets.push({ id: `g${i}`, w: g.gw, h: g.gh, u: "", p: `data:image/png;base64,${Buffer.from(g.png).toString("base64")}`, e: 1 });
  skAssets[`g${i}`] = g.png;
});
const lottie = {
  v: "5.7.0", fr: FR, ip: 0, op: DUR, w: W, h: H, nm: "UntilFIRE Logo Reveal",
  assets: lottieAssets,
  layers
};

writeFileSync(join(OUT_DIR, `${outName}.json`), JSON.stringify(lottie));
console.log(`Lottie JSON written: ${outName}.json (LINE_MODE=${LINE_MODE})`);

// ──────────────────────────────────────────────
// 9. Render transparent RGBA frames via Skia/Skottie
// ──────────────────────────────────────────────
const jsonStr = JSON.stringify(lottie);

const anim = ck.MakeManagedAnimation(jsonStr, {
  loadFont: () => null,
  loadImageAsset: (id) => {
    const bytes = skAssets[id];
    if (!bytes) return null;
    const img = ck.MakeImageFromEncoded(bytes);
    return img ? ck.MakeImageShader(img, ck.TileMode.Clamp, ck.TileMode.Clamp, ck.FilterMode.Linear, null) : null;
  }
});
if (!anim) throw new Error("MakeManagedAnimation failed");

const framesDir = join(OUT_DIR, `frames-${VARIANT}`);
try { rmSync(framesDir, { recursive: true, force: true }); } catch {}
mkdirSync(framesDir, { recursive: true });

const surface = ck.MakeSurface(W, H);
const canvas = surface.getCanvas();
const bounds = ck.LTRBRect(0, 0, W, H);
const totalFrames = DUR;

for (let f = 0; f < totalFrames; f++) {
  const t = f / totalFrames;
  canvas.clear(ck.Color4f(0, 0, 0, 0)); // transparent
  anim.seek(t);
  anim.render(canvas, bounds);
  const snap = surface.makeImageSnapshot();
  const png = snap.encodeToBytes(); // PNG with full alpha
  writeFileSync(`${framesDir}/f${String(f).padStart(3, "0")}.png`, Buffer.from(png));
  snap.delete();
}
console.log(`Rendered ${totalFrames} transparent PNG frames → ${framesDir}`);
surface.delete();
anim.delete();
