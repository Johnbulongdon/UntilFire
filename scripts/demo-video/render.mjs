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
// Pass the GLOBAL frame. Folding the bass energy over the beat cycle puts the
// kick TROUGH at phase 3.9, the ATTACK (steepest rise) at phase 4.7, and the
// body peak at 7.9 — so the felt downbeat is phase ~5 (global frames 5 + 15k).
// The pulse peaks on the attack and decays through the kick body.
// (Spring "pop" events overshoot ~3 frames after their anchor, so they anchor
//  ~3 frames BEFORE the beat — phase 2 — to land the visual jump on the kick.)
function beatPulse(gf, phase = 5) {
  const p = (((gf - phase) % 15) + 15) % 15;
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

  // Question fades out right before the 4s cut (last word lands at lf=81)
  const exitT = easeInOut(progress(lf, 100, 120));
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
      // word k lands exactly on a kick (global beat 6+15k); S0_START=0 so
      // local == global. Words land on 21,36,51,66,81.
      const beat = 21 + wordIdx * 15;
      const wT = springE(progress(lf, beat - 14, beat));
      if (wT > 0) {
        const wy = baseY + (1 - wT) * 16;
        drawText(c, SYNE_XB, Q_SIZE, line[wi], x, wy, WHITEISH, clamp(wT * 1.4, 0, 1) * keep);
      }
      x += widths[wi] + spaceW;
      wordIdx++;
    }
  }

  // Teal underline on "optional?" after it lands (lands at lf=81) — alpha rides the beat
  const ulT = easeOut(progress(lf, 84, 100));
  if (ulT > 0) {
    const pulse = beatPulse(lf + S0_START);
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
  if (lf < 100) drawParticles(c, lf + SI_START);

  // "introducing..." fades in then out quickly before the logo slams
  const in1  = easeOut(progress(lf, 8, 25));
  const outT = easeIn(progress(lf, 50, 62));  // gone by lf=62, just before the slam
  if (in1 > 0 && outT < 1) {
    const iy = H * 0.47 + (1 - in1) * 14;
    drawTextC(c, SYNE_B, 56, 'introducing...', W/2, iy, WHITEISH, in1 * (1 - outT) * 0.9);
  }

  // Logo JUMP lands on the kick: the spring is anchored at lf=63 so its
  // overshoot snaps at lf≈65 (global 185, phase 5), and the bloom fires from
  // that same kick — so the jump reads exactly on the beat.
  const riseT = springE(progress(lf, 63, 78));
  const sunR  = 260 * clamp(riseT, 0, 1.08);     // allow slight overshoot

  // Light fans out from the sun on the slam kick (lf=65→105)
  const lightT = easeInOut(progress(lf, 65, 105));
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

  // Sun drawn on top of light; ray pulses hit the kick (phase-5 global grid)
  if (sunR > 0 && lf < 105) {
    const pulse = beatPulse(lf + SI_START);
    halfSun(c, SUN_X, SUN_Y, sunR, clamp(riseT, 0, 1), pulse * (1 + lightT * 0.5));
  }

  // Lit: white bg, logo settles to centre, wordmark rises in
  if (lf >= 105) {
    drawRect(c, 0, 0, W, H, BG, 1);

    const settleT = easeOut(progress(lf, 105, 123));
    const logoR   = lerp(260, 90, settleT);
    const logoY   = lerp(H/2 + 30, H * 0.44, settleT);
    const pulse   = beatPulse(lf + SI_START) * 0.6;
    halfSun(c, SUN_X, logoY, logoR, 1, pulse);

    const wmT = easeOut(progress(lf, 120, 138));
    if (wmT > 0) {
      const wmy = H * 0.44 + 90 + 36 + (1 - wmT) * 12;
      drawTextC(c, SYNE_XB, 68, 'untilfire', SUN_X, wmy, TEXT, wmT);
    }
  }
}

