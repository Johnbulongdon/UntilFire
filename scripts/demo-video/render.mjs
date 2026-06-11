/**
 * UntilFire demo video — v16
 * Music starts at frame 1; total = track length (40.9s), every section ≤ 8s
 * and always in motion. Black open, question words appear in order →
 * "introducing... UntilFire" → logo animates in, its light blooms from 1px
 * at the center to fill the page white → app showcase on white.
 * Bar chart: bars wiggle-shuffle into a stacked two-color chart
 * (contributions vs growth) — show, don't tell.
 * 1920x1080 horizontal, 30fps.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Setup ─────────────────────────────────────────────────────────────────────
const FRAMES_DIR = path.join(__dirname, 'frames');
const spotOnly = process.env.SPOT != null;
const spotFrame = parseInt(process.env.SPOT || '0', 10);
if (!spotOnly) {
  rmSync(FRAMES_DIR, { recursive: true, force: true });
}
mkdirSync(FRAMES_DIR, { recursive: true });

const CanvasKitInit = (await import('canvaskit-wasm/bin/full/canvaskit.js')).default;
const ck = await CanvasKitInit({
  locateFile: f => path.join(__dirname, 'node_modules/canvaskit-wasm/bin/full', f),
});

// ── Dimensions ────────────────────────────────────────────────────────────────
const W = 1920, H = 1080, FR = 30;

// ── Palette ───────────────────────────────────────────────────────────────────
const hex = h => {
  const n = parseInt(h.replace('#',''), 16);
  return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255, 1];
};
const BG_DARK = hex('#08080e');  // intro only
const BG      = [1, 1, 1, 1];   // white — all post-intro scenes
const TEXT    = hex('#0f172a');  // near-black headlines
const BODY    = hex('#374151');  // body copy
const DIM     = hex('#94a3b8');  // dim labels
const TEAL    = hex('#22d3a5');  // brand teal — unchanged
const CARD    = hex('#f1f5f9');  // light card bg
const BORD    = hex('#e2e8f0');  // light border

// ── Fonts ─────────────────────────────────────────────────────────────────────
const F = p => ck.Typeface.MakeFreeTypeFaceFromData(
  readFileSync(path.join(__dirname, 'fonts', p)).buffer
);
const SYNE_XB = F('Syne-ExtraBold.ttf');
const SYNE_B  = F('Syne-Bold.ttf');
const DMS_R   = F('DMSans-Regular.ttf');
const DMS_M   = F('DMSans-Medium.ttf');
const DMS_B   = F('DMSans-Bold.ttf');
const DMM_M   = F('DMMono-Medium.ttf');

function measure(tf, size, str) {
  const f = new ck.Font(tf, size);
  f.setSubpixel(true);
  const ids = f.getGlyphIDs(str);
  const widths = f.getGlyphWidths(ids);
  const total = widths.reduce((a, b) => a + b, 0);
  f.delete();
  return total;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function mkPaint(color, alpha = 1) {
  const p = new ck.Paint();
  p.setColor(ck.Color4f(color[0], color[1], color[2], color[3] * alpha));
  p.setAntiAlias(true);
  return p;
}
function mkStroke(color, alpha, sw) {
  const p = mkPaint(color, alpha);
  p.setStyle(ck.PaintStyle.Stroke);
  p.setStrokeWidth(sw);
  p.setStrokeCap(ck.StrokeCap.Round);
  return p;
}
function drawCircle(c, x, y, r, col, alpha) {
  const p = mkPaint(col, alpha); c.drawCircle(x, y, r, p); p.delete();
}
function drawRect(c, x, y, w, h, col, alpha, rad = 0) {
  const p = mkPaint(col, alpha);
  if (rad > 0) c.drawRRect(ck.RRectXY(ck.LTRBRect(x, y, x+w, y+h), rad, rad), p);
  else c.drawRect(ck.LTRBRect(x, y, x+w, y+h), p);
  p.delete();
}
function drawLine(c, x0, y0, x1, y1, col, alpha, sw) {
  const p = mkStroke(col, alpha, sw); c.drawLine(x0, y0, x1, y1, p); p.delete();
}
function drawText(c, tf, size, str, x, y, col, alpha) {
  const f = new ck.Font(tf, size); f.setSubpixel(true);
  const p = mkPaint(col, alpha);
  const blob = ck.TextBlob.MakeFromText(str, f);
  c.drawTextBlob(blob, x, y, p);
  blob.delete(); p.delete(); f.delete();
}
function drawTextC(c, tf, size, str, cx, y, col, alpha) {
  const w = measure(tf, size, str);
  drawText(c, tf, size, str, cx - w/2, y, col, alpha);
}
function drawTextTracked(c, tf, size, str, cx, y, col, alpha, tracking) {
  const widths = [...str].map(ch => measure(tf, size, ch));
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (str.length - 1);
  let x = cx - total/2;
  for (let i = 0; i < str.length; i++) {
    drawText(c, tf, size, str[i], x, y, col, alpha);
    x += widths[i] + tracking;
  }
}

// ── Easing / math ─────────────────────────────────────────────────────────────
const easeOut   = t => 1 - (1-t)**3;
const easeIn    = t => t * t * t;
const easeInOut = t => t < 0.5 ? 4*t**3 : 1 - (-2*t+2)**3/2;
const springE   = t => t <= 0 ? 0 : t >= 1 ? 1
  : 2 ** (-10*t) * Math.sin((t*10 - 0.75) * (2*Math.PI) / 3) + 1;
const clamp     = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp      = (a, b, t) => a + (b-a)*clamp(t, 0, 1);
function progress(f, start, end) { return clamp((f-start)/(end-start), 0, 1); }
// in-then-out envelope (v8): eases in over iS→iE, back out over oS→oE
const ev = (f, iS, iE, eI, oS, oE, eO) => eI(progress(f, iS, iE)) * (1 - eO(progress(f, oS, oE)));

// ── Beat pulse (120 BPM = beat every 15 frames) ───────────────────────────────
function beatPulse(lf, phase = 14) {
  const p = (((lf - phase) % 15) + 15) % 15;
  return Math.max(0, 1 - p/5) ** 2;
}

// ── RNG ───────────────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5|0;
    let t = Math.imul(s^s>>>15, 1|s);
    t = t + Math.imul(t^t>>>7, 61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

// ── Ambient particles (subtle teal on white) ──────────────────────────────────
const NUM_PART = 48;
const rng = mulberry32(0xdeadbeef);
const particles = Array.from({length: NUM_PART}, () => ({
  x: rng() * W,
  y: rng() * H,
  vy: -(0.3 + rng() * 0.5),
  r: 1 + rng() * 2.5,
  a: 0.04 + rng() * 0.08,
  phase: rng() * 200,
}));
function drawParticles(c, gf) {
  for (const p of particles) {
    const y = ((p.y - (gf - p.phase) * p.vy * 0.5) % (H + 20) + H + 20) % (H + 20);
    drawCircle(c, p.x, y, p.r, TEAL, p.a);
  }
}

// ── Half-sun (teal, 5 rays) ───────────────────────────────────────────────────
function halfSun(c, x, y, r, alpha = 1, rayPulse = 0) {
  // Glow halo
  const glowP = new ck.Paint();
  const glowShader = ck.Shader.MakeRadialGradient(
    [x, y], r * 2.4,
    [ck.Color4f(TEAL[0], TEAL[1], TEAL[2], 0.22 * alpha),
     ck.Color4f(TEAL[0], TEAL[1], TEAL[2], 0)],
    null, ck.TileMode.Clamp
  );
  glowP.setShader(glowShader);
  c.save();
  c.clipRect(ck.XYWHRect(x - r*3, y - r*3, r*6, r*6), ck.ClipOp.Intersect, true);
  c.drawCircle(x, y, r * 2.4, glowP);
  c.restore();
  glowP.delete(); glowShader.delete();

  // Dome (clipped to upper half)
  c.save();
  c.clipRect(ck.XYWHRect(x - r*2.5, y - r*2.5, r*5, r*2.5), ck.ClipOp.Intersect, true);
  drawCircle(c, x, y, r, TEAL, 0.92 * alpha);
  c.restore();

  // Horizon line
  drawLine(c, x - r*1.5, y, x + r*1.5, y, TEAL, 0.65 * alpha, r * 0.045);

  // 5 rays
  for (const ang of [-Math.PI*0.82, -Math.PI*0.66, -Math.PI*0.5, -Math.PI*0.34, -Math.PI*0.18]) {
    const cx = Math.cos(ang), cy = Math.sin(ang);
    drawLine(c,
      x + cx*(r*1.15), y + cy*(r*1.15),
      x + cx*(r*1.52 + rayPulse*r*0.2), y + cy*(r*1.52 + rayPulse*r*0.2),
      TEAL, (0.78 + rayPulse*0.22) * alpha, r * 0.055
    );
  }
}

// ── Bank icons ────────────────────────────────────────────────────────────────
const iconsRaw = JSON.parse(readFileSync(path.join(__dirname, 'icons.json'), 'utf8'));
const bankNames = Object.keys(iconsRaw);
const bankIcons = bankNames.map(name => {
  const { path: svgPath, color } = iconsRaw[name];
  return { name, svgPath, color: hex(color) };
});

function drawBankLogo(c, icon, cx, cy, size, alpha) {
  c.save();
  c.translate(cx, cy);
  c.scale(size/24, size/24);
  c.translate(-12, -12);
  const p = ck.Path.MakeFromSVGString(icon.svgPath);
  if (p) {
    const paint = new ck.Paint();
    paint.setColor(ck.Color4f(icon.color[0], icon.color[1], icon.color[2], alpha));
    paint.setAntiAlias(true);
    c.drawPath(p, paint);
    paint.delete();
    p.delete();
  }
  c.restore();
}

// ── Scene timing ──────────────────────────────────────────────────────────────
// Total = new track length (43.6s). Beat-aligned transitions (30fps):
//   4s=120  12s=360  20.62s=619  29.11s=873  37.23s=1117  outro=1194  end=1308
// S0: question        0–120    (4s)   — black, words appear in order, fade out
// SI: introducing   120–360    (8s)   — "introducing... UntilFire", light blooms white
// S1: bar chart     330–619    (filmstrip in at 360 = 12s, out at 619 = 20.62s)
// S2: bank logos    589–873    (filmstrip in at 619 = 20.62s, out at 873 = 29.11s)
// S3: leaks         843–1117   (filmstrip in at 873 = 29.11s, out at 1117 = 37.23s)
// S4: end card     1087–1308   (filmstrip in at 1117 = 37.23s, outro at 1194 = 39.81s)
const TOTAL     = 1308;
const TRANS_LEN = 30;

const S0_START = 0,    S0_END = 120;
const SI_START = 120,  SI_END = 360;
const S1_START = 330,  S1_END = 619;
const S2_START = 589,  S2_END = 873;
const S3_START = 843,  S3_END = 1117;
const S4_START = 1087, S4_END = 1308;

const WHITEISH = [0.96, 0.97, 0.98, 1]; // text on dark

// ── Scene S0: Question on black — every word lands exactly on a beat ─────────
const Q_SIZE  = 96;
const Q_LINES = [['What', 'if', 'work'], ['was', 'optional?']];

function drawS0(c, lf) {
  drawRect(c, 0, 0, W, H, BG_DARK, 1);
  drawParticles(c, lf + S0_START);

  // Question fades out before the 4s cut
  const exitT = easeInOut(progress(lf, 96, 118));
  const keep  = 1 - exitT;
  if (keep <= 0) return;

  // Slow zoom drift keeps the hold alive
  c.save();
  const drift = 1 + lf * 0.00035;
  c.translate(W/2, H * 0.47); c.scale(drift, drift); c.translate(-W/2, -H * 0.47);

  const spaceW = measure(SYNE_XB, Q_SIZE, ' ');
  let wordIdx = 0;
  for (let li = 0; li < Q_LINES.length; li++) {
    const line = Q_LINES[li];
    const widths = line.map(w => measure(SYNE_XB, Q_SIZE, w));
    const lineW = widths.reduce((a, b) => a + b, 0) + spaceW * (line.length - 1);
    let x = W/2 - lineW/2;
    const baseY = H * 0.42 + li * 116;

    for (let wi = 0; wi < line.length; wi++) {
      // word k lands exactly on beat 14+15k — "optional?" hits the 2.5s beat
      const beat = 14 + wordIdx * 15;
      const wT = springE(progress(lf, beat - 14, beat));
      if (wT > 0) {
        const wy = baseY + (1 - wT) * 16;
        drawText(c, SYNE_XB, Q_SIZE, line[wi], x, wy, WHITEISH, clamp(wT * 1.4, 0, 1) * keep);
      }
      x += widths[wi] + spaceW;
      wordIdx++;
    }
  }

  // Teal underline on "optional?" after it lands — alpha rides the beat
  const ulT = easeOut(progress(lf, 76, 96));
  if (ulT > 0) {
    const pulse = beatPulse(lf, 14);
    const ow = measure(SYNE_XB, Q_SIZE, 'optional?');
    const lw = measure(SYNE_XB, Q_SIZE, 'was optional?');
    const lx = W/2 + lw/2 - ow, uy = H * 0.42 + 128;
    drawLine(c, lx, uy, lx + ow * ulT, uy, TEAL, (0.75 + 0.25 * pulse) * ulT * keep, 5);
  }
  c.restore();
}

// ── Scene SI: "introducing... UntilFire" + logo light-up to white ────────────
function drawSI(c, lf) {
  const SUN_X = W/2, SUN_Y = H/2 + 30;

  drawRect(c, 0, 0, W, H, BG_DARK, 1);
  if (lf < 200) drawParticles(c, lf + SI_START);

  // "introducing..." then "UntilFire" beneath — both leave before the logo
  const in1  = easeOut(progress(lf, 8, 30));
  const in2  = easeOut(progress(lf, 35, 58));
  const outT = easeIn(progress(lf, 80, 100));
  if (in1 > 0 && outT < 1) {
    const iy = H * 0.40 + (1 - in1) * 14;
    drawTextC(c, SYNE_B, 50, 'introducing...', W/2, iy, WHITEISH, in1 * (1 - outT) * 0.85);
  }
  if (in2 > 0 && outT < 1) {
    const uy = H * 0.40 + 110 + (1 - in2) * 14;
    drawTextC(c, SYNE_XB, 88, 'UntilFire', W/2, uy, WHITEISH, in2 * (1 - outT));
  }

  // Full-size logo animates in 100→145
  const riseT = easeOut(progress(lf, 100, 145));
  const sunR  = 260 * riseT;

  // Light fans out from the sun as an expanding wavefront: the white core
  // grows from 1px while the soft leading edge stays a fixed ~340px band —
  // reads as light sweeping outward, not a static vignette blob
  const lightT = easeInOut(progress(lf, 135, 190));
  if (lightT > 0) {
    const lr = lerp(1, 3200, lightT);
    const coreStop = clamp((lr - 340) / lr, 0, 1);
    const lightP = new ck.Paint();
    const lightSh = ck.Shader.MakeRadialGradient(
      [SUN_X, SUN_Y], lr,
      [ck.Color4f(1, 1, 1, 1), ck.Color4f(1, 1, 1, 1), ck.Color4f(1, 1, 1, 0)],
      [0, coreStop, 1], ck.TileMode.Clamp
    );
    lightP.setShader(lightSh);
    c.drawRect(ck.LTRBRect(0, 0, W, H), lightP);
    lightP.delete(); lightSh.delete();
  }

  // Sun drawn on top so it reads on both dark and white
  if (sunR > 0 && lf < 190) {
    const pulse = beatPulse(lf, 14);
    halfSun(c, SUN_X, SUN_Y, sunR, riseT, pulse * (1 + lightT));
  }

  // Lit: white bg, logo settles to center, wordmark rises in
  if (lf >= 190) {
    drawRect(c, 0, 0, W, H, BG, 1);

    // Sun shrinks from full-size to centred logo mark
    const settleT = easeOut(progress(lf, 190, 208));
    const logoR   = lerp(260, 90, settleT);
    const logoY   = lerp(H/2 + 30, H * 0.44, settleT);
    const pulse   = beatPulse(lf, 14) * 0.6;
    halfSun(c, SUN_X, logoY, logoR, 1, pulse);

    // "untilfire" wordmark fades up below the logo
    const wmT = easeOut(progress(lf, 204, 222));
    if (wmT > 0) {
      // Rise-up effect: starts 12px below final position
      const wmy = H * 0.44 + 90 + 36 + (1 - wmT) * 12;
      drawTextC(c, SYNE_XB, 68, 'untilfire', SUN_X, wmy, TEXT, wmT);
    }
  }
}

// ── Scene S1: Compounding chart — v8 port, exact animation ─────────────────────
// Compound model: totalV(x) = 0.42x + 0.82x^2.6 ; YMAX = 1.45 ; totalV(1)=1.24 → $1.24M
const totalV   = x => 0.42 * x + 0.82 * x ** 2.6;
const YMAX     = 1.45;
const NUM_BARS = 12;
// pop beats: on the grid then accelerating — audible speed-up
const POPS = [14, 29, 44, 59, 74, 89, 96, 103, 110, 117, 123, 129];
// messy "unplanned money" heights before the shuffle (v8 seed)
const messyRng = mulberry32(3);
const messyH   = Array.from({length: NUM_BARS}, () => 0.22 + messyRng() * 0.46);
const SLATE    = hex('#94a3b8');
const CONTRIB  = hex('#0e6e57');   // contributions segment (darker teal, v8)
const MORPH_S = 140, MORPH_STAG = 4, MORPH_DUR = 26;   // shuffle 140→~210
const NUM_IN  = 205, NUM_OUT = 242;                     // $1.24M dwell, chart dimmed
const CHIP_IN = 246;                                    // chip pans out with scene

function drawS1(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S1_START);

  const chX = 160, chY = H * 0.30, chW = W - 320, chH = H * 0.44;
  const gapR = 0.34;
  const bw = chW / (NUM_BARS + (NUM_BARS - 1) * gapR);
  const gap = bw * gapR;
  const baseY = chY + chH;

  const numW  = ev(lf, NUM_IN, NUM_IN + 10, easeOut, NUM_OUT, NUM_OUT + 8, easeIn);
  const chipW = easeOut(progress(lf, CHIP_IN, CHIP_IN + 10));
  const dimT  = numW;   // dim chart only for the big number

  // small kicker above chart (v8)
  const kickT = easeOut(progress(lf, 8, 22));
  if (kickT > 0.01) {
    drawTextTracked(c, DMM_M, 26, 'YOUR MONEY, PLANNED', W/2, chY - 120, DIM, kickT * 0.9, 6);
    drawTextC(c, SYNE_B, 52, 'Watch it compound', W/2, chY - 56, TEXT, kickT);
  }

  const lp = new ck.Paint();
  lp.setAlphaf(1 - 0.7 * dimT);
  c.saveLayer(lp);

  // grid
  const gridT = progress(lf, 14, 34);
  for (let g = 1; g <= 4; g++)
    drawLine(c, chX, baseY - g/4 * chH, chX + chW, baseY - g/4 * chH, DIM, 0.18 * gridT, 1);
  drawLine(c, chX, baseY, chX + chW, baseY, DIM, 0.45 * gridT, 1.5);

  for (let i = 0; i < NUM_BARS; i++) {
    const popT = springE(progress(lf, POPS[i], POPS[i] + 20));
    if (popT < 0.01) continue;

    const wt = progress(lf, MORPH_S + i * MORPH_STAG, MORPH_S + i * MORPH_STAG + MORPH_DUR);
    const wte = easeInOut(wt);
    const isStub = i >= 9;

    // target after shuffle: growth curve for 0–8, trimmed stubs for 9–11
    const xFrac = (i + 1) / 9;
    const curveH = isStub ? [0.06, 0.045, 0.03][i - 9] : totalV(xFrac) / YMAX;
    const hFrac = messyH[i] + (curveH - messyH[i]) * wte;

    // pronounced shuffle sway (v8 — the animation the user liked)
    const sway = (wt > 0 && wt < 1) ? Math.sin(wt * Math.PI * 4) * 13 * (1 - wt) : 0;

    // beat breathing once settled
    let hPix = hFrac * chH;
    if (popT >= 1 && (wt <= 0 || wt >= 1) && !isStub)
      hPix *= 1 + 0.022 * beatPulse(lf) * (0.6 + 0.4 * Math.sin(i * 1.3));

    const h2 = hPix * popT;
    const bx = chX + i * (bw + gap) + sway;
    const topY = baseY - h2;

    // v8 turned the trimmed stubs red; palette rule = no red → neutral slate
    const grownColor = isStub && wt > 0.5 ? SLATE : TEAL;
    drawRect(c, bx, topY, bw, h2, grownColor, popT * 0.92, 5);

    // contributions split appears as the curve forms (linear part of model)
    if (!isStub && wte > 0.05 && h2 > 12) {
      const contribFrac = (0.42 * xFrac) / totalV(xFrac);
      const cH = h2 * contribFrac * wte;
      // chip phase: pulse the contributions segments so the label reads instantly
      const hl = chipW > 0.01 ? 0.92 + 0.08 * Math.sin((lf + S1_START) * 0.25) : 0.92;
      drawRect(c, bx, baseY - cH, bw, cH, CONTRIB, popT * hl);
    }
  }

  c.restore();
  lp.delete();

  // — $1.24M reveal (chart dimmed under it) —
  if (numW > 0.01) {
    const sh = 1 + 0.05 * beatPulse(lf, 14) * numW;
    c.save();
    c.translate(W/2, H * 0.52); c.scale(sh, sh); c.translate(-W/2, -H * 0.52);
    drawTextC(c, DMM_M, 132, '$1.24M', W/2, H * 0.52, TEAL, numW);
    drawTextC(c, DMS_R, 38, 'projected by your freedom date', W/2, H * 0.52 + 70, TEXT, numW * 0.75);
    c.restore();
  }

  // — contributions legend chip (chart visible, segments pulsing) —
  if (chipW > 0.01) {
    const cpy = baseY + 76;
    const swW = 26;
    const label = 'your contributions — the rest is growth';
    const labelW = measure(DMS_M, 32, label);
    const total = swW + 16 + labelW;
    drawRect(c, W/2 - total/2, cpy - 22, swW, swW, CONTRIB, chipW, 4);
    drawText(c, DMS_M, 32, label, W/2 - total/2 + swW + 16, cpy + 2, BODY, chipW);
  }
}

// ── Scene S2: Bank logos — two-row scrolling marquee ──────────────────────────
function drawS2(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S2_START);

  const headT = easeOut(progress(lf, 0, 40));
  drawTextC(c, SYNE_B, 58, 'Works with your bank.', W/2, H*0.12, TEXT, headT);
  drawTextC(c, DMS_R, 32, 'Connect once, track automatically.', W/2, H*0.12 + 68, BODY, headT * 0.8);

  const CARD_W = 290, CARD_H = 164, GAP = 24;
  const STRIDE = CARD_W + GAP;
  const LOGO_SIZE = 88;
  const SPEED = 2.2;
  const enterT = easeOut(progress(lf, 12, 65));
  const pulse  = beatPulse(lf, 14);

  const rowDefs = [
    { icons: bankIcons.slice(0, 8),  y: H*0.35, dir: -1 },
    { icons: bankIcons.slice(8, 15), y: H*0.35 + CARD_H + 30, dir:  1 },
  ];

  for (const row of rowDefs) {
    const n = row.icons.length;
    const loopW = n * STRIDE;
    const scroll = ((lf * SPEED * row.dir) % loopW + loopW) % loopW;

    for (let k = -1; k < Math.ceil(W / loopW) + 2; k++) {
      for (let i = 0; i < n; i++) {
        const baseX = i * STRIDE + k * loopW - scroll;
        const cx = baseX + CARD_W/2;
        if (cx < -CARD_W || cx > W + CARD_W) continue;
        const cy = row.y + CARD_H/2;

        c.save();
        c.translate(cx, cy);
        const s = enterT * (1 + pulse * 0.018);
        c.scale(s, s);

        drawRect(c, -CARD_W/2, -CARD_H/2, CARD_W, CARD_H, CARD, enterT, 16);
        const borderP = mkStroke(BORD, enterT, 1.5);
        c.drawRRect(ck.RRectXY(ck.LTRBRect(-CARD_W/2, -CARD_H/2, CARD_W/2, CARD_H/2), 16, 16), borderP);
        borderP.delete();

        drawBankLogo(c, row.icons[i], 0, -12, LOGO_SIZE, enterT);

        const nm = row.icons[i].name;
        const nw = measure(DMS_M, 20, nm);
        drawText(c, DMS_M, 20, nm, -nw/2, CARD_H/2 - 18, BODY, enterT * 0.65);
        c.restore();
      }
    }
  }

  // Edge fade
  const fadeW = 200;
  for (const [x0, x1] of [[0, fadeW], [W, W - fadeW]]) {
    const p = new ck.Paint();
    const sh = ck.Shader.MakeLinearGradient(
      [x0, 0], [x1, 0],
      [ck.Color4f(1, 1, 1, 1), ck.Color4f(1, 1, 1, 0)],
      null, ck.TileMode.Clamp
    );
    p.setShader(sh);
    c.drawRect(ck.LTRBRect(Math.min(x0,x1), H*0.3, Math.max(x0,x1), H*0.8), p);
    p.delete(); sh.delete();
  }

  const tagT = easeOut(progress(lf, 95, 135));
  if (tagT > 0) drawTextC(c, DMS_M, 30, '15+ banks. 0 manual entries.', W/2, H*0.88, TEAL, tagT);
}

// ── Scene S3: Leaks card — find then swipe away ────────────────────────────────
const leakItems = [
  { label: 'Streaming services', amount: 47,  pct: 0.72 },
  { label: 'Unused gym',         amount: 29,  pct: 0.44 },
  { label: 'Food delivery',      amount: 89,  pct: 0.58 },
  { label: 'Subscriptions',      amount: 63,  pct: 0.85 },
  { label: 'Impulse spending',   amount: 124, pct: 0.66 },
];

function drawS3(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S3_START);

  const headT = easeOut(progress(lf, 0, 38));
  drawTextC(c, SYNE_B, 58, "You're leaking money.", W/2, H*0.1, TEXT, headT);
  drawTextC(c, DMS_R, 32, 'UntilFire finds the drains — and helps you cut them.', W/2, H*0.1 + 68, BODY, headT * 0.8);

  const CARD_W2 = 820, CARD_H2 = 492;
  const CX = W/2 - CARD_W2/2, CY = H*0.26;
  const cardT = easeOut(progress(lf, 5, 40));
  if (cardT > 0) {
    drawRect(c, CX, CY, CARD_W2, CARD_H2, CARD, cardT, 20);
    const bp = mkStroke(BORD, cardT, 1.5);
    c.drawRRect(ck.RRectXY(ck.LTRBRect(CX, CY, CX+CARD_W2, CY+CARD_H2), 20, 20), bp);
    bp.delete();
  }

  const removeStart = i => 147 + i * 16;
  const REMOVE_LEN  = 22;

  let recovered = 0;
  for (let i = 0; i < leakItems.length; i++) {
    recovered += leakItems[i].amount * easeOut(progress(lf, removeStart(i), removeStart(i) + REMOVE_LEN));
  }

  // Card header
  const ctT = easeOut(progress(lf, 15, 50));
  if (ctT > 0) {
    const pulse = beatPulse(lf, 14);
    drawText(c, DMS_B, 26, 'Spending Leaks', CX + 28, CY + 46, TEXT, ctT);
    const totalStr = `+$${Math.round(recovered)}/mo recovered`;
    const tw = measure(DMM_M, 26, totalStr);
    drawText(c, DMM_M, 26, totalStr, CX + CARD_W2 - tw - 28, CY + 46, TEAL,
      ctT * (recovered > 0.5 ? 0.85 + 0.15 * pulse : 0.4));
    drawLine(c, CX + 20, CY + 58, CX + CARD_W2 - 20, CY + 58, BORD, ctT, 1.5);
  }

  // Rows
  for (let i = 0; i < leakItems.length; i++) {
    const item  = leakItems[i];
    const rowT  = easeOut(progress(lf, 20 + i * 12, 50 + i * 12));
    if (rowT <= 0) continue;

    const remT  = easeInOut(progress(lf, removeStart(i), removeStart(i) + REMOVE_LEN));
    const ry    = CY + 80 + i * 74;
    const slideX = remT * 80;
    const rowAlpha = rowT * (1 - remT * 0.65);

    c.save();
    c.clipRect(ck.XYWHRect(CX, ry - 8, CARD_W2, 66), ck.ClipOp.Intersect, true);
    c.translate(slideX, 0);

    drawText(c, DMS_M, 24, item.label, CX + 28, ry + 20, TEXT, rowAlpha * 0.9);
    const amStr = `$${item.amount}`;
    const amw = measure(DMM_M, 24, amStr);
    drawText(c, DMM_M, 24, amStr, CX + CARD_W2 - amw - 110, ry + 20, TEXT, rowAlpha * 0.85 * (1 - remT));

    const BAR_L = CX + 28, BAR_R = CX + CARD_W2 - 110;
    const BAR_W = BAR_R - BAR_L;
    drawRect(c, BAR_L, ry + 32, BAR_W, 8, BORD, rowAlpha, 4);
    const fillW = BAR_W * item.pct * rowT * (1 - remT);
    if (fillW > 0) drawRect(c, BAR_L, ry + 32, fillW, 8, hex('#94a3b8'), rowAlpha, 4);
    c.restore();

    // Strikethrough
    if (remT > 0 && remT < 1) {
      const lw = measure(DMS_M, 24, item.label);
      drawLine(c, CX + 28 + slideX, ry + 12,
        CX + 28 + slideX + lw * clamp(remT * 1.6, 0, 1), ry + 12, TEAL, 0.85, 2.5);
    }

    // Teal check
    const checkT = easeOut(progress(lf, removeStart(i) + 12, removeStart(i) + REMOVE_LEN + 6));
    if (checkT > 0) {
      const ccx = CX + CARD_W2 - 56, ccy = ry + 12;
      const pop = checkT < 0.7 ? lerp(0, 1.15, checkT/0.7) : lerp(1.15, 1, (checkT-0.7)/0.3);
      drawCircle(c, ccx, ccy, 15 * pop, TEAL, 0.15 * checkT);
      const chk = mkStroke(TEAL, checkT, 3.2);
      c.drawLine(ccx - 6*pop, ccy + 0.5, ccx - 1.5*pop, ccy + 5.5*pop, chk);
      c.drawLine(ccx - 1.5*pop, ccy + 5.5*pop, ccx + 7*pop, ccy - 5*pop, chk);
      chk.delete();
    }
  }

}

// ── Scene S4: End card ────────────────────────────────────────────────────────
function drawS4(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S4_START);

  const enterT = easeOut(progress(lf, 0, 45));
  const pulse  = beatPulse(lf, 14);

  // Teal sunrise — smaller so the headline never crowds it
  if (enterT > 0) halfSun(c, W/2, H*0.56, 135 * enterT, enterT, pulse * 0.5);

  // Horizon line expanding from sun
  const lineT = easeOut(progress(lf, 30, 65));
  if (lineT > 0) {
    drawLine(c, W/2 - 170*lineT, H*0.56, W/2 + 170*lineT, H*0.56, TEAL, 0.3*lineT, 2);
  }

  // Wordmark + URL settle in early, beneath the sun
  const wmT  = easeOut(progress(lf, 40, 70));
  const urlT = easeOut(progress(lf, 52, 82));
  if (wmT > 0)  drawTextC(c, SYNE_XB, 52, 'untilfire', W/2, H*0.78, TEXT, wmT);
  if (urlT > 0) drawTextC(c, DMS_M, 30, 'www.untilfire.com', W/2, H*0.78 + 52, TEAL, urlT * 0.85);

  // Power copy — line 1 slams on the 39.81s beat (lf=107),
  // final line lands at exactly 41s (lf=143)
  const slamLine = (str, t0, y, col) => {
    const t = springE(progress(lf, t0 - 15, t0));
    if (t <= 0) return;
    c.save();
    c.translate(W/2, y - 26);
    const s = lerp(1.3, 1, t);
    c.scale(s, s);
    c.translate(-W/2, -(y - 26));
    drawTextC(c, SYNE_XB, 78, str, W/2, y, col, clamp(t * 1.6, 0, 1));
    c.restore();
  };
  slamLine("Don't let money stop you", 107, H*0.14, TEXT);
  slamLine('from being a good person.', 143, H*0.14 + 96, TEAL);

  const tagT = easeOut(progress(lf, 160, 190));
  if (tagT > 0) drawTextC(c, DMS_R, 26, 'Personal finance that sets you free.', W/2, H*0.91, BODY, tagT * 0.6);
}

// ── Filmstrip transition ───────────────────────────────────────────────────────
function renderWithTransition(c, f, sceneA, aStart, sceneB, bStart, transStart, transLen) {
  const t  = clamp((f - transStart) / transLen, 0, 1);
  const et = easeInOut(t);
  const cut = et * W;

  if (cut < W) {
    c.save();
    c.clipRect(ck.XYWHRect(0, 0, W - cut, H), ck.ClipOp.Intersect, true);
    c.translate(-cut, 0);
    sceneA(c, f - aStart);
    c.restore();
  }
  if (cut > 0) {
    c.save();
    c.clipRect(ck.XYWHRect(W - cut, 0, cut, H), ck.ClipOp.Intersect, true);
    c.translate(W - cut, 0);
    sceneB(c, f - bStart);
    c.restore();
  }
}

// ── Main render loop ──────────────────────────────────────────────────────────
const surface = ck.MakeSurface(W, H);
const canvas  = surface.getCanvas();
const totalFrames = spotOnly ? 1 : TOTAL;

for (let fi = 0; fi < totalFrames; fi++) {
  const f = spotOnly ? spotFrame : fi;
  canvas.clear(ck.Color4f(1, 1, 1, 1));

  // S0 ends fully dark; SI starts dark — hard cut is seamless
  if (f < S0_END) {
    drawS0(canvas, f);
  } else if (f < SI_END - TRANS_LEN) {
    drawSI(canvas, f - SI_START);
  } else if (f < SI_END) {
    renderWithTransition(canvas, f, drawSI, SI_START, drawS1, S1_START, SI_END - TRANS_LEN, TRANS_LEN);
  } else if (f < S1_END - TRANS_LEN) {
    drawS1(canvas, f - S1_START);
  } else if (f < S1_END) {
    renderWithTransition(canvas, f, drawS1, S1_START, drawS2, S2_START, S1_END - TRANS_LEN, TRANS_LEN);
  } else if (f < S2_END - TRANS_LEN) {
    drawS2(canvas, f - S2_START);
  } else if (f < S2_END) {
    renderWithTransition(canvas, f, drawS2, S2_START, drawS3, S3_START, S2_END - TRANS_LEN, TRANS_LEN);
  } else if (f < S3_END - TRANS_LEN) {
    drawS3(canvas, f - S3_START);
  } else if (f < S3_END) {
    renderWithTransition(canvas, f, drawS3, S3_START, drawS4, S4_START, S3_END - TRANS_LEN, TRANS_LEN);
  } else {
    drawS4(canvas, f - S4_START);
  }

  const img = surface.makeImageSnapshot();
  const bytes = img.encodeToBytes(ck.ImageFormat.PNG, 95);
  img.delete();

  const frameNum = spotOnly ? spotFrame : fi;
  const outPath = path.join(FRAMES_DIR, `f${String(frameNum).padStart(5,'0')}.png`);
  writeFileSync(outPath, bytes);

  if (!spotOnly && fi % 30 === 0) {
    process.stdout.write(`\r  Frame ${fi}/${TOTAL} (${Math.round(fi/TOTAL*100)}%)`);
  }
}

if (!spotOnly) {
  console.log(`\n  Frames done. Encoding MP4...`);
  const ffmpeg = require('ffmpeg-static');
  const out = path.join(__dirname, 'output.mp4');
  execSync(
    `${ffmpeg} -y -framerate ${FR} -i "${path.join(FRAMES_DIR,'f%05d.png')}" ` +
    `-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart "${out}"`,
    { stdio: 'inherit' }
  );
  console.log(`\n  Done → ${out}`);
} else {
  console.log(`  Spot frame ${spotFrame} → frames/f${String(spotFrame).padStart(5,'0')}.png`);
}
surface.delete();
