"use client";

import { useState } from "react";

type Segment = "all" | "free" | "pro";
type SendResult = { sent: number; total: number } | string | null;

export default function EmailsTab({ token }: { token: string }) {
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<SendResult>(null);

  const bodyHtml = body
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, heading, bodyHtml, segment }),
      });
      const data = await res.json();
      setResult(res.ok ? { sent: data.sent, total: data.total } : (data.error ?? "Send failed"));
    } catch {
      setResult("Send failed");
    }
    setSending(false);
    setConfirming(false);
  }

  const canSend = subject.trim() && heading.trim() && body.trim();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Segment">
          <select value={segment} onChange={(e) => setSegment(e.target.value as Segment)} style={inputStyle}>
            <option value="all">All users</option>
            <option value="free">Free users only</option>
            <option value="pro">Pro users only</option>
          </select>
        </Field>
        <Field label="Subject (email subject line)">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} placeholder="e.g. New: Expat FIRE globe" />
        </Field>
        <Field label="Heading (large text inside the email)">
          <input value={heading} onChange={(e) => setHeading(e.target.value)} style={inputStyle} placeholder="e.g. We just shipped something new" />
        </Field>
        <Field label="Message">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Write your update. Leave a blank line to start a new paragraph."
          />
        </Field>

        {!confirming ? (
          <button disabled={!canSend} onClick={() => setConfirming(true)} style={{ ...primaryBtn, opacity: canSend ? 1 : 0.5 }}>
            Review &amp; send
          </button>
        ) : (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 14 }}>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#92400E" }}>
              This sends a real email now to every {segment === "all" ? "" : segment + " "}user who hasn&apos;t unsubscribed. This can&apos;t be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={sending} onClick={send} style={primaryBtn}>{sending ? "Sending…" : "Yes, send now"}</button>
              <button disabled={sending} onClick={() => setConfirming(false)} style={{ ...primaryBtn, background: "#fff", color: "#19181E", border: "1px solid #E2E8F0" }}>Cancel</button>
            </div>
          </div>
        )}

        {result && (
          <p style={{ fontSize: 13, color: typeof result === "string" ? "#DC2626" : "#059669", fontWeight: 700 }}>
            {typeof result === "string" ? result : `Sent ${result.sent} of ${result.total} emails.`}
          </p>
        )}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 }}>Preview</div>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#22D3A5", textTransform: "uppercase", letterSpacing: 1 }}>Update</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#003527", margin: "6px 0 14px" }}>{heading || "Your heading here"}</div>
          <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{body || "Your message here."}</div>
          <p style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #F0F4F1", fontSize: 11, color: "#9CA3AF" }}>
            You&apos;re receiving this because you have an UntilFire account. Unsubscribe from these emails.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#64748B" }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 14,
  padding: "10px 12px",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  fontFamily: "inherit",
  color: "#19181E",
};

const primaryBtn: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  background: "#059669",
  color: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
};
