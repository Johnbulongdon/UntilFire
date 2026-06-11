// UntilFire demo video — HORIZONTAL 1920x1080 per docs/design/demo-video-requirements.md
// Real product UI (screen captures), all suns teal, zero orange.
import canvasKitInit from 'canvaskit-wasm/bin/full/canvaskit.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const CK_BIN = path.dirname(require.resolve('canvaskit-wasm/bin/full/canvaskit.js'));

const W = 1920, H = 1080, FR = 30;
const W2 = W / 2, H2 = H / 2;
const TOTAL = 1227;                       // 40.9s = music length (120 BPM)
const FRAMES_DIR = path.join(__dirname, 'frames_h');
const OUT_MP4 = path.join(__dirname, 'untilfire-demo-h.mp4');
const MUSIC = process.argv.find(a => /\.(m4a|mp3|wav)$/.test(a));
const SPOT = process.argv[2] === 'spot';

// ── Palette (NO ORANGE — hard requirement) ────────────────────────────────────
const BG     = '#08080e';
const TEAL   = '#22d3a5';
const TEAL_D = '#0e6e57';
const GREEN  = '#059669';
const WHITE  = '#ffffff';
const GREY   = '#9ca3af';
const GREY_D = '#6b7280';
const CARD   = '#111118';
const BORDER = '#23232d';

// ── Timeline (beats every 15f, grid 14+15k) ───────────────────────────────────
const S = [
  { id: 'hook',    start: 0    },   // teal sunrise + "What if work was optional?"
  { id: 'product', start: 240  },   // real UI: hero → city → income → savings → net worth → running
  { id: 'result',  start: 630  },   // real UI: freedom date / FIRE number / monthly move (Ken Burns)
  { id: 'copy',    start: 840  },   // power copy
  { id: 'end',     start: 1017 },   // end card, blue half-sun, www.untilfire.com
];
const sEnd = i => i < S.length - 1 ? S[i + 1].start : TOTAL;
const TRANS = 18;

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
const lerp  = (a, b, t) => a + (b - a) * t;

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const PARTS = [];
{
  const rng = mulberry32(7);
  for (let i = 0; i < 48; i++) PARTS.push({
    x: rng() * W, y: rng() * H, s: rng() * 0.35 + 0.15,
    r: rng() * 1.6 + 0.8, a: rng() * 0.07 + 0.05, ph: rng() * 6.28,
  });
}
function beatPulse(lf, phase = 14) {
  const p = (((lf - phase) % 15) + 15) % 15;
  return Math.max(0, 1 - p / 5) ** 2;
}

let GF = 0, ck;
let SYNE_XB, SYNE_B, DMS_R, DMS_M, DMS_B, DMM_M;
let IMG = {};   // decoded screenshots

