import type { Metadata } from "next";
import { normaliseCode } from "@/lib/referrals";
import EmbedCalculator from "./EmbedCalculator";

export const metadata: Metadata = {
  title: "Freedom date calculator | UntilFire",
  // Lives inside other people's pages; the page itself is not for search.
  robots: { index: false, follow: true },
};

/**
 * The calculator a creator puts in their own post (D-27). Every link out
 * goes through /r/<code>, so a reader who continues is credited to the
 * creator; the embed itself sets no cookie, since cookies inside another
 * site's frame are blocked by most browsers anyway.
 */
export default async function EmbedPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normaliseCode((await params).code);
  return <EmbedCalculator code={code} />;
}
