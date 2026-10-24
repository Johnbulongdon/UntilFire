"use client";

import React from "react";

/**
 * The glyph set.
 *
 * These eight paths were typed out in three places before this file: the
 * desktop nav array and MOBILE_PRIMARY_ITEMS in app/dashboard/page.tsx held
 * identical copies of the four nav glyphs, and Alert.tsx carried its own
 * severity set. Two hand-kept copies of a nav is exactly the failure
 * docs/design/app-structure.md calls out as load-bearing — it is how tabs
 * ship unreachable — and it applies to the icons as much as the routes.
 *
 * Stroke-based on a 24px grid, one consistent style, `currentColor` so a
 * glyph takes the colour of the text beside it. Never emoji: emoji render
 * differently on every platform and cannot be recoloured.
 */

export type IconName =
  | "home" | "money" | "plan" | "profile"
  | "critical" | "warning" | "info" | "positive"
  | "calendar" | "target"
  | "sliders" | "card" | "gift" | "megaphone" | "bank" | "users";

/** Path geometry only. Stroke, size and colour are applied by the component. */
export const ICON_PATHS: Record<IconName, string> = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  money: '<path d="M4 20h16"/><path d="M6 16l4-4 3 3 5-7"/><path d="M14 8h4v4"/>',
  plan: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
  // Severity glyphs are drawn on the same 24px grid as the nav set so they
  // sit on one baseline when they appear together.
  critical: '<path d="M12 3.1l8.9 15.8H3.1z"/><path d="M12 9.6v4.1M12 16.8v.1"/>',
  warning: '<circle cx="12" cy="12" r="9"/><path d="M12 7.2v5.5M12 16.3v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10.8v5.4M12 7.7v.1"/>',
  positive: '<path d="M4.2 12.6l4.8 4.8L19.8 6.6"/>',
  // Public calculator groups (/calculators): "when" and "on track".
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6"/>',
  // Profile section headers.
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M3.5 13h17M12 9v11M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>',
  megaphone: '<path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M17 9.5a3.5 3.5 0 0 1 0 5M8 15l1 4"/>',
  bank: '<path d="M3 9.5 12 4l9 5.5H3z"/><path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 20h17"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 5.2a3.3 3.3 0 0 1 0 6.6M17.5 14.3c2.4.6 4 2.6 4 5.7"/>',
};

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export default function Icon({ name, size = 20, strokeWidth = 1.7, style, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      style={{ flexShrink: 0, display: "block", ...style }}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
      {...rest}
    />
  );
}