// ── helpers ───────────────────────────────────────────────────────────────────
function rgb(hex) { hex = hex.replace('#', ''); return [parseInt(hex.slice(0,2),16)/255, parseInt(hex.slice(2,4),16)/255, parseInt(hex.slice(4,6),16)/255]; }
function mkPaint(col, a = 1, stroke = false, sw = 1) {
  const p = new ck.Paint();
  const [r, g, b] = rgb(col);
  p.setColor(ck.Color4f(r, g, b, a));
  p.setAntiAlias(true);
  p.setStyle(stroke ? ck.PaintStyle.Stroke : ck.PaintStyle.Fill);
  if (stroke) p.setStrokeWidth(sw);
  return p;
}
const fillRect = (c,x,y,w,h,col,a=1) => { const p=mkPaint(col,a); c.drawRect(ck.XYWHRect(x,y,w,h),p); p.delete(); };
const circle   = (c,x,y,r,col,a=1) => { const p=mkPaint(col,a); c.drawCircle(x,y,r,p); p.delete(); };
const rrect    = (c,x,y,w,h,rad,col,a=1) => { const p=mkPaint(col,a); c.drawRRect(ck.RRectXY(ck.XYWHRect(x,y,w,h),rad,rad),p); p.delete(); };
const oRRect   = (c,x,y,w,h,rad,col,a=1,sw=1) => { const p=mkPaint(col,a,true,sw); c.drawRRect(ck.RRectXY(ck.XYWHRect(x,y,w,h),rad,rad),p); p.delete(); };
const ln       = (c,x1,y1,x2,y2,col,a=1,sw=2) => { const p=mkPaint(col,a,true,sw); c.drawLine(x1,y1,x2,y2,p); p.delete(); };
function measure(font, str) { if (!str) return 0; const ids = font.getGlyphIDs(str); return font.getGlyphWidths(ids).reduce((a,b)=>a+b,0); }
function txt(c, str, x, y, face, size, col, a = 1, align = 'center', tracking = 0) {
  const font = new ck.Font(face, size);
  let w = measure(font, str) + tracking * Math.max(0, str.length - 1);
  let tx = align === 'center' ? x - w/2 : align === 'right' ? x - w : x;
  const p = mkPaint(col, a);
  if (tracking === 0) c.drawText(str, tx, y, p, font);
  else { let cx = tx; for (const ch of str) { c.drawText(ch, cx, y, p, font); cx += measure(font, ch) + tracking; } }
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
// draw an image region (src rect in image px) into dst rect
function img(c, im, sx, sy, sw, sh, dx, dy, dw, dh, alpha = 1) {
  const p = new ck.Paint();
  p.setAlphaf(alpha);
  c.drawImageRectOptions(im, ck.XYWHRect(sx, sy, sw, sh), ck.XYWHRect(dx, dy, dw, dh),
    ck.FilterMode.Linear, ck.MipmapMode.Linear, p);
  p.delete();
}

// teal half-sun with exactly 5 rays above a horizon line
function halfSun(c, x, y, r, alpha = 1, rayPulse = 0) {
  c.save();
  c.clipRect(ck.XYWHRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 2.2), ck.ClipOp.Intersect, true);
  circle(c, x, y, r, TEAL, 0.94 * alpha);
  c.restore();
  ln(c, x - r * 1.45, y, x + r * 1.45, y, TEAL, 0.65 * alpha, Math.max(2, r * 0.04));
  for (const ang of [-Math.PI*0.82, -Math.PI*0.66, -Math.PI*0.5, -Math.PI*0.34, -Math.PI*0.18]) {
    const r1 = r * 1.12, r2 = r * 1.45 + rayPulse * r * 0.18;
    ln(c, x + Math.cos(ang)*r1, y + Math.sin(ang)*r1, x + Math.cos(ang)*r2, y + Math.sin(ang)*r2,
       TEAL, (0.75 + rayPulse * 0.25) * alpha, Math.max(2.5, r * 0.05));
  }
}

// ══ S0: hook + teal sunrise ═══════════════════════════════════════════════════
function sHook(c, lf) {
  sceneBg(c);
  const riseT = ease.out3(prog(lf, 0, 110));
  const glowT = ease.out3(prog(lf, 40, 160));
  const sunR = 110, hy = H * 0.58, cx = W2;
  const bob = riseT >= 1 ? Math.sin(GF * 0.05) * 3 : 0;
  const cy = hy + sunR - sunR * 1.55 * riseT + bob;

  for (let ri = 4; ri >= 1; ri--)
    circle(c, cx, cy, sunR + ri * 34 + beatPulse(lf) * 14, TEAL, 0.016 * glowT * ri);

  c.save();
  c.clipRect(ck.XYWHRect(0, 0, W, hy + 1), ck.ClipOp.Intersect, true);
  circle(c, cx, cy, sunR, TEAL, 0.95 * glowT);
  circle(c, cx - 24, cy - 28, sunR * 0.34, WHITE, 0.15 * glowT);
  c.restore();
  if (glowT > 0.25) {
    for (const ang of [-Math.PI*0.82, -Math.PI*0.66, -Math.PI*0.5, -Math.PI*0.34, -Math.PI*0.18]) {
      const r1 = sunR + 14, r2 = sunR + 52 + beatPulse(lf) * 11;
      ln(c, cx + Math.cos(ang)*r1, cy + Math.sin(ang)*r1, cx + Math.cos(ang)*r2, cy + Math.sin(ang)*r2,
         TEAL, glowT * 0.8 * (0.85 + 0.15 * Math.sin(GF * 0.11)), 4);
    }
  }
  ln(c, 160, hy, W - 160, hy, TEAL, 0.25 * glowT, 1.5);

  // hook: one line, then the question — both get long dwell
  const drift = 1 + 0.035 * prog(lf, 14, 232);
  const aT = ev(lf, 14, 30, ease.spring, 118, 132, ease.in3);
  if (aT > 0.01) {
    c.save(); c.translate(W2, H * 0.80); c.scale(drift, drift); c.translate(-W2, -H * 0.80);
    txt(c, 'What if work was optional?', W2, H * 0.81, SYNE_XB, 72, WHITE, aT);
    c.restore();
  }
  const bT = ev(lf, 134, 150, ease.spring, 224, 238, ease.in3);
  if (bT > 0.01) {
    c.save(); c.translate(W2, H * 0.80); c.scale(drift, drift); c.translate(-W2, -H * 0.80);
    txt(c, 'What would you do?', W2, H * 0.81, SYNE_XB, 72, TEAL, bT);
    c.restore();
  }
}

