/**
 * Share formats without branding (D-60): a poster and a life timeline drawn
 * on a canvas (so the preview is the PNG you download, in the app's fonts),
 * and a Reddit-ready Markdown comment, since many subs don't allow images in
 * comments. No logo, no link: the person's plan, not an ad.
 */
import type { ReportData } from "./FreedomReport";

type Money = (n: number) => string;
const css = (name: string, fallback: string) =>
  (typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue(name).trim()) || fallback;
const fonts = () => ({ display: css("--uf-font-display", "Georgia, serif"), body: css("--uf-font", "system-ui, sans-serif"), mono: css("--uf-font-mono", "ui-monospace, monospace") });
const freeLabel = (d: ReportData) => (d.age !== null ? String(d.age) : `${Math.max(1, Math.round((d.date.getTime() - Date.now()) / (365.25 * 864e5)))}y`);

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function stats(ctx: CanvasRenderingContext2D, items: [string, string][], x: number, y: number, w: number, h: number, light: boolean) {
  const f = fonts(), gap = 18, cw = (w - gap * (items.length - 1)) / items.length;
  items.forEach(([k, v], i) => {
    const bx = x + i * (cw + gap);
    box(ctx, bx, y, cw, h, 22); ctx.fillStyle = light ? "#F3EBDF" : "rgba(255,255,255,.14)"; ctx.fill();
    ctx.fillStyle = light ? "#6B5C48" : "rgba(255,255,255,.8)"; ctx.font = `600 26px ${f.body}`; ctx.fillText(k, bx + 24, y + 44);
    ctx.fillStyle = light ? "#2A2117" : "#fff"; ctx.font = `600 40px ${f.mono}`; ctx.fillText(v, bx + 24, y + 96);
  });
}

/** A · Poster, 1080×1350: the age, the path to it, three numbers. */
export function drawPoster(c: HTMLCanvasElement, d: ReportData, compact: Money, money: Money) {
  const W = 1080, H = 1350, ctx = c.getContext("2d")!, f = fonts();
  c.width = W; c.height = H;
  const g = ctx.createRadialGradient(W * 0.85, 0, 40, W * 0.6, H * 0.3, H);
  g.addColorStop(0, "#f6b26b"); g.addColorStop(0.18, "#e9895a"); g.addColorStop(0.5, "#3c6e5f"); g.addColorStop(1, "#14302a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,213,154,.5)"; ctx.beginPath(); ctx.arc(W - 70, 70, 220, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = `700 34px ${f.body}`; ctx.fillText("MY FREEDOM PLAN", 72, 120);
  ctx.fillStyle = "#fff"; ctx.font = `600 400px ${f.display}`; ctx.fillText(freeLabel(d), 56, 470);
  ctx.font = `600 64px ${f.display}`; ctx.fillText(d.age !== null ? "years old" : "from now", 72, 560);
  ctx.font = `500 46px ${f.body}`; ctx.fillStyle = "rgba(255,255,255,.95)";
  ctx.fillText(`Free in ${d.date.getFullYear()}, spending ${money(d.spend)} a year.`, 72, 650);
  // The path: invested money rising to the target line.
  const pts = d.path, top = 760, bottom = 1030, max = Math.max(d.target * 1.08, ...pts.map((p) => p.total));
  const x = (i: number) => (i / Math.max(1, pts.length - 1)) * W, y = (v: number) => bottom - (v / max) * (bottom - top);
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.total)) : ctx.moveTo(x(i), y(p.total))));
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; ctx.stroke();
  ctx.lineTo(W, bottom + 40); ctx.lineTo(0, bottom + 40); ctx.closePath(); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fill();
  ctx.setLineDash([14, 14]); ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, y(d.target)); ctx.lineTo(W, y(d.target)); ctx.stroke(); ctx.setLineDash([]);
  // The dot sits where the path meets the target: the freedom date, in years from now.
  const yearsToFree = (d.date.getTime() - Date.now()) / (365.25 * 864e5);
  ctx.fillStyle = "#ffd59a"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x(Math.min(pts.length - 1, yearsToFree)), y(d.target), 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  stats(ctx, [["Saving", d.savingPct !== null ? `${Math.round(d.savingPct * 100)}%` : compact(d.savingTotal)], ["Invested now", compact(d.invested)], ["Goal", compact(d.target)]], 72, 1090, W - 144, 130, false);
  ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.font = `500 24px ${f.body}`;
  ctx.fillText(`My own numbers · ${+(d.growthRate * 100).toFixed(1)}% growth after inflation · ${+(d.withdrawalRate * 100).toFixed(1)}% withdrawals · not advice`, 72, 1290);
}

