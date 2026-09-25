"use client";

/**
 * Where a value sits among a population, as a position on a line with the
 * median marked. Teal, because it shows progress toward freedom; the number
 * beside it always carries the meaning too, so colour is never the only cue.
 *
 * `position` is 0–100. `fillAnimation` is a CSS animation for the fill, for
 * callers that define their own keyframes.
 */
export default function PercentileTrack({ position, label, fillAnimation, width = "min(420px, 80vw)" }: {
  position: number;
  label: string;
  fillAnimation?: string;
  width?: string;
}) {
  const at = Math.max(0.5, Math.min(99.5, position));
  return (
    <div role="img" aria-label={label} style={{ position: "relative", width, height: 38 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 8, height: 8, borderRadius: 4, background: "var(--uf-border)" }} />
      <div style={{ position: "absolute", left: 0, top: 8, height: 8, borderRadius: 4, width: `${at}%`, background: "var(--uf-teal)", transformOrigin: "left", animation: fillAnimation }} />
      <div aria-hidden style={{ position: "absolute", left: "50%", top: 3, width: 2, height: 18, marginLeft: -1, background: "var(--uf-ink-2)", borderRadius: 1 }} />
      <div aria-hidden style={{ position: "absolute", left: "50%", top: 24, transform: "translateX(-50%)", fontSize: 11, color: "var(--uf-ink-2)" }}>median</div>
      <div aria-hidden style={{ position: "absolute", left: `${at}%`, top: 4, width: 16, height: 16, marginLeft: -8, borderRadius: "50%", background: "var(--uf-teal)", border: "3px solid var(--uf-card)", boxShadow: "0 0 0 1px var(--uf-teal)" }} />
    </div>
  );
}