// ══ S1: real product walkthrough ══════════════════════════════════════════════
// browser frame on the right, step captions on the left, steps swap on beats
const STEPS = [
  { key: 'hero',     in: 0,   label: 'Meet UntilFire',        sub: 'No account. No setup. 60 seconds.' },
  { key: 'city',     in: 75,  label: 'Say where you live',    sub: 'or skip it — your call' },
  { key: 'income',   in: 150, label: 'What you earn',         sub: 'monthly take-home is enough' },
  { key: 'savings',  in: 225, label: 'What you save',         sub: 'or what you spend' },
  { key: 'networth', in: 300, label: 'Where you stand today', sub: 'net worth + age (optional)' },
  { key: 'running',  in: 360, label: 'It runs your projection', sub: 'taxes, city costs, compounding' },
];
const STEP_KEYS = { hero:'00-hero', city:'01-city-typed', income:'04-income-filled', savings:'06-savings-filled', networth:'08-networth-filled', running:'09-reveal-1' };

function browserFrame(c, x, y, w, h, alpha) {
  rrect(c, x - 3, y - 3, w + 6, h + 6, 18, BORDER, alpha);
  rrect(c, x, y, w, h, 16, '#1a1a22', alpha);
  // chrome bar
  const bar = 46;
  circle(c, x + 28, y + bar / 2, 6.5, '#3d3d48', alpha);
  circle(c, x + 52, y + bar / 2, 6.5, '#3d3d48', alpha);
  circle(c, x + 76, y + bar / 2, 6.5, '#3d3d48', alpha);
  rrect(c, x + w / 2 - 170, y + 9, 340, bar - 18, 14, '#0d0d13', alpha);
  txt(c, 'www.untilfire.com', x + w / 2, y + bar / 2 + 7, DMM_M, 19, GREY, alpha * 0.9);
  return bar;
}

