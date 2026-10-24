"use client";

import { useEffect, useRef, useState } from "react";
import { drawPoster, drawTimeline, redditMarkdown } from "./ShareCards";
import { createPortal } from "react-dom";

/**
 * The one-page freedom plan (D-60): a page anyone can save as a PDF and share,
 * built only from the numbers they entered. It earns trust by showing its
 * working: the inputs, the formula, the path, the bridge to the pension age,
 * how the answer moves if spending or growth differ, and what it leaves out.
 * Branding can be turned off, for places (Reddit) where a logo reads as an ad.
 * It is a printed page, so it keeps the light palette in both themes.
 */
export type ReportData = {
  date: Date;
  age: number | null;
  currentAge: number | null;
  place: string;
  target: number;
  spend: number;
  spendIsGoal: boolean;
  withdrawalRate: number;
  growthRate: number;
  invested: number;
  balances: { label: string; value: number }[];
  saving: { label: string; value: number; note?: string }[];
  savingTotal: number;
  savingPct: number | null;
  spendingToday: number;
  gross: number | null;
  path: { age: number; total: number; reachable: number }[];
  bridge: null | { accessAge: string; at: number; years: number; needed: number; reachable: number; locked: number; ok: boolean; name: string };
  grid: { spends: number[]; growths: number[]; ages: (number | null)[][] };
  conservative: string[];
  notIncluded: string[];
};

const C = { card: "#FFFDFA", s2: "#F3EBDF", b: "#EADCC8", ink: "#2A2117", ink2: "#6B5C48", ink3: "#9A8A73", green: "#12856A", teal: "#0E9C86", blue: "#2a78d6", pen: "#c58a4a", pos: "#DDF1EA" };
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono), ui-monospace, monospace", fontVariantNumeric: "tabular-nums" };
const serif = "var(--uf-font-display), Fraunces, Georgia, serif";
const h2: React.CSSProperties = { font: `600 16px ${serif}`, margin: "0 0 8px", color: C.ink };
const sec: React.CSSProperties = { borderTop: `1px solid ${C.b}`, paddingTop: 14 };
const sub: React.CSSProperties = { color: C.ink3, fontSize: 11.5, margin: "6px 0 0" };
const td: React.CSSProperties = { padding: "5px 0", borderBottom: `1px solid ${C.b}` };

function Chart({ d, money }: { d: ReportData; money: (n: number) => string }) {
  const W = 470, H = 210, L = 46, R = 14, T = 14, B = 28;
  const pts = d.path;
  if (pts.length < 2) return null;
  const a0 = pts[0].age, a1 = pts[pts.length - 1].age;
  const max = Math.max(d.target * 1.15, ...pts.map((p) => p.total));
  const x = (a: number) => L + ((a - a0) / (a1 - a0)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = (k: "total" | "reachable") => pts.map((p) => `${x(p.age).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const area = (k: "total" | "reachable") => `M${x(a0)},${y(0)} L${line(k).replace(/ /g, " L")} L${x(a1)},${y(0)} Z`;
  const step = max > 4e6 ? 2e6 : max > 1.5e6 ? 1e6 : max > 6e5 ? 2.5e5 : 1e5;
  const ticks = Array.from({ length: Math.floor(max / step) }, (_, i) => (i + 1) * step);
  const freeAge = d.age ?? a1, fx = x(Math.min(a1, Math.max(a0, freeAge + 0.98))), ty = y(d.target);
  const ageTicks = Array.from({ length: 5 }, (_, i) => Math.round(a0 + ((a1 - a0) * i) / 4));
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Invested money by age, reaching ${money(d.target)}${d.age ? ` at ${d.age}` : ""}`}>
    {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={C.b} /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill={C.ink3} style={mono}>{money(v)}</text></g>)}
    {ageTicks.map((a) => <text key={a} x={x(a)} y={H - 8} textAnchor="middle" fontSize={10} fill={C.ink3} style={mono}>{a}</text>)}
    <path d={area("total")} fill={C.teal} opacity={0.14} />
    {d.bridge && <path d={area("reachable")} fill={C.blue} opacity={0.22} />}
    <polyline points={line("total")} fill="none" stroke={C.teal} strokeWidth={2.5} />
    {d.bridge && <polyline points={line("reachable")} fill="none" stroke={C.blue} strokeWidth={1.6} strokeDasharray="4 3" />}
    <line x1={L} x2={W - R} y1={ty} y2={ty} stroke={C.ink} strokeWidth={1.2} strokeDasharray="5 4" />
    <text x={L + 4} y={ty - 6} fontSize={11} fontWeight={700} fill={C.ink}>Target {money(d.target)}</text>
    <circle cx={fx} cy={ty} r={5.5} fill={C.teal} stroke={C.card} strokeWidth={2} />
    {d.age !== null && <text x={fx - 2} y={ty - 8} textAnchor="end" fontSize={11} fontWeight={700} fill={C.teal}>Free at {d.age}</text>}
  </svg>;
}

