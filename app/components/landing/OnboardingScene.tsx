"use client";

/**
 * The onboarding scene (D-50): a landscape where the sun rises one step per
 * answer and a path fills from home toward it. The sky is a slow Paper
 * Shaders mesh gradient when WebGL2 is available and motion is allowed;
 * otherwise an SVG gradient that moves the same way. Decorative only: the
 * answer tag repeats what the step's own controls already say.
 */

import dynamic from "next/dynamic";
import { useEffect, useId, useState } from "react";

const MeshGradient = dynamic(() => import("@paper-design/shaders-react").then((m) => m.MeshGradient), { ssr: false });

export type SceneIcon = "pin" | "pay" | "jar" | "stack" | "age";

const ease = "cubic-bezier(.22,.8,.24,1)";
const SKY = {
  light: { from: ["#bfdde3", "#eef3ec", "#e9dcc6", "#cfe7e2"], to: ["#ffd9a3", "#fff1dc", "#f6b27c", "#d6efe4"] },
  dark: { from: ["#16323a", "#1e2a2c", "#2b2a24", "#173a36"], to: ["#5a3a1c", "#2e2a22", "#8a4f24", "#1d4a40"] },
};
const mixHex = (a: string, b: string, t: number) => "#" + [0, 2, 4].map((i) =>
  Math.round(parseInt(a.slice(1 + i, 3 + i), 16) * (1 - t) + parseInt(b.slice(1 + i, 3 + i), 16) * t).toString(16).padStart(2, "0")).join("");

function Icon({ k }: { k: SceneIcon }) {
  const p = { fill: "none", stroke: "var(--uf-green)", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      {k === "pin" && <><path {...p} d="M12 21c-4-5-6-8-6-11a6 6 0 0 1 12 0c0 3-2 6-6 11Z" /><circle {...p} cx="12" cy="10" r="2.2" /></>}
      {k === "pay" && <><rect {...p} x="3" y="6.5" width="18" height="11" rx="2.5" /><circle {...p} cx="12" cy="12" r="2.5" /></>}
      {k === "jar" && <><path {...p} d="M8 4h8M9 4v2.5c-2.5 1.5-3.5 3.5-3.5 6V18a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5.5c0-2.5-1-4.5-3.5-6V4" /><path {...p} d="M7 13h10" /></>}
      {k === "stack" && <><ellipse {...p} cx="12" cy="6.5" rx="6.5" ry="2.5" /><path {...p} d="M5.5 6.5v4.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V6.5M5.5 11v4.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V11" /></>}
      {k === "age" && <path {...p} d="M7 3h10M7 21h10M8 3c0 4.5 8 4.5 8 9s-8 4.5-8 9M16 3c0 4.5-8 4.5-8 9s8 4.5 8 9" />}
    </svg>
  );
}

/** WebGL2, motion allowed, and the theme, read once on the client. */
function useSkyMode() {
  const [mode, setMode] = useState<{ shader: boolean; dark: boolean }>({ shader: false, dark: false });
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      let gl = false;
      try { gl = !!document.createElement("canvas").getContext("webgl2"); } catch { gl = false; }
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setMode({ shader: gl && !still, dark: root.classList.contains("dark") });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return mode;
}

