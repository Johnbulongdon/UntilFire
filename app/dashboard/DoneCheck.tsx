"use client";

/**
 * The check beside "Today's done". When the last Today item is answered it plays once:
 * a ring fills, the dot pops, the check draws, a few sparks leave. It only moves forward
 * and then rests; there is no streak or loss state. A day that is already done on load,
 * and anyone who prefers reduced motion, gets the finished check with no motion.
 * Prototype of rive-mocks/today-done.
 */
const SPARKS = Array.from({ length: 10 }, (_, i) => ({ angle: i * 36 + 18, tone: i % 3 }));
const TONES = ["var(--uf-teal)", "var(--uf-aqua)", "var(--uf-warn)"];

export default function DoneCheck({ play, size = 44 }: { play: boolean; size?: number }) {
  return (
    <svg className={play ? "uf-done is-playing" : "uf-done"} width={size} height={size} viewBox="0 0 96 96" aria-hidden focusable="false" style={{ overflow: "visible", flexShrink: 0 }}>
      <style>{`
        .uf-done .ring-base { fill: none; stroke: var(--uf-border); stroke-width: 6; }
        .uf-done .ring { fill: none; stroke: var(--uf-teal); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 0; transform: rotate(-90deg); transform-box: view-box; transform-origin: 48px 48px; }
        .uf-done .dot { fill: var(--uf-teal); transform: scale(1); transform-box: view-box; transform-origin: 48px 48px; }
        .uf-done .tick { fill: none; stroke: var(--uf-card); stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 0; }
        .uf-done .spark { stroke-width: 5; stroke-linecap: round; opacity: 0; transform-box: view-box; transform-origin: 48px 48px; }
        @media (prefers-reduced-motion: no-preference) {
          .uf-done.is-playing .ring { stroke-dashoffset: 1; animation: uf-done-ring 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) 0.05s forwards; }
          .uf-done.is-playing .dot { transform: scale(0); animation: uf-done-dot 0.4s cubic-bezier(0.3, 1.5, 0.5, 1) 0.45s forwards; }
          .uf-done.is-playing .tick { stroke-dashoffset: 1; animation: uf-done-tick 0.35s ease-out 0.75s forwards; }
          .uf-done.is-playing .spark { animation: uf-done-spark 0.7s ease-out 0.8s forwards; }
        }
        @keyframes uf-done-ring { to { stroke-dashoffset: 0; } }
        @keyframes uf-done-dot { to { transform: scale(1); } }
        @keyframes uf-done-tick { to { stroke-dashoffset: 0; } }
        @keyframes uf-done-spark {
          0% { opacity: 1; transform: rotate(var(--a)) translateX(0); }
          100% { opacity: 0; transform: rotate(var(--a)) translateX(14px); }
        }
      `}</style>
      <circle className="ring-base" cx="48" cy="48" r="38" />
      <circle className="ring" cx="48" cy="48" r="38" pathLength={1} />
      <circle className="dot" cx="48" cy="48" r="32" />
      <path className="tick" d="M33 49 L44 60 L63 38" pathLength={1} />
      {SPARKS.map((s) => (
        <line key={s.angle} className="spark" x1="94" y1="48" x2="102" y2="48" stroke={TONES[s.tone]} style={{ ["--a" as string]: `${s.angle}deg` }} />
      ))}
    </svg>
  );
}