function sProduct(c, lf) {
  sceneBg(c);

  // left rail
  const railT = ev(lf, 4, 18, ease.out3, 372, 386, ease.in3);
  if (railT > 0.01) {
    txt(c, 'THE REAL PRODUCT', 80, H * 0.16, DMM_M, 22, TEAL, railT * 0.9, 'left', 6);
    ln(c, 80, H * 0.19, 360, H * 0.19, TEAL, 0.35 * railT, 2);
  }

  // browser frame
  const fw = 1380, fh = 910;
  const fx = W - fw - 70, fy = H2 - fh / 2 + 10;
  const frameT = ev(lf, 8, 24, ease.out3, 372, 388, ease.in3);

  // which step is active
  let idx = 0;
  for (let i = 0; i < STEPS.length; i++) if (lf >= STEPS[i].in) idx = i;
  const st = STEPS[idx];
  const stT = ease.inOut(prog(lf, st.in, st.in + 12));        // slide-in of current step
  const prevKey = idx > 0 ? STEPS[idx - 1].key : null;

  if (frameT > 0.01) {
    const breathe = 1 + 0.004 * beatPulse(lf);
    c.save();
    c.translate(fx + fw/2, fy + fh/2); c.scale(breathe, breathe); c.translate(-(fx + fw/2), -(fy + fh/2));

    const bar = browserFrame(c, fx, fy, fw, fh, frameT);
    const vx = fx + 8, vy = fy + bar, vw = fw - 16, vh = fh - bar - 8;

    c.save();
    c.clipRRect(ck.RRectXY(ck.XYWHRect(vx, vy, vw, vh), 10, 10), ck.ClipOp.Intersect, true);

    // slow Ken Burns inside the viewport so it never freezes
    const kb = 1 + 0.018 * Math.sin(GF * 0.012 + idx);
    const drawShot = (key, dxOff, a) => {
      const im = IMG[STEP_KEYS[key]];
      if (!im) return;
      const iw = im.width(), ih = im.height();
      // cover-fit: src aspect 1.6 vs viewport aspect
      const va = vw / vh, ia = iw / ih;
      let sw = iw, sh = ih, sx = 0, sy = 0;
      if (ia > va) { sw = ih * va; sx = (iw - sw) / 2; } else { sh = iw / va; sy = 0; }
      // zoom (Ken Burns) by shrinking src
      const z = kb;
      const zw = sw / z, zh = sh / z;
      img(c, im, sx + (sw - zw)/2, sy + (sh - zh)/2 * 0.4, zw, zh, vx + dxOff, vy, vw, vh, a);
    };

    // step slide transition: previous exits left, current enters from right
    if (stT < 1 && prevKey) {
      drawShot(prevKey, -vw * stT, 1);
      drawShot(st.key, vw * (1 - stT), 1);
    } else {
      drawShot(st.key, 0, 1);
    }
    c.restore();

    // teal beat ring around the frame
    const bp = beatPulse(lf);
    if (bp > 0.05) oRRect(c, fx - 8, fy - 8, fw + 16, fh + 16, 22, TEAL, bp * 0.25 * frameT, 2);
    c.restore();
  }

  // left captions for current step (swap with the step)
  const capT = ev(lf, st.in + 4, st.in + 18, ease.spring,
                  idx < STEPS.length - 1 ? STEPS[idx + 1].in : 372,
                  (idx < STEPS.length - 1 ? STEPS[idx + 1].in : 372) + 12, ease.in3);
  if (capT > 0.01 && railT > 0.01) {
    const cyy = H * 0.42;
    txt(c, String(idx + 1).padStart(2, '0'), 80, cyy - 64, DMM_M, 44, TEAL_D, capT, 'left');
    // wrap label at ~14 chars
    const words = st.label.split(' ');
    let line = '', lines = [];
    for (const w of words) { if ((line + ' ' + w).trim().length > 10) { lines.push(line.trim()); line = w; } else line += ' ' + w; }
    lines.push(line.trim());
    lines.forEach((l, i) => txt(c, l, 80, cyy + i * 56, SYNE_B, 44, WHITE, capT, 'left'));
    txt(c, st.sub, 80, cyy + lines.length * 56 + 14, DMS_R, 24, GREY, capT * 0.85, 'left');

    // step progress dots
    for (let i = 0; i < STEPS.length; i++) {
      const on = i === idx;
      circle(c, 86 + i * 30, H * 0.78, on ? 7 : 4.5, on ? TEAL : GREY_D, on ? capT : 0.5);
    }
  }
}

// ══ S2: result — Ken Burns through the real result screen ════════════════════
// shots phases (local): 0–60 full view, 60–120 freedom date, 120–165 FIRE number, 165–210 monthly move
function sResult(c, lf) {
  sceneBg(c);
  const im = IMG['11-result-top'];                // 3200x2000
  if (!im) return;
  const iw = im.width(), ih = im.height();

  // src rects (in 3200x2000 space) — aspect 16:9 → height = width * 0.5625
  const R = (x, y, w) => ({ x, y, w, h: w * (H / W) });
  const FULL  = R(0, 60, 3200);
  const DATE  = R(470, 470, 1500);     // "YOUR FREEDOM DATE February 2043"
  const NUM   = R(1560, 200, 1340);    // "$1,320,000 FIRE NUMBER"
  const MOVE  = R(1540, 1320, 1520);   // "THE MONTHLY MOVE" card + path chart

  const phases = [
    { at: 0,   rect: FULL },
    { at: 60,  rect: DATE },
    { at: 120, rect: NUM  },
    { at: 165, rect: MOVE },
  ];
  let pi = 0;
  for (let i = 0; i < phases.length; i++) if (lf >= phases[i].at) pi = i;
  const cur = phases[pi];
  const nxt = phases[Math.min(pi + 1, phases.length - 1)];
  const t = pi < phases.length - 1 ? ease.inOut(prog(lf, nxt.at - 22, nxt.at)) : 0;

  // continuous drift inside each phase so it never freezes
  const drift = 1 + 0.012 * Math.sin(GF * 0.015);
  let sx = lerp(cur.rect.x, nxt.rect.x, t);
  let sy = lerp(cur.rect.y, nxt.rect.y, t);
  let sw = lerp(cur.rect.w, nxt.rect.w, t) / drift;
  let sh = sw * (H / W);
  sx += (lerp(cur.rect.w, nxt.rect.w, t) - sw) / 2;
  sy += (lerp(cur.rect.h, nxt.rect.h, t) - sh) / 2;
  sx = clamp(sx, 0, iw - sw); sy = clamp(sy, 0, ih - sh);

  const inT = ease.out3(prog(lf, 0, 14));
  img(c, im, sx, sy, sw, sh, 0, 0, W, H, inT);

  // soft dark vignette edges so it sits in the brand world
  fillRect(c, 0, 0, W, 70, BG, 0.55);
  fillRect(c, 0, H - 70, W, 70, BG, 0.55);

  // kicker chip per phase
  const labels = ['Your result, instantly', 'Your freedom date', 'Your FIRE number', 'Your next move'];
  const chipT = ev(lf, cur.at + 6, cur.at + 18, ease.spring,
                   pi < phases.length - 1 ? nxt.at - 22 : 196, (pi < phases.length - 1 ? nxt.at - 22 : 196) + 10, ease.in3);
  if (chipT > 0.01) {
    const label = labels[pi];
    const f = new ck.Font(DMS_B, 30);
    const tw = measure(f, label); f.delete();
    const cw = tw + 76, chx = W2 - cw / 2, chy = H - 96;
    rrect(c, chx, chy, cw, 56, 28, '#062e22', chipT * 0.92);
    oRRect(c, chx, chy, cw, 56, 28, TEAL, chipT * 0.5, 1.5);
    circle(c, chx + 30, chy + 28, 6 + beatPulse(lf) * 2.5, TEAL, chipT);
    txt(c, label, chx + 52, chy + 38, DMS_B, 30, WHITE, chipT, 'left');
  }
}

