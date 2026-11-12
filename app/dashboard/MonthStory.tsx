"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { freeDaysLabel, freeNextLabel, freeTimeMore, type FreeDays } from "@/lib/freedom-progress";
import { FREE_DAYS_SHARE_URL, freeDaysShareText, storyChangeLine, storyFlowLine, storyKeptLine, storyPages, type MonthStory as Story, type StoryPage } from "@/lib/month-story";

/** One colour per page, the phone's four. The tokens turn dark by themselves; yellow keeps its dark ink (uf-freedom-panel). */
const GROUND: Record<StoryPage, string> = { kept: "var(--uf-mint)", change: "var(--uf-blue)", hours: "var(--uf-yellow)", free: "var(--uf-lilac)" };

/**
 * Month story (D-151, lib/month-story): last month in a few short pages, one
 * idea a page, opened from Today. The same pages and words as the phone's
 * story screen. The last page shares the free days, never an amount (D-22, D-98).
 */
export default function MonthStory({ story, free, freedomLabel, fmt, categoryLabel, onClose }: {
  story: Story;
  /** Home's free days (D-149); null without a freedom number, which leaves the last page out. */
  free: FreeDays | null;
  /** "Mar 2041", for the last of the 365 days. */
  freedomLabel?: string | null;
  fmt: (n: number) => string;
  categoryLabel: (key: string) => string;
  onClose: () => void;
}) {
  const pages = storyPages(story, !!free);
  const [at, setAt] = useState(0);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const page = pages[Math.min(at, pages.length - 1)];
  const last = at >= pages.length - 1;
  const box = useRef<HTMLDivElement>(null);

  // Keys: Escape closes, the arrows turn the page. Focus starts inside, so a keyboard is never left behind the scrim.
  useEffect(() => { box.current?.focus(); }, []);
  const next = () => { if (!last) setAt(at + 1); };
  const back = () => { if (at > 0) setAt(at - 1); };

  const share = async () => {
    if (!free) return;
    const text = freeDaysShareText(freeDaysLabel(free));
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text, url: FREE_DAYS_SHARE_URL });
        return;
      } catch (err) {
        // Closing the share sheet is a choice, not a failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${FREE_DAYS_SHARE_URL}`);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  const lines = page === "kept" ? { eyebrow: story.monthName, big: storyKeptLine(story, fmt), sub: storyFlowLine(story, fmt) }
    : page === "change" ? { eyebrow: "Biggest change", big: categoryLabel(story.change!.key), sub: storyChangeLine(story.change!, fmt) }
    : page === "hours" ? { eyebrow: "Put into savings, it pays for", big: freeTimeMore(story.hours)!, sub: "of every year" }
    : { eyebrow: "Your money already pays for", big: freeDaysLabel(free!), sub: "of every year" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "var(--uf-scrim)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--uf-s4)" }}>
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Your ${story.monthName} story`} onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") next(); else if (e.key === "ArrowLeft") back(); }}
        className={page === "hours" ? "uf-freedom-panel" : undefined}
        style={{ background: GROUND[page], color: "var(--uf-ink)", borderRadius: "var(--uf-r-modal)", padding: "var(--uf-s5)", maxWidth: 420, width: "100%", minHeight: "min(600px, 92vh)", maxHeight: "92vh", overflowY: "auto", boxShadow: "var(--uf-e3)", display: "flex", flexDirection: "column", gap: "var(--uf-s3)", outline: "none" }}>
        <div role="progressbar" aria-label={`Page ${at + 1} of ${pages.length}`} aria-valuemin={1} aria-valuemax={pages.length} aria-valuenow={at + 1} style={{ display: "flex", gap: 6 }}>
          {pages.map((p, i) => <span key={p} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= at ? "var(--uf-ink)" : "color-mix(in srgb, var(--uf-ink) 18%, transparent)" }} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-ink-2)" }}>Your {story.monthName} story</span>
          <button type="button" aria-label="Close the story" onClick={onClose}
            style={{ width: 44, height: 44, marginRight: -12, border: 0, background: "transparent", color: "var(--uf-ink)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* The page itself: a click anywhere on it turns to the next one. */}
        <div onClick={next} aria-live="polite" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", cursor: last ? "default" : "pointer" }}>
          <div key={page} className="uf-home-in" style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: "var(--uf-ink-2)" }}>{lines.eyebrow}</span>
            <span style={{ fontFamily: "var(--uf-font-display)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.08, fontVariantNumeric: "tabular-nums" }}>{lines.big}</span>
            <span style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.45, fontVariantNumeric: "tabular-nums" }}>{lines.sub}</span>
            {page === "free" && free && (
              <>
                <div className="uf-free-days" role="img" aria-label={`${free.days} of 365 days filled`} style={{ gridTemplateColumns: "repeat(37, minmax(0, 1fr))", gap: 2, marginTop: 6 }}>
                  {Array.from({ length: 365 }, (_, i) => <i key={i} data-on={i < free.days ? "" : undefined} data-next={i === free.days ? "" : undefined} />)}
                </div>
                <span style={{ justifySelf: "start", marginTop: 6, background: "var(--uf-ink)", color: "var(--uf-bg)", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {freeNextLabel(free, fmt, freedomLabel)}
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {last && page === "free" && free && (
            <>
              <Button variant="primary" size="lg" onClick={share}>Share my {freeDaysLabel(free)}</Button>
              <p className="uf-t-small" role="status" style={{ margin: 0, textAlign: "center", color: "var(--uf-ink-2)" }}>
                {status === "copied" ? "Copied. Paste it anywhere." : status === "failed" ? "Couldn’t copy it. Your browser blocked it." : "Shares your days only, never your money."}
              </p>
            </>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            {at > 0 && <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={back}>Back</Button>}
            {last
              ? <Button variant={page === "free" && free ? "secondary" : "primary"} size="lg" style={{ flex: 1 }} onClick={onClose}>Done</Button>
              : <Button variant="primary" size="lg" style={{ flex: 1 }} onClick={next}>Next</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