// ── Scene S1: v8 compound chart — glowing stacked bars on dark ────────────────
// Rebuilt to the v8 reference frames: dark bg, "you invest" (dark teal) under
// "your money multiplies" (bright green, glow at the bar tops), Yr labels,
// $1.24M over the last bar, then "August 2034 / YOUR NEW FREEDOM DATE" —
// the 3 tallest bars slide LEFT 3 year-slots (same height, earlier timeline)
// leaving ghost outlines at Yr 10–12 under the "3 years sooner" bracket.
const NUM_BARS = 12;
// Bars pop with a spring that overshoots ~3 frames after the anchor, so the
// anchors sit ~3 frames before the kick (local ≡2 mod15; S1_START=330≡0) — the
// bar's visual JUMP then lands on the kick (global 335,350,365…, phase 5).
// First 5 on the beat, then the pops accelerate audibly into the curve.
const POPS = [2, 17, 32, 47, 62, 74, 83, 91, 98, 104, 109, 114];
const GRN    = hex('#16a34a');   // rich growth green — readable on white bg
const INV    = hex('#065f46');   // deep teal base — anchors bar on white bg
const DIMBAR = hex('#cbd5e1');   // ghost outline — clearly faded on white bg
// Original 12-year compound curve
const totalFrac     = i => 0.055 + 0.50 * Math.pow(i / 11, 1.75);
const invFrac       = i => 0.05  + 0.13 * (i / 11);
// "3 years sooner" fast-track curve — same endpoint at i=8 as original at i=11
const totalFracFast = i => 0.055 + 0.50 * Math.pow(i / 8, 1.75);
const invFracFast   = i => 0.05  + 0.13 * (i / 8);
const SLATE = hex('#94a3b8');
const FD_DIM  = 140;   // compound-yield morph starts here (on a kick, phase 5)
const HEAD_IN = 155;   // "August 2034" settles on a kick (global 485, phase 5)