// ══ S3: power copy (teal/white only) ═════════════════════════════════════════
function sCopy(c, lf) {
  sceneBg(c);
  // faint teal sun glow behind
  for (let ri = 5; ri >= 1; ri--)
    circle(c, W2, H2, ri * 90 + beatPulse(lf) * 22, TEAL, 0.012);

  const drift = 1 + 0.03 * prog(lf, 0, 177);
  c.save(); c.translate(W2, H2); c.scale(drift, drift); c.translate(-W2, -H2);

  // line 1: f8–85 (2.5s)
  const a = ev(lf, 8, 23, ease.spring, 76, 90, ease.in3);
  if (a > 0.01) {
    txt(c, "Don't let money", W2, H2 - 40, SYNE_XB, 84, WHITE, a);
    txt(c, 'stop you from being a good person.', W2, H2 + 50, DMS_R, 44, GREY, a * 0.9);
  }
  // line 2: f95–177 (2.7s+, exits via pan)
  const b1 = ease.spring(prog(lf, 95, 110));
  const b2 = ease.spring(prog(lf, 110, 125));
  if (b1 > 0.01) {
    txt(c, 'Let your money hire you', W2, H2 - 40, SYNE_XB, 84, TEAL, b1);
    if (b2 > 0.01) txt(c, 'to chase your dreams.', W2, H2 + 64, SYNE_XB, 64, WHITE, b2);
  }
  c.restore();
}

// ══ S4: end card ══════════════════════════════════════════════════════════════
function sEndCard(c, lf) {
  sceneBg(c);
  for (let ri = 5; ri >= 1; ri--)
    circle(c, W2, H * 0.34, ri * 64 + beatPulse(lf) * 20, TEAL, 0.02);

  halfSun(c, W2, H * 0.34, 92, 1, beatPulse(lf));

  const wmT = ev(lf, 8, 22, ease.out3, 198, 210, ease.in3);
  if (wmT > 0.01) txt(c, 'untilfire', W2, H * 0.50, SYNE_XB, 88, WHITE, wmT);

  const tagT = ev(lf, 29, 44, ease.spring, 198, 210, ease.in3);
  if (tagT > 0.01) {
    txt(c, 'Personal finance that sets you free.', W2, H * 0.60, SYNE_B, 44, WHITE, tagT);
  }
  const fdT = ev(lf, 59, 74, ease.spring, 198, 210, ease.in3);
  if (fdT > 0.01) {
    const sc = 1 + 0.04 * beatPulse(lf) * fdT;
    c.save(); c.translate(W2, H * 0.70); c.scale(sc, sc); c.translate(-W2, -H * 0.70);
    txt(c, 'Find your freedom date — free, no login', W2, H * 0.70, DMS_M, 34, TEAL, fdT);
    c.restore();
  }
  const urlT = ev(lf, 89, 104, ease.spring, 198, 210, ease.in3);
  if (urlT > 0.01) {
    const k = 1 + 0.02 * Math.sin(GF * 0.06);
    c.save(); c.translate(W2, H * 0.82); c.scale(k, k); c.translate(-W2, -H * 0.82);
    txt(c, 'www.untilfire.com', W2, H * 0.82, DMM_M, 44, WHITE, urlT * 0.92);
    c.restore();
  }
  const lineT = ev(lf, 104, 120, ease.out3, 198, 210, ease.in3);
  if (lineT > 0.01) {
    const lw = 720 * lineT;
    ln(c, W2 - lw/2, H * 0.875, W2 + lw/2, H * 0.875, TEAL, lineT * 0.45, 2);
  }
}

