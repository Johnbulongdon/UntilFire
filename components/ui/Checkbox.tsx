"use client";

import React from "react";

/**
 * The house checkbox. Replaces the browser's `<input type="checkbox">`, whose
 * square ignores our corners and dark mode.
 *
 * It is still a real checkbox underneath (keyboard, label clicks, forms and
 * screen readers all work unchanged), so call sites swap the tag and keep
 * their props. Unticked: a rounded box on the card. Ticked: an ink box with
 * a card-coloured tick, which flips correctly in dark mode.
 * Rules: docs/design/design-system.md, "Checkbox". Styles: `.uf-check` in
 * app/globals.css.
 */

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** 20px by default; "sm" is 16px for dense rows. */
  size?: "sm" | "md";
}

export default function Checkbox({ size = "md", className, style, ...rest }: CheckboxProps) {
  return (
    <span className={`uf-check${size === "sm" ? " uf-check-sm" : ""}${className ? ` ${className}` : ""}`} style={style}>
      <input type="checkbox" {...rest} />
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M5.5 10.5l3 3 6-7" />
      </svg>
    </span>
  );
}