function drawS1(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);   // white — matches every post-intro scene
  drawParticles(c, lf + S1_START);

  // header (matches the other white scenes) — leaves before "August 2034" lands
  const hdT = easeOut(progress(lf, 8, 40)) * (1 - easeIn(progress(lf, 122, 140)));
  if (hdT > 0.01) {
    drawTextC(c, SYNE_B, 56, 'Watch it compound.', W/2, H*0.13, TEXT, hdT);
    drawTextC(c, DMS_R, 30, 'Your money working while you sleep.', W/2, H*0.13 + 60, BODY, hdT * 0.7);
  }

  const chX = W * 0.15, chW = W * 0.70;
  const baseY = H * 0.80, CH = H * 0.60;
  const gapR = 0.42;
  const bw = chW / (NUM_BARS + (NUM_BARS - 1) * gapR);
  const gap = bw * gapR;

  // After the freedom-date reveal bars morph IN PLACE: the compound yield
  // changes (steeper path) so bars 0–8 grow taller while bars 9–11 fade to
  // ghost outlines. Same $1.24M endpoint, 3 years earlier — not lower standards.
  // morph eased out over ~48 frames (slower) so the freedom-date payoff breathes
  const shiftT = easeInOut(progress(lf, FD_DIM, FD_DIM + 48));
  const pulse  = beatPulse(lf + S1_START);
  const slotX  = i => chX + i * (bw + gap);

  // grid (faint dark lines on white)
  const gridT = progress(lf, 10, 30);
  for (let g = 1; g <= 3; g++)
    drawLine(c, chX - 30, baseY - g/3 * (CH * 0.97), chX + chW + 30, baseY - g/3 * (CH * 0.97), BORD, 0.9 * gridT, 1);

  // Yr labels fixed on the timeline axis
  const axisT = progress(lf, 14, 40);
  for (const i of [0, 2, 5, 8, 11]) {
    const lbl = `Yr ${i + 1}`;
    drawText(c, DMS_R, 22, lbl, slotX(i) + bw/2 - measure(DMS_R, 22, lbl)/2, baseY + 96, SLATE, 0.55 * axisT);
  }

  // Draw bars 9–11 ghost outlines first (drawn behind the active bars)
  if (shiftT > 0.01) {
    for (let i = 9; i < NUM_BARS; i++) {
      const tH = totalFrac(i) * CH;
      const bx = slotX(i);
      const gp = mkStroke(DIMBAR, 0.55 * shiftT, 2);
      c.drawRRect(ck.RRectXY(ck.LTRBRect(bx, baseY - tH, bx + bw, baseY), 8, 8), gp);
      gp.delete();
    }
  }

  for (let i = 0; i < NUM_BARS; i++) {
    const popT = springE(progress(lf, POPS[i], POPS[i] + 20));
    if (popT < 0.01) continue;

    const isGhost = i >= 9;   // Yr 10–12 fade out as the fast curve takes over
    const alpha   = isGhost ? 1 - shiftT : 1;
    if (alpha < 0.005) continue;

    const breathe = 1 + 0.018 * pulse * (0.6 + 0.4 * Math.sin(i * 1.3));
    // morph bar heights: bars 0–8 grow to the fast-track curve
    const tf   = isGhost ? totalFrac(i) : lerp(totalFrac(i), totalFracFast(i), shiftT);
    const ivf  = isGhost ? invFrac(i)   : lerp(invFrac(i),   invFracFast(i),   shiftT);
    const tH   = tf * CH * popT * breathe;
    const invH = Math.min(ivf * CH * popT, tH);
    const bx   = slotX(i);
    const cxB  = bx + bw / 2;
    const topY = baseY - tH;

    // soft drop shadow grounds the bar on white (depth instead of dark-bg glow)
    drawRect(c, bx + 3, topY + 6, bw, tH, SLATE, 0.10 * popT * alpha, 8);

    const reflH = CH * 0.055 * popT;
    drawRect(c, bx, baseY - invH, bw, invH + reflH, INV, 0.92 * popT * alpha, 8);

    const gH = tH - invH * 0.55;
    if (gH > 4) {
      drawRect(c, bx, topY, bw, gH, GRN, 0.97 * popT * alpha, 8);
      // gentle green halo at the tip rides the beat (subtle on white)
      const glowP = new ck.Paint();
      const glowR = bw * 0.7 * (1 + pulse * 0.18);
      const glowSh = ck.Shader.MakeRadialGradient(
        [cxB, topY], glowR,
        [ck.Color4f(GRN[0], GRN[1], GRN[2], 0.28 * popT * alpha), ck.Color4f(GRN[0], GRN[1], GRN[2], 0)],
        null, ck.TileMode.Clamp
      );
      glowP.setShader(glowSh);
      c.drawCircle(cxB, topY, glowR, glowP);
      glowP.delete(); glowSh.delete();
    }
  }

  // axis line (dark on white)
  drawLine(c, chX - 30, baseY, chX + chW + 30, baseY, SLATE, 0.55 * gridT, 2);

  // $1.24M label: starts above Yr 12, slides to Yr 9 as the fast curve grows up
  const numT = easeOut(progress(lf, 123, 141));
  if (numT > 0.01) {
    // totalFracFast(8) == totalFrac(11) == 0.555, so Y stays constant
    const cx11  = slotX(11) + bw / 2;
    const cx8   = slotX(8)  + bw / 2;
    const numCX = lerp(cx11, cx8, shiftT);
    const numY  = baseY - totalFrac(11) * CH;
    drawTextC(c, DMM_M, 34, '$1.24M', numCX, numY - 28 - (1 - numT) * 10, TEAL, numT);
  }

  // "August 2034 / YOUR NEW FREEDOM DATE" slams on the 16.43s beat
  const headT = springE(progress(lf, HEAD_IN - 15, HEAD_IN));
  if (headT > 0.01) {
    c.save();
    c.translate(W/2, H * 0.115);
    const s = lerp(1.25, 1, headT);
    c.scale(s, s);
    c.translate(-W/2, -H * 0.115);
    drawTextC(c, SYNE_XB, 92, 'August 2034', W/2, H * 0.115, TEXT, clamp(headT * 1.5, 0, 1));
    c.restore();
    const kickT = easeOut(progress(lf, HEAD_IN + 2, HEAD_IN + 18));
    if (kickT > 0.01)
      drawTextTracked(c, DMS_B, 24, 'YOUR NEW FREEDOM DATE', W/2, H * 0.115 + 62, TEAL, kickT, 4);
  }

  // "3 years sooner" pill + bracket over the ghost years (fixed positions 9–11)
  const brT = easeOut(progress(lf, FD_DIM + 32, FD_DIM + 54));
  if (brT > 0.01) {
    const xL = slotX(9);
    const xR = slotX(11) + bw;
    const cxP = (xL + xR) / 2;
    const yBr = baseY - totalFrac(11) * CH - 80;
    // bracket
    drawLine(c, lerp(cxP, xL, brT), yBr, lerp(cxP, xR, brT), yBr, TEAL, 0.8 * brT, 3);
    drawLine(c, xL, yBr - 8, xL, yBr + 8, TEAL, 0.8 * brT, 3);
    drawLine(c, xR, yBr - 8, xR, yBr + 8, TEAL, 0.8 * brT, 3);
    // pill
    const pw = measure(DMS_B, 26, '3 years sooner') + 48;
    const py = yBr - 46;
    const pillP = mkStroke(TEAL, 0.85 * brT, 2);
    c.drawRRect(ck.RRectXY(ck.LTRBRect(cxP - pw/2, py - 22, cxP + pw/2, py + 18), 20, 20), pillP);
    pillP.delete();
    drawRect(c, cxP - pw/2, py - 22, pw, 40, TEAL, 0.10 * brT, 20);
    drawTextC(c, DMS_B, 26, '3 years sooner', cxP, py + 8, TEAL, brT);
  }
}

