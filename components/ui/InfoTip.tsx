"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * An explanation kept off the page until asked for: a small "i" that shows
 * its text on hover, keyboard focus or tap. Pages lead with graphics and
 * short labels (AGENTS.md, "Show, don't tell"); the sentence that explains a
 * number lives here instead of under it.
 */
export default function InfoTip({ children, label = "What this means" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={label} aria-describedby={open ? id : undefined} onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        style={{ width: 24, height: 24, display: "inline-grid", placeItems: "center", border: "none", background: "none", padding: 0, cursor: "help", color: "var(--uf-ink-3)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <span role="tooltip" id={id} className="uf-t-small" style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", zIndex: 40,
          width: "max-content", maxWidth: 260, padding: "8px 10px", borderRadius: 8, background: "var(--uf-ink)", color: "var(--uf-card)",
          boxShadow: "var(--uf-e2)", lineHeight: 1.4, fontWeight: 500, textTransform: "none", letterSpacing: 0, whiteSpace: "normal",
        }}>{children}</span>
      )}
    </span>
  );
}
