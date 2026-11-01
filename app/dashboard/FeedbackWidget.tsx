"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type FeedbackType = "bug" | "feature" | "general";
type Status = "idle" | "sending" | "sent" | "error";

const TYPE_OPTIONS: { key: FeedbackType; label: string }[] = [
  { key: "general",  label: "General" },
  { key: "feature",  label: "Feature request" },
  { key: "bug",      label: "Bug report" },
];

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  // The top bar (phones) and the sidebar (desktop) open this (D-54).
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("uf:feedback", show);
    return () => window.removeEventListener("uf:feedback", show);
  }, []);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Deep link from outside the app — the monthly email's "tell me what to
  // build" button lands on /dashboard?feedback=feature. Opening the widget
  // on arrival is the whole point: a button that drops someone on the
  // dashboard and leaves them to find a floating widget has not asked them
  // anything. The param is stripped afterwards so a refresh does not reopen
  // it, and an unrecognised value just opens on the default tab.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("feedback");
    if (requested === null) return;
    if (TYPE_OPTIONS.some((o) => o.key === requested)) {
      setType(requested as FeedbackType);
    }
    setOpen(true);
    params.delete("feedback");
    const qs = params.toString();
    window.history.replaceState(
      {}, "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
    );
  }, []);

  useEffect(() => {
    if (open && status !== "sent") {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [open, status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleClose() {
    setOpen(false);
    if (status === "sent") {
      setTimeout(() => {
        setMessage("");
        setType("general");
        setStatus("idle");
      }, 300);
    }
  }

  async function handleSubmit() {
    if (!message.trim() || status === "sending") return;
    setStatus("sending");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStatus("error"); return; }

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ type, message }),
    });

    if (res.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
    }
  }

  return (
    <>
      {/* Opened from the top bar on phones and the sidebar on desktop; a
          floating button covered amounts at the right edge of lists. */}
      {/* Backdrop + modal */}
      {open && (
        <div
          ref={backdropRef}
          onClick={(e) => { if (e.target === backdropRef.current) handleClose(); }}
          style={{ position: "fixed", inset: 0, background: "var(--uf-scrim)", zIndex: 201, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="uf-feedback-title" style={{
            background: "var(--uf-card)", color: "var(--uf-ink)", border: "1px solid var(--uf-border)",
            borderRadius: "var(--uf-r-modal)", padding: "28px 28px 24px", width: "100%", maxWidth: 440,
            boxShadow: "var(--uf-e3)", position: "relative",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 id="uf-feedback-title" className="uf-t-h2" style={{ margin: 0 }}>Send feedback</h2>
              <button
                onClick={handleClose}
                style={{ background: "var(--uf-surface)", border: "none", cursor: "pointer", color: "var(--uf-ink-2)", width: 36, height: 36, borderRadius: "var(--uf-r-pill)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {status === "sent" ? (
              /* Success state */
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div aria-hidden style={{ width: 56, height: 56, borderRadius: "var(--uf-r-pill)", background: "var(--uf-yellow)", color: "var(--uf-on-accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <div className="uf-t-h3" style={{ marginBottom: 8 }}>Thanks for your feedback</div>
                <div className="uf-t-body" style={{ color: "var(--uf-ink-2)", marginBottom: 24 }}>
                  We read every message and use it to make UntilFire better.
                </div>
                <Button variant="primary" onClick={handleClose}>Close</Button>
              </div>
            ) : (
              <>
                {/* Type selector */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-ink)", marginBottom: 8 }}>Type</div>
                  <div role="radiogroup" aria-label="Feedback type" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {TYPE_OPTIONS.map((opt) => {
                      const on = type === opt.key;
                      return (
                        <button
                          key={opt.key}
                          role="radio"
                          aria-checked={on}
                          onClick={() => setType(opt.key)}
                          style={{
                            padding: "7px 14px", borderRadius: "var(--uf-r-pill)", border: "1px solid",
                            borderColor: on ? "var(--uf-ink)" : "var(--uf-border)",
                            background: on ? "var(--uf-ink)" : "var(--uf-card)",
                            color: on ? "var(--uf-card)" : "var(--uf-ink-2)",
                            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                            transition: "background var(--uf-dur-1), color var(--uf-dur-1)",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="uf-feedback-message" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--uf-ink)", marginBottom: 8 }}>
                    Message
                  </label>
                  <textarea
                    id="uf-feedback-message"
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); if (status === "error") setStatus("idle"); }}
                    placeholder={
                      type === "bug" ? "Describe what happened and how to reproduce it…" :
                      type === "feature" ? "What would you like to see in UntilFire?" :
                      "Share your thoughts, questions, or suggestions…"
                    }
                    maxLength={1000}
                    rows={4}
                    style={{
                      width: "100%", padding: "12px 14px", border: "1.5px solid var(--uf-border)",
                      borderRadius: "var(--uf-r-control)", fontSize: 14, color: "var(--uf-ink)",
                      background: "var(--uf-card)", fontFamily: "inherit", resize: "vertical",
                      outline: "none", lineHeight: 1.6, boxSizing: "border-box",
                    }}
                  />
                  <div style={{ fontSize: 12, color: "var(--uf-ink-3)", textAlign: "right", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                    {message.length}/1000
                  </div>
                </div>

                {/* Error */}
                {status === "error" && (
                  <div role="alert" className="uf-t-small" style={{ color: "var(--uf-neg-ink)", background: "var(--uf-neg-bg)", borderRadius: "var(--uf-r-control)", padding: "8px 12px", marginBottom: 12, fontWeight: 600 }}>
                    Couldn&apos;t send. Please try again.
                  </div>
                )}

                {/* Submit */}
                <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={!message.trim() || status === "sending"}>
                  {status === "sending" ? "Sending…" : "Send feedback"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