// ── Scene S2: Bank logos — two-row scrolling marquee ──────────────────────────
function drawS2(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S2_START);

  const headT = easeOut(progress(lf, 0, 40));
  drawTextC(c, SYNE_B, 58, 'Works with your bank.', W/2, H*0.12, TEXT, headT);
  drawTextC(c, DMS_R, 32, 'Connect once, track automatically.', W/2, H*0.12 + 68, BODY, headT * 0.8);

  const CARD_W = 252, CARD_H = 132, GAP = 20;
  const STRIDE = CARD_W + GAP;
  const LOGO_SIZE = 64;
  const enterT = easeOut(progress(lf, 12, 65));
  const pulse  = beatPulse(lf + S2_START);

  // four rows fill the page — disjoint 9-icon sets per row, and each row's
  // loop (9 × stride = 2448px) is wider than the visible window (2424px),
  // so no logo can ever appear twice on screen at the same moment
  const ROW_STEP = CARD_H + 22;
  const rowDefs = [
    { icons: bankIcons.slice(0, 9),   y: H*0.245,                dir: -1, speed: 2.4 },
    { icons: bankIcons.slice(9, 18),  y: H*0.245 + ROW_STEP,     dir:  1, speed: 1.8 },
    { icons: bankIcons.slice(18, 27), y: H*0.245 + ROW_STEP * 2, dir: -1, speed: 2.0 },
    { icons: bankIcons.slice(27, 36), y: H*0.245 + ROW_STEP * 3, dir: 1, speed: 2.2 },
  ];

  for (const row of rowDefs) {
    const n = row.icons.length;
    const loopW = n * STRIDE;
    const scroll = ((lf * row.speed * row.dir) % loopW + loopW) % loopW;

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

        drawBankLogo(c, row.icons[i], 0, -10, LOGO_SIZE, enterT);

        const nm = row.icons[i].name;
        const nw = measure(DMS_M, 18, nm);
        drawText(c, DMS_M, 18, nm, -nw/2, CARD_H/2 - 14, BODY, enterT * 0.65);
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
    c.drawRect(ck.LTRBRect(Math.min(x0,x1), H*0.22, Math.max(x0,x1), H*0.86), p);
    p.delete(); sh.delete();
  }

  const tagT = easeOut(progress(lf, 95, 135));
  if (tagT > 0) drawTextC(c, DMS_M, 30, '15,000+ banks. 0 manual entries.', W/2, H*0.93, TEAL, tagT);
}

