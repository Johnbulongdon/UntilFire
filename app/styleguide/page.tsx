import type { Metadata } from "next";
import StyleguideClient from "./StyleguideClient";

/**
 * Internal reference for the design system: every primitive in
 * components/ui, every token in globals.css, rendered by the real
 * components in both themes.
 *
 * It exists because the kit was going unused — five primitives you cannot
 * look at are five primitives nobody reaches for. Keep it current: when you
 * add a variant, add it here.
 *
 * Not indexed and not in the sitemap. It is a working tool, not a page.
 */
export const metadata: Metadata = {
  title: "UI kit — UntilFire",
  description: "Internal reference for UntilFire design system primitives and tokens.",
  robots: { index: false, follow: false },
};

export default function StyleguidePage() {
  return <StyleguideClient />;
}
