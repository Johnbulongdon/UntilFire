// UntilFire demo video renderer — v11 (v8-faithful rebuild)
// Brand fonts: Syne (display), DM Sans (body), DM Mono (numbers)
// Real bank logos from simple-icons. 1080x1920 @ 30fps, 40.9s (120 BPM grid).
import canvasKitInit from 'canvaskit-wasm/bin/full/canvaskit.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const CK_BIN = path.dirname(require.resolve('canvaskit-wasm/bin/full/canvaskit.js'));

const W = 1080, H = 1920, FR = 30;
const W2 = W / 2;
const TOTAL = 1227;                     // 40.9s = music length
const FRAMES_DIR = path.join(__dirname, 'frames');
const OUT_MP4 = path.join(__dirname, 'untilfire-demo.mp4');
const MUSIC = process.argv.find(a => a.endsWith('.m4a') || a.endsWith('.mp3') || a.endsWith('.wav'));
const SPOT = process.argv[2] === 'spot';

// ── Brand palette ─────────────────────────────────────────────────────────────
const BG      = '#08080e';
const TEAL    = '#22d3a5';
const ORANGE  = '#f97316';
const GREEN   = '#059669';
const WHITE   = '#ffffff';
const GREY    = '#9ca3af';
const GREY_D  = '#6b7280';
const CARD    = '#111118';
const BORDER  = '#23232d';
const CONTRIB = '#0e6e57';   // contributions segment (darker teal)
const RED     = '#ef4444';
const YELLOW  = '#eab308';

// ── Timeline ──────────────────────────────────────────────────────────────────
// 120 BPM → beat every 15 frames; grid 14+15k
const S = [
  { id: 's0', start: 0    },  // hook + sunrise + power copy   0–11.1s
  { id: 's1', start: 333  },  // compounding chart + shuffle   11.1–22.5s
  { id: 's2', start: 675  },  // real bank logos               22.5–26.6s
  { id: 's3', start: 798  },  // leaks card                    26.6–33.4s
  { id: 's4', start: 1002 },  // end card                      33.4–40.9s
];
const sEnd = i => i < S.length - 1 ? S[i + 1].start : TOTAL;
const TRANS = 18;