// ── Scene S3: Leaks — phone notification swipe ───────────────────────────────
// Each charge looks like a phone notification; on the beat it swipes right
// and dissolves (teal particle burst) while the stack below shifts up.
const leakItems = [
  { label: 'Streaming services', sub: 'Netflix, Spotify, Hulu',    amount: 47  },
  { label: 'Unused gym',         sub: 'No check-ins in 3 months',  amount: 29  },
  { label: 'Food delivery',      sub: 'Recurring orders',           amount: 89  },
  { label: 'Subscriptions',      sub: 'Apps & services',            amount: 63  },
  { label: 'Impulse buys',       sub: 'Flagged transactions',       amount: 124 },
  { label: 'Bank fees',          sub: 'Monthly maintenance fee',    amount: 18  },
  { label: 'Unused apps',        sub: '14 apps, no activity',       amount: 22  },
  { label: 'Daily takeout',      sub: 'Avg 3× per week',            amount: 96  },
  { label: 'Old insurance',      sub: 'Duplicate coverage',         amount: 54  },
  { label: 'Late fees',          sub: 'Preventable charges',        amount: 31  },
];
const NOTIF_IC = ['#6366f1','#8b5cf6','#475569','#0891b2','#64748b',
                  '#94a3b8','#22d3a5','#1e40af','#334155','#7c3aed'].map(hex);
// Swipes flick on kicks then accelerate. S3_START=843≡3 (mod 15), so a local
// frame sits on the phase-5 global grid when it is ≡2 (mod 15): 62,77,92,107,122.
const CROSS = [62, 77, 92, 107, 122, 134, 144, 152, 159, 165];

