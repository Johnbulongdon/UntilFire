/**
 * UntilFire demo video — v8-basis horizontal 1920x1080
 * Emotional motion-graphics: hook + teal sunrise, bar chart shuffle→growth,
 * bank logos popping on beat, leaks card, power copy, end card.
 * All suns/accents = teal (#22d3a5). No orange anywhere.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Setup ─────────────────────────────────────────────────────────────────────
const FRAMES_DIR = path.join(__dirname, 'frames');
// Only wipe frames dir on full render, not spot renders
if (process.env.SPOT == null) {
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
const BG    = hex('#08080e');
const TEAL  = hex('#22d3a5');
const WHITE = hex('#f8fafc');
const DIM   = hex('#6b7280');
const CARD  = hex('#111118');
const BORD  = hex('#23232d');

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
function paint(color, alpha = 1) {
  const p = new ck.Paint();
  p.setColor(ck.Color4f(color[0], color[1], color[2], color[3] * alpha));
  p.setAntiAlias(true);
  return p;
}
function stroke(color, alpha, sw) {
  const p = paint(color, alpha);
  p.setStyle(ck.PaintStyle.Stroke);
  p.setStrokeWidth(sw);
  p.setStrokeCap(ck.StrokeCap.Round);
  return p;
}
function circle(c, x, y, r, col, alpha) {
  const p = paint(col, alpha);
  c.drawCircle(x, y, r, p);
  p.delete();
}
function rect(c, x, y, w, h, col, alpha, rad = 0) {
  const p = paint(col, alpha);
  if (rad > 0) c.drawRRect(ck.RRectXY(ck.LTRBRect(x, y, x+w, y+h), rad, rad), p);
  else c.drawRect(ck.LTRBRect(x, y, x+w, y+h), p);
  p.delete();
}
function ln(c, x0, y0, x1, y1, col, alpha, sw) {
  const p = stroke(col, alpha, sw);
  c.drawLine(x0, y0, x1, y1, p);
  p.delete();
}
function text(c, tf, size, str, x, y, col, alpha) {
  const f = new ck.Font(tf, size);
  f.setSubpixel(true);
  const p = paint(col, alpha);
  const blob = ck.TextBlob.MakeFromText(str, f);
  c.drawTextBlob(blob, x, y, p);
  blob.delete(); p.delete(); f.delete();
}
function textC(c, tf, size, str, cx, y, col, alpha) {
  const w = measure(tf, size, str);
  text(c, tf, size, str, cx - w/2, y, col, alpha);
}

// ── easing ────────────────────────────────────────────────────────────────────
const easeOut  = t => 1 - (1-t)**3;
const easeIn   = t => t * t * t;
const easeInOut = t => t < 0.5 ? 4*t**3 : 1 - (-2*t+2)**3/2;
const clamp    = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp     = (a, b, t) => a + (b-a)*clamp(t, 0, 1);
function progress(f, start, end) { return clamp((f-start)/(end-start), 0, 1); }

// ── Beat pulse (120 BPM = 15 frames per beat) ─────────────────────────────────
function beatPulse(lf, phase = 14) {
  const p = (((lf - phase) % 15) + 15) % 15;
  return Math.max(0, 1 - p/5) ** 2;
}

// ── RNG ───────────────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = s + 0x6D2B79F5|0; let t = Math.imul(s^s>>>15,1|s); t = t + Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
}

// ── Ambient particles ─────────────────────────────────────────────────────────
const NUM_PART = 42;
const rng = mulberry32(0xdeadbeef);
const particles = Array.from({length: NUM_PART}, (_, i) => ({
  x: rng() * W,
  y: rng() * H,
  vy: -(0.4 + rng() * 0.6),
  r: 1 + rng() * 2,
  a: 0.08 + rng() * 0.18,
  phase: rng() * 200,
}));
function drawParticles(c, gf) {
  for (const p of particles) {
    const y = ((p.y - (gf - p.phase) * p.vy * 0.5) % (H + 20) + H + 20) % (H + 20);
    circle(c, p.x, y, p.r, TEAL, p.a);
  }
}

// ── Half-sun (teal, 5 rays above horizon) ─────────────────────────────────────
function halfSun(c, x, y, r, alpha = 1, rayPulse = 0) {
  c.save();
  c.clipRect(ck.XYWHRect(x - r*2.5, y - r*2.5, r*5, r*2.5), ck.ClipOp.Intersect, true);
  // glow halo
  const glowPaint = new ck.Paint();
  const shader = ck.Shader.MakeRadialGradient(
    [x, y], r * 2.2,
    [ck.Color4f(TEAL[0], TEAL[1], TEAL[2], 0.18 * alpha), ck.Color4f(TEAL[0], TEAL[1], TEAL[2], 0)],
    null, ck.TileMode.Clamp
  );
  glowPaint.setShader(shader);
  c.drawCircle(x, y, r * 2.2, glowPaint);
  glowPaint.delete(); shader.delete();
  c.restore();

  // dome
  c.save();
  c.clipRect(ck.XYWHRect(x - r*2.5, y - r*2.5, r*5, r*2.5), ck.ClipOp.Intersect, true);
  circle(c, x, y, r, TEAL, 0.92 * alpha);
  c.restore();

  // horizon line
  ln(c, x - r*1.5, y, x + r*1.5, y, TEAL, 0.65 * alpha, r * 0.045);

  // 5 rays
  const rayAngles = [-Math.PI*0.82, -Math.PI*0.66, -Math.PI*0.5, -Math.PI*0.34, -Math.PI*0.18];
  for (const ang of rayAngles) {
    const cx = Math.cos(ang), cy = Math.sin(ang);
    ln(c,
      x + cx*(r*1.14), y + cy*(r*1.14),
      x + cx*(r*1.5 + rayPulse*r*0.2), y + cy*(r*1.5 + rayPulse*r*0.2),
      TEAL, 0.75 + rayPulse*0.25, r * 0.055
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

// ── Scene timing (frames at 30fps, total ~1230 = 41s) ─────────────────────────
// S0: hook + sunrise  0–270   (9s)
// S1: bar chart       270–540 (9s)
// S2: bank logos      540–780 (8s)
// S3: leaks card      780–1020 (8s)
// S4: end card        1020–1230 (7s)
const TOTAL = 1230;

// ── Scene 0: Hook + teal sunrise ──────────────────────────────────────────────
function drawS0(c, lf) {
  // Background
  rect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf);

  // Sunrise rise animation
  const riseT = easeOut(progress(lf, 0, 150));
  const sunR = lerp(0, 280, riseT);
  const sunY = H * 0.62;
  const sunX = W * 0.5;

  if (sunR > 0) {
    const pulse = beatPulse(lf, 14);
    halfSun(c, sunX, sunY, sunR, riseT, pulse);
    // horizon glow line
    ln(c, sunX - sunR*1.6, sunY, sunX + sunR*1.6, sunY,
       TEAL, 0.22 * riseT, 2);
  }

  // Headline fade-in
  const headT = progress(lf, 60, 180);
  if (headT > 0) {
    const alpha = easeOut(headT);
    // "What if work"
    textC(c, SYNE_XB, 96, 'What if work', W/2, H*0.22, WHITE, alpha);
    // "was optional?" with teal accent
    const line2 = 'was optional?';
    const w2 = measure(SYNE_XB, 96, line2);
    text(c, SYNE_XB, 96, line2, W/2 - w2/2, H*0.22 + 115, WHITE, alpha);
  }

  // Sub-copy dwell after headline
  const subT = progress(lf, 160, 240);
  if (subT > 0) {
    const alpha = easeOut(subT);
    textC(c, DMS_M, 36, 'Most people never find out. UntilFire shows you how close you are.', W/2, H*0.22 + 185, DIM, alpha * 0.85);
  }

  // Teal accent underline on "optional?"
  const ulT = progress(lf, 100, 160);
  if (ulT > 0) {
    const alpha = easeOut(ulT);
    const w2 = measure(SYNE_XB, 96, 'was optional?');
    const lx = W/2 - w2/2;
    const rx = W/2 + w2/2;
    const uy = H*0.22 + 125;
    ln(c, lx, uy, lx + (rx-lx)*easeOut(ulT), uy, TEAL, alpha, 4);
  }
}

// ── Scene 1: Bar chart — shuffle → compound growth ────────────────────────────
const NUM_BARS = 12;
const barLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// "Messy" random bar heights (savings before FIRE awareness)
const messyRng = mulberry32(0xabcdef01);
const messyH = Array.from({length: NUM_BARS}, (_, i) => 0.1 + messyRng() * 0.55);

// Target: compound growth curve
const growthH = Array.from({length: NUM_BARS}, (_, i) => {
  const g = Math.pow(1 + 0.08/12, i);
  return 0.18 + (g - 1) * 1.2;
});

function drawS1(c, lf) {
  rect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + 270);

  const CHART_L = W*0.12, CHART_R = W*0.88;
  const CHART_T = H*0.18, CHART_B = H*0.82;
  const CW = CHART_R - CHART_L;
  const CH = CHART_B - CHART_T;
  const barW = CW / NUM_BARS * 0.65;
  const gap   = CW / NUM_BARS;

  // Morph progress: 0 = messy, 1 = growth curve
  const morphT = easeInOut(progress(lf, 60, 210));

  // Sway wobble during transition
  const wt = morphT;
  const sway = (wt > 0 && wt < 1) ? Math.sin(wt * Math.PI * 4) * 16 * (1 - wt) : 0;

  // Beat pulse scale
  const pulse = beatPulse(lf, 14);

  // Dim bars when text overlay is showing
  const textShowT = progress(lf, 190, 240);
  const dimAlpha = lerp(1, 0.35, textShowT);

  const layerP = new ck.Paint();
  layerP.setAlphaf(dimAlpha);
  c.saveLayer(layerP);
  layerP.delete();

  // Draw bars
  for (let i = 0; i < NUM_BARS; i++) {
    const bh = lerp(messyH[i], growthH[i], morphT);
    const barH = bh * CH;
    const bx = CHART_L + i * gap + gap * 0.175;
    const by = CHART_B - barH + sway * (1 - i/NUM_BARS * 0.5) * (1 - morphT);
    const alpha = 0.7 + 0.3 * morphT + pulse * 0.15 * (i/NUM_BARS);

    // Bar glow
    if (morphT > 0.4) {
      const glP = stroke(TEAL, 0.12 * (morphT - 0.4)/0.6, barW*1.4);
      glP.setStrokeCap(ck.StrokeCap.Round);
      c.drawLine(bx + barW/2, by + barH*0.1, bx + barW/2, by + barH*0.9, glP);
      glP.delete();
    }

    // Bar fill
    const barColor = morphT > 0.5 ? TEAL : [0.3, 0.35, 0.4, 1];
    rect(c, bx, by, barW, barH, barColor, alpha * dimAlpha, 4);

    // Label
    text(c, DMS_R, 22, barLabels[i], bx + barW/2 - measure(DMS_R, 22, barLabels[i])/2, CHART_B + 32, DIM, 0.5 * dimAlpha);
  }
  c.restore();

  // Axis line
  ln(c, CHART_L - 10, CHART_B, CHART_R + 10, CHART_B, BORD, 1, 2);

  // Y-axis labels
  for (let i = 0; i <= 4; i++) {
    const yv = i * 0.25;
    const yp = CHART_B - yv * CH;
    ln(c, CHART_L - 8, yp, CHART_L, yp, BORD, 0.5, 1);
  }

  // Headline copy
  const headT = easeOut(progress(lf, 0, 60));
  if (headT > 0) {
    textC(c, SYNE_B, 54, 'Your money compounds. Every month matters.', W/2, H*0.08, WHITE, headT);
  }

  // Overlay copy after morph
  const copyT = easeOut(progress(lf, 200, 255));
  if (copyT > 0) {
    rect(c, W*0.28, H*0.35, W*0.44, 120, CARD, 0.92 * copyT, 16);
    const bord = stroke(TEAL, 0.35 * copyT, 1.5);
    c.drawRRect(ck.RRectXY(ck.LTRBRect(W*0.28, H*0.35, W*0.28+W*0.44, H*0.35+120), 16, 16), bord);
    bord.delete();
    textC(c, DMM_M, 38, '$847/mo → freedom date', W/2, H*0.35 + 60, TEAL, copyT);
    textC(c, DMS_R, 24, 'Automatically calculated from your numbers', W/2, H*0.35 + 95, DIM, copyT * 0.75);
  }
}

// ── Scene 2: Bank logos — big scrolling marquee ───────────────────────────────
function drawS2(c, lf) {
  rect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + 540);

  // Headline
  const headT = easeOut(progress(lf, 0, 60));
  textC(c, SYNE_B, 58, 'Works with your bank.', W/2, H*0.13, WHITE, headT);
  textC(c, DMS_R, 32, 'Connect once, track automatically.', W/2, H*0.13 + 68, DIM, headT * 0.8);

  // Two marquee rows scrolling in opposite directions, big cards + big logos
  const CARD_W = 300, CARD_H = 170, GAP = 28;
  const STRIDE = CARD_W + GAP;
  const LOGO_SIZE = 92;
  const SPEED = 2.4; // px per frame — always moving

  const rowDefs = [
    { icons: bankIcons.slice(0, 8),  y: H*0.36, dir: -1 },
    { icons: bankIcons.slice(8, 15), y: H*0.36 + CARD_H + 36, dir:  1 },
  ];

  const enterT = easeOut(progress(lf, 15, 70));
  const pulse = beatPulse(lf, 14);

  for (const row of rowDefs) {
    const n = row.icons.length;
    const loopW = n * STRIDE;
    const scroll = ((lf * SPEED * row.dir) % loopW + loopW) % loopW;

    // Draw enough copies to cover the screen + wraparound
    for (let k = -1; k < Math.ceil(W / loopW) + 2; k++) {
      for (let i = 0; i < n; i++) {
        const baseX = i * STRIDE + k * loopW - scroll;
        const cx = baseX + CARD_W/2;
        if (cx < -CARD_W || cx > W + CARD_W) continue;
        const cy = row.y + CARD_H/2;

        c.save();
        c.translate(cx, cy);
        const s = 1 + pulse * 0.02;
        c.scale(s * enterT, s * enterT);

        rect(c, -CARD_W/2, -CARD_H/2, CARD_W, CARD_H, CARD, enterT * 0.95, 18);
        const borderP = stroke(BORD, enterT * 0.8, 1.5);
        c.drawRRect(ck.RRectXY(ck.LTRBRect(-CARD_W/2, -CARD_H/2, CARD_W/2, CARD_H/2), 18, 18), borderP);
        borderP.delete();

        drawBankLogo(c, row.icons[i], 0, -14, LOGO_SIZE, enterT);

        const nm = row.icons[i].name;
        const nw = measure(DMS_M, 22, nm);
        text(c, DMS_M, 22, nm, -nw/2, CARD_H/2 - 22, DIM, enterT * 0.75);

        c.restore();
      }
    }
  }

  // Soft edge fade so the marquee melts into the background at screen edges
  const fadeW = 220;
  const mkFade = (x0, x1) => {
    const p = new ck.Paint();
    const sh = ck.Shader.MakeLinearGradient(
      [x0, 0], [x1, 0],
      [ck.Color4f(BG[0], BG[1], BG[2], 1), ck.Color4f(BG[0], BG[1], BG[2], 0)],
      null, ck.TileMode.Clamp
    );
    p.setShader(sh);
    c.drawRect(ck.LTRBRect(Math.min(x0,x1), H*0.30, Math.max(x0,x1), H*0.78), p);
    p.delete(); sh.delete();
  };
  mkFade(0, fadeW);
  mkFade(W, W - fadeW);

  // Bottom tagline
  const tagT = easeOut(progress(lf, 120, 170));
  if (tagT > 0) {
    textC(c, DMS_M, 30, '15+ banks. 0 manual entries.', W/2, H*0.88, TEAL, tagT);
  }
}

// ── Scene 3: Leaks card — find them, then swipe them away ─────────────────────
const leakItems = [
  { label: 'Streaming services', amount: 47,  pct: 0.72 },
  { label: 'Unused gym',         amount: 29,  pct: 0.44 },
  { label: 'Food delivery',      amount: 89,  pct: 0.58 },
  { label: 'Subscriptions',      amount: 63,  pct: 0.85 },
  { label: 'Impulse spending',   amount: 124, pct: 0.66 },
];
const LEAK_TOTAL = leakItems.reduce((a, it) => a + it.amount, 0); // 352

function drawS3(c, lf) {
  rect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + 780);

  // Headline
  const headT = easeOut(progress(lf, 0, 50));
  textC(c, SYNE_B, 58, "You're leaking money.", W/2, H*0.1, WHITE, headT);
  textC(c, DMS_R, 32, 'UntilFire finds the drains — and helps you cut them.', W/2, H*0.1 + 68, DIM, headT * 0.8);

  // Card
  const CARD_W2 = 820, CARD_H2 = 480;
  const CX = W/2 - CARD_W2/2, CY = H*0.23;
  const cardT = easeOut(progress(lf, 10, 55));
  if (cardT > 0) {
    rect(c, CX, CY, CARD_W2, CARD_H2, CARD, cardT, 20);
    const bp = stroke(BORD, cardT, 1.5);
    c.drawRRect(ck.RRectXY(ck.LTRBRect(CX, CY, CX+CARD_W2, CY+CARD_H2), 20, 20), bp);
    bp.delete();
  }

  // Removal schedule: each row i gets removed starting at frame 125 + i*22
  const removeStart = i => 125 + i * 22;
  const REMOVE_LEN = 25;

  // Recovered total: counts UP in teal as each removal completes
  let recovered = 0;
  for (let i = 0; i < leakItems.length; i++) {
    const remT = progress(lf, removeStart(i), removeStart(i) + REMOVE_LEN);
    recovered += leakItems[i].amount * easeOut(remT);
  }

  // Card header
  const ctT = easeOut(progress(lf, 30, 70));
  if (ctT > 0) {
    text(c, DMS_B, 26, 'Spending Leaks', CX + 28, CY + 46, WHITE, ctT);
    const totalStr = `+$${Math.round(recovered)}/mo recovered`;
    const tw = measure(DMM_M, 26, totalStr);
    const recAlpha = recovered > 0.5 ? 1 : 0.45;
    text(c, DMM_M, 26, totalStr, CX + CARD_W2 - tw - 28, CY + 46, TEAL, ctT * recAlpha);
    ln(c, CX + 20, CY + 58, CX + CARD_W2 - 20, CY + 58, BORD, ctT * 0.6, 1);
  }

  // Leak rows
  for (let i = 0; i < leakItems.length; i++) {
    const item = leakItems[i];
    const rowT = easeOut(progress(lf, 35 + i * 15, 75 + i * 15));
    if (rowT <= 0) continue;

    const remT = easeInOut(progress(lf, removeStart(i), removeStart(i) + REMOVE_LEN));
    const ry = CY + 80 + i * 72;

    // Row content slides right + fades as it is removed
    const slideX = remT * 80;
    const rowAlpha = rowT * (1 - remT * 0.65);

    c.save();
    c.clipRect(ck.XYWHRect(CX, ry - 8, CARD_W2, 64), ck.ClipOp.Intersect, true);
    c.translate(slideX, 0);

    text(c, DMS_M, 24, item.label, CX + 28, ry + 20, WHITE, rowAlpha * 0.9);
    const amStr = `$${item.amount}`;
    const amw = measure(DMM_M, 24, amStr);
    text(c, DMM_M, 24, amStr, CX + CARD_W2 - amw - 110, ry + 20, WHITE, rowAlpha * 0.85 * (1 - remT));

    // Bar — neutral grey, shrinks to zero on removal
    const BAR_L = CX + 28, BAR_R = CX + CARD_W2 - 110;
    const BAR_W = BAR_R - BAR_L;
    rect(c, BAR_L, ry + 30, BAR_W, 8, BORD, rowAlpha * 0.8, 4);
    const fillW = BAR_W * item.pct * rowT * (1 - remT);
    if (fillW > 0) rect(c, BAR_L, ry + 30, fillW, 8, [0.62,0.65,0.72,1], rowAlpha, 4);

    c.restore();

    // Strikethrough draws across the label while removing
    if (remT > 0 && remT < 1) {
      const lw = measure(DMS_M, 24, item.label);
      ln(c, CX + 28 + slideX, ry + 12, CX + 28 + slideX + lw * clamp(remT*1.6,0,1), ry + 12, TEAL, 0.85, 2.5);
    }

    // Teal check pops in once removed
    const checkT = easeOut(progress(lf, removeStart(i) + 12, removeStart(i) + REMOVE_LEN + 6));
    if (checkT > 0) {
      const ccx = CX + CARD_W2 - 56, ccy = ry + 12;
      const pop = checkT < 0.7 ? lerp(0, 1.15, checkT/0.7) : lerp(1.15, 1, (checkT-0.7)/0.3);
      circle(c, ccx, ccy, 15 * pop, TEAL, 0.18 * checkT);
      const chk = stroke(TEAL, checkT, 3.2);
      c.drawLine(ccx - 6*pop, ccy + 0.5, ccx - 1.5*pop, ccy + 5.5*pop, chk);
      c.drawLine(ccx - 1.5*pop, ccy + 5.5*pop, ccx + 7*pop, ccy - 5*pop, chk);
      chk.delete();
    }
  }

  // Power line — appears once everything is swiped away
  const powerT = easeOut(progress(lf, 235, 270));
  if (powerT > 0) {
    rect(c, W*0.18, H*0.82, W*0.64, 80, CARD, 0.93*powerT, 12);
    const bp2 = stroke(TEAL, 0.35*powerT, 1.5);
    c.drawRRect(ck.RRectXY(ck.LTRBRect(W*0.18, H*0.82, W*0.18+W*0.64, H*0.82+80), 12, 12), bp2);
    bp2.delete();
    textC(c, DMS_M, 28, '+$352/mo back → your freedom date moves 3 years closer', W/2, H*0.82+48, TEAL, powerT);
  }
}

// ── Scene 4: End card ──────────────────────────────────────────────────────────
function drawS4(c, lf) {
  rect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + 1020);

  const enterT = easeOut(progress(lf, 0, 75));
  const pulse  = beatPulse(lf, 14);

  // Large teal sunrise
  const sunR = lerp(0, 200, enterT);
  if (sunR > 0) halfSun(c, W/2, H*0.52, sunR, enterT, pulse * 0.6);

  // Power copy — 3 lines staggered
  const l1T = easeOut(progress(lf, 40, 100));
  const l2T = easeOut(progress(lf, 75, 135));
  const l3T = easeOut(progress(lf, 110, 170));

  if (l1T > 0) textC(c, SYNE_XB, 68, "Don't let money run your life.", W/2, H*0.1, WHITE, l1T);
  if (l2T > 0) textC(c, SYNE_XB, 68, 'Let your money hire you to', W/2, H*0.1 + 85, WHITE, l2T);
  if (l3T > 0) textC(c, SYNE_XB, 68, 'chase your dreams.', W/2, H*0.1 + 170, TEAL, l3T);

  // Wordmark
  const wmT = easeOut(progress(lf, 140, 190));
  if (wmT > 0) {
    textC(c, SYNE_XB, 52, 'untilfire', W/2, H*0.71, WHITE, wmT);
  }
  // URL
  const urlT = easeOut(progress(lf, 170, 210));
  if (urlT > 0) {
    textC(c, DMS_M, 30, 'www.untilfire.com', W/2, H*0.71 + 52, TEAL, urlT * 0.85);
  }

  // Teal horizon line expanding
  const lineT = easeOut(progress(lf, 150, 195));
  if (lineT > 0) {
    ln(c, W/2 - 220*lineT, H*0.52, W/2 + 220*lineT, H*0.52, TEAL, 0.35*lineT, 2);
  }

  // Subtle tagline at bottom
  const tagT = easeOut(progress(lf, 200, 240));
  if (tagT > 0) {
    textC(c, DMS_R, 26, 'Personal finance that sets you free.', W/2, H*0.91, DIM, tagT * 0.7);
  }
}

// ── Transition: filmstrip pan between scenes (direct draw, no inner surfaces) ─
function renderWithTransition(c, f, sceneA, aStart, sceneB, bStart, transStart, transLen) {
  const t = clamp((f - transStart) / transLen, 0, 1);
  const et = easeInOut(t);
  const cut = et * W;

  // Scene A — slides out to the left
  if (cut < W) {
    c.save();
    c.clipRect(ck.XYWHRect(0, 0, W - cut, H), ck.ClipOp.Intersect, true);
    c.translate(-cut, 0);
    sceneA(c, f - aStart);
    c.restore();
  }

  // Scene B — slides in from the right
  if (cut > 0) {
    c.save();
    c.clipRect(ck.XYWHRect(W - cut, 0, cut, H), ck.ClipOp.Intersect, true);
    c.translate(W - cut, 0);
    sceneB(c, f - bStart);
    c.restore();
  }
}

// ── Render loop ───────────────────────────────────────────────────────────────
const surface = ck.MakeSurface(W, H);
const canvas  = surface.getCanvas();

// Scene boundaries
const S0_START = 0,   S0_END = 270;   // 9s
const S1_START = 240, S1_END = 540;   // 9s
const S2_START = 510, S2_END = 780;   // 8s
const S3_START = 750, S3_END = 1020;  // 8s
const S4_START = 990, S4_END = 1230;  // 7s
const TRANS_LEN = 30; // 1s transition

const spotOnly = process.env.SPOT != null;
const spotFrame = parseInt(process.env.SPOT || '0', 10);
const totalFrames = spotOnly ? 1 : TOTAL;
// In spot mode, keep existing frames (don't wipe)

for (let fi = 0; fi < totalFrames; fi++) {
  const f = spotOnly ? spotFrame : fi;
  canvas.clear(ck.Color4f(...BG));

  if (f < S0_END - TRANS_LEN) {
    drawS0(canvas, f - S0_START);
  } else if (f < S0_END) {
    renderWithTransition(canvas, f, drawS0, S0_START, drawS1, S1_START, S0_END - TRANS_LEN, TRANS_LEN);
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