// ── Easing ────────────────────────────────────────────────────────────────────
const ease = {
  out3:   t => 1 - (1 - t) ** 3,
  in3:    t => t ** 3,
  inOut:  t => t < .5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2,
  spring: t => {
    if (t <= 0) return 0; if (t >= 1) return 1;
    return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const prog  = (f, a, b) => clamp((f - a) / (b - a), 0, 1);
const ev    = (f, iS, iE, eI, oS, oE, eO) => eI(prog(f, iS, iE)) * (1 - eO(prog(f, oS, oE)));

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Ambient particles — guarantee something always moves
const PARTS = [];
{
  const rng = mulberry32(7);
  for (let i = 0; i < 42; i++) PARTS.push({
    x: rng() * W, y: rng() * H, s: rng() * 0.35 + 0.15,
    r: rng() * 1.6 + 0.8, a: rng() * 0.07 + 0.05, ph: rng() * 6.28,
  });
}

function beatPulse(lf, phase = 14) {
  const p = (((lf - phase) % 15) + 15) % 15;
  return Math.max(0, 1 - p / 5) ** 2;
}

let GF = 0, ck;
let SYNE_XB, SYNE_B, DMS_R, DMS_M, DMS_B, DMM_M;   // typefaces
let ICON_PATHS = [];                                // CanvasKit Path objects

// ── Drawing helpers ───────────────────────────────────────────────────────────
function rgb(hex) {
  hex = hex.replace('#', '');
  return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255];
}
function mkPaint(col, a = 1, stroke = false, sw = 1) {
  const p = new ck.Paint();
  const [r, g, b] = rgb(col);
  p.setColor(ck.Color4f(r, g, b, a));
  p.setAntiAlias(true);
  p.setStyle(stroke ? ck.PaintStyle.Stroke : ck.PaintStyle.Fill);
  if (stroke) p.setStrokeWidth(sw);
  return p;
}
const fillRect = (c, x, y, w, h, col, a = 1) => { const p = mkPaint(col, a); c.drawRect(ck.XYWHRect(x, y, w, h), p); p.delete(); };
const circle   = (c, x, y, r, col, a = 1) => { const p = mkPaint(col, a); c.drawCircle(x, y, r, p); p.delete(); };
const oCircle  = (c, x, y, r, col, a = 1, sw = 2) => { const p = mkPaint(col, a, true, sw); c.drawCircle(x, y, r, p); p.delete(); };
const rrect    = (c, x, y, w, h, rad, col, a = 1) => { const p = mkPaint(col, a); c.drawRRect(ck.RRectXY(ck.XYWHRect(x, y, w, h), rad, rad), p); p.delete(); };
const oRRect   = (c, x, y, w, h, rad, col, a = 1, sw = 1) => { const p = mkPaint(col, a, true, sw); c.drawRRect(ck.RRectXY(ck.XYWHRect(x, y, w, h), rad, rad), p); p.delete(); };
const ln       = (c, x1, y1, x2, y2, col, a = 1, sw = 2) => { const p = mkPaint(col, a, true, sw); c.drawLine(x1, y1, x2, y2, p); p.delete(); };

function measure(font, str) {
  if (!str) return 0;
  const ids = font.getGlyphIDs(str);
  return font.getGlyphWidths(ids).reduce((a, b) => a + b, 0);
}
// face: one of the loaded typefaces
function txt(c, str, x, y, face, size, col, a = 1, align = 'center', tracking = 0) {
  const font = new ck.Font(face, size);
  let w = measure(font, str) + tracking * (str.length - 1);
  let tx = x;
  if (align === 'center') tx = x - w / 2;
  if (align === 'right')  tx = x - w;
  const p = mkPaint(col, a);
  if (tracking === 0) {
    c.drawText(str, tx, y, p, font);
  } else {
    let cx = tx;
    for (const ch of str) {
      c.drawText(ch, cx, y, p, font);
      cx += measure(font, ch) + tracking;
    }
  }
  p.delete(); font.delete();
  return w;
}

function sceneBg(c) {
  fillRect(c, 0, 0, W, H, BG);
  for (const pt of PARTS) {
    const y = (((pt.y - GF * pt.s) % (H + 30)) + (H + 30)) % (H + 30) - 15;
    const x = pt.x + Math.sin(GF * 0.02 + pt.ph) * 14;
    const tw = 0.7 + 0.3 * Math.sin(GF * 0.07 + pt.ph * 3);
    circle(c, x, y, pt.r, TEAL, pt.a * tw);
  }
}

// ══ S0: Hook + sunrise + power copy ══════════════════════════════════════════
function s0(c, lf) {
  sceneBg(c);

  // — Sunrise (orange sun, 5 rays, rises over horizon) —
  const riseT = ease.out3(prog(lf, 0, 120));
  const glowT = ease.out3(prog(lf, 50, 180));
  const sunR = 96, hy = H * 0.56, cx = W2;
  // gentle bob after rise so it never freezes
  const bob = riseT >= 1 ? Math.sin(GF * 0.05) * 3 : 0;
  const cy = hy + sunR - sunR * 1.55 * riseT + bob;

  for (let ri = 4; ri >= 1; ri--)
    circle(c, cx, cy, sunR + ri * 30 + beatPulse(lf) * 12, ORANGE, 0.030 * glowT * ri / 2);

  c.save();
  c.clipRect(ck.XYWHRect(0, 0, W, hy + 1), ck.ClipOp.Intersect, true);
  circle(c, cx, cy, sunR, ORANGE, 0.95 * glowT);
  circle(c, cx - 20, cy - 24, sunR * 0.34, WHITE, 0.16 * glowT);
  c.restore();

  if (glowT > 0.25) {
    const shimmer = 0.85 + 0.15 * Math.sin(GF * 0.11);
    for (const ang of [-Math.PI * 0.82, -Math.PI * 0.66, -Math.PI * 0.5, -Math.PI * 0.34, -Math.PI * 0.18]) {
      const r1 = sunR + 12, r2 = sunR + 46 + beatPulse(lf) * 10;
      ln(c, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1,
            cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2, ORANGE, glowT * 0.8 * shimmer, 4);
    }
  }
  ln(c, 70, hy, W - 70, hy, TEAL, 0.25 * glowT, 1.5);

  // — Hook couplet: "What if work / was optional?" f14–90 —
  const ty = H * 0.70;
  const drift = 1 + 0.035 * prog(lf, 14, 145);   // slow zoom so holds never freeze
  const aT = ev(lf, 14, 30, ease.spring, 78, 92, ease.in3);
  const bT = ev(lf, 29, 45, ease.spring, 78, 92, ease.in3);
  if (aT > 0.01 || bT > 0.01) {
    c.save();
    c.translate(W2, ty + 50); c.scale(drift, drift); c.translate(-W2, -(ty + 50));
    if (aT > 0.01) txt(c, 'What if work', W2, ty, SYNE_XB, 78, WHITE, aT);
    if (bT > 0.01) txt(c, 'was optional?', W2, ty + 96, SYNE_XB, 78, TEAL, bT);
    c.restore();
  }

  // — "What would you do?" f97–148 —
  const cT = ev(lf, 97, 112, ease.spring, 136, 150, ease.in3);
  if (cT > 0.01) {
    const k = 1 + 0.04 * prog(lf, 97, 150);
    c.save(); c.translate(W2, ty + 40); c.scale(k, k); c.translate(-W2, -(ty + 40));
    txt(c, 'What would you do?', W2, ty + 40, DMS_M, 54, WHITE, cT);
    c.restore();
  }

  // — Power copy 1: f154–232 (2.6s dwell) —
  const d1 = ev(lf, 154, 169, ease.spring, 220, 234, ease.in3);
  const d1b = ev(lf, 169, 184, ease.spring, 220, 234, ease.in3);
  if (d1 > 0.01 || d1b > 0.01) {
    const k = 1 + 0.04 * prog(lf, 154, 234);
    c.save(); c.translate(W2, ty + 40); c.scale(k, k); c.translate(-W2, -(ty + 40));
    if (d1 > 0.01)  txt(c, "Don't let money", W2, ty - 10, SYNE_XB, 64, WHITE, d1);
    if (d1b > 0.01) {
      txt(c, 'stop you from being', W2, ty + 68, DMS_R, 44, GREY, d1b);
      txt(c, 'a good person.', W2, ty + 126, DMS_R, 44, GREY, d1b);
    }
    c.restore();
  }

  // — Power copy 2: cascade f239→ hold to pan-out (2.3s+ each line) —
  const e1 = ease.spring(prog(lf, 239, 254));
  const e2 = ease.spring(prog(lf, 254, 269));
  const e3 = ease.spring(prog(lf, 269, 284));
  if (e1 > 0.01) {
    const k = 1 + 0.035 * prog(lf, 239, 333);
    c.save(); c.translate(W2, ty + 60); c.scale(k, k); c.translate(-W2, -(ty + 60));
    txt(c, 'Let your money', W2, ty - 20, SYNE_XB, 62, TEAL, e1);
    if (e2 > 0.01) txt(c, 'hire you', W2, ty + 64, SYNE_XB, 84, TEAL, e2);
    if (e3 > 0.01) txt(c, 'to chase your dreams.', W2, ty + 144, SYNE_B, 48, ORANGE, e3);
    c.restore();
  }
}

// ══ S1: Compounding chart + bar shuffle ══════════════════════════════════════
// Compound model: totalV(x) = 0.42x + 0.82x^2.6 ; YMAX = 1.45 ; totalV(1)=1.24 → $1.24M
const totalV = x => 0.42 * x + 0.82 * x ** 2.6;
const YMAX = 1.45;
const N_BARS = 12;
// pop beats: quarter-beats then accelerating — audible speed-up
const POPS = [14, 29, 44, 59, 74, 89, 96, 104, 111, 119, 126, 134];
// messy "unplanned money" heights before the shuffle
const MESSY = [];
{ const rng = mulberry32(3); for (let i = 0; i < N_BARS; i++) MESSY.push(0.22 + rng() * 0.46); }
const MORPH_S = 149, MORPH_STAG = 5, MORPH_DUR = 30;       // shuffle 149→~239
const NUM_IN = 254, NUM_OUT = 314;                          // $1.24M dwell 2s, chart dimmed
const CHIP_IN = 319, CHIP_OUT = 339;                        // pans out with scene

function s1(c, lf) {
  sceneBg(c);

  const chX = 90, chY = H * 0.26, chW = W - 180, chH = H * 0.40;
  const gapR = 0.34;
  const bw = chW / (N_BARS + (N_BARS - 1) * gapR);
  const gap = bw * gapR;
  const baseY = chY + chH;

  const numW  = ev(lf, NUM_IN, NUM_IN + 10, ease.out3, NUM_OUT, NUM_OUT + 8, ease.in3);
  const chipW = ev(lf, CHIP_IN, CHIP_IN + 10, ease.out3, CHIP_OUT + 60, CHIP_OUT + 70, ease.in3);
  const dimT = numW;   // dim chart only for the big number; chip highlights segments instead

  // small kicker above chart
  const kickT = ev(lf, 8, 22, ease.out3, 320, 335, ease.in3);
  if (kickT > 0.01) {
    txt(c, 'YOUR MONEY, PLANNED', W2, chY - 96, DMM_M, 26, GREY_D, kickT * 0.9, 'center', 6);
    txt(c, 'Watch it compound', W2, chY - 40, SYNE_B, 52, WHITE, kickT);
  }

  const lp = new ck.Paint();
  lp.setAlphaf(1 - 0.7 * dimT);
  c.saveLayer(lp);

  // grid
  const gridT = prog(lf, 14, 34);
  for (let g = 1; g <= 4; g++)
    ln(c, chX, baseY - g / 4 * chH, chX + chW, baseY - g / 4 * chH, WHITE, 0.05 * gridT, 1);
  ln(c, chX, baseY, chX + chW, baseY, WHITE, 0.16 * gridT, 1);

  for (let i = 0; i < N_BARS; i++) {
    const popT = ease.spring(prog(lf, POPS[i], POPS[i] + 20));
    if (popT < 0.01) continue;

    const wt = prog(lf, MORPH_S + i * MORPH_STAG, MORPH_S + i * MORPH_STAG + MORPH_DUR);
    const wte = ease.inOut(wt);
    const isStub = i >= 9;

    // target after shuffle: growth curve for 0–8, stubs for 9–11
    const xFrac = (i + 1) / 9;
    const curveH = isStub ? [0.06, 0.045, 0.03][i - 9] : totalV(xFrac) / YMAX;
    const hFrac = MESSY[i] + (curveH - MESSY[i]) * wte;

    // pronounced shuffle sway (the animation the user liked)
    const sway = (wt > 0 && wt < 1) ? Math.sin(wt * Math.PI * 4) * 13 * (1 - wt) : 0;

    // beat breathing once settled
    let hPix = hFrac * chH;
    if (popT >= 1 && (wt <= 0 || wt >= 1) && !isStub)
      hPix *= 1 + 0.022 * beatPulse(lf) * (0.6 + 0.4 * Math.sin(i * 1.3));

    const h2 = hPix * popT;
    const bx = chX + i * (bw + gap) + sway;
    const topY = baseY - h2;

    const grownColor = isStub && wt > 0.5 ? RED : TEAL;
    rrect(c, bx, topY, bw, h2, 5, grownColor, popT * 0.92);

    // contributions split appears as the curve forms (linear part of model)
    if (!isStub && wte > 0.05 && h2 > 12) {
      const contribFrac = (0.42 * xFrac) / totalV(xFrac);
      const cH = h2 * contribFrac * wte;
      // chip phase: pulse the contributions segments so the label reads instantly
      const hl = chipW > 0.01 ? 0.92 + 0.08 * Math.sin(GF * 0.25) : 0.92;
      fillRect(c, bx, baseY - cH, bw, cH, CONTRIB, popT * hl);
    }
  }

  c.restore();
  lp.delete();

  // — $1.24M reveal (chart dimmed under it) —
  if (numW > 0.01) {
    const sh = 1 + 0.05 * beatPulse(lf) * numW;
    c.save();
    c.translate(W2, H * 0.46); c.scale(sh, sh); c.translate(-W2, -H * 0.46);
    txt(c, '$1.24M', W2, H * 0.46, DMM_M, 132, TEAL, numW);
    txt(c, 'projected by your freedom date', W2, H * 0.46 + 70, DMS_R, 38, WHITE, numW * 0.75);
    c.restore();
  }

  // — contributions legend chip (chart visible, segments pulsing) —
  if (chipW > 0.01) {
    const cpy = baseY + 70;
    const swW = 26;
    const mf = new ck.Font(DMS_M, 32);
    const labelW = measure(mf, 'your contributions — the rest is growth');
    mf.delete();
    const total = swW + 16 + labelW;
    fillRect(c, W2 - total / 2, cpy - 20, swW, swW, CONTRIB, chipW);
    txt(c, 'your contributions — the rest is growth', W2 - total / 2 + swW + 16 + labelW / 2, cpy + 4, DMS_M, 32, GREY, chipW);
  }
}

// ══ S2: Real bank logos ══════════════════════════════════════════════════════
let ICONS_META = [];
function s2(c, lf) {
  sceneBg(c);

  const headT = ev(lf, 6, 20, ease.out3, 108, 120, ease.in3);
  if (headT > 0.01) {
    txt(c, 'Connect your', W2, H * 0.115, DMS_R, 44, GREY, headT * 0.85);
    txt(c, 'whole financial world', W2, H * 0.165, SYNE_B, 56, WHITE, headT);
  }

  const cols = 3, rows = 5;
  const cellW = 300, cellH = 168;
  const gridW = cols * cellW, gridH = rows * cellH;
  const gx = W2 - gridW / 2, gy = H * 0.225;

  for (let i = 0; i < 15; i++) {
    const row = Math.floor(i / cols), col = i % cols;
    const cxx = gx + col * cellW + cellW / 2;
    const cyy = gy + row * cellH + cellH / 2;
    // one row per beat
    const popT = ease.spring(prog(lf, 8 + row * 15 + col * 3, 8 + row * 15 + col * 3 + 16));
    if (popT < 0.01) continue;

    const meta = ICONS_META[i];
    const sc = 0.65 + 0.35 * popT;
    c.save();
    c.translate(cxx, cyy); c.scale(sc, sc); c.translate(-cxx, -cyy);

    rrect(c, cxx - 128, cyy - 64, 256, 128, 18, CARD, popT * 0.95);
    oRRect(c, cxx - 128, cyy - 64, 256, 128, 18, BORDER, popT * 0.7, 1);

    // brand tint wash
    rrect(c, cxx - 128, cyy - 64, 256, 128, 18, '#' + meta.hex, popT * 0.10);

    // icon — brand color, or white if the brand color is too dark for the card
    const [r, g, b] = rgb('#' + meta.hex);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const iconCol = lum < 0.22 ? WHITE : '#' + meta.hex;
    const isz = 56, ik = isz / 24;
    c.save();
    c.translate(cxx - isz / 2, cyy - isz / 2 - 12); c.scale(ik, ik);
    const ip = mkPaint(iconCol, popT * 0.95);
    c.drawPath(ICON_PATHS[i], ip);
    ip.delete();
    c.restore();

    txt(c, meta.title, cxx, cyy + 48, DMS_M, 24, GREY, popT * 0.9);

    // beat ring
    const bp = beatPulse(lf);
    if (bp > 0.05) oRRect(c, cxx - 132, cyy - 68, 264, 136, 20, TEAL, bp * 0.30 * popT, 1.5);
    c.restore();
  }

  // scan line sweeping the wall
  const scanT = prog(lf, 18, 112);
  if (scanT > 0 && scanT < 1) {
    const sy = gy + scanT * gridH;
    const sa = 0.55 * Math.sin(scanT * Math.PI);
    ln(c, gx - 14, sy, gx + gridW + 14, sy, TEAL, sa, 2);
    for (let gi = 1; gi <= 3; gi++) {
      ln(c, gx - 14, sy - gi * 4, gx + gridW + 14, sy - gi * 4, TEAL, sa * 0.13 / gi, 1);
      ln(c, gx - 14, sy + gi * 4, gx + gridW + 14, sy + gi * 4, TEAL, sa * 0.13 / gi, 1);
    }
  }

  const badgeT = ev(lf, 96, 110, ease.spring, 118, 123, ease.in3);
  if (badgeT > 0.01) {
    const bp = 1 + 0.03 * beatPulse(lf);
    c.save(); c.translate(W2, H * 0.90); c.scale(bp, bp); c.translate(-W2, -H * 0.90);
    rrect(c, W2 - 190, H * 0.90 - 36, 380, 64, 32, GREEN, badgeT * 0.95);
    txt(c, 'Tracked automatically', W2, H * 0.90 + 6, DMS_B, 30, WHITE, badgeT);
    c.restore();
  }
}

// ══ S3: Leaks card ═══════════════════════════════════════════════════════════
const LEAKS = [
  { label: 'Unused subscriptions', amount: '$247/mo', color: RED },
  { label: 'Dining out',           amount: '$380/mo', color: ORANGE },
  { label: 'Impulse shopping',     amount: '$156/mo', color: YELLOW },
];
function s3(c, lf) {
  sceneBg(c);

  const headT = ev(lf, 6, 20, ease.out3, 186, 198, ease.in3);
  if (headT > 0.01) {
    txt(c, 'It finds where money', W2, H * 0.105, DMS_R, 44, GREY, headT * 0.85);
    txt(c, 'leaks', W2, H * 0.168, SYNE_XB, 88, ORANGE, headT);
  }

  const cardT = ev(lf, 14, 29, ease.out3, 186, 198, ease.in3);
  const cw = W - 90, chh = 420, cx0 = 45, cy0 = H * 0.225;
  if (cardT > 0.01) {
    rrect(c, cx0, cy0, cw, chh, 24, CARD, cardT * 0.96);
    oRRect(c, cx0, cy0, cw, chh, 24, BORDER, cardT * 0.6, 1);
  }

  const ROWB = [29, 59, 89];
  for (let i = 0; i < 3; i++) {
    const rT = ev(lf, ROWB[i], ROWB[i] + 16, ease.spring, 186, 198, ease.in3);
    if (rT < 0.01) continue;
    const ry = cy0 + 64 + i * 100;
    const { label, amount, color } = LEAKS[i];
    circle(c, cx0 + 38, ry + 14, 9, color, rT * 0.95);
    txt(c, label, cx0 + 64, ry + 24, DMS_M, 36, WHITE, rT * 0.92, 'left');
    txt(c, amount, cx0 + cw - 36, ry + 24, DMM_M, 38, color, rT, 'right');
    const barMax = cw - 100;
    const fills = [0.62, 0.95, 0.39];
    const fw = barMax * fills[i] * ease.out3(prog(lf, ROWB[i] + 8, ROWB[i] + 32));
    fillRect(c, cx0 + 50, ry + 52, barMax, 4, BORDER, rT * 0.5);
    fillRect(c, cx0 + 50, ry + 52, fw, 4, color, rT * 0.92);
  }

  const totT = ev(lf, 119, 133, ease.spring, 186, 198, ease.in3);
  if (totT > 0.01) {
    const ty2 = cy0 + 64 + 300 + 6;
    ln(c, cx0 + 36, ty2 - 14, cx0 + cw - 36, ty2 - 14, BORDER, totT * 0.7, 1);
    txt(c, 'leaking every month', cx0 + 64, ty2 + 30, DMS_R, 34, GREY_D, totT * 0.85, 'left');
    txt(c, '$783', cx0 + cw - 36, ty2 + 32, DMM_M, 52, RED, totT, 'right');
  }

  const ctaT = ev(lf, 149, 164, ease.spring, 186, 198, ease.in3);
  if (ctaT > 0.01) {
    const pl = 1 + 0.03 * beatPulse(lf);
    c.save(); c.translate(W2, H * 0.72); c.scale(pl, pl); c.translate(-W2, -H * 0.72);
    txt(c, "That's $9,396 a year", W2, H * 0.715, SYNE_B, 54, WHITE, ctaT);
    txt(c, 'yours to invest instead', W2, H * 0.760, DMS_M, 38, TEAL, ctaT * 0.9);
    c.restore();
  }

  const fdT = ev(lf, 164, 178, ease.spring, 186, 198, ease.in3);
  if (fdT > 0.01) {
    const sh = 1 + 0.04 * beatPulse(lf) * fdT;
    c.save(); c.translate(W2, H * 0.845); c.scale(sh, sh); c.translate(-W2, -H * 0.845);
    rrect(c, W2 - 290, H * 0.845 - 40, 580, 76, 38, GREEN, fdT * 0.95);
    txt(c, 'Your freedom date moves closer', W2, H * 0.845 + 8, DMS_B, 32, WHITE, fdT);
    c.restore();
  }
}

// ══ S4: End card — blue half-sun logo, wordmark, URL ═════════════════════════
function s4(c, lf) {
  sceneBg(c);

  // glow — teal
  for (let ri = 5; ri >= 1; ri--)
    circle(c, W2, H * 0.36, ri * 62 + beatPulse(lf) * 20, TEAL, 0.022);

  // half-sun (teal/blue) above its horizon line — the approved logo
  const lr = 80, lx = W2, ly = H * 0.36;
  c.save();
  c.clipRect(ck.XYWHRect(lx - lr * 2, ly - lr * 2, lr * 4, lr * 2), ck.ClipOp.Intersect, true);
  circle(c, lx, ly, lr, TEAL, 0.94);
  c.restore();
  ln(c, lx - lr * 1.45, ly, lx + lr * 1.45, ly, TEAL, 0.65, 3);

  // 5 rays
  for (const ang of [-Math.PI * 0.82, -Math.PI * 0.66, -Math.PI * 0.5, -Math.PI * 0.34, -Math.PI * 0.18]) {
    const pulse = beatPulse(lf) * 0.3;
    const r1 = lr + 10, r2 = lr + 38 + pulse * 14;
    ln(c, lx + Math.cos(ang) * r1, ly + Math.sin(ang) * r1,
          lx + Math.cos(ang) * r2, ly + Math.sin(ang) * r2, TEAL, 0.75 + pulse * 0.25, 4);
  }

  const wmT = ev(lf, 8, 22, ease.out3, 212, 224, ease.in3);
  if (wmT > 0.01) txt(c, 'untilfire', W2, H * 0.455, SYNE_XB, 84, WHITE, wmT);

  const tagT = ev(lf, 29, 44, ease.spring, 212, 224, ease.in3);
  if (tagT > 0.01) {
    txt(c, 'Personal finance', W2, H * 0.530, DMS_R, 40, GREY, tagT * 0.85);
    txt(c, 'that sets you free.', W2, H * 0.578, SYNE_B, 50, WHITE, tagT);
  }

  const fdT = ev(lf, 59, 74, ease.spring, 212, 224, ease.in3);
  if (fdT > 0.01) {
    const sc = 1 + 0.04 * beatPulse(lf) * fdT;
    c.save(); c.translate(W2, H * 0.675); c.scale(sc, sc); c.translate(-W2, -H * 0.675);
    txt(c, 'Find your freedom date — free', W2, H * 0.675, DMS_M, 38, TEAL, fdT);
    c.restore();
  }

  const urlT = ev(lf, 89, 104, ease.spring, 212, 224, ease.in3);
  if (urlT > 0.01) {
    const k = 1 + 0.02 * Math.sin(GF * 0.06);
    c.save(); c.translate(W2, H * 0.775); c.scale(k, k); c.translate(-W2, -H * 0.775);
    txt(c, 'www.untilfire.com', W2, H * 0.775, DMM_M, 46, WHITE, urlT * 0.9);
    c.restore();
  }

  const lineT = ev(lf, 104, 120, ease.out3, 212, 224, ease.in3);
  if (lineT > 0.01) {
    const lw = (W - 200) * lineT;
    ln(c, W2 - lw / 2, H * 0.815, W2 + lw / 2, H * 0.815, TEAL, lineT * 0.45, 2);
  }
}

// ── Dispatch + filmstrip pan ──────────────────────────────────────────────────
const FNS = [s0, s1, s2, s3, s4];
function sceneIdx(f) { let k = 0; for (let i = 0; i < S.length; i++) if (f >= S[i].start) k = i; return k; }

function renderFrame(c, f) {
  GF = f;
  const si = sceneIdx(f), ss = S[si].start, se = sEnd(si), lf = f - ss;
  const tOut = si < S.length - 1 ? prog(f, se - TRANS, se) : 0;

  if (tOut > 0) {
    const ni = si + 1, nlf = f - S[ni].start, e = ease.inOut(tOut);
    c.save(); c.clipRect(ck.XYWHRect(0, 0, W, H), ck.ClipOp.Intersect, true);
    c.translate(-W * e, 0); FNS[si](c, lf); c.restore();
    c.save(); c.clipRect(ck.XYWHRect(0, 0, W, H), ck.ClipOp.Intersect, true);
    c.translate(W * (1 - e), 0); FNS[ni](c, Math.max(nlf, 0)); c.restore();
  } else {
    FNS[si](c, lf);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  ck = await canvasKitInit({ locateFile: f => path.join(CK_BIN, f) });

  const F = p => ck.Typeface.MakeFreeTypeFaceFromData(readFileSync(path.join(__dirname, 'fonts', p)).buffer);
  SYNE_XB = F('Syne-ExtraBold.ttf');
  SYNE_B  = F('Syne-Bold.ttf');
  DMS_R   = F('DMSans-Regular.ttf');
  DMS_M   = F('DMSans-Medium.ttf');
  DMS_B   = F('DMSans-Bold.ttf');
  DMM_M   = F('DMMono-Medium.ttf');

  ICONS_META = JSON.parse(readFileSync(path.join(__dirname, 'icons.json'), 'utf8'));
  ICON_PATHS = ICONS_META.map(m => ck.Path.MakeFromSVGString(m.path));

  if (!existsSync(FRAMES_DIR)) mkdirSync(FRAMES_DIR, { recursive: true });

  const surface = ck.MakeSurface(W, H);
  if (!surface) throw new Error('MakeSurface failed');

  const frames = SPOT
    ? [20, 50, 90, 120, 170, 210, 260, 300, 347, 380, 420, 460, 500, 540, 600, 640, 690, 720, 760, 830, 900, 960, 1020, 1080, 1140, 1200]
    : Array.from({ length: TOTAL }, (_, i) => i);

  console.log(`Rendering ${frames.length} frames...`);
  const t0 = Date.now();
  for (const f of frames) {
    renderFrame(surface.getCanvas(), f);
    surface.flush();
    const img = surface.makeImageSnapshot();
    const png = img.encodeToBytes(ck.ImageFormat.PNG, 90);
    img.delete();
    writeFileSync(`${FRAMES_DIR}/f${String(f).padStart(5, '0')}.png`, Buffer.from(png));
    if (f % 60 === 0) process.stdout.write(`\r f${f}/${TOTAL} ${((Date.now() - t0) / 1000).toFixed(0)}s   `);
  }
  surface.delete();
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  if (!SPOT) {
    const ffmpegBin = (await import('ffmpeg-static')).default;
    const audio = MUSIC && existsSync(MUSIC) ? `-i "${MUSIC}" -c:a aac -b:a 192k -shortest` : '';
    execSync(`${ffmpegBin} -y -framerate ${FR} -i ${FRAMES_DIR}/f%05d.png ${audio} -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p ${OUT_MP4}`, { stdio: 'inherit' });
    console.log('→ ' + OUT_MP4 + (audio ? ' (with music)' : ' (silent — pass music path as argument)'));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