/** B · Life timeline, 1200×800: today, free, the bridge, the pension opening, 90. */
export function drawTimeline(c: HTMLCanvasElement, d: ReportData, compact: Money, money: Money) {
  const W = 1200, H = 800, ctx = c.getContext("2d")!, f = fonts();
  c.width = W; c.height = H;
  ctx.fillStyle = "#FFFDFA"; ctx.fillRect(0, 0, W, H);
  const now = d.currentAge ?? 0, years = (d.date.getTime() - Date.now()) / (365.25 * 864e5);
  const free = d.age ?? Math.round(now + years), end = Math.max(90, (d.bridge?.at ?? 0) + 10, free + 20);
  ctx.fillStyle = "#2A2117"; ctx.font = `600 76px ${f.display}`;
  const head = d.currentAge !== null ? `${now} → free at ` : "Free in ";
  ctx.fillText(head, 80, 150); const hw = ctx.measureText(head).width;
  ctx.fillStyle = "#0E9C86"; ctx.fillText(d.currentAge !== null ? String(free) : `${Math.round(years)} years`, 80 + hw, 150);
  ctx.fillStyle = "#6B5C48"; ctx.font = `500 34px ${f.body}`;
  ctx.fillText(`Saving ${money(d.savingTotal)} a year to spend ${money(d.spend)} a year, for good.`, 80, 215);
  const L = 80, R = W - 80, Y = 380, x = (a: number) => L + ((a - now) / (end - now)) * (R - L);
  const seg = (a: number, b: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x(a), Y, Math.max(0, x(b) - x(a)), 30); };
  box(ctx, L, Y, R - L, 30, 15); ctx.save(); ctx.clip();
  seg(now, free, "#2A2117");
  const opens = d.bridge && d.bridge.at > free ? d.bridge.at : null;
  if (opens) { seg(free, opens, "#0E9C86"); seg(opens, end, "#9fd8c9"); } else seg(free, end, "#0E9C86");
  ctx.restore();
  const pin = (a: number, big: string, small: string, below = false, align: CanvasTextAlign = "center") => {
    const px = x(a); ctx.fillStyle = "#9A8A73"; ctx.fillRect(px - 2, below ? Y + 36 : Y - 40, 4, 34);
    ctx.textAlign = align; ctx.fillStyle = "#2A2117"; ctx.font = `700 40px ${/½/.test(big) ? f.body : f.mono}`; ctx.fillText(big, px, below ? Y + 112 : Y - 92);
    ctx.fillStyle = "#6B5C48"; ctx.font = `500 28px ${f.body}`; ctx.fillText(small, px, below ? Y + 150 : Y - 54); ctx.textAlign = "left";
  };
  if (d.currentAge !== null) { pin(now, String(now), "today", false, "left"); pin(free, String(free), "free"); pin(end, String(end), "", false, "right"); }
  if (opens) pin(opens, d.bridge!.accessAge, `${d.bridge!.name} opens`, true);
  ctx.font = `500 26px ${f.body}`; let lx = L;
  for (const [col, t] of [["#2A2117", "Working"], ["#0E9C86", opens ? "Bridge: money you can reach" : "Free"], ...(opens ? [["#9fd8c9", "Everything"]] : [])] as [string, string][]) {
    box(ctx, lx, 600, 28, 18, 5); ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = "#6B5C48"; ctx.fillText(t, lx + 38, 617); lx += 60 + ctx.measureText(t).width;
  }
  stats(ctx, [["Invested now", compact(d.invested)], ["Saving", d.savingPct !== null ? `${Math.round(d.savingPct * 100)}%` : compact(d.savingTotal)], ["Goal", compact(d.target)]], 80, 650, W - 160, 120, true);
}

/**
 * D · A Reddit comment in Markdown: a line, the plan as a table with a real
 * header (Reddit draws an empty header as a blank shaded row), the what-ifs as
 * their own table, then the assumptions in italics.
 */
export function redditMarkdown(d: ReportData, money: Money): string {
  const wr = +(d.withdrawalRate * 100).toFixed(1);
  const when = d.age !== null ? `free at about ${d.age} (${d.date.getFullYear()})` : `free in ${d.date.getFullYear()}`;
  const rows: [string, string][] = [
    ["Saving / yr" + (d.saving.some((s) => /employer/i.test(s.label)) ? " (incl. employer)" : ""), `${money(d.savingTotal)}${d.savingPct !== null ? ` (${Math.round(d.savingPct * 100)}% of pay)` : ""}`],
    ["Invested now", money(d.invested)],
    ["Spend when free", `${money(d.spend)} / yr`],
    [`Target (${money(d.spend)} ÷ ${wr}%)`, money(d.target)],
    ...(d.bridge ? [[`Bridge to ${d.bridge.accessAge}`, `${d.bridge.ok ? "✅" : "⚠️"} ${money(d.bridge.reachable)} reachable vs ${money(d.bridge.needed)} needed`] as [string, string]] : []),
  ];
  const mid = d.grid.growths.length >> 1;
  const whatIf = d.grid.spends.map((s, i) => [s, d.grid.ages[i][mid]] as const).filter(([, a]) => a !== null);
  const noes = d.conservative.filter((t) => /^No /.test(t)).map((t) => t.replace(/^No /, "no ").split(":")[0].replace(/ counted$/, ""));
  return [
    `Ran my numbers: **${when}**.`, "",
    "| My plan | |", "|---|---|", ...rows.map(([k, v]) => `| ${k} | ${v} |`), "",
    ...(whatIf.length > 1 ? [`| If I spend | ${d.currentAge ? "Free at" : "Free in"} |`, "|---|---|", ...whatIf.map(([s, a]) => `| ${money(s)} / yr | ${d.currentAge ? a : `${a} years`} |`), ""] : []),
    `*${+(d.growthRate * 100).toFixed(1)}% growth after inflation, ${wr}% withdrawals${noes.length ? `, ${noes.join(", ")}` : ""}. Estimate, not advice.*`,
  ].join("\n");
}
