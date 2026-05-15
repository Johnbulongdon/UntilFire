"use client";

import { useState, useEffect, useRef } from "react";
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
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      <style>{`
        .uf-feedback-btn { transition: transform 0.15s, box-shadow 0.15s; }
        .uf-feedback-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(6,78,59,0.35) !important; }
        @media(max-width: 640px) { .uf-feedback-btn { bottom: 76px !important; } }
      `}</style>

      {/* Floating button */}
      <button
        className="uf-feedback-btn"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          background: "#064E3B",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(6,78,59,0.25)",
          fontFamily: "inherit",
          letterSpacing: "-0.1px",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Feedback
      </button>

      {/* Backdrop + modal */}
      {open && (
        <div
          ref={backdropRef}
          onClick={(e) => { if (e.target === backdropRef.current) handleClose(); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 201,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={{
            background: "#fff",
            borderRadius: 16,
            padding: "28px 28px 24px",
            width: "100%",
            maxWidth: 440,
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            position: "relative",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>UntilFire</div>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: "#064E3B", margin: 0, letterSpacing: "-0.3px" }}>Send feedback</h2>
              </div>
              <button
                onClick={handleClose}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {status === "sent" ? (
              /* Success state */
              <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>🎉</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#064E3B", marginBottom: 8 }}>Thanks for your feedback!</div>
                <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24, lineHeight: 1.6 }}>
                  We read every submission and use it to make UntilFire better.
                </div>
                <button
                  onClick={handleClose}
                  style={{ padding: "10px 24px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Type selector */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Type</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setType(opt.key)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 999,
                          border: "1.5px solid",
                          borderColor: type === opt.key ? "#059669" : "#E2E8F0",
                          background: type === opt.key ? "#ECFDF5" : "#fff",
                          color: type === opt.key ? "#065F46" : "#64748B",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.12s",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                    Message
                  </label>
                  <textarea
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
                      width: "100%",
                      padding: "10px 12px",
                      border: "1.5px solid #E2E8F0",
                      borderRadius: 8,
                      fontSize: 14,
                      color: "#19181E",
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                      lineHeight: 1.6,
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 4 }}>
                    {message.length}/1000
                  </div>
                </div>

                {/* Error */}
                {status === "error" && (
                  <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 12 }}>
                    Something went wrong — please try again.
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || status === "sending"}
                  style={{
                    width: "100%",
                    padding: "11px 0",
                    background: !message.trim() || status === "sending" ? "#E2E8F0" : "#059669",
                    color: !message.trim() || status === "sending" ? "#9ca3af" : "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !message.trim() || status === "sending" ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.15s",
                  }}
                >
                  {status === "sending" ? "Sending…" : "Send feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