export default function OnboardingScene({ step, steps, answer, icon }: { step: number; steps: number; answer: string; icon: SceneIcon }) {
  const id = useId().replace(/:/g, "");
  const { shader, dark } = useSkyMode();
  const t = steps > 1 ? step / (steps - 1) : 1;
  const sunY = 150 - t * 92;
  const tr = (ms: number) => ({ transition: `all ${ms}ms ${ease}` });
  const pal = dark ? SKY.dark : SKY.light;
  const u = (k: string) => `url(#${id}-${k})`;
  return (
    <div className="uf-scene" aria-hidden="true">
      {shader && <MeshGradient colors={pal.from.map((c, i) => mixHex(c, pal.to[i], t))} distortion={0.55} swirl={0.25} speed={0.18}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />}
      <svg viewBox="0 0 350 210" width="100%" height="100%" style={{ display: "block", position: "relative" }}>
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: `color-mix(in srgb, #7fb8c6 ${40 - t * 22}%, var(--uf-bg))`, ...tr(900) }} />
            <stop offset="0.65" style={{ stopColor: `color-mix(in srgb, var(--uf-sun-soft) ${12 + t * 34}%, var(--uf-bg))`, ...tr(900) }} />
            <stop offset="1" style={{ stopColor: `color-mix(in srgb, var(--uf-sun) ${18 + t * 30}%, var(--uf-bg))`, ...tr(900) }} />
          </linearGradient>
          <radialGradient id={`${id}-glow`}><stop offset="0" stopColor="#ffd9a0" stopOpacity="0.9" /><stop offset="0.45" stopColor="var(--uf-sun-soft)" stopOpacity="0.35" /><stop offset="1" stopColor="var(--uf-sun-soft)" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${id}-far`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="color-mix(in srgb, var(--uf-teal) 26%, var(--uf-bg))" /><stop offset="1" stopColor="color-mix(in srgb, var(--uf-teal) 34%, var(--uf-bg))" /></linearGradient>
          <linearGradient id={`${id}-mid`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="color-mix(in srgb, var(--uf-teal) 55%, var(--uf-bg))" /><stop offset="1" stopColor="color-mix(in srgb, var(--uf-teal) 70%, var(--uf-bg))" /></linearGradient>
          <linearGradient id={`${id}-near`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--uf-teal)" /><stop offset="1" stopColor="var(--uf-green)" /></linearGradient>
        </defs>
        {!shader && <rect width="350" height="210" fill={u("sky")} />}
        {/* The sun rises one step per answer, behind the hills. */}
        <g style={{ transform: `translateY(${sunY}px)`, ...tr(1100) }}>
          <circle cx="238" cy="0" r="78" fill={u("glow")} style={{ opacity: 0.5 + t * 0.5, ...tr(1100) }} />
          <g style={{ opacity: t, ...tr(1100) }}>
            {Array.from({ length: 10 }, (_, k) => {
              const a = (k / 10) * Math.PI * 2;
              return <line key={k} x1={238 + Math.cos(a) * 38} y1={Math.sin(a) * 38} x2={238 + Math.cos(a) * 48} y2={Math.sin(a) * 48} stroke="var(--uf-sun-soft)" strokeWidth="3" strokeLinecap="round" />;
            })}
          </g>
          <circle cx="238" cy="0" r="27" fill="var(--uf-sun)" />
          <circle cx="231" cy="-7" r="9" fill="var(--uf-sun-soft)" opacity="0.7" />
        </g>
        <g className="uf-cloud" style={{ opacity: 0.85 }}><g transform="translate(70 26)">
          <path d="M40 48 a10 10 0 0 1 18 -6 a13 13 0 0 1 24 4 a9 9 0 0 1 2 17 h-40 a8 8 0 0 1 -4 -15Z" fill="color-mix(in srgb, white 75%, var(--uf-bg))" opacity="0.9" />
        </g></g>
        <g className="uf-cloud uf-cloud-2" style={{ opacity: 0.6 }}>
          <path d="M260 34 a8 8 0 0 1 14 -4 a10 10 0 0 1 19 3 a7 7 0 0 1 1 13 h-31 a6 6 0 0 1 -3 -12Z" fill="color-mix(in srgb, white 75%, var(--uf-bg))" opacity="0.85" />
        </g>
        <path d="M0 210 V128 C40 112 70 104 110 116 S180 98 230 112 S310 100 350 108 V210Z" fill={u("far")} />
        <path d="M0 210 V150 C50 134 96 132 140 146 S230 128 280 140 S330 136 350 134 V210Z" fill={u("mid")} />
        {[[166, 140], [178, 138], [300, 136]].map(([x, y], k) => (
          <g key={k}><rect x={x - 1} y={y - 2} width="2" height="8" fill="color-mix(in srgb, var(--uf-green) 70%, black)" /><circle cx={x} cy={y - 6} r="6" fill="color-mix(in srgb, var(--uf-green) 85%, var(--uf-bg))" /></g>
        ))}
        {/* A path from home toward the sun; it fills as you answer. */}
        <path d="M70 178 C110 170 130 160 170 156 S230 146 262 138" fill="none" stroke="color-mix(in srgb, var(--uf-bg) 70%, transparent)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 7" />
        <path d="M70 178 C110 170 130 160 170 156 S230 146 262 138" fill="none" stroke="var(--uf-sun-soft)" strokeWidth="4" strokeLinecap="round" pathLength={100}
          style={{ strokeDasharray: `${t * 100} 100`, ...tr(1100) }} />
        <path d="M0 210 V170 C60 160 120 168 180 176 S300 170 350 164 V210Z" fill={u("near")} />
        <g transform="translate(52 160)">
          <path d="M0 14 L13 3 L26 14 V30 H0Z" fill="var(--uf-bg)" />
          <path d="M-3 15 L13 1 L29 15" fill="none" stroke="color-mix(in srgb, var(--uf-green) 80%, black)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9" y="19" width="8" height="11" rx="1.5" fill="var(--uf-sun)" />
        </g>
      </svg>
      <div key={answer} className="uf-scene-tag"><Icon k={icon} />{answer}</div>
    </div>
  );
}
