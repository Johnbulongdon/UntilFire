/**
 * UntilFire demo video — v15
 * Open: full black, question words appear one by one → question fades out →
 * "introducing... UntilFire" on black → full-size logo animates in and its
 * light turns the bg white → logo + wordmark settle → app showcase on white.
 * 1920x1080 horizontal, 30fps, ~48.5s.
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

// ── Easing / math ─────────────────────────────────────────────────────────────
const easeOut   = t => 1 - (1-t)**3;
const easeIn    = t => t * t * t;
const easeInOut = t => t < 0.5 ? 4*t**3 : 1 - (-2*t+2)**3/2;
const clamp     = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp      = (a, b, t) => a + (b-a)*clamp(t, 0, 1);
function progress(f, start, end) { return clamp((f-start)/(end-start), 0, 1); }

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
// S0: question        0–225    (7.5s) — black, words appear in order, fade out
// SI: introducing     225–495  (9s)   — "introducing... UntilFire", logo lights bg white
// S1: bar chart       465–765  (10s,  30f filmstrip overlap)
// S2: bank logos      735–1005 (9s,   30f filmstrip overlap)
// S3: leaks           975–1245 (9s,   30f filmstrip overlap)
// S4: end card        1215–1455(8s,   30f filmstrip overlap)
const TOTAL     = 1455;
const TRANS_LEN = 30;

const S0_START = 0,    S0_END = 225;
const SI_START = 225,  SI_END = 495;
const S1_START = 465,  S1_END = 765;
const S2_START = 735,  S2_END = 1005;
const S3_START = 975,  S3_END = 1245;
const S4_START = 1215, S4_END = 1455;

const WHITEISH = [0.96, 0.97, 0.98, 1]; // text on dark

// ── Scene S0: Question on black — words appear one by one ────────────────────
const Q_SIZE  = 96;
const Q_LINES = [['What', 'if', 'work'], ['was', 'optional?']];

function drawS0(c, lf) {
  drawRect(c, 0, 0, W, H, BG_DARK, 1);
  drawParticles(c, lf + S0_START);

  // Question fades out as a whole at the end
  const exitT = easeInOut(progress(lf, 170, 200));
  const keep  = 1 - exitT;
  if (keep <= 0) return;

  const spaceW = measure(SYNE_XB, Q_SIZE, ' ');
  let wordIdx = 0;
  for (let li = 0; li < Q_LINES.length; li++) {
    const line = Q_LINES[li];
    const widths = line.map(w => measure(SYNE_XB, Q_SIZE, w));
    const lineW = widths.reduce((a, b) => a + b, 0) + spaceW * (line.length - 1);
    let x = W/2 - lineW/2;
    const baseY = H * 0.42 + li * 116;

    for (let wi = 0; wi < line.length; wi++) {
      const t0 = 15 + wordIdx * 16;
      const wT = easeOut(progress(lf, t0, t0 + 22));
      if (wT > 0) {
        const wy = baseY + (1 - wT) * 14;
        drawText(c, SYNE_XB, Q_SIZE, line[wi], x, wy, WHITEISH, wT * keep);
      }
      x += widths[wi] + spaceW;
      wordIdx++;
    }
  }

  // Teal underline on "optional?" after it lands
  const ulT = easeOut(progress(lf, 100, 140));
  if (ulT > 0) {
    const ow = measure(SYNE_XB, Q_SIZE, 'optional?');
    const lw = measure(SYNE_XB, Q_SIZE, 'was optional?');
    const lx = W/2 + lw/2 - ow, uy = H * 0.42 + 128;
    drawLine(c, lx, uy, lx + ow * ulT, uy, TEAL, ulT * keep, 5);
  }
}

// ── Scene SI: "introducing... UntilFire" + logo light-up to white ────────────
function drawSI(c, lf) {
  const SUN_X = W/2, SUN_Y = H/2 + 30;

  drawRect(c, 0, 0, W, H, BG_DARK, 1);
  if (lf < 200) drawParticles(c, lf + SI_START);

  // "introducing..." then "UntilFire" beneath — both leave before the logo
  const in1  = easeOut(progress(lf, 10, 35));
  const in2  = easeOut(progress(lf, 45, 70));
  const outT = easeIn(progress(lf, 95, 115));
  if (in1 > 0 && outT < 1) {
    const iy = H * 0.40 + (1 - in1) * 14;
    drawTextC(c, SYNE_B, 50, 'introducing...', W/2, iy, WHITEISH, in1 * (1 - outT) * 0.85);
  }
  if (in2 > 0 && outT < 1) {
    const uy = H * 0.40 + 110 + (1 - in2) * 14;
    drawTextC(c, SYNE_XB, 88, 'UntilFire', W/2, uy, WHITEISH, in2 * (1 - outT));
  }

  // Full-size logo animates in 115→165
  const riseT = easeOut(progress(lf, 115, 165));
  const sunR  = 260 * riseT;

  // The sun's light turns the bg white — soft radiance expanding 150→200
  const lightT = easeInOut(progress(lf, 150, 200));
  if (lightT > 0) {
    const maxR = Math.sqrt(W*W + H*H) * 1.05;
    const lr   = lerp(sunR * 1.1, maxR, lightT);
    const lightP = new ck.Paint();
    const lightSh = ck.Shader.MakeRadialGradient(
      [SUN_X, SUN_Y], lr,
      [ck.Color4f(1, 1, 1, 1), ck.Color4f(1, 1, 1, 1), ck.Color4f(1, 1, 1, 0)],
      [0, 0.7, 1], ck.TileMode.Clamp
    );
    lightP.setShader(lightSh);
    c.drawRect(ck.LTRBRect(0, 0, W, H), lightP);
    lightP.delete(); lightSh.delete();
  }

  // Sun drawn on top so it reads on both dark and white
  if (sunR > 0 && lf < 200) {
    const pulse = beatPulse(lf, 14);
    halfSun(c, SUN_X, SUN_Y, sunR, riseT, pulse * (1 + lightT));
  }

  // Lit: white bg, logo settles to center, wordmark rises in
  if (lf >= 200) {
    drawRect(c, 0, 0, W, H, BG, 1);

    // Sun shrinks from full-size to centred logo mark
    const settleT = easeOut(progress(lf, 200, 224));
    const logoR   = lerp(260, 90, settleT);
    const logoY   = lerp(H/2 + 30, H * 0.44, settleT);
    const pulse   = beatPulse(lf, 14) * (1 - settleT) * 0.6;
    halfSun(c, SUN_X, logoY, logoR, 1, pulse);

    // "untilfire" wordmark fades up below the logo
    const wmT = easeOut(progress(lf, 220, 242));
    if (wmT > 0) {
      // Rise-up effect: starts 12px below final position
      const wmy = H * 0.44 + 90 + 36 + (1 - wmT) * 12;
      drawTextC(c, SYNE_XB, 68, 'untilfire', SUN_X, wmy, TEXT, wmT);
    }
  }
}

// ── Scene S1: Bar chart — shuffle → compound growth ───────────────────────────
const NUM_BARS   = 12;
const barLabels  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const messyRng   = mulberry32(0xabcdef01);
const messyH     = Array.from({length: NUM_BARS}, () => 0.12 + messyRng() * 0.55);
const growthH    = Array.from({length: NUM_BARS}, (_, i) => {
  const g = Math.pow(1 + 0.08/12, i);
  return 0.2 + (g - 1) * 1.3;
});

function drawS1(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S1_START);

  const CHART_L = W*0.1, CHART_R = W*0.9;
  const CHART_T = H*0.2, CHART_B = H*0.82;
  const CW = CHART_R - CHART_L, CH = CHART_B - CHART_T;
  const gap = CW / NUM_BARS, barW = gap * 0.62;

  const morphT = easeInOut(progress(lf, 50, 200));
  const wt     = morphT;
  const sway   = (wt > 0 && wt < 1) ? Math.sin(wt * Math.PI * 4) * 14 * (1 - wt) : 0;
  const pulse  = beatPulse(lf, 14);
  const textShowT = progress(lf, 195, 245);
  const dimAlpha  = lerp(1, 0.3, textShowT);

  // Headline
  const headT = easeOut(progress(lf, 0, 55));
  if (headT > 0) drawTextC(c, SYNE_B, 52, 'Your money compounds. Every month matters.', W/2, H*0.1, TEXT, headT);

  // Chart
  const layerP = new ck.Paint(); layerP.setAlphaf(dimAlpha);
  c.saveLayer(layerP); layerP.delete();

  // Axis + grid lines
  drawLine(c, CHART_L - 10, CHART_B, CHART_R + 10, CHART_B, DIM, 0.4, 1.5);
  for (let i = 1; i <= 4; i++) {
    const yp = CHART_B - i/4 * CH;
    drawLine(c, CHART_L, yp, CHART_R, yp, DIM, 0.15, 1);
  }

  for (let i = 0; i < NUM_BARS; i++) {
    const bh   = lerp(messyH[i], growthH[i], morphT);
    const barH = bh * CH;
    const bx   = CHART_L + i * gap + gap * 0.19;
    const by   = CHART_B - barH + sway * (1 - i/NUM_BARS * 0.4) * (1 - morphT);
    const alpha = 0.65 + 0.35 * morphT + pulse * 0.1 * (i/NUM_BARS);
    const barCol = morphT > 0.5 ? TEAL : hex('#94a3b8');
    drawRect(c, bx, by, barW, barH, barCol, alpha, 5);
    drawText(c, DMS_R, 22, barLabels[i],
      bx + barW/2 - measure(DMS_R, 22, barLabels[i])/2, CHART_B + 32, DIM, 0.55);
  }
  c.restore();

  // Overlay stat
  const copyT = easeOut(progress(lf, 205, 255));
  if (copyT > 0) {
    drawRect(c, W*0.3, H*0.35, W*0.4, 112, CARD, 0.96*copyT, 16);
    const bp = mkStroke(TEAL, 0.4*copyT, 1.5);
    c.drawRRect(ck.RRectXY(ck.LTRBRect(W*0.3, H*0.35, W*0.3+W*0.4, H*0.35+112), 16, 16), bp);
    bp.delete();
    drawTextC(c, DMM_M, 38, '$847/mo → freedom date', W/2, H*0.35 + 58, TEAL, copyT);
    drawTextC(c, DMS_R, 24, 'Automatically calculated from your numbers', W/2, H*0.35 + 95, BODY, copyT * 0.7);
  }
}

// ── Scene S2: Bank logos — two-row scrolling marquee ──────────────────────────
function drawS2(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S2_START);

  const headT = easeOut(progress(lf, 0, 55));
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

  const tagT = easeOut(progress(lf, 120, 170));
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

  const headT = easeOut(progress(lf, 0, 50));
  drawTextC(c, SYNE_B, 58, "You're leaking money.", W/2, H*0.1, TEXT, headT);
  drawTextC(c, DMS_R, 32, 'UntilFire finds the drains — and helps you cut them.', W/2, H*0.1 + 68, BODY, headT * 0.8);

  const CARD_W2 = 820, CARD_H2 = 492;
  const CX = W/2 - CARD_W2/2, CY = H*0.23;
  const cardT = easeOut(progress(lf, 10, 55));
  if (cardT > 0) {
    drawRect(c, CX, CY, CARD_W2, CARD_H2, CARD, cardT, 20);
    const bp = mkStroke(BORD, cardT, 1.5);
    c.drawRRect(ck.RRectXY(ck.LTRBRect(CX, CY, CX+CARD_W2, CY+CARD_H2), 20, 20), bp);
    bp.delete();
  }

  const removeStart = i => 125 + i * 22;
  const REMOVE_LEN  = 25;

  let recovered = 0;
  for (let i = 0; i < leakItems.length; i++) {
    recovered += leakItems[i].amount * easeOut(progress(lf, removeStart(i), removeStart(i) + REMOVE_LEN));
  }

  // Card header
  const ctT = easeOut(progress(lf, 30, 70));
  if (ctT > 0) {
    drawText(c, DMS_B, 26, 'Spending Leaks', CX + 28, CY + 46, TEXT, ctT);
    const totalStr = `+$${Math.round(recovered)}/mo recovered`;
    const tw = measure(DMM_M, 26, totalStr);
    drawText(c, DMM_M, 26, totalStr, CX + CARD_W2 - tw - 28, CY + 46, TEAL, ctT * (recovered > 0.5 ? 1 : 0.4));
    drawLine(c, CX + 20, CY + 58, CX + CARD_W2 - 20, CY + 58, BORD, ctT, 1.5);
  }

  // Rows
  for (let i = 0; i < leakItems.length; i++) {
    const item  = leakItems[i];
    const rowT  = easeOut(progress(lf, 35 + i * 15, 75 + i * 15));
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

  // Power line
  const powerT = easeOut(progress(lf, 240, 275));
  if (powerT > 0) {
    drawRect(c, W*0.18, H*0.82, W*0.64, 80, CARD, 0.96*powerT, 12);
    const bp2 = mkStroke(TEAL, 0.4*powerT, 1.5);
    c.drawRRect(ck.RRectXY(ck.LTRBRect(W*0.18, H*0.82, W*0.18+W*0.64, H*0.82+80), 12, 12), bp2);
    bp2.delete();
    drawTextC(c, DMS_M, 28, '+$352/mo back → your freedom date moves 3 years closer', W/2, H*0.82+48, TEAL, powerT);
  }
}

// ── Scene S4: End card ────────────────────────────────────────────────────────
function drawS4(c, lf) {
  drawRect(c, 0, 0, W, H, BG, 1);
  drawParticles(c, lf + S4_START);

  const enterT = easeOut(progress(lf, 0, 70));
  const pulse  = beatPulse(lf, 14);

  // Large teal sunrise
  if (enterT > 0) halfSun(c, W/2, H*0.52, 210 * enterT, enterT, pulse * 0.5);

  // Power copy
  const l1T = easeOut(progress(lf, 40, 100));
  const l2T = easeOut(progress(lf, 70, 130));
  const l3T = easeOut(progress(lf, 105, 165));
  if (l1T > 0) drawTextC(c, SYNE_XB, 70, "Don't let money run your life.", W/2, H*0.09, TEXT, l1T);
  if (l2T > 0) drawTextC(c, SYNE_XB, 70, 'Let your money hire you to', W/2, H*0.09 + 88, TEXT, l2T);
  if (l3T > 0) drawTextC(c, SYNE_XB, 70, 'chase your dreams.', W/2, H*0.09 + 176, TEAL, l3T);

  // Wordmark + URL
  const wmT  = easeOut(progress(lf, 145, 190));
  const urlT = easeOut(progress(lf, 170, 210));
  if (wmT > 0)  drawTextC(c, SYNE_XB, 52, 'untilfire', W/2, H*0.72, TEXT, wmT);
  if (urlT > 0) drawTextC(c, DMS_M, 30, 'www.untilfire.com', W/2, H*0.72 + 52, TEAL, urlT * 0.85);

  // Horizon line expanding from sun
  const lineT = easeOut(progress(lf, 155, 200));
  if (lineT > 0) {
    drawLine(c, W/2 - 230*lineT, H*0.52, W/2 + 230*lineT, H*0.52, TEAL, 0.3*lineT, 2);
  }

  const tagT = easeOut(progress(lf, 205, 245));
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