function drawS3(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S3_START);

  const CARD_W = 880, CARD_H = 84, STRIDE = 96;
  const cardX = W / 2 - CARD_W / 2;
  const stackTop = H * 0.11;

  // Minimal header — feels like a notification center, not a sales pitch
  const headT = easeOut(progress(lf, 0, 32));
  if (headT > 0.01)
    drawTextC(c, DMS_M, 30, 'Found while syncing your banks.', W / 2, H * 0.062, BODY, headT * 0.7);

  // Per-card swipe progress (easeIn so it starts fast like a real swipe)
  const swipes = leakItems.map((_, i) => easeIn(progress(lf, CROSS[i], CROSS[i] + 18)));

  // Accumulate recovered amount + beat-kick for counter
  let recovered = 0;
  let hitKick = 0;
  for (let i = 0; i < leakItems.length; i++) {
    recovered += leakItems[i].amount * easeOut(progress(lf, CROSS[i], CROSS[i] + 8));
    if (lf >= CROSS[i])
      hitKick = Math.max(hitKick, clamp(1 - (lf - CROSS[i]) / 6, 0, 1));
  }

  // Draw each notification card
  for (let i = 0; i < leakItems.length; i++) {
    const item = leakItems[i];
    const inT = springE(progress(lf, 6 + i * 3, 26 + i * 3));
    if (inT < 0.01) continue;

    const st = swipes[i];

    // Stack shift: as cards above swipe out, cards below slide up to fill gap
    let shiftUp = 0;
    for (let j = 0; j < i; j++) shiftUp += swipes[j] * STRIDE;
    const baseY = stackTop + i * STRIDE - shiftUp;
    if (baseY > H + 10 || baseY + CARD_H < -10) continue;

    // Card slides right (fast easeIn), fades as it goes
    const tx = st * (W * 0.80 + CARD_W * 0.5);
    const cardAlpha = inT * clamp(1 - st * 1.7, 0, 1);

    if (cardAlpha > 0.01) {
      c.save();
      c.translate(tx, 0);

      // subtle elevation shadow
      drawRect(c, cardX + 2, baseY + 3, CARD_W, CARD_H, BODY, 0.05 * cardAlpha, 16);
      // card body
      drawRect(c, cardX, baseY, CARD_W, CARD_H, BG, cardAlpha, 16);
      // border
      const bp = mkStroke(BORD, cardAlpha * 0.9, 1.5);
      c.drawRRect(ck.RRectXY(ck.LTRBRect(cardX, baseY, cardX + CARD_W, baseY + CARD_H), 16, 16), bp);
      bp.delete();

      // app icon circle + first letter
      const icX = cardX + 56, icY = baseY + CARD_H / 2;
      drawCircle(c, icX, icY, 26, NOTIF_IC[i], cardAlpha * 0.85);
      drawTextC(c, DMS_B, 22, item.label[0], icX, icY + 8, BG, cardAlpha);

      // notification text
      drawText(c, DMS_M, 28, item.label, cardX + 96, baseY + 32, TEXT, cardAlpha);
      drawText(c, DMS_R, 20, item.sub,   cardX + 96, baseY + 58, BODY, cardAlpha * 0.5);

      // amount right-aligned
      const amtStr = `$${item.amount}/mo`;
      const amtW = measure(DMM_M, 26, amtStr);
      drawText(c, DMM_M, 26, amtStr, cardX + CARD_W - amtW - 28, baseY + 34, BODY, cardAlpha * 0.85);

      c.restore();
    }

    // Dissolve: teal particles scatter from the card as it exits
    if (lf > CROSS[i] && lf <= CROSS[i] + 22) {
      const dt = lf - CROSS[i];
      const pRng = mulberry32(i * 8191 + 7);
      for (let k = 0; k < 10; k++) {
        const angle = pRng() * Math.PI * 2;
        const speed = 80 + pRng() * 200;
        const px = W / 2 + tx * 0.45 + Math.cos(angle) * speed * (dt / 30);
        const py = baseY + CARD_H / 2 + Math.sin(angle) * speed * (dt / 30) * 0.5;
        const pr = lerp(4.5, 0.5, dt / 22);
        const pa = clamp(1 - dt / 22, 0, 1) * 0.88;
        if (pa > 0.01) drawCircle(c, px, py, pr, TEAL, pa);
      }
    }
  }

  // Counter: appears after 4 cards clear, rises to center stage when all gone
  const ctT = easeOut(progress(lf, CROSS[3] + 10, CROSS[3] + 35));
  if (ctT > 0.01) {
    const allClearT = easeInOut(progress(lf, CROSS[9] + 20, CROSS[9] + 50));
    const cyC = lerp(H * 0.88, H * 0.55, allClearT);
    const sz  = lerp(76, 108, allClearT);
    const sh  = 1 + 0.09 * hitKick;
    c.save();
    c.translate(W / 2, cyC); c.scale(sh, sh); c.translate(-W / 2, -cyC);
    drawTextC(c, DMM_M, sz, `+$${Math.round(recovered)}/mo`, W / 2, cyC, TEAL, ctT);
    drawTextC(c, DMS_R, 28, 'recovered back into your plan', W / 2, cyC + sz * 0.65, BODY, ctT * 0.7);
    c.restore();
  }
}