// ── dispatch + filmstrip pan ──────────────────────────────────────────────────
const FNS = [sHook, sProduct, sResult, sCopy, sEndCard];
function sceneIdx(f) { let k = 0; for (let i = 0; i < S.length; i++) if (f >= S[i].start) k = i; return k; }
function renderFrame(c, f) {
  GF = f;
  const si = sceneIdx(f), ss = S[si].start, se = sEnd(si), lf = f - ss;
  const tOut = si < S.length - 1 ? prog(f, se - TRANS, se) : 0;
  if (tOut > 0) {
    const ni = si + 1, nlf = f - S[ni].start, e = ease.inOut(tOut);
    c.save(); c.clipRect(ck.XYWHRect(0,0,W,H), ck.ClipOp.Intersect, true);
    c.translate(-W * e, 0); FNS[si](c, lf); c.restore();
    c.save(); c.clipRect(ck.XYWHRect(0,0,W,H), ck.ClipOp.Intersect, true);
    c.translate(W * (1 - e), 0); FNS[ni](c, Math.max(nlf, 0)); c.restore();
  } else {
    FNS[si](c, lf);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  ck = await canvasKitInit({ locateFile: f => path.join(CK_BIN, f) });
  const F = p => ck.Typeface.MakeFreeTypeFaceFromData(readFileSync(path.join(__dirname, 'fonts', p)).buffer);
  SYNE_XB = F('Syne-ExtraBold.ttf'); SYNE_B = F('Syne-Bold.ttf');
  DMS_R = F('DMSans-Regular.ttf'); DMS_M = F('DMSans-Medium.ttf'); DMS_B = F('DMSans-Bold.ttf');
  DMM_M = F('DMMono-Medium.ttf');

  for (const k of ['00-hero','01-city-typed','04-income-filled','06-savings-filled','08-networth-filled','09-reveal-1','11-result-top']) {
    IMG[k] = ck.MakeImageFromEncoded(readFileSync(path.join(__dirname, 'shots', k + '.png')));
    if (!IMG[k]) throw new Error('decode failed: ' + k);
  }

  if (!existsSync(FRAMES_DIR)) mkdirSync(FRAMES_DIR, { recursive: true });
  const surface = ck.MakeSurface(W, H);
  if (!surface) throw new Error('MakeSurface failed');

  const frames = SPOT
    ? [20, 60, 120, 180, 230, 252, 300, 340, 400, 470, 540, 600, 640, 700, 760, 810, 852, 900, 960, 1000, 1030, 1090, 1150, 1210]
    : Array.from({ length: TOTAL }, (_, i) => i);

  console.log(`Rendering ${frames.length} frames at ${W}x${H}...`);
  const t0 = Date.now();
  for (const f of frames) {
    renderFrame(surface.getCanvas(), f);
    surface.flush();
    const im = surface.makeImageSnapshot();
    const png = im.encodeToBytes(ck.ImageFormat.PNG, 90);
    im.delete();
    writeFileSync(`${FRAMES_DIR}/f${String(f).padStart(5, '0')}.png`, Buffer.from(png));
    if (f % 60 === 0) process.stdout.write(`\r f${f}/${TOTAL} ${((Date.now()-t0)/1000).toFixed(0)}s   `);
  }
  surface.delete();
  console.log(`\nDone in ${((Date.now()-t0)/1000).toFixed(1)}s`);

  if (!SPOT) {
    const ffmpegBin = (await import('ffmpeg-static')).default;
    const audio = MUSIC && existsSync(MUSIC) ? `-i "${MUSIC}" -c:a aac -b:a 192k -shortest` : '';
    execSync(`${ffmpegBin} -y -framerate ${FR} -i ${FRAMES_DIR}/f%05d.png ${audio} -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p ${OUT_MP4}`, { stdio: 'inherit' });
    console.log('→ ' + OUT_MP4 + (audio ? ' (with music)' : ' (silent)'));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