export function ReportPage({ d, branded, money, compact }: { d: ReportData; branded: boolean; money: (n: number) => string; compact: (n: number) => string }) {
  const when = d.date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prepared = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const share = d.target > 0 ? Math.min(1, d.invested / d.target) : 0;
  const kpi = (label: string, value: React.ReactNode) => <div style={{ background: C.s2, borderRadius: 12, padding: "10px 12px" }}><span style={{ display: "block", fontSize: 11.5, color: C.ink2 }}>{label}</span><b style={{ fontSize: 18, ...mono }}>{value}</b></div>;
  const list = (items: string[]) => <ul style={{ display: "grid", gap: 4, margin: 0, padding: 0, listStyle: "none" }}>{items.map((t) => <li key={t} style={{ display: "flex", gap: 8 }}><span style={{ color: C.ink3 }}>○</span>{t}</li>)}</ul>;
  const pct = (g: number) => `${+(g * 100).toFixed(1)}%`;
  return <div className="uf-report-page" style={{ width: "100%", maxWidth: 860, margin: "0 auto", background: C.card, color: C.ink, borderRadius: 6, padding: "34px 40px 26px", font: "13px/1.45 var(--uf-font), system-ui, sans-serif", boxShadow: "0 12px 40px #3a2a1222" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderBottom: `1px solid ${C.b}`, paddingBottom: 12 }}>
      <b style={{ fontSize: 15 }}>{branded ? "UntilFire · Freedom plan" : "Freedom plan"}</b>
      <div style={{ color: C.ink3, fontSize: 12, textAlign: "right" }}>Prepared {prepared}<br /><span style={{ background: C.s2, borderRadius: 99, padding: "3px 10px", color: C.ink2, fontWeight: 600 }}>Built only from numbers entered</span></div>
    </div>
    <div className="uf-report-hero" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 26, margin: "20px 0 6px", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.ink3 }}>{[d.currentAge ? `Age ${d.currentAge}` : null, d.place || null].filter(Boolean).join(" · ")}</div>
        <h1 style={{ font: `600 40px/1.08 ${serif}`, margin: "6px 0 8px", color: C.teal }}>Free in {when}{d.age !== null && <>, <span style={{ color: C.ink }}>at {d.age}</span></>}</h1>
        <p style={{ fontSize: 15, color: C.ink2, margin: 0 }}>When <b style={mono}>{money(d.target)}</b> invested can pay <b style={mono}>{money(d.spend)}</b> a year, for good.</p>
        <div style={{ height: 10, borderRadius: 99, background: C.s2, margin: "14px 0 4px", overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${Math.max(1, share * 100)}%`, background: C.teal }} /></div>
        <div style={{ ...mono, ...sub, margin: 0 }}>{money(d.invested)} today · {Math.round(share * 100)}% there</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {kpi("Saving a year", money(d.savingTotal))}
        {kpi(d.gross ? "Of pay, with employer" : "Of take-home", d.savingPct !== null ? `${Math.round(d.savingPct * 100)}%` : "—")}
        {kpi("Spending today", money(d.spendingToday))}
        {kpi(d.bridge ? `Bridge to ${d.bridge.accessAge}` : "Withdrawal rate", d.bridge ? <span style={{ color: d.bridge.ok ? C.green : "#b4532a" }}>{d.bridge.ok ? "✓ passes" : "short"}</span> : pct(d.withdrawalRate))}
      </div>
    </div>
    <div className="uf-report-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginTop: 18 }}>
      <div style={sec}><h2 style={h2}>How it&apos;s worked out</h2>
        <div style={{ background: C.s2, borderRadius: 12, padding: "10px 14px", fontSize: 15, margin: "2px 0 10px", ...mono }}>{money(d.spend)} ÷ {pct(d.withdrawalRate)} = {money(d.target)}</div>
        <Chart d={d} money={compact} />
        <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: C.ink2, marginTop: 4, flexWrap: "wrap" }}>
          <span><i style={{ display: "inline-block", width: 14, height: 3, background: C.teal, marginRight: 5, verticalAlign: "middle" }} />All invested</span>
          {d.bridge && <span><i style={{ display: "inline-block", width: 14, height: 3, background: C.blue, marginRight: 5, verticalAlign: "middle" }} />Reachable before {d.bridge.accessAge}</span>}
          <span><i style={{ display: "inline-block", width: 14, height: 3, background: C.ink, marginRight: 5, verticalAlign: "middle" }} />Target</span>
        </div>
      </div>
      <div style={sec}><h2 style={h2}>The numbers used</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
          {d.gross ? <tr><td style={td}>Salary</td><td style={{ ...td, ...mono, textAlign: "right" }}>{money(d.gross)}</td></tr> : null}
          {d.saving.map((r) => <tr key={r.label}><td style={td}>{r.label}{r.note && <small style={{ color: C.ink3, marginLeft: 6 }}>{r.note}</small>}</td><td style={{ ...td, ...mono, textAlign: "right" }}>{money(r.value)}/yr</td></tr>)}
          <tr><td style={td}>Invested now<small style={{ color: C.ink3, marginLeft: 6 }}>{d.balances.filter((b) => b.value > 0).map((b) => `${b.label} ${compact(b.value)}`).join(" · ")}</small></td><td style={{ ...td, ...mono, textAlign: "right" }}>{money(d.invested)}</td></tr>
          <tr><td style={{ ...td, borderBottom: 0 }}>{d.spendIsGoal ? "Spend once free" : "Spending, now and once free"}</td><td style={{ ...td, borderBottom: 0, ...mono, textAlign: "right" }}>{money(d.spend)}/yr</td></tr>
        </tbody></table>
      </div>
    </div>
    <div className="uf-report-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginTop: 18 }}>
      {d.bridge ? <div style={sec}><h2 style={h2}>Can the money be reached{d.age !== null ? ` at ${d.age}` : ""}?</h2>
        <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", margin: "6px 0 4px" }}><i style={{ width: `${(d.bridge.reachable / (d.bridge.reachable + d.bridge.locked)) * 100}%`, background: C.blue }} /><i style={{ flex: 1, background: C.pen }} /></div>
        <div style={{ ...mono, ...sub, margin: 0, display: "flex", justifyContent: "space-between" }}><span>{compact(d.bridge.reachable)} any age</span><span>{compact(d.bridge.locked)} opens at {d.bridge.accessAge}</span></div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}><tbody>
          <tr><td style={td}>Needed for {Math.ceil(d.bridge.years)} years until {d.bridge.accessAge}</td><td style={{ ...td, ...mono, textAlign: "right" }}>{money(d.bridge.needed)}</td></tr>
          <tr><td style={td}>Reachable before then</td><td style={{ ...td, ...mono, textAlign: "right", color: d.bridge.ok ? C.green : "#b4532a", fontWeight: 700 }}>{money(d.bridge.reachable)}</td></tr>
          <tr><td style={{ ...td, borderBottom: 0 }}>{d.bridge.ok ? "Room to spare" : "Short by"}</td><td style={{ ...td, borderBottom: 0, ...mono, textAlign: "right" }}>{money(Math.abs(d.bridge.reachable - d.bridge.needed))}</td></tr>
        </tbody></table>
        {d.bridge.ok && d.bridge.reachable - d.bridge.needed < d.bridge.needed * 0.1 && <p style={sub}>Thin margin: saving more into the {d.bridge.name} instead of reachable accounts would delay freedom.</p>}
      </div> : <div style={sec}><h2 style={h2}>Pension access</h2><p style={{ margin: 0, color: C.ink2 }}>Not checked: confirm when your pension opens in the plan to see whether enough can be reached before then.</p></div>}
      <div style={sec}><h2 style={h2}>If things go differently</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}><tbody>
          <tr><th />{d.grid.growths.map((g, i) => <th key={g} style={{ fontSize: 11.5, color: C.ink3, padding: "6px 4px" }}>{pct(g)}{i === 0 ? " growth" : ""}</th>)}</tr>
          {d.grid.spends.map((s, i) => <tr key={s} style={{ borderTop: i ? `1px solid ${C.b}` : undefined }}><td style={{ textAlign: "left", fontWeight: 600, padding: "6px 4px" }}>Spend {money(s)}</td>
            {d.grid.ages[i].map((a, j) => <td key={j} style={{ ...mono, padding: "6px 4px" }}><span style={i === 1 && j === 1 ? { background: C.pos, borderRadius: 8, padding: "4px 10px", fontWeight: 800, color: "#0f6b56" } : undefined}>{a ?? "—"}</span></td>)}</tr>)}
        </tbody></table>
        <p style={sub}>{d.currentAge ? "Age when free." : "Years to freedom."} Growth is after inflation; US stocks averaged about 6–7% after inflation over the last century, with long bad stretches.</p>
      </div>
    </div>
    <div className="uf-report-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginTop: 18 }}>
      <div style={sec}><h2 style={h2}>Kept conservative</h2>{list(d.conservative)}</div>
      <div style={sec}><h2 style={h2}>Not included</h2>{list(d.notIncluded)}<p style={sub}>Each can move the date.</p></div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderTop: `1px solid ${C.b}`, marginTop: 18, paddingTop: 12, color: C.ink3, fontSize: 11.5 }}>
      <span>An estimate from the numbers entered, not financial advice.</span>
      {branded && <span>Make your own free at <b style={{ color: C.green }}>untilfire.com</b></span>}
    </div>
  </div>;
}

/**
 * The page in a full-screen sheet with its two choices: branding on or off,
 * and Save as PDF (the browser's print, so nothing is uploaded anywhere).
 * Printing shows the page alone.
 */
export type ShareFormat = "page" | "poster" | "timeline" | "reddit";
const FORMATS: { key: ShareFormat; label: string }[] = [
  { key: "page", label: "Full page" }, { key: "poster", label: "Poster" }, { key: "timeline", label: "Timeline" }, { key: "reddit", label: "Reddit text" },
];

export default function FreedomReport({ d, money, compact, onClose, onExport }: {
  d: ReportData; money: (n: number) => string; compact: (n: number) => string; onClose: () => void;
  onExport?: (format: ShareFormat, branded: boolean) => void;
}) {
  const [branded, setBranded] = useState(true);
  const [format, setFormat] = useState<ShareFormat>("page");
  const [copied, setCopied] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const markdown = format === "reddit" ? redditMarkdown(d, money) : "";
  // The cards are drawn once the app's fonts have loaded, so the PNG uses them too.
  useEffect(() => {
    const c = canvas.current;
    if (!c || (format !== "poster" && format !== "timeline")) return;
    let live = true;
    document.fonts.ready.then(() => { if (live) (format === "poster" ? drawPoster : drawTimeline)(c, d, compact, money); });
    return () => { live = false; };
  }, [format, d, compact, money]);
  const download = () => {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      // On a phone, straight to the share sheet (Reddit, Instagram, Messages) where it can take a file.
      const file = new File([blob], `freedom-plan-${format}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) { navigator.share({ files: [file] }).catch(() => {}); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `freedom-plan-${format}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
    onExport?.(format, false);
  };
  const copy = () => { navigator.clipboard?.writeText(markdown).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); onExport?.("reddit", false); };
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const pill = (on: boolean): React.CSSProperties => ({ padding: "7px 14px", borderRadius: 99, border: 0, cursor: "pointer", fontWeight: 700, fontSize: 13,
    background: on ? "var(--uf-ink)" : "transparent", color: on ? "var(--uf-card)" : "var(--uf-ink-2)" });
  // On <body> itself, so printing can drop everything else and the page prints alone, on one sheet.
  return createPortal(<div role="dialog" aria-modal aria-label="One-page freedom plan" className="uf-report-overlay"
    style={{ position: "fixed", inset: 0, zIndex: 1000, overflowY: "auto", background: "color-mix(in srgb, var(--uf-bg) 92%, #000)", padding: "16px 16px 48px" }}>
    <style>{`
      @media print {
        @page { size: A4; margin: 8mm; }
        body > *:not(.uf-report-overlay) { display: none !important; }
        html, body { background: #fff !important; height: auto !important; }
        .uf-report-overlay { position: static !important; overflow: visible !important; background: #fff !important; padding: 0 !important; }
        .uf-report-page { box-shadow: none !important; max-width: none !important; padding: 0 !important; zoom: 0.86; }
        .uf-report-controls { display: none !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      @media (max-width: 720px) { .uf-report-page { padding: 22px 18px !important; } .uf-report-hero, .uf-report-grid { grid-template-columns: 1fr !important; } }
    `}</style>
    <div className="uf-report-controls" style={{ maxWidth: 860, margin: "0 auto 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={onClose} style={{ ...pill(false), border: "1px solid var(--uf-border-2)", background: "var(--uf-card)" }}>← Back</button>
      <div role="tablist" aria-label="Format" style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--uf-card)", border: "1px solid var(--uf-border)", flexWrap: "wrap" }}>
        {FORMATS.map((f) => <button key={f.key} type="button" role="tab" aria-selected={format === f.key} onClick={() => setFormat(f.key)} style={pill(format === f.key)}>{f.label}</button>)}
      </div>
      {format === "page" && <div role="radiogroup" aria-label="Branding" style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 99, background: "var(--uf-card)", border: "1px solid var(--uf-border)" }}>
        <button type="button" role="radio" aria-checked={branded} onClick={() => setBranded(true)} style={pill(branded)}>With UntilFire</button>
        <button type="button" role="radio" aria-checked={!branded} onClick={() => setBranded(false)} style={pill(!branded)}>No branding</button>
      </div>}
      <button type="button" onClick={format === "page" ? () => { onExport?.("page", branded); window.print(); } : format === "reddit" ? copy : download}
        style={{ marginLeft: "auto", padding: "9px 16px", borderRadius: 12, border: 0, cursor: "pointer", fontWeight: 700, background: "var(--uf-green)", color: "#fff" }}>
        {format === "page" ? "Save as PDF" : format === "reddit" ? (copied ? "Copied ✓" : "Copy as Markdown") : "Download PNG"}</button>
    </div>
    {format === "page" && <ReportPage d={d} branded={branded} money={money} compact={compact} />}
    {(format === "poster" || format === "timeline") && <canvas ref={canvas} aria-label={format === "poster" ? "Poster of your freedom plan" : "Timeline of your freedom plan"}
      style={{ display: "block", margin: "0 auto", width: "100%", maxWidth: format === "poster" ? 480 : 760, height: "auto", borderRadius: 18, boxShadow: "0 12px 40px #3a2a1222" }} />}
    {format === "reddit" && <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 8 }}>
      <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: 0 }}>Text, so it works where image comments aren&apos;t allowed. In Reddit&apos;s editor, switch to Markdown mode before pasting.</p>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--uf-card)", color: "var(--uf-ink)", border: "1px solid var(--uf-border)", borderRadius: 14, padding: 16, fontFamily: "var(--uf-font-mono)", fontSize: 13, lineHeight: 1.5 }}>{markdown}</pre>
    </div>}
  </div>, document.body);
}