// ── Scene S4: End card ────────────────────────────────────────────────────────
function drawS4(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S4_START);

  const enterT = easeOut(progress(lf, 0, 45));
  const pulse  = beatPulse(lf + S4_START);

  // Slow push-in keeps the tail alive — never parked once the copy has settled
  c.save();
  const drift = 1 + Math.max(0, lf - 40) * 0.00045;
  c.translate(W/2, H*0.5); c.scale(drift, drift); c.translate(-W/2, -H*0.5);

  // Teal sunrise — line 1 above it, line 2 below it, so the copy frames the
  // logo instead of clustering at the top
  const SUN_Y = H * 0.46;
  if (enterT > 0) halfSun(c, W/2, SUN_Y, 135 * enterT, enterT, pulse * 0.5);

  // Horizon line expanding from sun
  const lineT = easeOut(progress(lf, 30, 65));
  if (lineT > 0) {
    drawLine(c, W/2 - 170*lineT, SUN_Y, W/2 + 170*lineT, SUN_Y, TEAL, 0.3*lineT, 2);
  }

  // Wordmark + URL settle in early, beneath the sun
  const wmT  = easeOut(progress(lf, 40, 70));
  const urlT = easeOut(progress(lf, 52, 82));
  if (wmT > 0)  drawTextC(c, SYNE_XB, 52, 'untilfire', W/2, H*0.80, TEXT, wmT);
  if (urlT > 0) drawTextC(c, DMS_M, 30, 'www.untilfire.com', W/2, H*0.80 + 50, TEAL, urlT * 0.85);

  // Power copy — each line RISES up into place (not a quick flat pop) and
  // arrives exactly on its beat: line 1 on the 39.81s beat (lf=107) above the
  // sun, final line at exactly 41s (lf=143) below it. Soft shadow adds depth.
  const riseLine = (str, t0, y, col) => {
    const p = progress(lf, t0 - 24, t0);
    if (p <= 0) return;
    const e  = easeOut(p);
    const yo = (1 - e) * 54;            // travels up 54px into place
    const sc = lerp(0.94, 1, e);
    const a  = clamp(p * 2.0, 0, 1);
    c.save();
    c.translate(W/2, y); c.scale(sc, sc); c.translate(-W/2, -y);
    drawTextC(c, SYNE_XB, 80, str, W/2, y + yo + 4, SLATE, a * 0.16);  // shadow
    drawTextC(c, SYNE_XB, 80, str, W/2, y + yo,     col,   a);
    c.restore();
  };
  riseLine("Don't let money stop you", 107, H*0.16, TEXT);
  riseLine('from being a good person.', 143, H*0.63, TEAL);

  const tagT = easeOut(progress(lf, 160, 190));
  if (tagT > 0) drawTextC(c, DMS_R, 26, 'Personal finance that sets you free.', W/2, H*0.93, BODY, tagT * 0.6);

  c.restore();
}

// ── Bloom cut ────────────────────────────────────────────────────────────────
// Light-driven transition that echoes the logo bloom: a white bloom grows from
// centre and peaks (covering the screen) at the midpoint, hiding a hard swap
// from scene A to scene B, then recedes so B emerges out of the light. All
// post-intro scenes are white-bg, so the bloom reads as the scene dissolving
// through light rather than a flash.
function renderBloomCut(c, f, sceneA, aStart, sceneB, bStart, transStart, transLen) {
  const t = clamp((f - transStart) / transLen, 0, 1);
  if (t < 0.5) sceneA(c, f - aStart);
  else         sceneB(c, f - bStart);

  const bloom = Math.sin(t * Math.PI);   // 0 → 1 (mid) → 0
  if (bloom > 0.001) {
    const maxR = Math.hypot(W, H) * 0.62;
    const r = maxR * (0.4 + 0.6 * bloom);
    const p = new ck.Paint();
    const sh = ck.Shader.MakeRadialGradient(
      [W/2, H/2], r,
      [ck.Color4f(1,1,1, bloom), ck.Color4f(1,1,1, bloom), ck.Color4f(1,1,1, 0)],
      [0, Math.min(0.96, bloom), 1], ck.TileMode.Clamp
    );
    p.setShader(sh);
    c.drawRect(ck.LTRBRect(0, 0, W, H), p);
    p.delete(); sh.delete();
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
    renderBloomCut(canvas, f, drawSI, SI_START, drawS1, S1_START, SI_END - TRANS_LEN, TRANS_LEN);
  } else if (f < S1_END - TRANS_LEN) {
    drawS1(canvas, f - S1_START);
  } else if (f < S1_END) {
    renderBloomCut(canvas, f, drawS1, S1_START, drawS2, S2_START, S1_END - TRANS_LEN, TRANS_LEN);
  } else if (f < S2_END - TRANS_LEN) {
    drawS2(canvas, f - S2_START);
  } else if (f < S2_END) {
    renderBloomCut(canvas, f, drawS2, S2_START, drawS3, S3_START, S2_END - TRANS_LEN, TRANS_LEN);
  } else if (f < S3_END - TRANS_LEN) {
    drawS3(canvas, f - S3_START);
  } else if (f < S3_END) {
    renderBloomCut(canvas, f, drawS3, S3_START, drawS4, S4_START, S3_END - TRANS_LEN, TRANS_LEN);
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
