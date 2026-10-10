"use client";

import type { Badges, Metal } from "@/lib/explore";

/**
 * A freedom badge (D-67): a metal disc with its stars under it. No words on
 * the medal itself; the label is its tooltip and screen-reader name, and an
 * opened city spells it out. Placeholder art until drawn medals exist.
 */
export const METAL_NAME: Record<Metal, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
export const METAL_MEANS: Record<Metal, string> = {
  bronze: "Keep working full time",
  silver: "Stop saving now, just cover your costs",
  gold: "Work half time from now",
};
export const STAR_LIFE = ["", "Frugal life", "Medium life", "Wealthy life"];

export function medalLabel(metal: Metal, stars: number, retireAge: string) {
  return stars > 0
    ? `${METAL_NAME[metal]} ${"★".repeat(stars)}: ${METAL_MEANS[metal].toLowerCase()}, ${STAR_LIFE[stars].toLowerCase()} by ${retireAge}`
    : `${METAL_NAME[metal]}: not yet (${METAL_MEANS[metal].toLowerCase()})`;
}

export default function Medal({ metal, stars, size = 26, label, light = false }: { metal: Metal; stars: number; size?: number; label: string; light?: boolean }) {
  const locked = stars === 0;
  return (
    <span role="img" aria-label={label} title={label} style={{ display: "inline-grid", justifyItems: "center", gap: 2, lineHeight: 1 }}>
      <span style={{
        width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: size * 0.42,
        background: locked ? (light ? "var(--uf-surface-2)" : "#ffffff1a") : `radial-gradient(circle at 35% 30%, var(--uf-${metal}), var(--uf-${metal}-deep))`,
        border: locked ? `1.5px dashed ${light ? "var(--uf-border-2)" : "#ffffff66"}` : "none",
        boxShadow: locked ? "none" : "inset 0 -2px 0 #0000002e, inset 0 2px 0 #ffffff8c, 0 2px 6px -2px #00000059",
      }}>{locked ? "🔒" : ""}</span>
      <span aria-hidden style={{ fontSize: Math.max(8, size * 0.36), letterSpacing: -1, color: locked ? "transparent" : `var(--uf-${metal}${light ? "-deep" : ""})` }}>
        {"★".repeat(stars)}<span style={{ color: light ? "var(--uf-border-2)" : "#ffffff40" }}>{"★".repeat(3 - stars)}</span>
      </span>
    </span>
  );
}

/** The three medals of a city, in order. */
export function MedalRow({ badges, size, retireAge, light }: { badges: Badges; size?: number; retireAge: string; light?: boolean }) {
  const metals: Metal[] = badges.goldJudged ? ["bronze", "silver", "gold"] : ["bronze", "silver"];
  return <span style={{ display: "inline-flex", gap: 6, alignItems: "flex-start" }}>
    {metals.map((m) => <Medal key={m} metal={m} stars={badges[m]} size={size} light={light} label={medalLabel(m, badges[m], retireAge)} />)}
  </span>;
}
